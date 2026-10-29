import { randomUUID } from "node:crypto";
import { MediaConvertClient, CreateJobCommand, GetJobCommand, ListJobsCommand, type Job } from "@aws-sdk/client-mediaconvert";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import S3VideoJob, { type VideoJob } from "@/models/S3VideoJob";
import S3Asset, { type S3AssetRecord } from "@/models/S3Asset";
import { s3Client, storageConfig } from "@/lib/storage/s3";
import { mediaConvertSettings } from "./mediaConvertSettings";
import { videoOutputPrefix } from "./outputPaths";
import { parseVideoPlaylist } from "./hls";
import { mapBounded } from "./progress";
import { publishVideo } from "./publication";

export const managedVideoEnabled = () => process.env.VIDEO_PROCESSING_PROVIDER === "mediaconvert";
let client: MediaConvertClient | undefined;
export function mediaConvertClient() { return client ||= new MediaConvertClient({ region: storageConfig().region, maxAttempts: 1 }); }
const leaseMs = 90_000;
const sourceScope = (job: VideoJob) => ({ _id: job.assetId, tenantId: job.tenantId, key: job.sourceKey, versionId: job.sourceVersionId, etag: job.sourceEtag, status: "ready" as const });
const owned = (job: VideoJob) => ({ _id: job._id, tenantId: job.tenantId, provider: "mediaconvert" as const, state: "processing" as const, attemptId: job.attemptId, syncToken: job.syncToken, leaseUntil: { $gt: new Date() } });

async function assertSource(job: VideoJob, signal?: AbortSignal) {
  const asset = await S3Asset.findOne(sourceScope(job));
  if (!asset) throw new Error("SOURCE_CHANGED");
  // Application source keys are immutable random generations. Reject an out-of-band overwrite.
  const head = await s3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: job.sourceKey, IfMatch: job.sourceEtag }), { abortSignal: signal });
  if (head.ContentLength !== asset.byteSize || (job.sourceVersionId && head.VersionId !== job.sourceVersionId)) throw new Error("SOURCE_CHANGED");
  return asset;
}

async function requireOwnedUpdate(job: VideoJob, values: Record<string, unknown>) {
  if (typeof values.phase === "string" && values.phase !== job.phase) {
    const now = new Date();
    const durations = { ...job.phaseDurations, [job.phase]: (job.phaseDurations?.[job.phase] || 0) + Math.max(0, now.getTime() - (job.phaseStartedAt?.getTime() || now.getTime())) };
    values = { ...values, phaseDurations: durations, phaseStartedAt: now };
    job.phase = values.phase as string; job.phaseDurations = durations; job.phaseStartedAt = now;
  }
  const history = values.state === "failed" ? { $push: { attemptHistory: { $each: [{ attemptId: job.attemptId, startedAt: job.startedAt || new Date(), finishedAt: new Date(), state: "failed", errorCode: String(values.errorCode || ""), phaseDurations: job.phaseDurations || {} }], $slice: -3 } } } : {};
  const result = await S3VideoJob.updateOne(owned(job), { $set: { ...values, lastProgressAt: new Date() }, ...history });
  if (!result.matchedCount) throw new Error("LEASE_LOST");
}

