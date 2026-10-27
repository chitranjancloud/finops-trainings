import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, mkdir, rm, statfs, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import mongoose from "mongoose";
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectVersionsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import S3VideoJob, { type VideoJob } from "@/models/S3VideoJob";
import S3Asset from "@/models/S3Asset";
import S3AssetEvent from "@/models/S3AssetEvent";
import S3VideoSession from "@/models/S3VideoSession";
import { s3Client, storageConfig, deleteStoredObject } from "@/lib/storage/s3";
import { reconcileVideoJobs } from "./queue";
import { encodeVideo, runMediaTool } from "./encoding";
import { mediaTool } from "./tools";
import { videoOutputPrefix, assertVideoOutputPrefix } from "./outputPaths";

const LEASE_MS = 120000;
const MAX_ATTEMPTS = 3;
const safeErrors = new Set(["INVALID_VIDEO", "INVALID_PLAYLIST", "DURATION_MISMATCH", "INVALID_SEGMENT", "OUTPUT_TOO_LARGE", "INSUFFICIENT_DISK", "SOURCE_CHANGED", "PROCESS_TIMEOUT"]);

export async function claimVideoJob(tenantId: string) {
  const now = new Date();
  return S3VideoJob.findOneAndUpdate({ tenantId, attempts: { $lt: MAX_ATTEMPTS }, $or: [
    { state: "queued", nextAttemptAt: { $lte: now } }, { state: "processing", leaseUntil: { $lt: now } },
  ] }, { $set: { state: "processing", phase: "downloading", attemptId: randomUUID(), leaseUntil: new Date(Date.now() + LEASE_MS) }, $inc: { attempts: 1 } }, { returnDocument: "after", sort: { createdAt: 1 } });
}

export async function publishVideo(job: VideoJob, data: { segments: VideoJob["segments"]; duration: number; outputBytes: number; playlistKey: string; playlistVersionId: string; outputPrefix: string }) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const owned = await S3VideoJob.findOne({ _id: job._id, tenantId: job.tenantId, state: "processing", attemptId: job.attemptId, leaseUntil: { $gt: new Date() } }).session(session);
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
      await S3VideoJob.updateOne({ _id: job._id, tenantId: job.tenantId, attemptId: job.attemptId }, { $set: { ...data, state: "ready", phase: "ready", errorCode: "" } }, { session });
      await S3Asset.updateOne({ _id: asset._id, tenantId: job.tenantId }, { $set: { videoProcessingState: "ready", activeVideoOutputId: String(job._id), videoDurationSeconds: data.duration, videoProcessingErrorCode: "" } }, { session });
    });
  } finally { await session.endSession(); }
}

