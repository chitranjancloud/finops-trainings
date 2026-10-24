import { NextResponse } from "next/server";
import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { fetchSharePointFile } from "@/lib/sharepoint";
import {
  contentTypeFromName,
  extractSharePointParam,
  findAuthorizedBatch,
  protectedContentResponseHeaders,
  safeContentFilename,
  verifyBatchEnrollment,
  verifySharePointItemAuthorized,
  viewableKindFromName,
} from "@/lib/auth/protectedContentAccess";
import { serveInWebsitePreviewHtml } from "@/lib/contentPreview";
import {
  stampTenantId,
  withTenantContext,
  withTenantScope,
} from "@/lib/platform/runtime";
import ContentInventory from "@/models/ContentInventory";
import ContentAccessLog from "@/models/ContentAccessLog";

export const runtime = "nodejs";

const ASSESSMENT_TYPES = ["test", "assignment"] as const;
const FILE_KINDS = ["question", "answerSheet"] as const;

async function logAccess(opts: {
  user: any;
  batch: any;
  material: any;
  action: string;
  req: Request;
}) {
  try {
    const ip =
      opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      opts.req.headers.get("x-real-ip") ||
      "unknown";

    await ContentAccessLog.create(
      stampTenantId({
        userId: String(opts.user._id),
        name: opts.user.name,
        email: opts.user.email,
        batchId: String(opts.batch._id),
        batchName: opts.batch.name,
        materialId: String(opts.material._id || ""),
        materialName: opts.material.name || "",
        materialType: opts.material.type || "material",
        action: opts.action,
        deviceId: opts.user.activeDevice || "",
        ipAddress: ip,
        userAgent: (opts.req.headers.get("user-agent") || "").slice(0, 400),
        accessedAt: new Date(),
      })
    );
  } catch {
    // non-blocking
  }
}

async function fetchMaterialBytes(material: any, range: string | null) {
  const rawUrl = material.url || material.webUrl || "";
  if (!rawUrl) throw new Error("Content URL is not configured.");

  const driveId = extractSharePointParam(rawUrl, "driveId");
  const itemId = extractSharePointParam(rawUrl, "itemId");
  if (driveId && itemId) {
    return fetchSharePointFile(driveId, itemId, range);
  }

  if (rawUrl.startsWith("/uploads/") || rawUrl.startsWith("/api/")) {
    throw new Error("Invalid content reference.");
  }

  const parsed = new URL(rawUrl, "http://local");
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Invalid content reference.");
  }

  const headers: Record<string, string> = {};
  if (range) headers.Range = range;
  return fetch(parsed.toString(), { headers, cache: "no-store" });
}

function findAssessmentResource(batch: any, resourceId: string, resourceType: string) {
  const list =
    resourceType === "assignment" ? batch.assignments || [] : batch.tests || [];
  return list.find((item: any) => String(item._id) === resourceId);
}