export async function submitManagedVideo(jobId: string, tenantId: string, signal: AbortSignal = AbortSignal.timeout(20000)) {
  if (!managedVideoEnabled()) return;
  const role = process.env.AWS_MEDIACONVERT_ROLE_ARN;
  if (!role) {
    await S3VideoJob.updateOne({ _id: jobId, tenantId, state: "queued" }, { $set: { provider: "mediaconvert", phase: "configuration-needed", errorCode: "MEDIACONVERT_ROLE_MISSING" } });
    return;
  }
  const job = await S3VideoJob.findOneAndUpdate({ _id: jobId, tenantId, state: "queued", attempts: { $lt: 3 }, nextAttemptAt: { $lte: new Date() } },
    { $set: { provider: "mediaconvert", state: "processing", phase: "submitting", attemptId: randomUUID(), syncToken: randomUUID(), externalJobId: "", verificationCursor: 0,
      segments: [], outputBytes: 0, uploadedBytes: 0, uploadedSegments: 0, totalSegments: 0, phaseDurations: {}, errorCode: "", providerPercent: 0, submissionState: "not-started", startedAt: new Date(), phaseStartedAt: new Date(), leaseUntil: new Date(Date.now() + leaseMs) }, $unset: { finishedAt: 1 }, $inc: { attempts: 1 } }, { new: true });
  if (!job) return;
  let createStarted = false;
  try {
    const asset = await assertSource(job, signal);
    const prefix = videoOutputPrefix({ tenantId, assetId: job.assetId, sourceKey: job.sourceKey }, String(job._id), job.attemptId);
    await requireOwnedUpdate(job, { outputPrefix: prefix, errorCode: "" });
    await S3VideoJob.updateOne(owned(job), { $addToSet: { outputPrefixes: prefix } });
    const settings = mediaConvertSettings({ tenantId, assetId: job.assetId, sourceKey: job.sourceKey, bucket: asset.bucket }, String(job._id), job.attemptId, role);
    await requireOwnedUpdate(job, { submissionState: "dispatching" });
    createStarted = true;
    const response = await mediaConvertClient().send(new CreateJobCommand(settings), { abortSignal: signal });
    if (!response.Job?.Id) throw new Error("SUBMISSION_UNKNOWN");
    // Preserve the returned AWS ID even if deletion/lease recovery won while CreateJob was in flight.
    await S3VideoJob.updateOne({ _id: job._id, tenantId, attemptId: job.attemptId }, { $set: { externalJobId: response.Job.Id, submissionState: "accepted" } });
    await requireOwnedUpdate(job, { externalJobId: response.Job.Id, phase: "submitted", leaseUntil: new Date(0) });
    await S3Asset.updateOne({ ...sourceScope(job), videoProcessingState: { $ne: "ready" } }, { $set: { videoProcessingState: "processing", videoProcessingErrorCode: "" } });
  } catch (error) {
    // Never blindly resubmit an ambiguous CreateJob: AWS deduplication lasts only one minute.
    const message = error instanceof Error ? error.message : "";
    const rejected = error instanceof Error && ["AccessDeniedException", "BadRequestException", "ValidationException"].includes(error.name);
    const terminal = message === "SOURCE_CHANGED" || rejected || (!createStarted && job.attempts >= 3);
    const phase = terminal ? "failed" : createStarted ? "submission-unknown" : "configuration-needed";
    const errorCode = message === "SOURCE_CHANGED" ? message : rejected ? "MEDIACONVERT_REJECTED" : createStarted ? "SUBMISSION_UNKNOWN" : "MEDIACONVERT_CONFIGURATION_ERROR";
    if (rejected || !createStarted) await S3VideoJob.updateOne({ _id: job._id, tenantId, attemptId: job.attemptId, externalJobId: { $in: ["", null] } }, { $set: { submissionState: rejected ? "rejected" : "not-started" } });
    await requireOwnedUpdate(job, { state: terminal ? "failed" : createStarted ? "processing" : "queued", phase,
      errorCode, ...(!rejected && createStarted ? { submissionState: "unknown" } : {}),
      nextAttemptAt: new Date(Date.now() + 60000), leaseUntil: new Date(0) }).catch(() => undefined);
    if (terminal) await S3Asset.updateOne(sourceScope(job), { $set: { videoProcessingState: "failed", videoProcessingErrorCode: errorCode } });
    console.warn("Managed video submission needs attention", { jobId, phase });
  }
}

export async function recoverSubmission(job: VideoJob, signal?: AbortSignal): Promise<Job | undefined> {
  let NextToken: string | undefined;
  for (let page = 0; page < 10; page++) {
    const response = await mediaConvertClient().send(new ListJobsCommand({ MaxResults: 20, Order: "DESCENDING", NextToken }), { abortSignal: signal });
    const found = response.Jobs?.find(j => j.UserMetadata?.jobId === String(job._id) && j.UserMetadata?.attemptId === job.attemptId && j.UserMetadata?.tenantId === job.tenantId);
    if (found) return found;
    if (!response.NextToken) break;
    NextToken = response.NextToken;
  }
  return undefined;
}

