// Explicit live integration test: isolated temporary MongoDB database + synthetic S3 objects.
// Never uses real course/student records. Requires --run; cleans only generated test resources.
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const Module = require('node:module');
const { randomUUID } = require('node:crypto');
if (!process.argv.includes('--run')) { console.log('Preview only. Add --run to test real S3 with a new temporary finops_s3_test_* database.'); process.exit(0); }
require('@next/env').loadEnvConfig(process.cwd());
const ts = require('typescript'); const root = path.resolve(__dirname, '..'); const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) { return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args); };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
const mongoose = require('mongoose');
const runtime = require('../lib/platform/runtime/index.ts'); const db = require('../lib/mongodb.ts');
const api = require('../lib/storage/s3Api.ts'); const storage = require('../lib/storage/s3.ts');
const User = require('../models/User.ts').default; const Course = require('../models/Course.ts').default; const Batch = require('../models/Batch.ts').default; const Enrollment = require('../models/Enrollment.ts').default;
const Assets = require('../models/S3Asset.ts').default; const Uploads = require('../models/S3Upload.ts').default; const Events = require('../models/S3AssetEvent.ts').default;
const databaseName = 'finops_s3_test_' + randomUUID().replaceAll('-', '').slice(0, 16);
const oid = () => new mongoose.Types.ObjectId(); const tenant = String(oid()), course = oid(), batch = oid(), otherBatch = oid(), admin = oid(), student = oid();
const ctx = { tenantId: tenant, slug: 'finops', name: 'S3 integration test', status: 'active', host: 'localhost', resolvedAt: Date.now(), resolutionSource: 'domain' };
const context = (id) => ({ params: Promise.resolve({ id }) }); const run = (fn) => runtime.runWithTenantContextAsync(ctx, fn);
const req = (body, asStudent = false, url = 'http://localhost/api/s3/test') => new Request(url, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-user-id': String(asStudent ? student : admin), 'x-session-token': 'synthetic-session', 'x-device-id': 'synthetic-device' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
let count = 0; let initialized = false; let nativeClient;
async function check(label, fn) { await fn(); count++; console.log('PASS ' + label); }
const fixtures = [
  { category: 'video', filename: 'synthetic-header.mp4', contentType: 'video/mp4', bytes: (() => { const b = Buffer.alloc(32); b.write('ftyp', 4); return b; })() },
  { category: 'pdf', filename: 'synthetic.pdf', contentType: 'application/pdf', bytes: Buffer.from('%PDF-1.4\n% synthetic integration test\n%%EOF\n') },
  { category: 'study-material', filename: 'study.txt', contentType: 'text/plain', bytes: Buffer.from('Synthetic batch study material.\n') },
  { category: 'assignment', filename: 'assignment.pdf', contentType: 'application/pdf', bytes: Buffer.from('%PDF-1.4\n% synthetic assignment test\n%%EOF\n') },
];
async function upload(fixture, replacesAssetId = '', corrupt = false) {
  const init = await run(() => api.initUpload(req({ ...fixture, bytes: undefined, byteSize: fixture.bytes.length, courseId: String(course), batchId: String(batch), contentDate: '2026-10-26', replacesAssetId, idempotencyKey: randomUUID() }), context()));
  assert.equal(init.status, 201); const data = await init.json();
  const signed = await (await run(() => api.uploadParts(req({ partNumbers: [1] }), context(data.uploadSessionId)))).json();
  const bytes = corrupt ? Buffer.alloc(fixture.bytes.length, 88) : fixture.bytes;
  const response = await fetch(signed.parts[0].url, { method: 'PUT', body: bytes, signal: AbortSignal.timeout(20000) }); assert.equal(response.status, 200);
  const finish = () => run(() => api.finishUpload(req({ parts: [{ partNumber: 1, etag: response.headers.get('etag') }] }), context(data.uploadSessionId)));
  if (corrupt) await assert.rejects(finish, (e) => e.status === 422); else assert.equal((await finish()).status, 200);
  return data.assetId;
}
async function main() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    nativeClient = new mongoose.mongo.MongoClient(uri, { serverSelectionTimeoutMS: 7000 });
    await nativeClient.connect();
    // Preserve URI authentication; switch only the database selected after authentication.
    nativeClient.options.dbName = databaseName;
    mongoose.connection.setClient(nativeClient); initialized = true;
    if (mongoose.connection.name !== databaseName || !/^finops_s3_test_[a-f0-9]{16}$/.test(databaseName)) throw Error('Unsafe test database target');
    db.connectDB = async () => mongoose;
    await Promise.all([Assets.init(), Uploads.init(), Events.init()]);
    await User.collection.insertMany([{ _id: admin, tenantId: tenant, name: 'Synthetic Admin', email: 'admin@s3-test.invalid', role: 'admin', isLoggedIn: true, sessionToken: 'synthetic-session', activeDevice: 'synthetic-device' }, { _id: student, tenantId: tenant, name: 'Synthetic Student', email: 'student@s3-test.invalid', role: 'user', isLoggedIn: true, sessionToken: 'synthetic-session', activeDevice: 'synthetic-device' }]);
    await Course.collection.insertOne({ _id: course, tenantId: tenant, title: 'Synthetic Course', slug: 'synthetic-course' });
    await Batch.collection.insertMany([{ _id: batch, tenantId: tenant, courseId: String(course), name: 'Synthetic Batch', code: 'S3-TEST-A', isActive: true }, { _id: otherBatch, tenantId: tenant, courseId: String(course), name: 'Other Batch', code: 'S3-TEST-B', isActive: true }]);
    await Enrollment.collection.insertOne({ tenantId: tenant, userId: String(student), batchId: String(batch), batchBlocked: false });
    const uploaded = [];
    for (const f of fixtures) {
      await check(f.category + ': real multipart upload, verification, DB and student fetch', async () => {
        const id = await upload(f); uploaded.push(id);
        const asset = await Assets.findById(id); assert.equal(asset.status, 'ready'); assert.equal(asset.category, f.category); assert.ok(asset.uploadedAt);
        assert.ok(asset.key.startsWith(`tenant/${tenant}/courses/${course}/batches/${batch}/${f.category}/2026-10-26/`));
        const url = `http://localhost/api/s3/student/assets?batchId=${batch}&category=${f.category}&contentDate=2026-10-26`;
        const list = await (await run(() => api.studentAssets(req(undefined, true, url), context()))).json(); assert.equal(list.total, 1); assert.equal(list.assets[0].assetId, id);
        const grant = await (await run(() => api.accessUrl(req({ assetId: id }, true), context()))).json();
        const fetched = await fetch(grant.url, { signal: AbortSignal.timeout(20000) }); assert.equal(fetched.status, 200); assert.deepEqual(Buffer.from(await fetched.arrayBuffer()), f.bytes);
        assert.equal(await Events.countDocuments({ assetId: id }), 2);
      });
    }
    await check('student denied another batch', async () => {
      await assert.rejects(() => run(() => api.studentAssets(req(undefined, true, `http://localhost/api/s3/student/assets?batchId=${otherBatch}`), context())), (e) => e.status === 403);
    });
    let replacement;
    await check('replacement retains old history and publishes only verified new file', async () => {
      replacement = await upload(fixtures[1], uploaded[1]);
      const old = await Assets.findById(uploaded[1]); assert.equal(old.status, 'replaced'); assert.equal(old.replacedBy, replacement);
      await assert.rejects(() => run(() => api.accessUrl(req({ assetId: uploaded[1] }, true), context())), (e) => e.status === 409);
      const history = await (await run(() => api.assetHistory(req(undefined), context(uploaded[1])))).json(); assert.ok(history.events.some((e) => e.action === 'replaced'));
    });
    await check('invalid replacement never removes current content', async () => {
      await upload(fixtures[1], replacement, true);
      assert.equal((await Assets.findById(replacement)).status, 'ready');
    });
    await check('student cannot delete files', async () => {
      await assert.rejects(() => run(() => api.deleteAsset(req({}, true), context(uploaded[0]))), (e) => e.status === 403);
    });
    await check('S3 cleanup failure removes access and is retryable', async () => {
      const originalDelete = storage.deleteStoredObject;
      try {
        storage.deleteStoredObject = async () => { const e = new Error('synthetic permission failure'); e.name = 'AccessDenied'; throw e; };
        const result = await (await run(() => api.deleteAsset(req({}), context(uploaded[2])))).json();
        assert.equal(result.cleanupPending, true); assert.equal((await Assets.findById(uploaded[2])).status, 'deleted');
        await assert.rejects(() => run(() => api.accessUrl(req({ assetId: uploaded[2] }, true), context())), (e) => e.status === 409);
      } finally { storage.deleteStoredObject = originalDelete; }
      const retry = await (await run(() => api.deleteAsset(req({}), context(uploaded[2])))).json(); assert.equal(retry.cleanupPending, false);
    });
    await check('deletion revokes access, cleans S3 version and retains audit metadata', async () => {
      for (const id of [...uploaded, replacement]) {
        const response = await (await run(() => api.deleteAsset(req({}), context(id)))).json(); assert.equal(response.cleanupPending, false);
        const row = await Assets.findById(id); assert.equal(row.status, 'deleted'); assert.equal(row.cleanupState, 'done'); assert.ok(row.deletedAt);
        await assert.rejects(() => run(() => api.accessUrl(req({ assetId: id }, true), context())), (e) => e.status === 409);
        assert.ok(await Events.findOne({ assetId: id, action: 'delete-completed' }));
      }
    });
    console.log(`${count} live lifecycle checks passed. Fixtures validate storage/access, not video decoding or document rendering.`);
  } finally {
    try {
    if (initialized && mongoose.connection.name === databaseName && /^finops_s3_test_[a-f0-9]{16}$/.test(databaseName)) {
      let clean = true;
      for (const row of await Assets.find({ tenantId: tenant }).lean()) {
        if (!row.key.startsWith(`tenant/${tenant}/courses/${course}/batches/${batch}/`)) { clean = false; continue; }
        try {
          for (const u of await Uploads.find({ assetId: String(row._id) }).lean()) if (u.uploadId) await storage.abortMultipart({ ...row, uploadId: u.uploadId });
          await storage.deleteStoredObject(row);
        } catch (e) { clean = false; console.log('Test cleanup pending: ' + e.name); }
      }
      if (clean) { await mongoose.connection.dropDatabase(); console.log('Temporary test objects and database removed.'); } else console.log('Retained temporary DB for cleanup: ' + databaseName);
    }
    } finally {
      try { storage.s3Client().destroy(); } catch { /* configuration may be incomplete */ }
      await mongoose.disconnect(); if (nativeClient) await nativeClient.close();
    }
  }
}
main().catch((e) => { console.log('Live test failed: ' + (/not authorized|unauthorized/i.test(e.message) ? 'database permission denied; ' : /auth/i.test(e.message) ? 'authentication failed; ' : '') + e.name + (e.code ? ' code ' + e.code : '') + (e instanceof assert.AssertionError ? ' (assertion failed)' : '')); process.exitCode = 1; });