/** Tenant-scoped authenticated proxy for batch materials, inventory, and assessments. */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const batchId = searchParams.get("batchId") || "";
    const materialId = searchParams.get("materialId") || "";
    const inventoryId = searchParams.get("inventoryId") || "";
    const resourceId = searchParams.get("resourceId") || "";
    const resourceType = searchParams.get("resourceType") || "";
    const fileKind = searchParams.get("fileKind") || "";

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    const batch = await findAuthorizedBatch(batchId);
    if (!batch || !(await verifyBatchEnrollment(user, batch))) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this content." },
        { status: 403 }
      );
    }

    let material: any = null;

    if (resourceId && ASSESSMENT_TYPES.includes(resourceType as any)) {
      const assessment = findAssessmentResource(batch, resourceId, resourceType);
      if (!assessment || assessment.isActive === false) {
        return NextResponse.json(
          { success: false, message: "Assessment not found or not available." },
          { status: 404 }
        );
      }

      const storedUrl =
        fileKind === "answerSheet"
          ? String(assessment.answerSheetUrl || "").trim()
          : String(assessment.fileUrl || "").trim();

      if (!storedUrl) {
        return NextResponse.json(
          { success: false, message: "Assessment file is not available." },
          { status: 404 }
        );
      }

      material = {
        _id: assessment._id,
        name: assessment.title || assessment.name || "Assessment",
        type: resourceType,
        url: storedUrl,
      };
    } else {
      material = (batch.materials || []).find(
        (item: any) => String(item._id) === materialId
      );

      if (!material && inventoryId) {
        const inventoryItem = await ContentInventory.findOne(
          withTenantScope({
            _id: inventoryId,
            batchId: String(batch._id),
          })
        );

        if (inventoryItem) {
          material = {
            _id: inventoryItem._id,
            name: inventoryItem.fileName,
            type:
              inventoryItem.fileType === "study-material"
                ? "material"
                : inventoryItem.fileType,
            url: inventoryItem.url,
            webUrl: inventoryItem.webUrl,
            sharePointDriveId: inventoryItem.sharePointDriveId,
            sharePointItemId: inventoryItem.sharePointItemId,
            isActive: true,
          };
        }
      }
    }

    if (!material || material.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Content not found or not available." },
        { status: 404 }
      );
    }

    const rawUrl = String(material.url || material.webUrl || "").trim();
    const driveId =
      extractSharePointParam(rawUrl, "driveId") ||
      String(material.sharePointDriveId || "").trim();
    const itemId =
      extractSharePointParam(rawUrl, "itemId") ||
      String(material.sharePointItemId || "").trim();
    const previewMode = (searchParams.get("preview") || "").toLowerCase();
    const filename = safeContentFilename(material.name || "content");

    if (previewMode === "html") {
      if (driveId && itemId) {
        const authorized = await verifySharePointItemAuthorized({
          driveId,
          itemId,
          batchId: String(batch._id),
        });
        if (!authorized) {
          return NextResponse.json(
            { success: false, message: "You do not have access to this content." },
            { status: 403 }
          );
        }
      }
      await logAccess({ user, batch, material, action: "view", req });
      const proxyUrl = new URL(req.url);
      proxyUrl.searchParams.delete("preview");
      const kind = viewableKindFromName(filename);
      const fallbackProxyPath =
        kind === "pdf" || kind === "image"
          ? `${proxyUrl.pathname}${proxyUrl.search}`
          : "";

      return serveInWebsitePreviewHtml({
        filename,
        driveId,
        itemId,
        fallbackProxyPath,
        req,
      });
    }
    if (driveId && itemId) {
      const authorized = await verifySharePointItemAuthorized({
        driveId,
        itemId,
        batchId: String(batch._id),
      });
      if (!authorized) {
        return NextResponse.json(
          { success: false, message: "You do not have access to this content." },
          { status: 403 }
        );
      }
    }

    const fileRes = await fetchMaterialBytes(material, req.headers.get("range"));
    if (!fileRes.ok && fileRes.status !== 206) {
      return NextResponse.json(
        { success: false, message: "Content could not be loaded.", status: fileRes.status },
        { status: fileRes.status === 404 ? 404 : 502 }
      );
    }

    const contentType = contentTypeFromName(filename, fileRes.headers.get("content-type"));
    const kind = viewableKindFromName(filename, contentType);
    const isStudyMaterial =
      !resourceId &&
      ["material", "study-material"].includes(String(material.type || ""));
    if (kind === "office" && isStudyMaterial) {
      return NextResponse.json(
        {
          success: false,
          message: "This file can only be viewed on the website.",
        },
        { status: 403 }
      );
    }
    const action = contentType.startsWith("video/")
      ? "play"
      : contentType === "application/pdf"
        ? "view"
        : "open";
    await logAccess({ user, batch, material, action, req });

    const headers = protectedContentResponseHeaders(filename, contentType);
    const length = fileRes.headers.get("content-length");
    const range = fileRes.headers.get("content-range");
    if (length) headers["Content-Length"] = length;
    if (range) headers["Content-Range"] = range;

    return new NextResponse(fileRes.body, {
      status: fileRes.status,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load content." },
      { status: 500 }
    );
  }
});