export async function syncManagedVideo(jobId: string, tenantId: string, signal: AbortSignal = AbortSignal.timeout(45000), deadline = Date.now() + 40000) {
  const job = await S3VideoJob.findOneAndUpdate({ _id: jobId, tenantId, provider: "mediaconvert", state: "processing", leaseUntil: { $lte: new Date() } },
    { $set: { leaseUntil: new Date(Date.now() + leaseMs), syncToken: randomUUID() } }, { new: true });
  if (!job) return;
  try {
    const remote = job.externalJobId ? (await mediaConvertClient().send(new GetJobCommand({ Id: job.externalJobId }), { abortSignal: signal })).Job : await recoverSubmission(job, signal);
    if (!remote) { await requireOwnedUpdate(job, { phase: "submission-unknown", errorCode: "SUBMISSION_UNKNOWN", nextAttemptAt: new Date(Date.now() + 60000) }); return; }
    if (remote.UserMetadata?.jobId !== String(job._id) || remote.UserMetadata?.attemptId !== job.attemptId || remote.UserMetadata?.tenantId !== tenantId) throw new Error("SOURCE_CHANGED");
    if (!job.externalJobId) { job.externalJobId = remote.Id || ""; await requireOwnedUpdate(job, { externalJobId: job.externalJobId, submissionState: "accepted" }); }
    if (["ERROR", "CANCELED"].includes(remote.Status || "")) {
      await requireOwnedUpdate(job, { state: "failed", phase: "failed", errorCode: remote.Status === "CANCELED" ? "MEDIACONVERT_CANCELLED" : `MEDIACONVERT_${remote.ErrorCode || "FAILED"}`, finishedAt: new Date() });
      await S3Asset.updateOne(sourceScope(job), { $set: { videoProcessingState: "failed", videoProcessingErrorCode: "MEDIACONVERT_FAILED" } });
      return;
    }
    if (remote.Status !== "COMPLETE") {
      const phase = remote.Status === "SUBMITTED" ? "submitted" : remote.CurrentPhase === "UPLOADING" ? "uploading-segments" : remote.CurrentPhase === "PROBING" ? "probing" : "encoding";
      await requireOwnedUpdate(job, { phase, providerPercent: remote.JobPercentComplete ?? 0, errorCode: "", nextAttemptAt: new Date(Date.now() + 30000) });
      return;
    }
    const asset = await assertSource(job, signal);
    const prefix = videoOutputPrefix({ tenantId, assetId: job.assetId, sourceKey: job.sourceKey }, String(job._id), job.attemptId);
    if (prefix !== job.outputPrefix) throw new Error("INVALID_OUTPUT_SCOPE");
    const playlistKey = `${prefix}/stream_720p.m3u8`;
    const playlist = await s3Client().send(new GetObjectCommand({ Bucket: asset.bucket, Key: playlistKey }), { abortSignal: signal });
    if (!playlist.Body || !playlist.ContentLength || playlist.ContentLength > 512 * 1024) throw new Error("INVALID_PLAYLIST");
    const segments = parseVideoPlaylist(await playlist.Body.transformToString(), "mediaconvert");
    const start = job.verificationCursor || 0;
    if (start !== job.segments.length) throw new Error("INVALID_PLAYLIST");
    // Verification is checkpointed across short Vercel invocations; never process an entire large file here.
    let all = [...job.segments];
    let outputBytes = job.outputBytes || 0;
    for (let offset = start; offset < Math.min(segments.length, start + 128); offset += 16) {
      if (signal.aborted || Date.now() > deadline - 7000) return;
      const checked = await mapBounded(segments.slice(offset, offset + 16), 8, async segment => {
      const key = `${prefix}/${segment.filename}`;
      const head = await s3Client().send(new HeadObjectCommand({ Bucket: asset.bucket, Key: key }), { abortSignal: signal });
      if (!head.ContentLength || head.ContentLength > 16 * 1024 * 1024) throw new Error("INVALID_SEGMENT");
      const sample = await s3Client().send(new GetObjectCommand({ Bucket: asset.bucket, Key: key, VersionId: head.VersionId, Range: "bytes=0-187" }), { abortSignal: signal });
      const bytes = await sample.Body?.transformToByteArray();
      if (!bytes || bytes.length !== 188 || bytes[0] !== 0x47) throw new Error("INVALID_SEGMENT");
      return { key, duration: segment.duration, versionId: head.VersionId || "", size: head.ContentLength };
    }, signal);
    all = [...all, ...checked.map(({ key, duration, versionId }) => ({ key, duration, versionId }))];
    outputBytes += checked.reduce((sum, s) => sum + s.size, 0);
    if (outputBytes > 20 * 1024 ** 3) throw new Error("OUTPUT_TOO_LARGE");
    await requireOwnedUpdate(job, { phase: "verifying", segments: all, verificationCursor: all.length, uploadedSegments: all.length, totalSegments: segments.length, outputBytes });
    }
    if (all.length !== segments.length) return;
    const duration = segments.reduce((sum, s) => sum + s.duration, 0);
    const expected = remote.OutputGroupDetails?.[0]?.OutputDetails?.[0]?.DurationInMs;
    if (duration > 12 * 3600 || (expected && Math.abs(duration - expected / 1000) > Math.max(2, duration * .005))) throw new Error("DURATION_MISMATCH");
    await requireOwnedUpdate(job, { phase: "publishing" });
    await publishVideo(job, { segments: all, duration, outputBytes, playlistKey, playlistVersionId: playlist.VersionId || "", outputPrefix: prefix });
  } catch (error) {
    const safe = error instanceof Error && ["SOURCE_CHANGED", "INVALID_PLAYLIST", "INVALID_SEGMENT", "INVALID_OUTPUT_SCOPE", "OUTPUT_TOO_LARGE", "DURATION_MISMATCH", "REPLACEMENT_CONFLICT"].includes(error.message) ? error.message : "MEDIACONVERT_SYNC_ERROR";
    if (safe !== "MEDIACONVERT_SYNC_ERROR") {
      await requireOwnedUpdate(job, { state: "failed", phase: "failed", errorCode: safe, finishedAt: new Date() });
      await S3Asset.updateOne(sourceScope(job), { $set: { videoProcessingState: "failed", videoProcessingErrorCode: safe } });
    } else await requireOwnedUpdate(job, { errorCode: safe, nextAttemptAt: new Date(Date.now() + 60000) }).catch(() => undefined);
    console.warn("Managed video reconciliation needs attention", { jobId, code: safe });
  } finally {
    await S3VideoJob.updateOne(owned(job), { $set: { leaseUntil: new Date(0) } });
  }
}

