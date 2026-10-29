// Offline tests of the real TypeScript modules with mocked DB/storage boundaries.
// No .env loading, real credentials, MongoDB connection or AWS request.
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

const validation = require("../lib/storage/s3Validation.ts");
const runtime = require("../lib/platform/runtime/index.ts");
const tenantWrapper = require("../lib/platform/runtime/withTenantContext.ts");
const auth = require("../lib/storage/s3Authorization.ts");
const db = require("../lib/mongodb.ts");
const sdk = require("../lib/storage/s3.ts");
const User = require("../models/User.ts").default;
const Course = require("../models/Course.ts").default;
const Batch = require("../models/Batch.ts").default;
const Enrollment = require("../models/Enrollment.ts").default;
const Assets = require("../models/S3Asset.ts").default;
const Uploads = require("../models/S3Upload.ts").default;
const Events = require("../models/S3AssetEvent.ts").default;
Events.init = async () => undefined;
Events.updateOne = async () => ({ upsertedCount: 1 });
Assets.countDocuments = async () => 21;
const api = require("../lib/storage/s3Api.ts");
const tenant = "111111111111111111111111";
const userId = "222222222222222222222222";
const courseId = "333333333333333333333333";
const batchId = "444444444444444444444444";
const assetId = "555555555555555555555555";
const uploadId = "666666666666666666666666";
const context = { tenantId: tenant, slug: "finops", name: "Test", status: "active", host: "localhost", resolvedAt: Date.now(), resolutionSource: "domain" };
const run = (fn) => runtime.runWithTenantContextAsync(context, fn);
const valid = { filename: "lesson.mp4", contentType: "video/mp4", byteSize: 1024, courseId, batchId, idempotencyKey: "1234567890123456" };
const request = (body, headers = {}) => new Request("http://localhost/api/s3/test", {
  method: "POST", headers: { "Content-Type": "application/json", "x-user-id": userId, "x-session-token": "token", "x-device-id": "device", ...headers }, body: JSON.stringify(body),
});
const routeContext = { params: Promise.resolve({ id: uploadId }) };
let count = 0;
async function check(name, test) {
  await test(); count++; console.log(`PASS ${name}`);
}
function rejectsStatus(fn, status) {
  return assert.rejects(fn, (error) => error instanceof validation.StorageError && error.status === status);
}

