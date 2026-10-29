import { randomUUID } from "node:crypto";
import { ensureVideoJob, segmentationEnabled } from "@/lib/video/queue";
import S3VideoJob from "@/models/S3VideoJob";
import S3VideoSession from "@/models/S3VideoSession";
import { Types } from "mongoose";
import { withTenantContext, requireTenantId, TENANT_HOST_HEADER } from "@/lib/platform/runtime";
import S3Asset, { type S3AssetRecord } from "@/models/S3Asset";
import S3Upload from "@/models/S3Upload";
import S3AssetEvent from "@/models/S3AssetEvent";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import { withTenantScope } from "@/lib/platform/runtime";
import { authorizeScope, storageUser, strictScope } from "./s3Authorization";
import { StorageError, uploadInput, PART_SIZE, partNumbers, verifyParts, validFileHeader, categoryInput, contentDate, objectId, safeFilename } from "./s3Validation";
import { storageConfig, startMultipart, signPart, listParts, inspectObject, inspectHeader, completeMultipart, abortMultipart, signAccess, deleteStoredObject } from "./s3";

type Context = { params: Promise<{ id?: string }> };
type Handler = (req: Request, context: Context) => Promise<Response>;
export function privateJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
export function storageRoute<P extends object = { id?: string }>(flag: "upload" | "playback", handler: (req: Request, context: { params: Promise<P> }) => Promise<Response>) {
  return async (req: Request, context: { params: Promise<P> }) => {
    let stage = "feature-check";
    try {
      if (process.env[flag === "upload" ? "S3_UPLOAD_ENABLED" : "S3_PLAYBACK_ENABLED"] !== "true") {
        throw new StorageError(503, "S3 pilot is disabled.");
      }
      // Do not let a public caller choose the tenant through an internal header.
      stage = "request-copy";
      const headers = new Headers(req.headers);
      headers.delete(TENANT_HOST_HEADER);
      const hasBody = !["GET", "HEAD"].includes(req.method) && req.body !== null;
      const clean = new Request(req.url, { method: req.method, headers, signal: req.signal,
        ...(hasBody ? { body: req.body, duplex: "half" } : {}),
      } as RequestInit);
      stage = "tenant-handler";
      return await withTenantContext(handler)(clean, context);
    } catch (error) {
      if (error instanceof StorageError) return privateJson({ success: false, message: error.message }, error.status);
      // SDK errors may contain signed URLs/keys. Never log whole errors here.
      console.error("S3 pilot operation failed", { stage, name: error instanceof Error ? error.name : "UnknownError" });
      return privateJson({ success: false, message: "Storage operation failed. Retry or contact your administrator.", code: stage === "request-copy" ? "STORAGE_REQUEST_ERROR" : "STORAGE_OPERATION_ERROR" }, 502);
    }
  };
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.includes("application/json")) throw new StorageError(415, "Send application/json.");
  const reader = req.body?.getReader();
  if (!reader) throw new StorageError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 128 * 1024) { await reader.cancel(); throw new StorageError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new StorageError(400, "Invalid JSON request."); }
}

// Burst protection per instance; production multi-replica deployments need a
// shared limiter. Upload concurrency and signing totals are also persisted.
const bursts = new Map<string, { until: number; count: number }>();
export function rateLimit(userId: string, action: string, max: number) {
  const now = Date.now();
  const key = `${requireTenantId()}:${userId}:${action}`;
  for (const [id, entry] of bursts) if (entry.until < now) bursts.delete(id);
  if (bursts.size > 10000) throw new StorageError(429, "Please retry shortly.");
  const entry = bursts.get(key) || { until: now + 60000, count: 0 };
  if (++entry.count > max) throw new StorageError(429, "Too many requests. Please wait a minute.");
  bursts.set(key, entry);
}
const duplicate = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === 11000;
const publicAsset = (a: S3AssetRecord) => ({
  assetId: String(a._id), filename: a.originalFilename, contentType: a.contentType,
  byteSize: a.byteSize, courseId: a.courseId, batchId: a.batchId, status: a.status, createdAt: a.createdAt,
  category: a.category || (a.contentType === "application/pdf" ? "pdf" : a.contentType === "video/mp4" ? "video" : "study-material"), contentDate: a.contentDate || a.createdAt?.toISOString().slice(0, 10) || "",
  uploadedAt: a.uploadedAt, deletedAt: a.deletedAt, replacesAssetId: a.replacesAssetId, replacedBy: a.replacedBy, cleanupState: a.cleanupState,
  videoProcessingState: a.videoProcessingState || "not-requested", videoDurationSeconds: a.videoDurationSeconds || 0,
  videoProcessingErrorCode: a.videoProcessingErrorCode || "",
});

