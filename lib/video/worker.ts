import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, mkdir, rm, statfs, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";
import { GetObjectCommand, PutObjectCommand, HeadObjectCommand, ListObjectVersionsCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import S3VideoJob, { type VideoJob } from "@/models/S3VideoJob";
import S3Asset from "@/models/S3Asset";
import S3VideoSession from "@/models/S3VideoSession";
import { s3Client, storageConfig, deleteStoredObject } from "@/lib/storage/s3";
import { reconcileVideoJobs } from "./queue";
import { encodeVideo, runMediaTool } from "./encoding";
import { mediaTool } from "./tools";
import { videoOutputPrefix, assertVideoOutputPrefix } from "./outputPaths";
import { mapBounded } from "./progress";

const LEASE_MS = 120000;
const MAX_ATTEMPTS = 3;
const safeErrors = new Set(["INVALID_VIDEO", "INVALID_PLAYLIST", "DURATION_MISMATCH", "INVALID_SEGMENT", "OUTPUT_TOO_LARGE", "INSUFFICIENT_DISK", "SOURCE_CHANGED", "PROCESS_TIMEOUT"]);

export async function claimVideoJob(tenantId: string) {
  const now = new Date();
  return S3VideoJob.findOneAndUpdate({ tenantId, provider: { $ne: "mediaconvert" }, attempts: { $lt: MAX_ATTEMPTS }, $or: [
    { state: "queued", nextAttemptAt: { $lte: now } }, { state: "processing", leaseUntil: { $lt: now } },
  ] }, { $set: { state: "processing", phase: "downloading", attemptId: randomUUID(), leaseUntil: new Date(Date.now() + LEASE_MS),
    startedAt: now, phaseStartedAt: now, lastProgressAt: now, phaseDurations: {}, downloadedBytes: 0, sourceBytes: 0,
    encodedSeconds: 0, sourceDurationSeconds: 0, uploadedSegments: 0, totalSegments: 0, uploadedBytes: 0 }, $unset: { finishedAt: 1 }, $inc: { attempts: 1 } }, { returnDocument: "after", sort: { createdAt: 1 } });
}

export { publishVideo } from "./publication";
import { publishVideo } from "./publication";

export async function processVideoJob(job: VideoJob, shutdown?: AbortSignal) {
  const abort = new AbortController();
  const stop = () => abort.abort();
  shutdown?.addEventListener("abort", stop, { once: true });
  if (shutdown?.aborted) abort.abort();
  const ownership = { _id: job._id, tenantId: job.tenantId, attemptId: job.attemptId, state: "processing" as const };
  const progress = { sourceBytes: 0, downloadedBytes: 0, encodedSeconds: 0, sourceDurationSeconds: 0, uploadedSegments: 0, totalSegments: 0, uploadedBytes: 0 };
  let progressWrite: Promise<void> | undefined;
  const flushProgress = async () => {
    if (progressWrite) await progressWrite;
    abort.signal.throwIfAborted();
    progressWrite = (async () => {
      const changed = await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { ...progress, lastProgressAt: new Date() } });
      if (!changed.matchedCount) throw new Error("LEASE_LOST");
    })();
    try { await progressWrite; } finally { progressWrite = undefined; }
  };
  let reporting = false;
  const progressTimer = setInterval(() => {
    if (reporting || abort.signal.aborted) return;
    reporting = true;
    void flushProgress().catch(() => abort.abort()).finally(() => { reporting = false; });
  }, 3000);
  let currentPhase = "downloading", phaseStarted = Date.now();
  const durations: Record<string, number> = {};
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
    durations[currentPhase] = (durations[currentPhase] || 0) + Date.now() - phaseStarted;
    phaseStarted = Date.now(); currentPhase = name; job.phaseDurations = { ...durations };
    await flushProgress();
    const result = await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { phase: name, phaseStartedAt: new Date(), phaseDurations: durations } });
    if (!result.matchedCount) throw new Error("LEASE_LOST");
  };
  try {
    const asset = await S3Asset.findOne({ _id: job.assetId, tenantId: job.tenantId, status: "ready", key: job.sourceKey, versionId: job.sourceVersionId, etag: job.sourceEtag });
    if (!asset) throw new Error("SOURCE_CHANGED");
    progress.sourceBytes = asset.byteSize;
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
    const counter = new Transform({ transform(chunk: Buffer, _encoding, callback) { progress.downloadedBytes += chunk.length; callback(null, chunk); } });
    await pipeline(source.Body as Readable, counter, createWriteStream(input), { signal: abort.signal });
    if ((await stat(input)).size !== asset.byteSize) throw new Error("SOURCE_CHANGED");
    await phase("encoding");
    // Protect disk throughout conversion, including before FFmpeg exits.
    const diskWatch = setInterval(() => {
      void statfs(root).then((space) => {
        if (Number(space.bavail) * Number(space.bsize) < 1024 ** 3) abort.abort();
      }).catch(() => abort.abort());
    }, 5000);
    let encoded;
    try { encoded = await encodeVideo(input, output, abort.signal, (seconds, duration) => { progress.encodedSeconds = seconds; progress.sourceDurationSeconds = duration; }); }
    finally { clearInterval(diskWatch); }
    await phase("uploading-segments");
    const prefix = videoOutputPrefix({ tenantId: job.tenantId, assetId: job.assetId, sourceKey: job.sourceKey }, String(job._id), job.attemptId);
    // Record cleanup scope BEFORE uploading any object.
    await S3VideoJob.updateOne(ownership, { $addToSet: { outputPrefixes: prefix } });
    progress.totalSegments = encoded.segments.length;
    const concurrency = Math.max(1, Math.min(8, Math.floor(Number(process.env.VIDEO_SEGMENT_UPLOAD_CONCURRENCY) || 4)));
    const uploaded = await mapBounded(encoded.segments, concurrency, async segment => {
      abort.signal.throwIfAborted();
      const filename = path.join(output, segment.filename);
      const key = `${prefix}/${segment.filename}`;
      const size = (await stat(filename)).size;
      const result = await s3Client().send(new PutObjectCommand({ Bucket: asset.bucket, Key: key, Body: createReadStream(filename), ContentLength: size,
        ContentType: "video/mp2t", ServerSideEncryption: "AES256", ChecksumAlgorithm: "SHA256" }), { abortSignal: abort.signal });
      const head = await s3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: key, VersionId: result.VersionId }), { abortSignal: abort.signal });
      if (head.ContentLength !== size) throw new Error("OUTPUT_VERIFY_FAILED");
      progress.uploadedSegments++; progress.uploadedBytes += size;
      return { key, duration: segment.duration, versionId: result.VersionId || "" };
    }, abort.signal);
    await phase("verifying");
    const playlistKey = `${prefix}/index.m3u8`;
    const playlist = await s3Client().send(new PutObjectCommand({ Bucket: asset.bucket, Key: playlistKey, Body: encoded.playlist,
      ContentType: "application/vnd.apple.mpegurl", ServerSideEncryption: "AES256", ChecksumAlgorithm: "SHA256" }), { abortSignal: abort.signal });
    await phase("publishing");
    const playlistHead = await s3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: playlistKey, VersionId: playlist.VersionId }), { abortSignal: abort.signal });
    if (playlistHead.ContentLength !== Buffer.byteLength(encoded.playlist)) throw new Error("OUTPUT_VERIFY_FAILED");
    await phase("publishing");
    await publishVideo(job, { segments: uploaded, duration: encoded.duration, outputBytes: encoded.outputBytes, playlistKey, playlistVersionId: playlist.VersionId || "", outputPrefix: prefix });
    console.info("Video processing ready", { assetId: job.assetId, segmentCount: uploaded.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const errorCode = safeErrors.has(message) ? message : message === "REPLACEMENT_CONFLICT" ? "REPLACEMENT_CONFLICT" : "PROCESSING_FAILED";
    const terminal = ["INVALID_VIDEO", "INVALID_PLAYLIST", "SOURCE_CHANGED", "REPLACEMENT_CONFLICT"].includes(errorCode) || job.attempts >= MAX_ATTEMPTS;
    const finishedAt = new Date();
    durations[currentPhase] = (durations[currentPhase] || 0) + Date.now() - phaseStarted;
    const result = await S3VideoJob.updateOne({ ...ownership, leaseUntil: { $gt: new Date() } }, { $set: { ...progress, state: terminal ? "failed" : "queued", phase: terminal ? "failed" : "retry-wait", errorCode, finishedAt, phaseDurations: durations,
      nextAttemptAt: new Date(Date.now() + job.attempts * 60000), leaseUntil: new Date(0) },
      $push: { attemptHistory: { $each: [{ attemptId: job.attemptId, startedAt: job.startedAt || finishedAt, finishedAt, state: terminal ? "failed" : "retry-wait", errorCode, phaseDurations: durations }], $slice: -3 } } });
    if (result.modifiedCount) await S3Asset.updateOne({ _id: job.assetId, tenantId: job.tenantId, status: "ready", key: job.sourceKey, videoProcessingState: { $ne: "ready" } },
      { $set: { videoProcessingState: terminal ? "failed" : "queued", videoProcessingErrorCode: errorCode } });
    console.warn("Video processing did not finish", { assetId: job.assetId, errorCode });
  } finally {
    clearInterval(progressTimer);
    await progressWrite?.catch(() => undefined);
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
  const exhausted = await S3VideoJob.find({ tenantId, provider: { $ne: "mediaconvert" }, state: "processing", attempts: { $gte: MAX_ATTEMPTS }, leaseUntil: { $lt: new Date() } }).limit(100);
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