async function main() {
  await check("MP4 input accepts bounded video", () => assert.equal(validation.uploadInput(valid).partCount, 1));
  for (const [name, change] of [
    ["wrong extension", { filename: "x.exe" }], ["oversize", { byteSize: validation.MAX_VIDEO_BYTES + 1 }],
    ["fractional bytes", { byteSize: 100.5 }], ["invalid course", { courseId: "forged" }],
    ["wrong MIME", { contentType: "text/html" }], ["bad idempotency key", { idempotencyKey: "x" }],
  ]) await check(`reject ${name}`, () => assert.throws(() => validation.uploadInput({ ...valid, ...change }), validation.StorageError));
  await check("part signing rejects duplicate/out-of-bounds/big batches", () => {
    for (const numbers of [[1, 1], [0], [4], Array.from({ length: 21 }, (_, i) => i + 1)]) {
      assert.throws(() => validation.partNumbers(numbers, 3), validation.StorageError);
    }
  });
  await check("multipart verification checks exact sizes and ETags", () => {
    const actual = [{ PartNumber: 1, ETag: '"a"', Size: 16 }, { PartNumber: 2, ETag: '"b"', Size: 4 }];
    const supplied = [{ partNumber: 1, etag: '"a"' }, { partNumber: 2, etag: '"b"' }];
    assert.equal(validation.verifyParts(actual, supplied, 20, 16).length, 2);
    assert.throws(() => validation.verifyParts(actual, [{ partNumber: 1, etag: "forged" }, supplied[1]], 20, 16));
    assert.throws(() => validation.verifyParts([{ ...actual[0], Size: 17 }, actual[1]], supplied, 20, 16));
    assert.throws(() => validation.verifyParts(actual.slice(1), supplied, 20, 16));
  });
  await check("reject disguised HTML header", () => {
    assert.equal(validation.isMp4Header(Buffer.from("<html>not a video")), false);
    const header = Buffer.alloc(32); header.write("ftyp", 4);
    assert.equal(validation.isMp4Header(header), true);
  });
  await check("new schema indexes enforce tenant/idempotency and active slots", () => {
    const indexes = Uploads.schema.indexes();
    assert.ok(indexes.some(([keys, options]) => keys.idempotencyKey && keys.tenantId && options.unique));
    assert.ok(indexes.some(([keys, options]) => keys.slot && keys.ownerId && options.unique && options.partialFilterExpression));
    assert.ok(Assets.schema.path("tenantId").isRequired);
  });
  await check("strict S3 scope rejects legacy/forged tenant override", () => run(() => {
    assert.deepEqual(auth.strictScope({ tenantId: "forged", _id: assetId }), { tenantId: tenant, _id: assetId });
  }));
  await check("flags disabled before DB/tenant lookup", async () => {
    const previous = process.env.S3_UPLOAD_ENABLED;
    delete process.env.S3_UPLOAD_ENABLED;
    let called = false;
    const res = await api.storageRoute("upload", async () => { called = true; throw Error(); })(request({}), routeContext);
    assert.equal(res.status, 503); assert.equal(called, false);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    if (previous === undefined) delete process.env.S3_UPLOAD_ENABLED; else process.env.S3_UPLOAD_ENABLED = previous;
  });
  await check("presigned URLs bind size/version and respect credential expiry", async () => {
    const keys = ["AWS_REGION", "S3_MEDIA_BUCKET"];
    const previous = keys.map((key) => process.env[key]);
    process.env.AWS_REGION = "ap-south-1"; process.env.S3_MEDIA_BUCKET = "private-test-bucket";
    const client = sdk.s3Client();
    const credentials = client.config.credentials;
    client.config.credentials = async () => ({ accessKeyId: "TESTONLY", secretAccessKey: "test-only-not-real", expiration: new Date(Date.now() + 120000) });
    try {
      const part = await sdk.signPart({ bucket: "private-test-bucket", key: "tenant/test/video.mp4", uploadId: "multipart-test" }, 1, 600, 1024);
      const url = new URL(part.url);
      assert.ok(url.searchParams.get("X-Amz-SignedHeaders").includes("content-length"));
      assert.ok(Number(url.searchParams.get("X-Amz-Expires")) <= 90);
      const grant = await sdk.signAccess({ bucket: "private-test-bucket", key: "tenant/test/video.mp4", safeFilename: "test.mp4", versionId: "version-test" });
      assert.equal(new URL(grant.url).searchParams.get("versionId"), "version-test");
      client.config.credentials = async () => ({ accessKeyId: "TESTONLY", secretAccessKey: "test-only-not-real", expiration: new Date(Date.now() + 10000) });
      await rejectsStatus(() => sdk.signAccess({ bucket: "private-test-bucket", key: "tenant/test/video.mp4", safeFilename: "test.mp4" }), 503);
    } finally {
      client.config.credentials = credentials;
      keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; });
    }
  });

  db.connectDB = async () => undefined;
  let role = "user";
  User.findOne = async (filter) => {
    assert.ok(JSON.stringify(filter).includes(tenant));
    return { _id: userId, tenantId: tenant, name: "Student", email: "test@example.invalid", role, isLoggedIn: true, sessionToken: "token", activeDevice: "device" };
  };
  Course.findOne = async () => ({ _id: courseId, slug: "test-course", title: "Test course" });
  Batch.findOne = async () => ({ _id: batchId, courseId, name: "Test batch", isActive: true });
  Enrollment.findOne = async () => null;
  let signs = 0;
  sdk.signAccess = async () => { signs++; return { url: "https://example.invalid/signed", expiresAt: new Date(Date.now() + 600000).toISOString() }; };
  let asset = { _id: assetId, tenantId: tenant, courseId, batchId, status: "ready", originalFilename: "test.mp4", contentType: "video/mp4" };
  Assets.findOne = async (filter) => { assert.equal(filter.tenantId, tenant); return asset; };
  Assets.updateOne = async () => ({ modifiedCount: 1 });
  await check("missing session returns 401", () => run(() => rejectsStatus(() => auth.storageUser(request({}, { "x-user-id": "" })), 401)));
  await check("student cannot initialize uploads", () => run(() => rejectsStatus(() => api.initUpload(request(valid), routeContext), 403)));
  await check("non-enrolled student cannot get signed video URL", () => run(async () => {
    await rejectsStatus(() => api.accessUrl(request({ assetId }), routeContext), 403); assert.equal(signs, 0);
  }));
  await check("forged/missing asset cannot get signed URL", () => run(async () => {
    const old = asset; asset = null;
    await rejectsStatus(() => api.accessUrl(request({ assetId }), routeContext), 404);
    asset = old; assert.equal(signs, 0);
  }));
  await check("wrong device rejected", () => run(() => rejectsStatus(() => auth.storageUser(request({}, { "x-device-id": "other-device" })), 401)));
  Enrollment.findOne = async (filter) => { assert.ok(JSON.stringify(filter).includes('"batchBlocked":{"$ne":true}')); return { _id: "enrolled" }; };
  await check("authorized access uses stored mapping and private response", () => run(async () => {
    const res = await api.accessUrl(request({ assetId, courseId: "forged-course", tenantId: "forged-tenant" }), routeContext);
    assert.equal(res.status, 200); assert.equal(signs, 1);
    assert.equal(res.headers.get("cache-control"), "private, no-store");
  }));
  await check("unready content never signed", () => run(async () => {
    asset.status = "uploading";
    await rejectsStatus(() => api.accessUrl(request({ assetId }), routeContext), 409);
    assert.equal(signs, 1); asset.status = "ready";
  }));
  await check("batch/course mismatch blocks playback", () => run(async () => {
    Batch.findOne = async () => ({ _id: batchId, courseId: "different-course" });
    await rejectsStatus(() => api.accessUrl(request({ assetId }), routeContext), 403);
  }));
  await check("foreign upload owner cannot sign parts", () => run(async () => {
    role = "admin";
    Uploads.findOne = async (filter) => { assert.equal(filter.ownerId, userId); assert.equal(filter.tenantId, tenant); return null; };
    await rejectsStatus(() => api.uploadParts(request({ partNumbers: [1] }), routeContext), 404);
  }));

  Batch.findOne = async () => ({ _id: batchId, courseId, name: "Test batch", isActive: true });
  const upload = { _id: uploadId, assetId, ownerId: userId, status: "uploading", expectedSize: 1024, partSize: validation.PART_SIZE,
    expiresAt: new Date(Date.now() + 3600000), uploadId: "multipart-test", partCount: 1 };
  let saved = 0;
  asset = { _id: assetId, tenantId: tenant, courseId, batchId, status: "uploading", originalFilename: "test.mp4", contentType: "video/mp4",
    bucket: "private-test", key: "tenant/test/video.mp4", byteSize: 1024, safeFilename: "test.mp4",
    toObject() { return { bucket: this.bucket, key: this.key }; }, async save() { saved++; } };
  Uploads.findOne = async () => upload;
  await check("resume accepts completed session even after upload expiry", () => run(async () => {
    upload.status = "completed"; upload.expiresAt = new Date(0);
    const response = await api.initUpload(request({ ...valid, filename: "test.mp4" }), routeContext);
    assert.equal(response.status, 200);
    upload.status = "uploading"; upload.expiresAt = new Date(Date.now() + 3600000);
  }));
  await check("resume preserves completing session for finalization recovery", () => run(async () => {
    upload.status = "completing";
    const response = await api.initUpload(request({ ...valid, filename: "test.mp4" }), routeContext);
    assert.equal((await response.json()).status, "completing");
    upload.status = "uploading";
  }));
  await check("expired resume returns explicit restart instructions", () => run(async () => {
    upload.expiresAt = new Date(0);
    const response = await api.initUpload(request({ ...valid, filename: "test.mp4" }), routeContext);
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, "UPLOAD_RESTART_REQUIRED");
    assert.equal(body.uploadSessionId, uploadId);
    upload.expiresAt = new Date(Date.now() + 3600000);
  }));
  await check("cancelled resume requires restart and repeated cancel is harmless", () => run(async () => {
    upload.status = "cancelled";
    const response = await api.initUpload(request({ ...valid, filename: "test.mp4" }), routeContext);
    assert.equal((await response.json()).code, "UPLOAD_RESTART_REQUIRED");
    assert.equal((await api.cancelUpload(request({}), routeContext)).status, 200);
    upload.status = "uploading";
  }));
  await check("initializing upload returns retryable busy instead of destructive restart", () => run(async () => {
    upload.status = "initializing";
    await rejectsStatus(() => api.initUpload(request({ ...valid, filename: "test.mp4" }), routeContext), 503);
    upload.status = "uploading";
  }));
  Uploads.findOneAndUpdate = async (filter) => { assert.equal(filter.tenantId, tenant); return upload; };
  Uploads.updateOne = async () => ({ modifiedCount: 1 });
  let completedCalls = 0;
  const metadata = { ContentLength: 1024, ContentType: "video/mp4", Metadata: { assetid: assetId, tenantid: tenant }, ETag: '"whole"' };
  const header = Buffer.alloc(32); header.write("ftyp", 4);
  sdk.inspectHeader = async () => header;
  sdk.inspectObject = async () => metadata;
  sdk.completeMultipart = async () => { completedCalls++; };
  await check("completion recovers S3-success/DB-failure without re-uploading", () => run(async () => {
    const res = await api.finishUpload(request({ parts: [] }), routeContext);
    assert.equal(res.status, 200); assert.equal(asset.status, "ready");
    assert.equal(saved, 1); assert.equal(completedCalls, 0);
  }));
  await check("completed retry is idempotent", () => run(async () => {
    upload.status = "completed";
    const res = await api.finishUpload(request({}), routeContext);
    assert.equal(res.status, 200); assert.equal(saved, 1);
    upload.status = "uploading";
  }));
  await check("fresh completion verifies real parts before publication", () => run(async () => {
    asset.status = "uploading";
    let heads = 0;
    sdk.inspectObject = async () => ++heads === 1 ? null : metadata;
    sdk.listParts = async () => [{ PartNumber: 1, ETag: '"part"', Size: 1024 }];
    await api.finishUpload(request({ parts: [{ partNumber: 1, etag: '"part"' }] }), routeContext);
    assert.equal(asset.status, "ready"); assert.equal(completedCalls, 1);
  }));
  await check("wrong object size is never published", () => run(async () => {
    asset.status = "uploading";
    sdk.inspectObject = async () => ({ ...metadata, ContentLength: 2048 });
    const before = saved;
    await rejectsStatus(() => api.finishUpload(request({ parts: [] }), routeContext), 422);
    assert.equal(saved, before);
  }));
  await check("expired upload cannot sign more parts", () => run(async () => {
    upload.expiresAt = new Date(0);
    await rejectsStatus(() => api.uploadParts(request({ partNumbers: [1] }), routeContext), 409);
    upload.expiresAt = new Date(Date.now() + 3600000);
  }));
  role = "user";
  const listRequest = new Request("http://localhost/api/s3/student/assets?batchId=" + batchId, { headers: { "x-user-id": userId, "x-session-token": "token", "x-device-id": "device" } });
  await check("student list denies unenrolled viewers before querying assets", () => run(async () => {
    Enrollment.findOne = async () => null;
    Assets.find = () => { throw Error("Must not list unauthorized assets"); };
    await rejectsStatus(() => api.studentAssets(listRequest, routeContext), 403);
  }));
  await check("student list is ready-only tenant/batch/course scoped and paginated", () => run(async () => {
    Enrollment.findOne = async () => ({ _id: "enrolled" });
    let requested;
    Assets.find = (filter) => { assert.deepEqual(filter, { batchId, courseId, status: "ready", tenantId: tenant }); return { sort() { return this; }, skip(n) { assert.equal(n, 0); return this; }, limit(n) { requested = n; return Promise.resolve(Array.from({ length: 21 }, (_, i) => ({ ...asset, _id: String(i), key: "secret-key", bucket: "secret-bucket" }))); } }; };
    const response = await api.studentAssets(listRequest, routeContext);
    const body = await response.json();
    assert.equal(requested, 21); assert.equal(body.assets.length, 20); assert.equal(body.hasMore, true);
    assert.equal(body.assets[0].key, undefined); assert.equal(body.assets[0].bucket, undefined);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }));
  await check("student list requires a valid batch ID", () => run(async () => {
    const bad = new Request("http://localhost/api/s3/student/assets", { headers: Object.fromEntries(listRequest.headers) });
    await rejectsStatus(() => api.studentAssets(bad, routeContext), 400);
  }));
  await check("route accepts Next-style streaming requests and strips internal tenant headers", async () => {
    const original = tenantWrapper.withTenantContext;
    const flag = process.env.S3_UPLOAD_ENABLED;
    process.env.S3_UPLOAD_ENABLED = "true";
    tenantWrapper.withTenantContext = (handler) => handler;
    try {
      const source = request({ filename: "test.mp4" }, { [runtime.TENANT_HOST_HEADER]: "forged.invalid" });
      // Framework requests may come from a different Request implementation.
      const frameworkRequest = { url: source.url, method: source.method, headers: source.headers, body: source.body, signal: source.signal };
      const response = await api.storageRoute("upload", async (clean) => {
        assert.equal(clean.headers.get(runtime.TENANT_HOST_HEADER), null);
        assert.equal(clean.headers.get("x-user-id"), userId);
        assert.equal((await clean.json()).filename, "test.mp4");
        return api.privateJson({ success: true });
      })(frameworkRequest, routeContext);
      assert.equal(response.status, 200);
    } finally { tenantWrapper.withTenantContext = original; if (flag === undefined) delete process.env.S3_UPLOAD_ENABLED; else process.env.S3_UPLOAD_ENABLED = flag; }
  });
  await check("route copies GET requests without a body", async () => {
    const original = tenantWrapper.withTenantContext;
    const flag = process.env.S3_PLAYBACK_ENABLED;
    process.env.S3_PLAYBACK_ENABLED = "true";
    tenantWrapper.withTenantContext = (handler) => handler;
    try {
      const response = await api.storageRoute("playback", async (clean) => { assert.equal(clean.method, "GET"); assert.equal(clean.body, null); return api.privateJson({ success: true }); })(new Request("http://localhost/api/s3/student/assets"), routeContext);
      assert.equal(response.status, 200);
    } finally { tenantWrapper.withTenantContext = original; if (flag === undefined) delete process.env.S3_PLAYBACK_ENABLED; else process.env.S3_PLAYBACK_ENABLED = flag; }
  });
  await check("all categories validate file types and batch/date scope", () => {
    for (const [category, filename, contentType] of [["pdf", "lesson.pdf", "application/pdf"], ["study-material", "notes.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], ["assignment", "task.txt", "text/plain"]]) {
      const input = validation.uploadInput({ ...valid, category, filename, contentType, contentDate: "2026-10-26" });
      assert.equal(input.category, category); assert.equal(input.batchId, batchId); assert.equal(input.contentDate, "2026-10-26");
    }
  });
  await check("reject invalid dates, unsafe filenames, active content and missing batch", () => {
    for (const change of [{ contentDate: "2026-02-30" }, { contentDate: "../secret" }, { filename: "../lesson.mp4" }, { category: "pdf", filename: "script.html", contentType: "text/html" }, { batchId: "" }, { category: "unknown" }]) assert.throws(() => validation.uploadInput({ ...valid, ...change }), validation.StorageError);
  });
  await check("document size limit and category restrictions are enforced", () => {
    assert.throws(() => validation.uploadInput({ ...valid, category: "pdf", filename: "big.pdf", contentType: "application/pdf", byteSize: 500 * 1024 * 1024 + 1 }), validation.StorageError);
    assert.throws(() => validation.uploadInput({ ...valid, category: "pdf" }), validation.StorageError);
  });
  await check("file signatures are checked before student publication", () => {
    assert.equal(validation.validFileHeader(Buffer.from("%PDF-1.4"), "application/pdf"), true);
    assert.equal(validation.validFileHeader(Buffer.from("<html>fake"), "application/pdf"), false);
    assert.equal(validation.validFileHeader(Buffer.from([80, 75, 3, 4]), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), true);
    assert.equal(validation.validFileHeader(Buffer.from("<script>alert(1)"), "text/plain"), false);
    assert.equal(validation.validFileHeader(Buffer.from("safe study notes"), "text/plain"), true);
  });
  await check("replacement targets must be valid object IDs", () => {
    assert.throws(() => validation.uploadInput({ ...valid, replacesAssetId: "../another-batch" }), validation.StorageError);
  });
  await check("students cannot delete files or read administrator history", () => run(async () => {
    await rejectsStatus(() => api.deleteAsset(request({}), routeContext), 403);
    await rejectsStatus(() => api.assetHistory(request({}), routeContext), 403);
  }));
  await check("cached pre-category schemas refresh and persist all category fields", () => {
    const { Mongoose, Schema } = require("mongoose"); const isolated = new Mongoose();
    const old = isolated.model("CachedAsset", new Schema({ originalFilename: String, status: { type: String, enum: ["ready"] } }));
    assert.equal(old.schema.path("category"), undefined);
    const refresh = require("../models/S3Asset.ts").refreshCachedAssetModel;
    assert.equal(refresh(old), old);
    for (const category of ["video", "pdf", "study-material", "assignment"]) {
      const row = new old({ tenantId: tenant, createdBy: userId, originalFilename: "test.pdf", safeFilename: "test.pdf", contentType: "application/pdf", byteSize: 32, bucket: "test", key: "test-key", courseId, batchId, category, contentDate: "2026-10-26", status: "ready" });
      assert.equal(row.category, category); assert.equal(row.toObject().category, category); assert.equal(row.validateSync(), undefined);
    }
    assert.equal(refresh(old), old);
  });
  await check("admin and student category queries never mix missing categories with videos", () => run(async () => {
    const originalFind = Assets.find, originalCount = Assets.countDocuments, originalUploads = Uploads.find, originalRole = role;
    try {
      Uploads.find = async () => [];
      for (const category of ["video", "pdf", "study-material", "assignment"]) {
        const inspect = (filter) => { assert.equal(filter.category, category); assert.equal(filter.tenantId, tenant); assert.equal(filter.$or, undefined); };
        Assets.find = (filter) => { inspect(filter); return { sort() { return this; }, skip() { return this; }, limit() { return Promise.resolve([]); } }; };
        Assets.countDocuments = async (filter) => { inspect(filter); return 0; };
        const url = "http://localhost/api/s3/student/assets?batchId=" + batchId + "&category=" + category;
        const get = new Request(url, { headers: Object.fromEntries(request({}).headers) });
        role = "user"; assert.equal((await api.studentAssets(get, routeContext)).status, 200);
        role = "admin"; assert.equal((await api.assetList(get, routeContext)).status, 200);
      }
    } finally { Assets.find = originalFind; Assets.countDocuments = originalCount; Uploads.find = originalUploads; role = originalRole; }
  }));
  console.log(`\n${count} offline S3 checks passed. No AWS resources contacted.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
