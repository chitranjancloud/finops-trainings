import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";

async function main() {
  loadEnvConfig(process.cwd());
  const assetId = process.argv[process.argv.indexOf("--asset-id") + 1];
  if (!process.argv.includes("--asset-id") || !/^[a-f\d]{24}$/.test(assetId || "")) throw new Error("Provide --asset-id <existing video ObjectId>.");
  const apply = process.argv.includes("--apply");
  const tenantId = process.env.VIDEO_WORKER_TENANT_ID || "";
  if (!/^[a-f\d]{24}$/.test(tenantId)) throw new Error("Configure VIDEO_WORKER_TENANT_ID.");
  const mongoose = (await import("mongoose")).default;
  const Asset = (await import("../models/S3Asset")).default;
  const Job = (await import("../models/S3VideoJob")).default;
  const { videoSourceFolder, videoOutputPrefix, assertVideoOutputPrefix } = await import("../lib/video/outputPaths");
  const { s3Client, urlTtl } = await import("../lib/storage/s3");
  const { CopyObjectCommand, HeadObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { parseVideoPlaylist } = await import("../lib/video/hls");
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || "", { dbName: "finops", autoIndex: false, serverSelectionTimeoutMS: 8000 });
  try {
    const asset = await Asset.findOne({ _id: assetId, tenantId, status: "ready", contentType: "video/mp4", videoProcessingState: "ready" });
    if (!asset?.activeVideoOutputId) throw new Error("Ready segmented video not found in the configured tenant.");
    const job = await Job.findOne({ _id: asset.activeVideoOutputId, tenantId, assetId, state: "ready", sourceKey: asset.key });
    if (!job?.segments.length || job.playlistKey !== job.outputPrefix + "/index.m3u8") throw new Error("Validated output not found.");
    const source = { tenantId, assetId, sourceKey: asset.key };
    assertVideoOutputPrefix(source, job.outputPrefix);
    const folder = videoSourceFolder(source);
    if (job.outputPrefix.startsWith(folder + "/output/")) { console.info("Video output already shares the original lesson-date folder."); return; }
    const destination = videoOutputPrefix(source, String(job._id), randomUUID());
    console.info(JSON.stringify({ assetId, mode: apply ? "apply" : "preview", originalFolder: folder, from: job.outputPrefix, to: destination, segmentCount: job.segments.length }));
    if (!apply) return;
    const Bucket = asset.bucket;
    const client = s3Client();
    const playlist = await client.send(new GetObjectCommand({ Bucket, Key: job.playlistKey, VersionId: job.playlistVersionId || undefined }));
    const text = await playlist.Body?.transformToString();
    if (!text) throw new Error("Source playlist unavailable.");
    const parsed = parseVideoPlaylist(text);
    if (parsed.length !== job.segments.length) throw new Error("Source playlist/index mismatch.");
    for (let i = 0; i < parsed.length; i++) {
      if (job.segments[i].key !== `${job.outputPrefix}/${parsed[i].filename}` || Math.abs(job.segments[i].duration - parsed[i].duration) > 0.001) throw new Error("Source segment index mismatch.");
    }
    // Stop the local worker before applying. Track partial copies for eventual
    // cleanup, and allow already issued old URLs to expire before retiring them.
    const cleanupAfter = new Date(Date.now() + (urlTtl("access") + 120) * 1000);
    const staged = await Job.updateOne({ _id: job._id, tenantId, state: "ready", outputPrefix: job.outputPrefix },
      { $addToSet: { outputPrefixes: destination }, $set: { cleanupAfter } });
    if (!staged.matchedCount) throw new Error("Output changed before migration.");
    const copy = async (key: string, versionId: string, filename: string) => {
      const head = await client.send(new HeadObjectCommand({ Bucket, Key: key, VersionId: versionId || undefined }));
      if (!head.ContentLength || !head.ETag) throw new Error("Source object verification failed.");
      const CopySource = [Bucket, ...key.split("/")].map(encodeURIComponent).join("/") + (versionId ? `?versionId=${encodeURIComponent(versionId)}` : "");
      const result = await client.send(new CopyObjectCommand({ Bucket, Key: `${destination}/${filename}`, CopySource, CopySourceIfMatch: head.ETag, MetadataDirective: "COPY", ServerSideEncryption: "AES256" }));
      const verified = await client.send(new HeadObjectCommand({ Bucket, Key: `${destination}/${filename}`, VersionId: result.VersionId }));
      if (verified.ContentLength !== head.ContentLength || verified.ContentType !== head.ContentType || verified.ETag !== head.ETag) throw new Error("Copied object verification failed.");
      return { key: `${destination}/${filename}`, versionId: result.VersionId || "" };
    };
    const segments: { key: string; versionId: string; duration: number }[] = [];
    for (let i = 0; i < job.segments.length; i++) {
      const segment = job.segments[i];
      segments.push({ ...await copy(segment.key, segment.versionId, parsed[i].filename), duration: segment.duration });
    }
    const movedPlaylist = await copy(job.playlistKey, job.playlistVersionId, "index.m3u8");
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await Asset.updateOne({ _id: assetId, tenantId, status: "ready", key: asset.key, activeVideoOutputId: String(job._id) }, { $set: { updatedAt: new Date() } }, { session });
        if (!current.matchedCount) throw new Error("Asset changed during migration.");
        const changed = await Job.updateOne({ _id: job._id, tenantId, state: "ready", outputPrefix: job.outputPrefix },
          { $set: { outputPrefix: destination, segments, playlistKey: movedPlaylist.key, playlistVersionId: movedPlaylist.versionId, cleanupAfter }, $addToSet: { outputPrefixes: { $each: [job.outputPrefix, destination] } } }, { session });
        if (!changed.matchedCount) throw new Error("Output changed during migration.");
      });
    } finally { await session.endSession(); }
    console.info(JSON.stringify({ moved: true, objectsVerified: segments.length + 1, originalUnchanged: true, retiredOutputCleanupAfter: cleanupAfter.toISOString() }));
  } finally { await mongoose.disconnect(); }
}
main().catch((error) => { console.error("Video output migration failed", { name: error instanceof Error ? error.name : "UnknownError", message: error instanceof Error && !/https?:|credential|token|secret|password/i.test(error.message) ? error.message : "Check configuration and permissions." }); process.exitCode = 1; });