export async function reconcileManagedVideos(tenantId: string, limit = 2, signal?: AbortSignal, deadline = Date.now() + 40000) {
  // Repair a crash after verified asset.save() but before ensureVideoJob().
  const assets = await S3Asset.aggregate<Pick<S3AssetRecord, "_id" | "key" | "versionId" | "etag">>([
    { $match: { tenantId, status: "ready", contentType: "video/mp4", videoProcessingState: "queued" } },
    { $lookup: { from: S3VideoJob.collection.name, let: { asset: { $toString: "$_id" }, source: "$key", version: { $ifNull: ["$versionId", ""] } },
      pipeline: [{ $match: { tenantId, profile: "720p-v1", $expr: { $and: [{ $eq: ["$assetId", "$$asset"] }, { $eq: ["$sourceKey", "$$source"] }, { $eq: ["$sourceVersionId", "$$version"] }] } } }, { $limit: 1 }], as: "existingJobs" } },
    { $match: { existingJobs: { $size: 0 } } }, { $sort: { updatedAt: 1 } }, { $limit: limit }, { $project: { _id: 1, key: 1, versionId: 1, etag: 1 } },
  ]);
  await S3VideoJob.init();
  for (const asset of assets) {
    const filter = { tenantId, assetId: String(asset._id), sourceKey: asset.key, sourceVersionId: asset.versionId || "", profile: "720p-v1" };
    if (!await S3VideoJob.exists(filter)) await S3VideoJob.updateOne(filter, { $setOnInsert: { provider: "mediaconvert", sourceEtag: asset.etag } }, { upsert: true });
  }
  const jobs = await S3VideoJob.find({ tenantId, $or: [{ provider: "mediaconvert", state: { $in: ["queued", "processing"] } }, { provider: { $ne: "mediaconvert" }, state: "queued" }], nextAttemptAt: { $lte: new Date() } }).sort({ updatedAt: 1 }).limit(limit);
  for (const job of jobs) {
    if (signal?.aborted || Date.now() > deadline - 7000) break;
    if (job.state === "queued") await submitManagedVideo(String(job._id), tenantId, signal);
    else await syncManagedVideo(String(job._id), tenantId, signal, deadline);
  }
  return jobs.length;
}