async function audit(assetId: string, actorId: string, action: string, relatedAssetId = "") {
  await S3AssetEvent.init();
  await S3AssetEvent.updateOne(strictScope({ assetId, action, relatedAssetId }), { $setOnInsert: { actorId } }, { upsert: true });
}
function listFilters(params: URLSearchParams): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (params.has("category")) {
    const category = categoryInput(params.get("category"));
    filter.category = category;
  }
  if (params.get("contentDate")) filter.contentDate = contentDate(params.get("contentDate"));
  return filter;
}
async function completeReplacement(asset: S3AssetRecord, actorId: string) {
  if (!asset.replacesAssetId) return;
  const previous = await S3Asset.findOne(strictScope({ _id: asset.replacesAssetId }));
  if (!previous || previous.courseId !== asset.courseId || previous.batchId !== asset.batchId || (previous.category || "video") !== (asset.category || "video")) throw new StorageError(409, "Replacement target is unavailable or changed. The new file was not published.");
  if (previous.status === "replaced" && previous.replacedBy === String(asset._id)) { await audit(String(previous._id), actorId, "replaced", String(asset._id)); return; }
  await audit(String(previous._id), actorId, "replacement-requested", String(asset._id));
  const changed = await S3Asset.updateOne(strictScope({ _id: previous._id, status: "ready" }), { $set: { status: "replaced", replacedBy: String(asset._id) } });
  if (!changed.modifiedCount) throw new StorageError(409, "Another replacement or delete won. The new file was not published.");
  await audit(String(previous._id), actorId, "replaced", String(asset._id));
}

