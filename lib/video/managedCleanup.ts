import { CancelJobCommand, GetJobCommand } from "@aws-sdk/client-mediaconvert";
import { ListObjectVersionsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import S3VideoJob from "@/models/S3VideoJob";
import S3Asset, { type S3AssetRecord } from "@/models/S3Asset";
import S3VideoSession from "@/models/S3VideoSession";
import { deleteStoredObject, s3Client } from "@/lib/storage/s3";
import { assertVideoOutputPrefix } from "./outputPaths";
import { mediaConvertClient, recoverSubmission } from "./mediaConvert";
import { mapBounded } from "./progress";

// Bounded cleanup pages run on Vercel too. Never rely on a local worker for deletion.
export async function cleanupManagedVideos(tenantId: string, signal?: AbortSignal) {
  const jobs = await S3VideoJob.find({ tenantId, state: { $in: ["ready", "failed", "cancelled"] }, cleanupAfter: { $lte: new Date() },
    outputPrefixes: { $exists: true, $ne: [] } }).sort({ cleanupAfter: 1 }).limit(1);
  for (const job of jobs) {
    const defer = () => S3VideoJob.updateOne({ _id: job._id, tenantId }, { $set: { cleanupAfter: new Date(Date.now() + 300000) } });
    const asset = await S3Asset.findOne({ _id: job.assetId, tenantId });
    if (!asset) { await defer(); continue; }
    if (job.provider === "mediaconvert" && (job.state === "cancelled" || asset.status === "deleted") && !job.externalJobId && job.attemptId && !["not-started", "rejected"].includes(job.submissionState || "")) {
      const remote = await recoverSubmission(job, signal);
      if (!remote?.Id) { await defer(); continue; } // Never assume an interrupted CreateJob did not reach AWS.
      job.externalJobId = remote.Id;
      await S3VideoJob.updateOne({ _id: job._id, tenantId, attemptId: job.attemptId }, { $set: { externalJobId: remote.Id } });
    }
    if (job.provider === "mediaconvert" && job.externalJobId && (job.state === "cancelled" || asset.status === "deleted")) {
      const remote = (await mediaConvertClient().send(new GetJobCommand({ Id: job.externalJobId }), { abortSignal: signal })).Job;
      if (!remote?.Status) { await defer(); continue; }
      if (remote.UserMetadata?.tenantId !== tenantId || remote.UserMetadata?.jobId !== String(job._id) || remote.UserMetadata?.attemptId !== job.attemptId) { await defer(); continue; }
      if (["SUBMITTED", "PROGRESSING"].includes(remote.Status)) {
        await mediaConvertClient().send(new CancelJobCommand({ Id: job.externalJobId }), { abortSignal: signal });
        await defer();
        continue; // Wait for AWS to confirm cancellation before removing output.
      }
    }
    let pending = false;
    for (const prefix of job.outputPrefixes) {
      if (asset.status !== "deleted" && job.state === "ready" && prefix === job.outputPrefix) continue;
      assertVideoOutputPrefix({ tenantId, assetId: job.assetId, sourceKey: job.sourceKey }, prefix);
      const page = await s3Client().send(new ListObjectVersionsCommand({ Bucket: asset.bucket, Prefix: `${prefix}/`, MaxKeys: 100 }), { abortSignal: signal });
      const objects = [...page.Versions || [], ...page.DeleteMarkers || []];
      await mapBounded(objects, 6, async item => {
        if (!item.Key?.startsWith(`${prefix}/`) || !item.VersionId) throw new Error("INVALID_CLEANUP_SCOPE");
        await s3Client().send(new DeleteObjectCommand({ Bucket: asset.bucket, Key: item.Key, VersionId: item.VersionId }), { abortSignal: signal });
      }, signal);
      if (page.IsTruncated) pending = true;
      else await S3VideoJob.updateOne({ _id: job._id, tenantId, state: { $ne: "processing" } }, { $pull: { outputPrefixes: prefix } });
      break; // One verified prefix/page per invocation.
    }
    await S3VideoJob.updateOne({ _id: job._id, tenantId }, { $set: { cleanupAfter: new Date(Date.now() + (pending ? 1000 : 60000)) } });
  }
  const deleted = await S3Asset.aggregate<S3AssetRecord>([
    { $match: { tenantId, status: "deleted", cleanupState: { $ne: "done" } } },
    { $lookup: { from: S3VideoJob.collection.name, let: { asset: { $toString: "$_id" } }, pipeline: [
      { $match: { tenantId, $expr: { $eq: ["$assetId", "$$asset"] }, $or: [{ state: "processing" }, { outputPrefixes: { $exists: true, $ne: [] } }] } }, { $limit: 1 },
    ], as: "pendingJobs" } }, { $match: { pendingJobs: { $size: 0 } } }, { $limit: 1 },
  ]);
  for (const asset of deleted) {
    const active = await S3VideoJob.exists({ tenantId, assetId: String(asset._id), $or: [{ state: "processing" }, { outputPrefixes: { $exists: true, $ne: [] } }] });
    if (active) continue;
    await deleteStoredObject(asset, signal);
    await S3VideoSession.deleteMany({ tenantId, assetId: String(asset._id) });
    await S3Asset.updateOne({ _id: asset._id, tenantId, status: "deleted" }, { $set: { cleanupState: "done" } });
  }
}
