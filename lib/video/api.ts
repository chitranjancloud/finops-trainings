import { createHash, randomBytes } from "node:crypto";
import S3VideoSession from "@/models/S3VideoSession";
import S3VideoJob from "@/models/S3VideoJob";
import S3Asset, { type S3AssetRecord } from "@/models/S3Asset";
import User from "@/models/User";
import { withTenantScope } from "@/lib/platform/runtime";
import { connectDB } from "@/lib/mongodb";
import { authorizeScope, storageUser, strictScope, type StorageUser } from "@/lib/storage/s3Authorization";
import { privateJson, jsonBody, rateLimit } from "@/lib/storage/s3Api";
import { StorageError, objectId } from "@/lib/storage/s3Validation";
import { signAccess } from "@/lib/storage/s3";
import { ensureVideoJob, segmentationEnabled } from "./queue";
import { playbackPlaylist } from "./hls";

export const videoHash = (value: string) => createHash("sha256").update(value).digest("hex");
export async function createVideoPlayback(req: Request, asset: S3AssetRecord, user: StorageUser) {
  if (asset.videoProcessingState !== "ready" || !asset.activeVideoOutputId) throw new StorageError(409,
    asset.videoProcessingState === "failed" ? "Video processing failed. Please contact your administrator." : "Video is still processing. Please try again later.");
  const output = await S3VideoJob.findOne(strictScope({ _id: asset.activeVideoOutputId, assetId: String(asset._id), state: "ready" })).select({ segments: { $slice: 1 } });
  if (!output?.segments.length) throw new StorageError(409, "Video output is unavailable.");
  const token = randomBytes(32).toString("base64url");
  // Renewable session: no login credential is placed in the native-HLS URL.
  const expiresAt = new Date(Date.now() + 30 * 60000);
  await S3VideoSession.create({ ...strictScope(), tokenHash: videoHash(token), assetId: String(asset._id), outputId: String(output._id),
    userId: String(user._id), loginHash: videoHash(req.headers.get("x-session-token") || ""),
    deviceHash: videoHash(req.headers.get("x-device-id") || ""), expiresAt });
  return { mode: "hls", url: `/api/s3/video-playback/${token}/manifest`, playbackToken: token,
    expiresAt: expiresAt.toISOString(), filename: asset.originalFilename };
}

async function playbackAccess(token: string, segmentIndex?: number) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new StorageError(401, "Playback session expired.");
  rateLimit(videoHash(token), "video-media", 240);
  await connectDB();
  const session = await S3VideoSession.findOne(strictScope({ tokenHash: videoHash(token), expiresAt: { $gt: new Date() } }));
  if (!session) throw new StorageError(401, "Playback session expired. Reopen the video.");
  const user = await User.findOne(withTenantScope({ _id: session.userId }));
  if (!user?.isLoggedIn || videoHash(user.sessionToken || "") !== session.loginHash || videoHash(user.activeDevice || "") !== session.deviceHash) throw new StorageError(401, "Login session expired.");
  const asset = await S3Asset.findOne(strictScope({ _id: session.assetId, status: "ready", activeVideoOutputId: session.outputId }));
  if (!asset) throw new StorageError(409, "Video is no longer available.");
  await authorizeScope(user as StorageUser, asset.courseId, asset.batchId);
  const query = S3VideoJob.findOne(strictScope({ _id: session.outputId, assetId: String(asset._id), state: "ready" }));
  if (segmentIndex !== undefined) query.select({ segments: { $slice: [segmentIndex, 1] } });
  const output = await query;
  if (!output?.segments.length) throw new StorageError(409, "Video output is unavailable.");
  return { session, asset, output };
}

export async function videoManifest(_req: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const { output } = await playbackAccess(token);
  const text = playbackPlaylist(output.segments, (index) => `/api/s3/video-playback/${token}/segment/${index}`);
  return new Response(text, { headers: { "Content-Type": "application/vnd.apple.mpegurl", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
export async function videoSegment(_req: Request, context: { params: Promise<{ token: string; index: string }> }) {
  const { token, index } = await context.params;
  if (!/^(0|[1-9]\d{0,4})$/.test(index)) throw new StorageError(400, "Invalid segment.");
  const { asset, output } = await playbackAccess(token, Number(index));
  const segment = output.segments[0];
  if (!segment || !segment.key.startsWith(output.outputPrefix + "/")) throw new StorageError(404, "Segment not found.");
  const grant = await signAccess({ bucket: asset.bucket, key: segment.key, versionId: segment.versionId, safeFilename: "segment.ts", contentType: "video/mp2t" });
  return new Response(null, { status: 307, headers: { Location: grant.url, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
}
export async function renewVideoPlayback(req: Request) {
  const user = await storageUser(req);
  rateLimit(String(user._id), "video-renew", 30);
  const body = await jsonBody(req);
  if (typeof body.token !== "string") throw new StorageError(400, "Playback token required.");
  const { session } = await playbackAccess(body.token);
  if (session.userId !== String(user._id)) throw new StorageError(403, "Playback session does not belong to you.");
  const expiresAt = new Date(Date.now() + 30 * 60000);
  await S3VideoSession.updateOne(strictScope({ _id: session._id }), { $set: { expiresAt } });
  return privateJson({ success: true, expiresAt: expiresAt.toISOString() });
}
export async function videoStatus(req: Request, context: { params: Promise<{ id?: string }> }) {
  const user = await storageUser(req, true);
  rateLimit(String(user._id), "video-status", 60);
  const { id } = await context.params;
  const asset = await S3Asset.findOne(strictScope({ _id: objectId(id, "asset ID") }));
  if (!asset) throw new StorageError(404, "Video not found.");
  await authorizeScope(user, asset.courseId, asset.batchId, true);
  const job = await S3VideoJob.findOne(strictScope({ assetId: String(asset._id), sourceKey: asset.key }));
  return privateJson({ success: true, state: asset.videoProcessingState || "not-requested", phase: job?.phase || "", errorCode: asset.videoProcessingErrorCode || "" });
}
export async function retryVideo(req: Request, context: { params: Promise<{ id?: string }> }) {
  const user = await storageUser(req, true);
  rateLimit(String(user._id), "video-retry", 10);
  if (!segmentationEnabled()) throw new StorageError(503, "Video segmentation is disabled.");
  const { id } = await context.params;
  const asset = await S3Asset.findOne(strictScope({ _id: objectId(id, "asset ID"), status: "ready", contentType: "video/mp4" }));
  if (!asset) throw new StorageError(404, "Video not found.");
  await authorizeScope(user, asset.courseId, asset.batchId, true);
  const changed = await S3Asset.updateOne(strictScope({ _id: asset._id, videoProcessingState: { $in: ["failed", "not-requested", null] } }),
    { $set: { videoProcessingState: "queued", videoProcessingErrorCode: "" } });
  if (!changed.modifiedCount) throw new StorageError(409, "Video is already queued, processing, or ready.");
  asset.videoProcessingState = "queued";
  await S3VideoJob.updateOne(strictScope({ assetId: String(asset._id), sourceKey: asset.key, state: "failed" }),
    { $set: { state: "queued", attempts: 0, nextAttemptAt: new Date(), errorCode: "" } });
  await ensureVideoJob(asset);
  return privateJson({ success: true, message: "Video queued for processing." });
}