export async function processVideoJob(job: VideoJob, shutdown?: AbortSignal) {
  const abort = new AbortController();
  const stop = () => abort.abort();
  shutdown?.addEventListener("abort", stop, { once: true });
  const ownership = { _id: job._id, tenantId: job.tenantId, attemptId: job.attemptId, state: "processing" as const };
  let heartbeatRunning = false;
  const heartbeat = setInterval(async () => {
    if (heartbeatRunning) return;
    heartbeatRunning = true;
    try {
      const asset = await S3Asset.exists({ _id: job.assetId, tenantId: job.tenantId, status: "ready", key: job.sourceKey });
      const result = asset && await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { leaseUntil: new Date(Date.now() + LEASE_MS) } });
      if (!result || !result.modifiedCount) abort.abort();
    } catch { abort.abort(); }
    finally { heartbeatRunning = false; }
  }, 20000);
  let directory = "";
  const phase = async (name: string) => {
    abort.signal.throwIfAborted();
    const result = await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { phase: name } });
    if (!result.matchedCount) throw new Error("LEASE_LOST");
  };
  try {
    const asset = await S3Asset.findOne({ _id: job.assetId, tenantId: job.tenantId, status: "ready", key: job.sourceKey, versionId: job.sourceVersionId, etag: job.sourceEtag });
    if (!asset) throw new Error("SOURCE_CHANGED");
    await S3Asset.updateOne({ _id: asset._id, tenantId: job.tenantId, status: "ready", key: job.sourceKey, videoProcessingState: { $ne: "ready" } },
      { $set: { videoProcessingState: "processing", videoProcessingErrorCode: "" } });
    const root = path.resolve(process.env.VIDEO_TEMP_ROOT || path.join(tmpdir(), "finops-video"));
    await mkdir(root, { recursive: true });
    const disk = await statfs(root);
    if (Number(disk.bavail) * Number(disk.bsize) < asset.byteSize + 22 * 1024 ** 3) throw new Error("INSUFFICIENT_DISK");
    directory = await mkdtemp(path.join(root, "job-"));
    const output = path.join(directory, "output"); await mkdir(output);
    const input = path.join(directory, "source.mp4");
    const source = await s3Client().send(new GetObjectCommand({ Bucket: asset.bucket, Key: job.sourceKey, VersionId: job.sourceVersionId || undefined, IfMatch: job.sourceEtag || undefined }), { abortSignal: abort.signal });
    if (!source.Body || source.ContentLength !== asset.byteSize) throw new Error("SOURCE_CHANGED");
    await pipeline(source.Body as Readable, createWriteStream(input), { signal: abort.signal });
    if ((await stat(input)).size !== asset.byteSize) throw new Error("SOURCE_CHANGED");
    await phase("encoding");
    // Protect disk throughout conversion, including before FFmpeg exits.
    const diskWatch = setInterval(() => {
      void statfs(root).then((space) => {
        if (Number(space.bavail) * Number(space.bsize) < 1024 ** 3) abort.abort();
      }).catch(() => abort.abort());
    }, 5000);
    let encoded;
    try { encoded = await encodeVideo(input, output, abort.signal); }
    finally { clearInterval(diskWatch); }
    await phase("uploading-segments");
    const prefix = videoOutputPrefix({ tenantId: job.tenantId, assetId: job.assetId, sourceKey: job.sourceKey }, String(job._id), job.attemptId);
    // Record cleanup scope BEFORE uploading any object.
    await S3VideoJob.updateOne(ownership, { $addToSet: { outputPrefixes: prefix } });
    const uploaded: VideoJob["segments"] = [];
    for (const segment of encoded.segments) {
      abort.signal.throwIfAborted();
      const filename = path.join(output, segment.filename);
      const key = `${prefix}/${segment.filename}`;
      const size = (await stat(filename)).size;
      const result = await s3Client().send(new PutObjectCommand({ Bucket: asset.bucket, Key: key, Body: createReadStream(filename), ContentLength: size,
        ContentType: "video/mp2t", ServerSideEncryption: "AES256", ChecksumAlgorithm: "SHA256" }), { abortSignal: abort.signal });
      const head = await s3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: key, VersionId: result.VersionId }), { abortSignal: abort.signal });
      if (head.ContentLength !== size) throw new Error("OUTPUT_VERIFY_FAILED");
      uploaded.push({ key, duration: segment.duration, versionId: result.VersionId || "" });
    }
    const playlistKey = `${prefix}/index.m3u8`;
    const playlist = await s3Client().send(new PutObjectCommand({ Bucket: asset.bucket, Key: playlistKey, Body: encoded.playlist,
      ContentType: "application/vnd.apple.mpegurl", ServerSideEncryption: "AES256", ChecksumAlgorithm: "SHA256" }), { abortSignal: abort.signal });
    await phase("publishing");
    await publishVideo(job, { segments: uploaded, duration: encoded.duration, outputBytes: encoded.outputBytes, playlistKey, playlistVersionId: playlist.VersionId || "", outputPrefix: prefix });
    console.info("Video processing ready", { assetId: job.assetId, segmentCount: uploaded.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errorCode = safeErrors.has(message) ? message : message === "REPLACEMENT_CONFLICT" ? "REPLACEMENT_CONFLICT" : "PROCESSING_FAILED";
    const terminal = ["INVALID_VIDEO", "INVALID_PLAYLIST", "SOURCE_CHANGED", "REPLACEMENT_CONFLICT"].includes(errorCode) || job.attempts >= MAX_ATTEMPTS;
    const result = await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { state: terminal ? "failed" : "queued", phase: terminal ? "failed" : "retry-wait", errorCode,
      nextAttemptAt: new Date(Date.now() + job.attempts * 60000), leaseUntil: new Date(0) } });
    if (result.modifiedCount) await S3Asset.updateOne({ _id: job.assetId, tenantId: job.tenantId, status: "ready", key: job.sourceKey, videoProcessingState: { $ne: "ready" } },
      { $set: { videoProcessingState: terminal ? "failed" : "queued", videoProcessingErrorCode: errorCode } });
    console.warn("Video processing did not finish", { assetId: job.assetId, errorCode });
  } finally {
    clearInterval(heartbeat); shutdown?.removeEventListener("abort", stop);
    if (directory) {
      // Only the concrete directory returned by mkdtemp under the verified root.
      const root = path.resolve(process.env.VIDEO_TEMP_ROOT || path.join(tmpdir(), "finops-video"));
      if (path.dirname(directory) === root && path.basename(directory).startsWith("job-")) await rm(directory, { recursive: true, force: true });
    }
  }
}