export const initUpload: Handler = async (req) => {
  const user = await storageUser(req, true);
  rateLimit(String(user._id), "init", 10);
  const input = uploadInput(await jsonBody(req));
  await authorizeScope(user, input.courseId, input.batchId, true);
  const owner = strictScope({ ownerId: String(user._id), idempotencyKey: input.idempotencyKey });
  const existing = await S3Upload.findOne(owner);
  if (existing) {
    const asset = await S3Asset.findOne(strictScope({ _id: existing.assetId }));
    if (!asset || asset.originalFilename !== input.filename || asset.byteSize !== input.byteSize || asset.courseId !== input.courseId || asset.batchId !== input.batchId || (asset.category || "video") !== input.category || (asset.contentDate && asset.contentDate !== input.contentDate) || (asset.replacesAssetId || "") !== input.replacesAssetId) throw new StorageError(409, "Request key was already used for a different upload.");
    if (["initializing", "aborting"].includes(existing.status)) throw new StorageError(503, "Upload setup or cancellation is still in progress. Retry shortly.");
    if (!["uploading", "completing", "completed"].includes(existing.status) || (existing.status !== "completed" && existing.expiresAt.getTime() <= Date.now())) {
      return privateJson({ success: false, code: "UPLOAD_RESTART_REQUIRED", uploadSessionId: String(existing._id),
        message: existing.status === "cancelled" ? "This upload was cancelled. Start a new upload with the same file." : "This upload expired or failed and cannot be resumed. Start a new upload." }, 409);
    }
    return privateJson({ success: true, assetId: existing.assetId, uploadSessionId: String(existing._id), partSize: existing.partSize, partCount: existing.partCount, expiresAt: existing.expiresAt, status: existing.status });
  }
  if (input.replacesAssetId) {
    const target = await S3Asset.findOne(strictScope({ _id: input.replacesAssetId }));
    if (!target || target.status !== "ready" || target.courseId !== input.courseId || target.batchId !== input.batchId || (target.category || "video") !== input.category) throw new StorageError(409, "Replace a ready file from this same batch and category.");
  }
  const { bucket } = storageConfig();
  // Required before relying on unique idempotency/active-slot constraints.
  await S3Upload.init();
  const assetId = new Types.ObjectId();
  const key = `tenant/${requireTenantId()}/courses/${input.courseId}/batches/${input.batchId}/${input.category}/${input.contentDate}/${assetId}/${randomUUID()}/${safeFilename(input.filename)}`;
  let upload;
  // Unique active-slot index enforces three concurrent uploads even across replicas.
  for (let slot = 0; slot < 3; slot++) {
    try {
      upload = await S3Upload.create({ ...owner, assetId: String(assetId), slot,
        expectedSize: input.byteSize, partSize: PART_SIZE, partCount: input.partCount,
        expiresAt: new Date(Date.now() + 24 * 3600000) });
      break;
    } catch (error) { if (!duplicate(error)) throw error; }
  }
  if (!upload) throw new StorageError(409, "Upload already started or three upload slots are occupied. Resume/cancel an existing upload.");
  let multipartId = "";
  try {
    await S3Asset.create({ _id: assetId, ...strictScope(), createdBy: String(user._id),
      originalFilename: input.filename, safeFilename: safeFilename(input.filename), contentType: input.contentType,
      byteSize: input.byteSize, bucket, key, courseId: input.courseId, batchId: input.batchId, category: input.category, contentDate: input.contentDate, replacesAssetId: input.replacesAssetId });
    await audit(String(assetId), String(user._id), "upload-created", input.replacesAssetId);
    multipartId = await startMultipart({ bucket, key }, String(assetId), requireTenantId(), input.contentType);
    upload.uploadId = multipartId; upload.status = "uploading";
    await upload.save();
  } catch (error) {
    if (multipartId) await abortMultipart({ bucket, key, uploadId: multipartId }).catch(() => undefined);
    await S3Upload.updateOne(strictScope({ _id: upload._id }), { $set: { status: "failed" } });
    await S3Asset.updateOne(strictScope({ _id: assetId }), { $set: { status: "failed" } });
    throw error;
  }
  return privateJson({ success: true, assetId: String(assetId), uploadSessionId: String(upload._id), partSize: PART_SIZE, partCount: input.partCount, expiresAt: upload.expiresAt, status: "uploading" }, 201);
};

async function ownedUpload(req: Request, context: Context) {
  const user = await storageUser(req, true);
  const { id } = await context.params;
  const upload = await S3Upload.findOne(strictScope({ _id: objectId(id, "upload ID"), ownerId: String(user._id) }));
  if (!upload) throw new StorageError(404, "Upload not found.");
  const asset = await S3Asset.findOne(strictScope({ _id: upload.assetId }));
  if (!asset) throw new StorageError(404, "Asset not found.");
  return { user, upload, asset };
}
export const uploadParts: Handler = async (req, context) => {
  const { user, upload, asset } = await ownedUpload(req, context);
  rateLimit(String(user._id), "parts", 60);
  if (upload.status !== "uploading" || upload.expiresAt.getTime() <= Date.now()) throw new StorageError(409, "Upload is not active. Resume or cancel it.");
  const numbers = partNumbers((await jsonBody(req)).partNumbers, upload.partCount);
  const allowed = await S3Upload.updateOne(strictScope({ _id: upload._id, status: "uploading", signCalls: { $lt: 5000 } }), { $inc: { signCalls: 1 } });
  if (!allowed.modifiedCount) throw new StorageError(429, "Upload signing limit reached.");
  const remaining = Math.floor((upload.expiresAt.getTime() - Date.now()) / 1000);
  const parts = await Promise.all(numbers.map((n) => signPart({ ...asset.toObject(), uploadId: upload.uploadId }, n, remaining,
    Math.min(upload.partSize, upload.expectedSize - (n - 1) * upload.partSize))));
  return privateJson({ success: true, parts });
};

