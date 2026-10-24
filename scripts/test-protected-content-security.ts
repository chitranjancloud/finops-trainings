/**
 * Protected content security + video seek regression tests.
 *
 * USAGE:
 *   npx tsx scripts/test-protected-content-security.ts
 *   npm run test:protected-content-security
 */
import {
  buildBatchContentProxyUrl,
  buildRecordedContentProxyUrl,
} from "@/lib/auth/protectedContentUrls";
import {
  resolveSharePointIdsFromUrl,
  verifySharePointItemAuthorized,
} from "@/lib/auth/protectedContentAccess";
import { runWithTenantContext, type TenantContext } from "@/lib/platform/runtime";
import { clampVideoSeekPosition } from "@/lib/video/seekControls";

type CaseResult = { name: string; ok: boolean; detail?: string };
const results: CaseResult[] = [];

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function record(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      results.push({ name, ok: true });
      console.log(`PASS ${name}`);
    })
    .catch((e: unknown) => {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({ name, ok: false, detail });
      console.log(`FAIL ${name}: ${detail}`);
    });
}

async function main() {
  console.log("=== PROTECTED CONTENT SECURITY TESTS ===\n");

  await record("1_proxy_url_never_returns_sharepoint_domain", () => {
    const url = buildBatchContentProxyUrl({
      batchId: "batch-1",
      materialId: "mat-1",
      userId: "user-1",
      sessionToken: "tok",
      deviceId: "dev",
    });
    assert(url.startsWith("/api/batch-content?"), "must use batch-content proxy");
    assert(!url.includes("sharepoint"), "must not expose sharepoint domain");
    assert(!url.includes("microsoft"), "must not expose microsoft domain");
  });

  await record("2_recorded_proxy_url_uses_authenticated_endpoint", () => {
    const url = buildRecordedContentProxyUrl({
      courseId: "course-1",
      resourceType: "video",
      resourceIndex: 0,
      userId: "user-1",
      sessionToken: "tok",
      deviceId: "dev",
    });
    assert(url.startsWith("/api/student/recorded-content?"), "must use recorded proxy");
    assert(!url.includes("graph.microsoft"), "must not expose graph URL");
  });

  await record("3_assessment_proxy_includes_resource_scope", () => {
    const url = buildBatchContentProxyUrl({
      batchId: "batch-1",
      userId: "user-1",
      sessionToken: "tok",
      deviceId: "dev",
      resourceId: "test-1",
      resourceType: "test",
      fileKind: "question",
    });
    assert(url.includes("resourceId=test-1"), "resourceId required");
    assert(url.includes("resourceType=test"), "resourceType required");
    assert(url.includes("fileKind=question"), "fileKind required");
  });

  await record("4_sharepoint_ids_parsed_from_internal_reference", () => {
    const ids = resolveSharePointIdsFromUrl(
      "/api/sharepoint-file?driveId=d1&itemId=i1&name=file.pdf"
    );
    assert(ids?.driveId === "d1", "driveId parsed");
    assert(ids?.itemId === "i1", "itemId parsed");
  });

  await record("5_unrelated_sharepoint_ids_rejected_for_batch", async () => {
    const FINOPS_CTX: TenantContext = {
      tenantId: "6a759a1ffcf75887e20db272",
      slug: "finops",
      name: "FinOps",
      status: "active",
      host: "localhost",
      resolvedAt: Date.now(),
      resolutionSource: "domain",
    };

    const Batch = (await import("@/models/Batch")).default;
    const original = Batch.findOne;
    Batch.findOne = (async () => ({
      _id: "batch-finops",
      name: "FinOps Batch",
      isActive: true,
      materials: [
        {
          url: "/api/sharepoint-file?driveId=allowed-drive&itemId=allowed-item",
        },
      ],
      tests: [],
      assignments: [],
    })) as any;

    const ContentInventory = (await import("@/models/ContentInventory")).default;
    const originalInventory = ContentInventory.find;
    ContentInventory.find = (() =>
      ({
        lean: async () => [],
      }) as any) as typeof ContentInventory.find;

    try {
      const allowed = await runWithTenantContext(FINOPS_CTX, () =>
        verifySharePointItemAuthorized({
          driveId: "allowed-drive",
          itemId: "allowed-item",
          batchId: "batch-finops",
        })
      );
      const denied = await runWithTenantContext(FINOPS_CTX, () =>
        verifySharePointItemAuthorized({
          driveId: "forged-drive",
          itemId: "forged-item",
          batchId: "batch-finops",
        })
      );
      assert(allowed, "authorized item accepted");
      assert(!denied, "forged item rejected");
    } finally {
      Batch.findOne = original;
      ContentInventory.find = originalInventory;
    }
  });

  await record("6_seek_back_clamps_at_zero", () => {
    assert(clampVideoSeekPosition(3, -10, 120) === 0, "cannot go below 0");
  });

  await record("7_seek_forward_clamps_at_duration", () => {
    assert(clampVideoSeekPosition(115, 10, 120) === 120, "cannot exceed duration");
  });

  await record("8_seek_forward_exactly_10_seconds", () => {
    assert(clampVideoSeekPosition(30, 10, 120) === 40, "forward 10 sec");
  });

  await record("9_seek_back_exactly_10_seconds", () => {
    assert(clampVideoSeekPosition(30, -10, 120) === 20, "back 10 sec");
  });

  await record("10_content_url_routes_return_proxy_not_storage", async () => {
    const contentUrl = await import("@/app/api/student/content-url/route");
    const batchContentUrl = await import("@/app/api/student/batch-content-url/route");
    assert(typeof contentUrl.GET === "function", "content-url route exists");
    assert(typeof batchContentUrl.GET === "function", "batch-content-url route exists");
  });

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== SUMMARY ===`);
  console.log(`passed: ${passed}/${results.length}`);
  if (failed.length) {
    for (const f of failed) console.log(`  FAIL ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