async function deleteOutputPrefix(bucket: string, tenantId: string, assetId: string, sourceKey: string, prefix: string) {
  assertVideoOutputPrefix({ tenantId, assetId, sourceKey }, prefix);
  let keyMarker: string | undefined;
  let versionMarker: string | undefined;
  do {
    const page = await s3Client().send(new ListObjectVersionsCommand({ Bucket: bucket, Prefix: prefix + "/", KeyMarker: keyMarker, VersionIdMarker: versionMarker, MaxKeys: 1000 }));
    for (const item of [...page.Versions || [], ...page.DeleteMarkers || []]) {
      if (item.Key?.startsWith(prefix + "/")) await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: item.Key, VersionId: item.VersionId }));
    }
    keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
    versionMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
  } while (keyMarker);
}

export async function maintainVideoJobs(tenantId: string) {
  await reconcileVideoJobs(tenantId);
  // A crash on the final attempt must not leave processing state stuck forever.
  const exhausted = await S3VideoJob.find({ tenantId, state: "processing", attempts: { $gte: MAX_ATTEMPTS }, leaseUntil: { $lt: new Date() } }).limit(100);
  for (const job of exhausted) {
    const changed = await S3VideoJob.updateOne({ _id: job._id, tenantId, state: "processing", leaseUntil: { $lt: new Date() } }, { $set: { state: "failed", phase: "failed", errorCode: "WORKER_INTERRUPTED" } });
    if (changed.modifiedCount) await S3Asset.updateOne({ _id: job.assetId, tenantId, status: "ready", videoProcessingState: { $ne: "ready" } }, { $set: { videoProcessingState: "failed", videoProcessingErrorCode: "WORKER_INTERRUPTED" } });
  }
  const jobs = await S3VideoJob.find({ tenantId, cleanupAfter: { $lte: new Date() }, outputPrefixes: { $exists: true, $ne: [] }, state: { $ne: "processing" } }).sort({ cleanupAfter: 1 }).limit(20);
  for (const job of jobs) {
    const asset = await S3Asset.findOne({ _id: job.assetId, tenantId });
    if (!asset) continue;
    const deleted = asset.status === "deleted";
    for (const prefix of job.outputPrefixes) {
      if (!deleted && job.state === "ready" && prefix === job.outputPrefix) continue;
      await deleteOutputPrefix(asset.bucket, tenantId, job.assetId, asset.key, prefix);
      // Retain deleted scopes so a late stopped worker upload is swept again.
      if (!deleted) await S3VideoJob.updateOne({ _id: job._id, tenantId, state: { $ne: "processing" } }, { $pull: { outputPrefixes: prefix } });
    }
    await S3VideoJob.updateOne({ _id: job._id, tenantId }, { $set: { cleanupAfter: new Date(Date.now() + 300000) } });
  }
  const deleted = await S3Asset.find({ tenantId, status: "deleted", cleanupState: { $ne: "done" }, videoProcessingState: { $in: ["queued", "processing", "ready", "failed"] } }).limit(100);
  for (const asset of deleted) {
    await S3VideoJob.updateMany({ tenantId, assetId: String(asset._id), state: { $ne: "ready" } }, { $set: { state: "cancelled" } });
    if (await S3VideoJob.exists({ tenantId, assetId: String(asset._id), leaseUntil: { $gt: new Date() } })) continue;
    const outputs = await S3VideoJob.find({ tenantId, assetId: String(asset._id) });
    for (const job of outputs) for (const prefix of job.outputPrefixes) await deleteOutputPrefix(asset.bucket, tenantId, String(asset._id), asset.key, prefix);
    await deleteStoredObject(asset);
    await S3VideoSession.deleteMany({ tenantId, assetId: String(asset._id) });
    await S3Asset.updateOne({ _id: asset._id, tenantId, status: "deleted" }, { $set: { cleanupState: "done" } });
  }
}

export async function checkVideoTools() {
  storageConfig();
  await runMediaTool(mediaTool("ffmpeg"), ["-version"]);
  await runMediaTool(mediaTool("ffprobe"), ["-version"]);
}
