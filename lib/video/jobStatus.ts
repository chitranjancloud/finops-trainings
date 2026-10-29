import S3VideoJob from "@/models/S3VideoJob";
import S3VideoWorker from "@/models/S3VideoWorker";
import { publicJobProgress, type VideoProgress } from "./progress";

// Only call after the caller has authorized and selected these tenant assets.
export async function assetJobStatuses(tenantId: string, assets: { _id: unknown; key: string; versionId?: string; videoProcessingState?: string }[]) {
  const pending = assets.filter(a => ["queued", "processing", "failed"].includes(a.videoProcessingState || ""));
  const result = new Map<string, VideoProgress>();
  if (!pending.length) return result;
  const managed = process.env.VIDEO_PROCESSING_PROVIDER === "mediaconvert";
  const [jobs, worker] = await Promise.all([
    S3VideoJob.find({ tenantId, assetId: { $in: pending.map(a => String(a._id)) } }).sort({ createdAt: -1 })
      .select("assetId sourceKey sourceVersionId state phase provider providerPercent downloadedBytes sourceBytes encodedSeconds sourceDurationSeconds uploadedSegments totalSegments uploadedBytes nextAttemptAt lastProgressAt").lean(),
    managed ? Promise.resolve(true) : S3VideoWorker.exists({ tenantId, lastSeenAt: { $gt: new Date(Date.now() - 90000) } }),
  ]);
  for (const asset of pending) {
    const job = jobs.find(j => j.assetId === String(asset._id) && j.sourceKey === asset.key && j.sourceVersionId === (asset.versionId || ""));
    result.set(String(asset._id), publicJobProgress(job || { state: asset.videoProcessingState, provider: managed ? "mediaconvert" : "ffmpeg" }, Boolean(worker)));
  }
  return result;
}
