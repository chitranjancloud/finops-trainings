// Real integration modules; all AWS/DB boundaries are mocked. No .env or network.
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path'); const Module = require('node:module'); const ts = require('typescript');
const root = path.resolve(__dirname, '..'), resolve = Module._resolveFilename;
Module._resolveFilename = function(request, ...args) { return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, ...args); };
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { mediaConvertSettings } = require('../lib/video/mediaConvertSettings.ts');
const managed = require('../lib/video/mediaConvert.ts'); const { parseVideoPlaylist } = require('../lib/video/hls.ts');
const Job = require('../models/S3VideoJob.ts').default; const Asset = require('../models/S3Asset.ts').default;
const sdk = require('../lib/storage/s3.ts'); const { MediaConvertClient } = require('@aws-sdk/client-mediaconvert');
const publication = require('../lib/video/publication.ts');
const tenantId = '111111111111111111111111', assetId = '222222222222222222222222', jobId = '333333333333333333333333';
const attemptId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const sourceKey = `tenant/${tenantId}/courses/${jobId}/batches/${jobId}/video/2026-10-29/${assetId}/${attemptId}/lesson.mp4`;
const source = { tenantId, assetId, sourceKey, bucket: 'synthetic' };
const role = 'arn:aws:iam::123456789012:role/VideoConvert';
async function main() {
  const settings = mediaConvertSettings(source, jobId, attemptId, role);
  assert.equal(settings.Settings.Inputs[0].FileInput, `s3://synthetic/${sourceKey}`);
  assert.equal(settings.ClientRequestToken.length <= 64, true);
  assert.equal(settings.Settings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.SegmentLength, 6);
  assert.ok(settings.Settings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.Destination.includes('/output/'));
  assert.throws(() => mediaConvertSettings({ ...source, sourceKey: '../foreign' }, jobId, attemptId, role));
  const playlist = '#EXTM3U\n#EXTINF:6.0,\nstream_720p00000.ts\n#EXT-X-ENDLIST\n';
  assert.equal(parseVideoPlaylist(playlist, 'mediaconvert').length, 1);
  assert.throws(() => parseVideoPlaylist(playlist.replace('stream_720p00000.ts', '../private.ts'), 'mediaconvert'));
  process.env.VIDEO_PROCESSING_PROVIDER = 'mediaconvert'; process.env.AWS_REGION = 'ap-southeast-2'; process.env.S3_MEDIA_BUCKET = 'synthetic';
  let job = { ...source, _id: jobId, state: 'processing', phase: 'encoding', provider: 'mediaconvert', syncToken: 'claim-token', sourceVersionId: 'v1', sourceEtag: 'etag', attemptId, attempts: 1, segments: [], outputBytes: 0 };
  const updates = [];
  Job.updateOne = async (filter, update) => { assert.equal(filter.tenantId, tenantId); if (filter.state === 'processing') assert.equal(filter.syncToken, 'claim-token', 'sync updates and release must be claim-fenced'); if (update.$set) updates.push(update.$set); return { matchedCount: 1 }; };
  Job.findOneAndUpdate = async () => job;
  Asset.findOne = async () => ({ bucket: 'synthetic', byteSize: 32 }); Asset.updateOne = async () => ({ matchedCount: 1 });
  sdk.s3Client = () => ({ send: async command => { assert.equal(command.constructor.name, 'HeadObjectCommand'); return { ContentLength: 32, VersionId: 'v1' }; } });
  let creates = 0;
  MediaConvertClient.prototype.send = async command => { assert.equal(command.constructor.name, 'CreateJobCommand'); creates++; return { Job: { Id: 'external1' } }; };
  delete process.env.AWS_MEDIACONVERT_ROLE_ARN;
  await managed.submitManagedVideo(jobId, tenantId); assert.equal(creates, 0); assert.equal(updates.at(-1).phase, 'configuration-needed');
  process.env.AWS_MEDIACONVERT_ROLE_ARN = role;
  await managed.submitManagedVideo(jobId, tenantId); assert.equal(creates, 1); assert.equal(updates.find(u => u.externalJobId)?.externalJobId, 'external1');
  MediaConvertClient.prototype.send = async () => { throw new Error('network lost after create'); };
  await managed.submitManagedVideo(jobId, tenantId); assert.equal(updates.at(-1).phase, 'submission-unknown');
  // Ambiguous submission must search for its prior attempt, never call CreateJob.
  job = { ...job, externalJobId: '', provider: 'mediaconvert' };
  MediaConvertClient.prototype.send = async command => { assert.equal(command.constructor.name, 'ListJobsCommand'); return { Jobs: [] }; };
  await managed.syncManagedVideo(jobId, tenantId);
  assert.ok(updates.some(u => u.phase === 'submission-unknown'));
  // Successful output is verified, version pinned, and only then published.
  const { videoOutputPrefix } = require('../lib/video/outputPaths.ts');
  job.outputPrefix = videoOutputPrefix(source, jobId, attemptId); job.externalJobId = 'external1';
  MediaConvertClient.prototype.send = async () => ({ Job: { Id: 'external1', Status: 'COMPLETE', UserMetadata: { tenantId, jobId, attemptId } } });
  sdk.s3Client = () => ({ send: async command => {
    if (command.constructor.name === 'HeadObjectCommand') return command.input.Key === sourceKey ? { ContentLength: 32, VersionId: 'v1' } : { ContentLength: 188, VersionId: 'segment-v1' };
    if (command.input.Key.endsWith('.m3u8')) return { ContentLength: playlist.length, VersionId: 'playlist-v1', Body: { transformToString: async () => playlist } };
    assert.equal(command.input.VersionId, 'segment-v1'); assert.equal(command.input.Range, 'bytes=0-187');
    return { Body: { transformToByteArray: async () => { const bytes = new Uint8Array(188); bytes[0] = 0x47; return bytes; } } };
  } });
  let published = 0;
  publication.publishVideo = async (_job, output) => { published++; assert.equal(output.segments[0].versionId, 'segment-v1'); assert.equal(output.duration, 6); };
  await managed.syncManagedVideo(jobId, tenantId); assert.equal(published, 1);
  const route = require('../app/api/internal/video-jobs/route.ts');
  delete process.env.CRON_SECRET;
  assert.equal((await route.GET(new Request('http://localhost/api/internal/video-jobs'))).status, 401);
  process.env.CRON_SECRET = 'test-secret';
  assert.equal((await route.GET(new Request('http://localhost/api/internal/video-jobs', { headers: { authorization: 'Bearer wrong' } }))).status, 401);
  // An asset saved before its queue upsert is repaired without an unbounded scan.
  const queuedAsset = { _id: assetId, key: sourceKey, versionId: 'v1', etag: 'etag' };
  const rows = values => ({ sort() { return this; }, limit(n) { assert.ok(n <= 2); return Promise.resolve(values); } });
  Asset.aggregate = async pipeline => { assert.equal(pipeline[0].$match.tenantId, tenantId); return pipeline[0].$match.status === 'deleted' ? [] : [queuedAsset]; };
  Asset.find = () => rows([queuedAsset]); Job.find = () => rows([]); Job.init = async () => {};
  Job.exists = async filter => { assert.equal(filter.tenantId, tenantId); return null; };
  let repaired = false;
  Job.updateOne = async (filter, update) => { if (update.$setOnInsert) { assert.equal(filter.sourceVersionId, 'v1'); assert.equal(update.$setOnInsert.provider, 'mediaconvert'); repaired = true; } return { matchedCount: 1 }; };
  await managed.reconcileManagedVideos(tenantId); assert.equal(repaired, true);
  // Delete during submitting must recover/cancel AWS, never retire its output scope.
  const cleanup = require('../lib/video/managedCleanup.ts');
  const deleting = { ...job, phase: 'submitting', state: 'cancelled', externalJobId: '', outputPrefixes: [job.outputPrefix] };
  Job.find = () => rows([deleting]); Asset.find = () => rows([]);
  Asset.findOne = async () => ({ _id: assetId, bucket: 'synthetic', status: 'deleted' });
  let cancelled = 0, removed = 0;
  MediaConvertClient.prototype.send = async command => {
    if (command.constructor.name === 'ListJobsCommand') return { Jobs: [{ Id: 'recovered', UserMetadata: { tenantId, jobId, attemptId } }] };
    if (command.constructor.name === 'GetJobCommand') return { Job: { Status: 'PROGRESSING', UserMetadata: { tenantId, jobId, attemptId } } };
    if (command.constructor.name === 'CancelJobCommand') { cancelled++; return {}; }
    throw Error('Unexpected AWS request');
  };
  sdk.s3Client = () => ({ send: async () => { removed++; throw Error('Must not delete live output'); } });
  await cleanup.cleanupManagedVideos(tenantId); assert.equal(cancelled, 1); assert.equal(removed, 0);
  // Terminal legacy FFmpeg output is still cleaned after removing laptop workers.
  const legacy = { ...job, provider: 'ffmpeg', state: 'failed', outputPrefixes: [job.outputPrefix] };
  Job.find = () => rows([legacy]);
  MediaConvertClient.prototype.send = async () => { throw Error('Legacy cleanup must not call MediaConvert'); };
  sdk.s3Client = () => ({ send: async command => {
    if (command.constructor.name === 'ListObjectVersionsCommand') return { Versions: [{ Key: `${job.outputPrefix}/stream_720p00000.ts`, VersionId: 'v1' }] };
    assert.equal(command.constructor.name, 'DeleteObjectCommand'); removed++; return {};
  } });
  await cleanup.cleanupManagedVideos(tenantId); assert.equal(removed, 1);
  const { assetJobStatuses } = require('../lib/video/jobStatus.ts');
  Job.find = filter => {
    assert.equal(filter.tenantId, tenantId); assert.deepEqual(filter.assetId.$in, [assetId]);
    return { sort() { return this; }, select(fields) { assert.ok(!fields.split(' ').includes('segments')); return this; }, lean: async () => [{ ...job, phase: 'encoding', providerPercent: 41, sourceVersionId: 'v1' }] };
  };
  const status = await assetJobStatuses(tenantId, [{ _id: assetId, key: sourceKey, versionId: 'v1', videoProcessingState: 'processing' }]);
  assert.equal(status.get(assetId).percent, 41); assert.equal('sourceKey' in status.get(assetId), false);
  assert.equal('syncToken' in status.get(assetId), false);
  // Check the Hobby scheduler's actual inline handler with a mocked HTTP boundary.
  const template = JSON.parse(fs.readFileSync(path.join(root, 'deploy/mediaconvert-hobby-scheduler.cloudformation.json'), 'utf8'));
  assert.equal(template.Parameters.CronSecret.NoEcho, true);
  assert.equal(template.Parameters.ScheduleState.Default, 'DISABLED');
  const sandbox = { exports: {}, AbortSignal, console: { info() {}, error() {} }, process: { env: { DEPLOYMENT_ORIGIN: 'https://example.vercel.app', CRON_SECRET: 'synthetic-only' } },
    fetch: async (url, options) => { assert.equal(url, 'https://example.vercel.app/api/internal/video-jobs'); assert.equal(options.headers.authorization, 'Bearer synthetic-only'); assert.equal(options.redirect, 'error'); return { ok: true, json: async () => ({ success: true, checked: 2 }) }; } };
  require('node:vm').runInNewContext(template.Resources.Trigger.Properties.Code.ZipFile, sandbox);
  assert.equal((await sandbox.exports.handler()).success, true);
  console.log('PASS managed job settings/scope, configuration, submission, ambiguous recovery without duplicates, verified publication and cron authorization');
  console.log('PASS claim-fenced status writes, orphan job repair, deletion-during-submission recovery, and legacy versioned cleanup');
  console.log('PASS tenant-scoped public progress and Hobby scheduler authorization/handler contract');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
