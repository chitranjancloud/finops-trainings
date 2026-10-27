// Offline boundaries: no environment loading or live DB/storage operations.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (request.startsWith("@/")) request = path.join(root, request.slice(2));
  return resolve.call(this, request, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  module._compile(outputText, filename);
};
const { parseVideoPlaylist, playbackPlaylist } = require("../lib/video/hls.ts");
const queue = require("../lib/video/queue.ts");
const api = require("../lib/video/api.ts");
const storageApi = require("../lib/storage/s3Api.ts");
const worker = require("../lib/video/worker.ts");
const outputPaths = require("../lib/video/outputPaths.ts");
const runtime = require("../lib/platform/runtime/index.ts");
const db = require("../lib/mongodb.ts");
const auth = require("../lib/storage/s3Authorization.ts");
const sdk = require("../lib/storage/s3.ts");
const { StorageError } = require("../lib/storage/s3Validation.ts");
const Asset = require("../models/S3Asset.ts").default;
const Job = require("../models/S3VideoJob.ts").default;
const Session = require("../models/S3VideoSession.ts").default;
const Upload = require("../models/S3Upload.ts").default;
const User = require("../models/User.ts").default;
const Event = require("../models/S3AssetEvent.ts").default;
const mongoose = require("mongoose");
const tenant = "111111111111111111111111", assetId = "222222222222222222222222", userId = "333333333333333333333333";
const outputId = "444444444444444444444444", token = "a".repeat(43);
const context = { tenantId: tenant, slug: "finops", name: "Synthetic", status: "active", host: "localhost", resolvedAt: Date.now(), resolutionSource: "domain" };
const run = (fn) => runtime.runWithTenantContextAsync(context, fn);
let checks = 0;
async function check(name, fn) { await fn(); checks++; console.info("PASS", name); }
const user = { _id: userId, tenantId: tenant, sessionToken: "test-login", activeDevice: "test-device", isLoggedIn: true, role: "student" };
const request = (body) => new Request("http://localhost/api/test", { method: "POST", headers: { "Content-Type": "application/json", "x-session-token": "test-login", "x-device-id": "test-device" }, body: JSON.stringify(body) });
const asset = { _id: assetId, tenantId: tenant, contentType: "video/mp4", status: "ready", videoProcessingState: "ready", activeVideoOutputId: outputId,
  originalFilename: "lesson.mp4", courseId: "555555555555555555555555", batchId: "666666666666666666666666", bucket: "synthetic", key: "source", versionId: "source-v1", etag: "etag" };
const prefix = `tenant/${tenant}/video-output/${assetId}/${outputId}/12345678-1234-1234-1234-123456789abc`;
const output = { _id: outputId, tenantId: tenant, assetId, outputPrefix: prefix, state: "ready", segments: [{ key: prefix + "/segment-000000.ts", duration: 6, versionId: "seg-v1" }] };
const playback = { _id: outputId, tenantId: tenant, assetId, outputId, userId, loginHash: api.videoHash("test-login"), deviceHash: api.videoHash("test-device"), expiresAt: new Date(Date.now() + 60000) };
const query = (value) => ({ select() { return Promise.resolve(value); }, then(a, b) { return Promise.resolve(value).then(a, b); } });

