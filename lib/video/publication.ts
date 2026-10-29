import mongoose from "mongoose";
import S3VideoJob, { type VideoJob } from "@/models/S3VideoJob";
import S3Asset from "@/models/S3Asset";
import S3AssetEvent from "@/models/S3AssetEvent";

export async function publishVideo(job: VideoJob, data: { segments: VideoJob["segments"]; duration: number; outputBytes: number; playlistKey: string; playlistVersionId: string; outputPrefix: string }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const fence = job.provider === "mediaconvert" ? { syncToken: job.syncToken } : {};
      const owned = await S3VideoJob.findOne({ _id: job._id, tenantId: job.tenantId, state: "processing", attemptId: job.attemptId, ...fence, leaseUntil: { $gt: new Date() } }).session(session);
      if (!owned) throw new Error("LEASE_LOST");
      const asset = await S3Asset.findOne({ _id: job.assetId, tenantId: job.tenantId, key: job.sourceKey, versionId: job.sourceVersionId, etag: job.sourceEtag, status: "ready" }).session(session);
      if (!asset) throw new Error("SOURCE_CHANGED");
      if (asset.replacesAssetId) {
        const previous = await S3Asset.findOneAndUpdate({ _id: asset.replacesAssetId, tenantId: job.tenantId, status: "ready", courseId: asset.courseId, batchId: asset.batchId, category: asset.category },
          { $set: { status: "replaced", replacedBy: job.assetId } }, { session, returnDocument: "after" });
        if (!previous) throw new Error("REPLACEMENT_CONFLICT");
        await S3AssetEvent.updateOne({ tenantId: job.tenantId, assetId: String(previous._id), action: "replaced", relatedAssetId: job.assetId },
          { $setOnInsert: { actorId: asset.createdBy } }, { session, upsert: true });
      }
      const finishedAt = new Date();
      await S3VideoJob.updateOne({ _id: job._id, tenantId: job.tenantId, attemptId: job.attemptId, ...fence }, { $set: { ...data, state: "ready", phase: "ready", errorCode: "", finishedAt, lastProgressAt: finishedAt },
        $push: { attemptHistory: { $each: [{ attemptId: job.attemptId, startedAt: job.startedAt || finishedAt, finishedAt, state: "ready", errorCode: "", phaseDurations: job.phaseDurations || {} }], $slice: -3 } } }, { session });
      await S3Asset.updateOne({ _id: asset._id, tenantId: job.tenantId }, { $set: { videoProcessingState: "ready", activeVideoOutputId: String(job._id), videoDurationSeconds: data.duration, videoProcessingErrorCode: "" } }, { session });
    });
  } finally { await session.endSession(); }
}