export const finishUpload: Handler = async (req, context) => {
  const { user, upload, asset } = await ownedUpload(req, context);
  rateLimit(String(user._id), "complete", 15);
  if (upload.status === "completed" && asset.status === "ready") {
    await authorizeScope(user, asset.courseId, asset.batchId, true);
    await ensureVideoJob(asset);
    return privateJson({ success: true, asset: publicAsset(asset) });
  }
  if (upload.expiresAt.getTime() <= Date.now()) throw new StorageError(409, "Upload expired. Cancel it and start again.");
  const body = await jsonBody(req);
  const lock = await S3Upload.findOneAndUpdate(strictScope({ _id: upload._id, $or: [
    { status: "uploading" }, { status: "completing", leaseUntil: { $lt: new Date() } },
  ] }), { $set: { status: "completing", leaseUntil: new Date(Date.now() + 120000) } }, { new: true });
  if (!lock) throw new StorageError(409, "Upload completion is busy or unavailable. Retry shortly.");
  try {
    await authorizeScope(user, asset.courseId, asset.batchId, true);
    await S3Asset.updateOne(strictScope({ _id: asset._id }), { $set: { status: "validating" } });
    // HEAD recovery handles an S3 success followed by a failed DB write.
    let head = await inspectObject(asset);
    if (!head) {
      const actual = await listParts({ ...asset.toObject(), uploadId: upload.uploadId });
      const verified = verifyParts(actual, body.parts, upload.expectedSize, upload.partSize);
      await completeMultipart({ ...asset.toObject(), uploadId: upload.uploadId }, verified);
      head = await inspectObject(asset);
    }
    if (!head || head.ContentLength !== upload.expectedSize || head.ContentType !== asset.contentType ||
        head.Metadata?.assetid !== String(asset._id) || head.Metadata?.tenantid !== requireTenantId() ||
        !validFileHeader(await inspectHeader(asset, head.VersionId), asset.contentType)) {
      await S3Asset.updateOne(strictScope({ _id: asset._id }), { $set: { status: "failed", versionId: head?.VersionId || "", etag: head?.ETag || "" } });
      await S3Upload.updateOne(strictScope({ _id: upload._id }), { $set: { status: "failed" } });
      throw new StorageError(422, "Uploaded file failed type/size/ownership validation. It has not been published.");
    }
    await S3Asset.updateOne(strictScope({ _id: asset._id }), { $set: { versionId: head.VersionId || "", etag: head.ETag || "" } });
    const segmented = asset.contentType === "video/mp4" && (segmentationEnabled() || asset.videoProcessingState === "queued");
    try { if (!segmented) await completeReplacement(asset, String(user._id)); }
    catch (error) {
      if (error instanceof StorageError && error.status === 409) {
        await S3Asset.updateOne(strictScope({ _id: asset._id }), { $set: { status: "failed" } });
        await S3Upload.updateOne(strictScope({ _id: upload._id }), { $set: { status: "failed" } });
      }
      throw error;
    }
    asset.status = "ready"; asset.uploadedAt = asset.uploadedAt || new Date(); asset.etag = head.ETag || ""; asset.versionId = head.VersionId || "";
    if (segmented) asset.videoProcessingState = "queued";
    await asset.save();
    await ensureVideoJob(asset);
    await audit(String(asset._id), String(user._id), "upload-ready", asset.replacesAssetId || "");
    await S3Upload.updateOne(strictScope({ _id: upload._id }), { $set: { status: "completed" } });
    return privateJson({ success: true, asset: publicAsset(asset) });
  } catch (error) {
    await S3Upload.updateOne(strictScope({ _id: upload._id, status: "completing" }), { $set: { status: "uploading", leaseUntil: new Date(0) } });
    throw error;
  }
};

