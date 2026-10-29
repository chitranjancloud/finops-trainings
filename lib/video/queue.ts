import S3VideoJob from "@/models/S3VideoJob";
import S3Asset, { type S3AssetRecord } from "@/models/S3Asset";

export const segmentationEnabled = () => process.env.S3_VIDEO_SEGMENTATION_ENABLED === "true";
export async function ensureVideoJob(asset: S3AssetRecord) {
  if (asset.contentType !== "video/mp4" || !["queued", "processing"].includes(asset.videoProcessingState || "")) return;
  await S3VideoJob.init();
  const filter = { tenantId: asset.tenantId, assetId: String(asset._id), sourceKey: asset.key, sourceVersionId: asset.versionId || "", profile: "720p-v1" };
  const managed = process.env.VIDEO_PROCESSING_PROVIDER === "mediaconvert";
  await S3VideoJob.updateOne(filter, { $setOnInsert: { sourceEtag: asset.etag, provider: managed ? "mediaconvert" : "ffmpeg" } }, { upsert: true });
  if (managed) {
    const job = await S3VideoJob.findOne(filter);
    if (job?.state === "queued") {
      const { submitManagedVideo } = await import("./mediaConvert");
      // Submission failure is tracked on the job; the verified original remains uploaded.
      await submitManagedVideo(String(job._id), asset.tenantId);
    }
  }
}

/** Explicit tenant parameter: usable by the worker without HTTP tenant context. */
export async function reconcileVideoJobs(tenantId: string) {
  const rows = await S3Asset.find({ tenantId, status: "ready", videoProcessingState: { $in: ["queued", "processing"] } }).limit(100);
  for (const asset of rows) await ensureVideoJob(asset);
}