async function main() {
  await check("output stays beside the original under its lesson date with strict cleanup scope", () => {
    const source = { tenantId: tenant, assetId, sourceKey: `tenant/${tenant}/courses/${userId}/batches/${outputId}/video/2026-10-27/${assetId}/12345678-1234-1234-1234-123456789abc/recording.mp4` };
    const current = outputPaths.videoOutputPrefix(source, outputId, "87654321-1234-1234-1234-123456789abc");
    assert.ok(current.includes("/video/2026-10-27/"));
    assert.equal(current, source.sourceKey.slice(0, source.sourceKey.lastIndexOf("/")) + `/output/${outputId}/87654321-1234-1234-1234-123456789abc`);
    outputPaths.assertVideoOutputPrefix(source, current);
    outputPaths.assertVideoOutputPrefix(source, prefix);
    for (const bad of [current + "/../source", current.replace("2026-10-27", "2026-10-26"), current.replace(assetId, userId), source.sourceKey]) assert.throws(() => outputPaths.assertVideoOutputPrefix(source, bad));
    assert.throws(() => outputPaths.videoSourceFolder({ ...source, sourceKey: source.sourceKey.replace("recording.mp4", "../original.mp4") }));
  });
  await check("VOD parser enforces complete playlist, relative generated paths and duration bounds", () => {
    const valid = "#EXTM3U\n#EXTINF:6.000,\nsegment-000000.ts\n#EXTINF:1.5,\nsegment-000001.ts\n#EXT-X-ENDLIST\n";
    assert.equal(parseVideoPlaylist(valid).length, 2);
    for (const bad of [valid.replace("segment-000000.ts", "../secret.ts"), valid.replace("segment-000000.ts", "https://evil.invalid/media"), valid.replace("#EXT-X-ENDLIST", ""), valid.replace("6.000", "NaN"), valid.replace("6.000", "99999"), valid.replace("segment-000001.ts", "segment-000000.ts"), valid.replace("#EXTINF:1.5,", "#EXT-X-KEY:METHOD=AES-128,URI=evil\n#EXTINF:1.5,")]) assert.throws(() => parseVideoPlaylist(bad));
    const manifest = playbackPlaylist([{ duration: 6 }, { duration: 1.5 }], (i) => `/segments/${i}`);
    assert.ok(manifest.includes("#EXT-X-TARGETDURATION:6")); assert.ok(manifest.includes("/segments/1"));
  });
  await check("job schema enforces source-scoped idempotency and session TTL", () => {
    assert.ok(Job.schema.indexes().some(([keys, options]) => keys.sourceKey && keys.sourceVersionId && keys.profile && keys.tenantId && options.unique));
    assert.ok(Session.schema.indexes().some(([keys, options]) => keys.expiresAt && options.expireAfterSeconds === 0));
  });
  Job.init = async () => undefined;
  await check("enqueue does not touch documents or original-only videos", async () => {
    Job.updateOne = async () => { throw new Error("should not enqueue"); };
    await queue.ensureVideoJob({ ...asset, contentType: "application/pdf", videoProcessingState: "queued" });
    await queue.ensureVideoJob({ ...asset, videoProcessingState: "not-requested" });
  });
  await check("enqueue upserts a unique tenant/source/profile job on every recovery", async () => {
    let previous;
    Job.updateOne = async (filter, update, options) => { assert.equal(filter.tenantId, tenant); assert.equal(filter.sourceVersionId, "source-v1"); assert.equal(options.upsert, true); if (previous) assert.deepEqual(filter, previous); previous = filter; };
    await queue.ensureVideoJob({ ...asset, videoProcessingState: "queued" });
    await queue.ensureVideoJob({ ...asset, videoProcessingState: "queued" });
  });
  await check("claims bound retries and recover expired leases with fresh ownership", async () => {
    Job.findOneAndUpdate = async (filter, update) => {
      assert.equal(filter.tenantId, tenant); assert.equal(filter.attempts.$lt, 3);
      assert.ok(filter.$or[1].leaseUntil.$lt instanceof Date);
      assert.match(update.$set.attemptId, /^[a-f\d-]{36}$/); assert.equal(update.$inc.attempts, 1); return null;
    };
    await worker.claimVideoJob(tenant);
  });
  db.connectDB = async () => undefined;
  auth.storageUser = async () => user;
  auth.authorizeScope = async () => undefined;
  await check("segmented videos never issue original MP4 URLs while processing or failed", async () => {
    sdk.signAccess = async () => { throw new Error("original must not be signed"); };
    for (const state of ["queued", "processing", "failed"]) {
      await assert.rejects(() => run(() => api.createVideoPlayback(request({}), { ...asset, videoProcessingState: state }, user)), (e) => e.status === 409);
    }
  });
  await check("playback grants store only hashes and expose no durable login credential", async () => {
    Job.findOne = () => query(output);
    Session.create = async (value) => { assert.equal(value.loginHash, api.videoHash("test-login")); assert.equal(value.deviceHash, api.videoHash("test-device")); assert.equal(value.tenantId, tenant); assert.equal(value.sessionToken, undefined); assert.equal(value.tokenHash.length, 64); };
    const grant = await run(() => api.createVideoPlayback(request({}), asset, user));
    assert.equal(grant.mode, "hls"); assert.ok(!grant.url.includes("test-login")); assert.equal(grant.playbackToken.length, 43);
  });
  Session.findOne = async (filter) => { assert.equal(filter.tenantId, tenant); assert.equal(filter.tokenHash, api.videoHash(token)); assert.ok(filter.expiresAt.$gt instanceof Date); return playback; };
  User.findOne = async () => user;
  Asset.findOne = async (filter) => { assert.equal(filter.tenantId, tenant); assert.equal(filter.status, "ready"); return asset; };
  Job.findOne = () => query(output);
  await check("manifest contains only resolver URLs and segment redirects bind exact output version", async () => {
    let signs = 0;
    sdk.signAccess = async (ref) => { signs++; assert.equal(ref.key, output.segments[0].key); assert.equal(ref.versionId, "seg-v1"); assert.equal(ref.contentType, "video/mp2t"); return { url: "https://synthetic.invalid/signed" }; };
    const manifest = await run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) }));
    assert.ok((await manifest.text()).includes(`/api/s3/video-playback/${token}/segment/0`));
    assert.equal(signs, 0);
    const response = await run(() => api.videoSegment(request({}), { params: Promise.resolve({ token, index: "0" }) }));
    assert.equal(response.status, 307); assert.equal(signs, 1); assert.equal(response.headers.get("cache-control"), "private, no-store");
  });
  await check("playback follows migrated date-folder references without hard-coded S3 paths", async () => {
    const previousPrefix = output.outputPrefix, previousSegments = output.segments;
    const sourceKey = `tenant/${tenant}/courses/${userId}/batches/${outputId}/video/2026-10-27/${assetId}/12345678-1234-1234-1234-123456789abc/recording.mp4`;
    const currentPrefix = outputPaths.videoOutputPrefix({ tenantId: tenant, assetId, sourceKey }, outputId, "87654321-1234-1234-1234-123456789abc");
    output.outputPrefix = currentPrefix;
    output.segments = [{ key: currentPrefix + "/segment-000000.ts", duration: 6, versionId: "moved-v1" }];
    try {
      sdk.signAccess = async (ref) => { assert.equal(ref.key, output.segments[0].key); assert.equal(ref.versionId, "moved-v1"); return { url: "https://synthetic.invalid/moved" }; };
      const manifest = await run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) }));
      assert.ok((await manifest.text()).includes(`/api/s3/video-playback/${token}/segment/0`));
      const segment = await run(() => api.videoSegment(request({}), { params: Promise.resolve({ token, index: "0" }) }));
      assert.equal(segment.headers.get("location"), "https://synthetic.invalid/moved");
    } finally { output.outputPrefix = previousPrefix; output.segments = previousSegments; }
  });
  await check("segment indices and output key boundaries fail closed", async () => {
    sdk.signAccess = async () => { throw new Error("must not sign"); };
    for (const index of ["-1", "1.5", "000", "100000", "../source"]) await assert.rejects(() => run(() => api.videoSegment(request({}), { params: Promise.resolve({ token, index }) })), (e) => e.status === 400);
    Job.findOne = () => query({ ...output, segments: [{ ...output.segments[0], key: "outside-prefix" }] });
    await assert.rejects(() => run(() => api.videoSegment(request({}), { params: Promise.resolve({ token, index: "0" }) })), (e) => e.status === 404);
    Job.findOne = () => query({ ...output, segments: [] });
    await assert.rejects(() => run(() => api.videoSegment(request({}), { params: Promise.resolve({ token, index: "999" }) })), (e) => e.status === 409);
    Job.findOne = () => query(output);
  });
  await check("revoked login, enrollment, deleted asset and expired sessions deny media", async () => {
    User.findOne = async () => ({ ...user, sessionToken: "revoked" });
    await assert.rejects(() => run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) })), (e) => e.status === 401);
    User.findOne = async () => user;
    auth.authorizeScope = async () => { throw new StorageError(403, "Not enrolled"); };
    await assert.rejects(() => run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) })), (e) => e.status === 403);
    auth.authorizeScope = async () => undefined;
    Asset.findOne = async () => null;
    await assert.rejects(() => run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) })), (e) => e.status === 409);
    Asset.findOne = async () => asset;
    Session.findOne = async () => null;
    await assert.rejects(() => run(() => api.videoManifest(request({}), { params: Promise.resolve({ token }) })), (e) => e.status === 401);
    Session.findOne = async () => playback;
  });
  await check("renewal extends the same grant and refuses another user's session", async () => {
    Session.updateOne = async (filter, update) => { assert.equal(filter.tenantId, tenant); assert.ok(update.$set.expiresAt > new Date()); };
    const response = await run(() => api.renewVideoPlayback(request({ token })));
    assert.equal(response.status, 200);
    auth.storageUser = async () => ({ ...user, _id: assetId });
    await assert.rejects(() => run(() => api.renewVideoPlayback(request({ token }))), (e) => e.status === 403);
    auth.storageUser = async () => user;
  });
  await check("completed-upload recovery repairs a missing queued job", async () => {
    const queued = { ...asset, videoProcessingState: "queued" };
    Upload.findOne = async () => ({ assetId, status: "completed" });
    Asset.findOne = async () => queued;
    let queuedCount = 0;
    Job.updateOne = async () => { queuedCount++; };
    const response = await run(() => storageApi.finishUpload(request({}), { params: Promise.resolve({ id: outputId }) }));
    assert.equal(response.status, 200); assert.equal(queuedCount, 1);
  });
  await check("upload completion automatically queues videos only and defers replacement", async () => {
    const previousFlag = process.env.S3_VIDEO_SEGMENTATION_ENABLED;
    process.env.S3_VIDEO_SEGMENTATION_ENABLED = "true";
    let enqueued = 0;
    Job.updateOne = async (_filter, _update, options) => { assert.equal(options.upsert, true); enqueued++; };
    Event.init = async () => undefined; Event.updateOne = async () => undefined;
    Asset.updateOne = async () => ({ modifiedCount: 1 });
    Upload.updateOne = async () => ({ modifiedCount: 1 });
    try {
      for (const contentType of ["video/mp4", "application/pdf"]) {
        const uploaded = { ...asset, contentType, status: "uploading", videoProcessingState: "not-requested", activeVideoOutputId: "", byteSize: 32,
          replacesAssetId: contentType === "video/mp4" ? "777777777777777777777777" : "", async save() {} };
        Asset.findOne = async () => uploaded;
        const upload = { _id: outputId, assetId, status: "uploading", expectedSize: 32, expiresAt: new Date(Date.now() + 60000) };
        Upload.findOne = async () => upload; Upload.findOneAndUpdate = async () => upload;
        sdk.inspectObject = async () => ({ ContentLength: 32, ContentType: contentType, Metadata: { assetid: assetId, tenantid: tenant }, VersionId: "source-v1", ETag: "etag" });
        sdk.inspectHeader = async () => { const bytes = Buffer.alloc(32); bytes.write(contentType === "video/mp4" ? "ftyp" : "%PDF-", contentType === "video/mp4" ? 4 : 0); return bytes; };
        const response = await run(() => storageApi.finishUpload(request({}), { params: Promise.resolve({ id: outputId }) }));
        assert.equal(response.status, 200);
        assert.equal(uploaded.videoProcessingState, contentType === "video/mp4" ? "queued" : "not-requested");
      }
      assert.equal(enqueued, 1);
    } finally { if (previousFlag === undefined) delete process.env.S3_VIDEO_SEGMENTATION_ENABLED; else process.env.S3_VIDEO_SEGMENTATION_ENABLED = previousFlag; }
  });
  await check("missing/deleted source cannot enter media conversion or publication", async () => {
    Asset.findOne = async () => null;
    let state;
    Job.updateOne = async (filter, update) => { assert.equal(filter.attemptId, "attempt"); assert.ok(filter.leaseUntil.$gt instanceof Date); state = update.$set.state; return { modifiedCount: 1 }; };
    Asset.updateOne = async (filter, update) => { assert.equal(filter.status, "ready"); assert.equal(update.$set.videoProcessingState, "failed"); };
    await worker.processVideoJob({ _id: outputId, tenantId: tenant, assetId, sourceKey: "source", sourceVersionId: "source-v1", sourceEtag: "etag", attemptId: "attempt", attempts: 1 });
    assert.equal(state, "failed");
  });
  const publishingJob = { _id: outputId, tenantId: tenant, assetId, sourceKey: "source", sourceVersionId: "source-v1", sourceEtag: "etag", attemptId: "attempt" };
  const publishingData = { segments: output.segments, duration: 6, outputBytes: 1024, playlistKey: prefix + "/index.m3u8", playlistVersionId: "playlist-v1", outputPrefix: prefix };
  let ended = false;
  const transaction = { async withTransaction(fn) { await fn(); }, async endSession() { ended = true; } };
  mongoose.startSession = async () => transaction;
  const inSession = (value) => ({ session(given) { assert.equal(given, transaction); return Promise.resolve(value); } });
  await check("stale worker ownership blocks output publication before any writes", async () => {
    Job.findOne = (filter) => { assert.equal(filter.attemptId, "attempt"); assert.ok(filter.leaseUntil.$gt instanceof Date); return inSession(null); };
    await assert.rejects(() => worker.publishVideo(publishingJob, publishingData), /LEASE_LOST/);
    assert.equal(ended, true);
  });
  await check("deleted or changed source blocks transactional publication", async () => {
    Job.findOne = () => inSession(publishingJob);
    Asset.findOne = (filter) => { assert.equal(filter.status, "ready"); assert.equal(filter.etag, "etag"); assert.equal(filter.versionId, "source-v1"); return inSession(null); };
    await assert.rejects(() => worker.publishVideo(publishingJob, publishingData), /SOURCE_CHANGED/);
  });
  await check("replacement conflicts prevent switching the new output", async () => {
    Asset.findOne = () => inSession({ ...asset, replacesAssetId: "777777777777777777777777" });
    Asset.findOneAndUpdate = async (filter, _update, options) => { assert.equal(filter.status, "ready"); assert.equal(filter.tenantId, tenant); assert.equal(options.session, transaction); return null; };
    await assert.rejects(() => worker.publishVideo(publishingJob, publishingData), /REPLACEMENT_CONFLICT/);
  });
  await check("replacement and validated output publish under the same transaction", async () => {
    let published = 0;
    Asset.findOneAndUpdate = async (_filter, update, options) => { assert.equal(options.session, transaction); assert.equal(update.$set.replacedBy, assetId); return { _id: "777777777777777777777777" }; };
    Event.updateOne = async (_filter, _update, options) => { assert.equal(options.session, transaction); };
    Job.updateOne = async (filter, update, options) => { assert.equal(options.session, transaction); assert.equal(filter.attemptId, "attempt"); assert.equal(update.$set.state, "ready"); assert.equal(update.$set.segments.length, 1); published++; };
    Asset.updateOne = async (_filter, update, options) => { assert.equal(options.session, transaction); assert.equal(update.$set.activeVideoOutputId, outputId); assert.equal(update.$set.videoProcessingState, "ready"); published++; };
    await worker.publishVideo(publishingJob, publishingData);
    assert.equal(published, 2);
  });
  console.info(`\n${checks} video checks passed. No AWS or MongoDB contacted.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