export const cancelUpload: Handler = async (req, context) => {
  const { user, upload, asset } = await ownedUpload(req, context);
  rateLimit(String(user._id), "abort", 15);
  if (upload.status === "cancelled") return privateJson({ success: true, status: "cancelled" });
  const lock = await S3Upload.findOneAndUpdate(strictScope({ _id: upload._id, $or: [
    { status: { $in: ["initializing", "uploading", "failed"] } }, { status: "aborting", leaseUntil: { $lt: new Date() } },
  ] }), { $set: { status: "aborting", leaseUntil: new Date(Date.now() + 120000) } }, { new: true });
  if (!lock) throw new StorageError(409, "Completed or busy uploads cannot be cancelled.");
  try {
    if (await inspectObject(asset)) throw new StorageError(409, "Object is already completed. Retry completion to recover its status.");
    if (upload.uploadId) await abortMultipart({ ...asset.toObject(), uploadId: upload.uploadId });
    await S3Asset.updateOne(strictScope({ _id: asset._id }), { $set: { status: "cancelled" } });
    await S3Upload.updateOne(strictScope({ _id: upload._id }), { $set: { status: "cancelled" } });
  } catch (error) {
    await S3Upload.updateOne(strictScope({ _id: upload._id, status: "aborting" }), { $set: { status: "uploading", leaseUntil: new Date(0) } });
    throw error;
  }
  return privateJson({ success: true, status: "cancelled" });
};

export const assetList: Handler = async (req) => {
  const user = await storageUser(req, true);
  rateLimit(String(user._id), "list", 60);
  const params = new URL(req.url).searchParams;
  const filter: Record<string, unknown> = strictScope({ ...listFilters(params), status: { $nin: ["deleted", "replaced", "cancelled"] } });
  if (params.get("includeArchived") === "true") delete filter.status;
  for (const field of ["assetId", "courseId", "batchId"]) {
    if (params.has(field)) filter[field === "assetId" ? "_id" : field] = objectId(params.get(field), field);
  }
  if (params.has("status")) {
    const status = params.get("status") || "";
    if (!["uploading", "validating", "ready", "failed", "cancelled", "replaced", "deleted"].includes(status)) throw new StorageError(400, "Invalid asset status.");
    filter.status = status;
  }
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.get("page") || "1", 10) || 1));
  const search = params.get("search")?.trim().slice(0, 200);
  if (search) filter.originalFilename = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  const limit = 20;
  const rows = await S3Asset.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit + 1);
  const visible = rows.slice(0, limit);
  const total = await S3Asset.countDocuments(filter);
  const uploads = await S3Upload.find(strictScope({ ownerId: String(user._id), assetId: { $in: visible.map((a) => String(a._id)) } }));
  return privateJson({ success: true, assets: visible.map((a) => {
    const upload = uploads.find((u) => u.assetId === String(a._id));
    return { ...publicAsset(a), ...(upload ? { uploadSessionId: String(upload._id), uploadStatus: upload.status, uploadExpiresAt: upload.expiresAt } : {}) };
  }), page, total, hasMore: rows.length > limit });
};

export const accessUrl: Handler = async (req) => {
  const user = await storageUser(req);
  rateLimit(String(user._id), "access", 20);
  const body = await jsonBody(req);
  const asset = await S3Asset.findOne(strictScope({ _id: objectId(body.assetId, "asset ID") }));
  if (!asset) throw new StorageError(404, "File not found.");
  // The stored mapping, never a body courseId/context, determines access.
  await authorizeScope(user, asset.courseId, asset.batchId);
  if (asset.status !== "ready") throw new StorageError(409, "File is not available.");
  if (asset.contentType === "video/mp4" && asset.videoProcessingState && asset.videoProcessingState !== "not-requested") {
    const { createVideoPlayback } = await import("@/lib/video/api");
    const playback = await createVideoPlayback(req, asset, user);
    await S3Asset.updateOne(strictScope({ _id: asset._id }), { $inc: { accessCount: 1 } });
    return privateJson({ success: true, ...playback });
  }
  const grant = await signAccess(asset);
  await S3Asset.updateOne(strictScope({ _id: asset._id }), { $inc: { accessCount: 1 } });
  // No user-supplied URLs, account tokens, or signed URLs in logs.
  console.info("S3 access granted", { assetId: String(asset._id), tenantId: requireTenantId(), userId: String(user._id) });
  return privateJson({ success: true, ...grant, filename: asset.originalFilename, contentType: asset.contentType });
};

