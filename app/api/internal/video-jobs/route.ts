import { timingSafeEqual } from "node:crypto";
import { connectDB } from "@/lib/mongodb";
import { managedVideoEnabled, reconcileManagedVideos } from "@/lib/video/mediaConvert";
import { cleanupManagedVideos } from "@/lib/video/managedCleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  const actual = req.headers.get("authorization") || "";
  const provided = Buffer.from(actual), required = Buffer.from(`Bearer ${expected || ""}`);
  if (!expected || provided.length !== required.length || !timingSafeEqual(provided, required)) {
    return Response.json({ success: false }, { status: 401 });
  }
  const tenantId = process.env.VIDEO_PROCESSING_TENANT_ID || process.env.VIDEO_WORKER_TENANT_ID || "";
  if (!managedVideoEnabled() || !/^[a-f\d]{24}$/.test(tenantId)) return Response.json({ success: false, message: "Managed video processing is not configured." }, { status: 503 });
  try {
    await connectDB();
    let checked = 0;
    const until = Date.now() + 35000;
    const signal = AbortSignal.timeout(45000);
    for (let batch = 0; batch < 4 && Date.now() < until - 7000; batch++) checked += await reconcileManagedVideos(tenantId, 2, signal, until);
    if (Date.now() < until - 7000) await cleanupManagedVideos(tenantId, signal);
    return Response.json({ success: true, checked }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Managed video scheduled check failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ success: false, message: "Video job check failed; it is safe to retry." }, { status: 502 });
  }
}