// Only the requested authorized batch is queried; no bucket listing or signed URLs.
export const studentAssets: Handler = async (req) => {
  const user = await storageUser(req);
  rateLimit(String(user._id), "student-list", 60);
  const params = new URL(req.url).searchParams;
  const batchId = objectId(params.get("batchId"), "batch ID");
  const batch = await Batch.findOne(withTenantScope({ _id: batchId, isActive: { $ne: false } }));
  if (!batch) throw new StorageError(404, "Batch not found.");
  const reference = String(batch.courseId);
  const course = await Course.findOne(withTenantScope(Types.ObjectId.isValid(reference) ? { $or: [{ _id: reference }, { slug: reference }] } : { slug: reference }));
  if (!course) throw new StorageError(404, "Course not found.");
  const courseId = String(course._id);
  await authorizeScope(user, courseId, batchId);
  const page = Math.max(1, Math.min(1000, Number.parseInt(params.get("page") || "1", 10) || 1));
  const filter = strictScope({ batchId, courseId, status: "ready", ...listFilters(params) });
  const total = await S3Asset.countDocuments(filter);
  const rows = await S3Asset.find(filter).sort({ createdAt: -1 }).skip((page - 1) * 20).limit(21);
  return privateJson({ success: true, assets: rows.slice(0, 20).map(publicAsset), page, total, hasMore: rows.length > 20 });
};

export const deleteAsset: Handler = async (req, context) => {
  const user = await storageUser(req, true);
  rateLimit(String(user._id), "delete", 20);
  const { id } = await context.params;
  let asset = await S3Asset.findOne(strictScope({ _id: objectId(id, "asset ID") }));
  if (!asset) throw new StorageError(404, "File not found.");
  await authorizeScope(user, asset.courseId, asset.batchId, true);
  if (["uploading", "validating"].includes(asset.status)) throw new StorageError(409, "Cancel or finish this upload first.");
  await audit(String(asset._id), String(user._id), "delete-requested");
  if (asset.status !== "deleted") {
    asset = await S3Asset.findOneAndUpdate(strictScope({ _id: asset._id, status: { $in: ["ready", "replaced", "failed", "cancelled"] } }), { $set: { status: "deleted", deletedAt: new Date(), deletedBy: String(user._id), cleanupState: "pending" } }, { new: true });
    if (!asset) throw new StorageError(409, "File changed. Refresh the list and try again.");
  }
  if (asset.cleanupState !== "done") {
    await S3VideoJob.updateMany(strictScope({ assetId: String(asset._id), state: { $in: ["queued", "processing", "failed"] } }), { $set: { state: "cancelled" } });
    await S3VideoSession.deleteMany(strictScope({ assetId: String(asset._id) }));
    try { await deleteStoredObject(asset); }
    catch (error) {
      console.error("S3 file cleanup pending", { name: error instanceof Error ? error.name : "UnknownError" });
      return privateJson({ success: true, cleanupPending: true, message: "Student access removed. S3 cleanup failed; check DeleteObject/DeleteObjectVersion permissions and retry deletion from history." });
    }
    if (asset.videoProcessingState && asset.videoProcessingState !== "not-requested") {
      return privateJson({ success: true, cleanupPending: true, message: "Student access removed. The video worker will clean up derived segments; keep the worker running." });
    }
    await S3Asset.updateOne(strictScope({ _id: asset._id, status: "deleted" }), { $set: { cleanupState: "done" } });
  }
  await audit(String(asset._id), String(user._id), "delete-completed");
  return privateJson({ success: true, cleanupPending: false, message: "File deleted from S3. Its database audit record is retained." });
};
export const assetHistory: Handler = async (req, context) => {
  const user = await storageUser(req, true);
  const { id } = await context.params;
  const asset = await S3Asset.findOne(strictScope({ _id: objectId(id, "asset ID") }));
  if (!asset) throw new StorageError(404, "File not found.");
  await authorizeScope(user, asset.courseId, asset.batchId, true);
  const events = await S3AssetEvent.find(strictScope({ assetId: String(asset._id) })).sort({ createdAt: -1 }).limit(100).select("action actorId relatedAssetId createdAt -_id");
  return privateJson({ success: true, asset: publicAsset(asset), events });
};
