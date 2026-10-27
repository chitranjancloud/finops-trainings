# Video segmentation: setup and implementation status

Updated: 2026-10-27

The main batch upload/player now includes video-only HLS processing. PDFs, study materials, and assignments continue through their existing flow. This is an in-project implementation, not the earlier separate `local-media-pilot` app.

## Enable locally

1. Install dependencies with `npm install`. FFmpeg, ffprobe, HLS.js, and the TypeScript worker runner are included. The FFmpeg package downloads a platform-specific executable during installation; installation must finish successfully. Alternatively, configure your own supported executables through `FFMPEG_PATH` and `FFPROBE_PATH`.
2. Use the existing MongoDB and S3 configuration. MongoDB must support transactions (Atlas or a replica set); the worker deliberately refuses standalone MongoDB because replacement publication must be atomic.
3. Set these server-only variables in your local environment, using the exact intended tenant ID:

   ```dotenv
   S3_UPLOAD_ENABLED=true
   S3_PLAYBACK_ENABLED=true
   S3_VIDEO_SEGMENTATION_ENABLED=true
   VIDEO_WORKER_ENABLED=true
   VIDEO_WORKER_TENANT_ID=<existing-tenant-object-id>
   ```

4. Start the website with `npm run dev`.
5. In a second terminal, from this same project folder, run `npm run video:worker`.
6. Upload an MP4 in `/admin-page/batches` under Videos. The admin list refreshes queued/processing rows every ten seconds. Keep the worker running until the video shows Ready.
7. Open the recording in the admin preview or the enrolled student's batch. The browser should request a manifest and individual segment URLs instead of the original MP4.

This local workspace has now been configured with segmentation enabled and the video worker started for the existing FinOps tenant. MongoDB transaction support was verified. Keep the worker running; after a machine/process restart, start it again with `npm run video:worker`. Environment templates still default to disabled for other installations. Existing recordings are converted only through **Prepare segments**; bucket configuration is not automatically changed.

Local scratch is configured as `D:/FinOpsVideoTemp` because C: had insufficient free space. The approved folder was created with Windows administrator approval and this account was granted Modify access to that folder only. The drive-root ACL was not changed. `scripts/setup-video-scratch.ps1` records the narrowly scoped setup for this machine; it is not required on deployments with an already writable scratch folder.

New uploads follow **Uploading → Queued → Processing → Ready** automatically after the original upload is verified. A recording stays one named row; segment objects are not listed as separate videos. Opening a ready recording in either admin or student views loads its player directly. The student Videos list refreshes every ten seconds, and an open admin preview updates when its recording becomes ready.

## Existing recordings

Existing original-MP4 assets retain their current player until explicitly converted. Use **Prepare segments** on a ready legacy video to queue conversion while segmentation is enabled. During that conversion the selected video uses processing status instead of silently falling back to the original file. New enabled uploads automatically queue conversion.

**Retry processing** retries failed conversion. Invalid/corrupt media requires a corrected upload. A video replacement preserves the previous recording until the new segmented output passes validation and the transaction switches publication.

## Worker requirements

- Run a separate supervised process/container with the same server-side MongoDB and S3 environment as the app and the intended tenant ID.
- One worker processes one recording at a time. Jobs have renewable leases, bounded retries, and source-scoped idempotency. Multiple workers can share the queue, but start with one.
- The initial profile is maximum 720p H.264/AAC, approximately six-second MPEG-TS segments, one quality rendition, no upscaling, and a full VOD playlist.
- Hard limits: 10 GiB source uploads (existing policy), 12-hour duration, 8192-pixel input dimensions, 10,000 segments, 20 GiB encoded media, and 24-hour conversion timeout.
- Free disk before each job must cover source bytes plus 22 GiB. A disk monitor aborts encoding below 1 GiB free. Scratch is under the OS temporary folder `finops-video`, or your configured `VIDEO_TEMP_ROOT`.
- FFmpeg and ffprobe run with generated paths, an argument array, a restricted protocol allowlist, and no shell interpolation. Run them under a restricted service account and keep your configured tool versions updated.
- Temporary files are removed after normal completion/failure. An OS/process crash can leave a scratch directory: stop the relevant worker and inspect its job/lease before manually removing abandoned scratch. Do not delete an active job directory.
- Set service restart/backoff and monitor worker errors, queue age, disk, conversion duration, and output size. Processing time depends on recording complexity and available CPU; no fixed conversion-time promise is made.

## S3 permissions and CORS

Derived objects now live beside their original recording, under the same batch and lesson date:

```text
tenant/<tenantId>/courses/<courseId>/batches/<batchId>/video/<lesson-date>/
  <assetId>/<source-generation>/
    <original-filename>.mp4
    output/<jobId>/<attemptId>/
      index.m3u8
      segment-000000.ts
      segment-000001.ts
      ...
```

The original upload key and filename stay unchanged. New conversions use this layout automatically. The uploaded `sample-30s-720p.mp4` test recording was migrated to it: the playlist and all six segments were copied and verified before their database references were switched transactionally. Previous output copies are retired by the worker after already issued links expire.

For another existing video, preview the exact move using `npm run video:move-output -- --asset-id <id>`. Stop the local worker before adding `--apply`, then restart it. The script validates the original date folder, pins and verifies object versions, and touches only the explicitly selected video's output. Failed copies leave the current output active and register partial output for cleanup.

The worker needs GetObject/GetObjectVersion for original videos; PutObject and Head/GetObject for derived output; and ListBucketVersions plus DeleteObject/DeleteObjectVersion for cleanup. The example CloudFormation policy now includes version listing. Apply infrastructure changes through your normal deployment process; do not replace an existing bucket's shared CORS or IAM policies blindly.

Browser playback needs GET/HEAD CORS for your exact app origin and required Range behavior. Existing multipart upload PUT CORS must remain available. Keep bucket public access blocked.

The app authorizes each segment request and returns a small 307 redirect; the browser downloads the actual video bytes directly from S3. Requests pin exact object versions when bucket versioning is available. No video bytes are proxied through Next.js.

## Playback security and browser behavior

### How the frontend loads and renders

1. The admin/student list requests asset metadata from the app. Each recording is one row with its original filename. Segment files never become separate lessons.
2. Opening that row renders the shared `S3AssetViewer` / `S3VideoPlayer`, which requests `/api/s3/student/access-url`. The server verifies access and returns an expiring manifest URL.
3. The manifest route builds an authorized `.m3u8` playlist from the saved ordered segment index. It represents the same segments as the stored S3 playlist, with application resolver URLs so private access is checked for every segment.
4. HLS.js reads that playlist, requests upcoming segment indices, and follows short redirects to temporary S3 URLs. Media bytes come directly from the new date-based S3 keys. The frontend does not list S3 folders or guess storage paths.
5. HLS.js appends those bytes to one video element, retaining the existing controls and watermark. Segments play on one continuous timeline with a small forward buffer. Native HLS browsers use the same authorized playlist/resolver flow.

The frontend uses asset/output IDs rather than hard-coded S3 folder names. Updating the verified segment keys in the database makes both admin and student players use the new folder automatically, including existing playback sessions on their next segment request.

- Playback tokens are random bearer credentials scoped through a hashed server record to tenant, user, login/device hashes, asset, output version, and expiry. They do not contain the original login token.
- Thirty-minute playback grants renew while the video is actively playing. Segment links retain the existing bounded S3 access URL lifetime.
- Enrollment, source availability, current output, and login/device state are checked again for manifests/segments. Database TTL removal is housekeeping; each request explicitly checks expiry.
- Redact `/api/s3/video-playback/<token>/...` path components from reverse proxy/access logs and analytics. Never log signed redirect locations or login credentials. Responses are private/no-store with a no-referrer policy.
- The initial implementation uses the same authorized segment-resolver redirect path for HLS.js and native HLS. This avoids separate fragile native-loader authentication, while video bytes still travel directly from S3. A future batched signing loader can reduce redirect/API request volume if measurements justify it.
- HLS.js targets an 18-second forward buffer and 12-second retained back buffer. Browser caches/decoders add memory; these are targets, not exact memory guarantees. Native Safari controls its own buffering.
- Pause stops HLS.js loading. Seeking loads media around the selected time. Expired sessions can be reopened while preserving the current lesson time.
- Access denial stops new loading; already issued URLs and downloaded media can remain usable temporarily. Watermarks and private URLs are not DRM or a guarantee against copying/screen recording.

## Deletion and rollback

Deletion removes new student access immediately and marks video jobs cancelled. The worker cleans versioned derived objects and retries cleanup. Keep it running even if accepting new conversions is disabled. An already running worker may need its lease/heartbeat interval to observe cancellation; repeated cleanup catches late writes.

Set `S3_VIDEO_SEGMENTATION_ENABLED=false` to stop new conversions. Leave `VIDEO_WORKER_ENABLED=true` when running cleanup. Existing HLS lessons still need their playback routes and S3 objects. Do not disable playback or remove these routes while published lessons reference them.

Original retention after replacement follows existing asset policy; automatic deletion of replaced originals is not introduced. Failed attempt outputs are swept by the worker. Old validated replaced outputs remain until explicit deletion/retention handling.

## Verification commands

```text
npm run test:s3
npm run test:video
npm run test:video:media
npm run test:video:ui
npx tsc --noEmit
npm run build
```

- `test:s3`: existing storage regressions with mocked storage/database boundaries.
- `test:video`: playlist validation, queue ownership/idempotency, processing gating, hashed grants, resolver authorization, renewal, and deleted-source behavior, without live services.
- `test:video:media`: generated local recordings exercise real FFmpeg conversion, segment durations, silent video, corrupt input, and cancellation.
- `test:video:ui`: generated media, intercepted app APIs, and a temporary loopback media server exercise the actual player in local Chrome, including cross-origin redirects. Default test origin is `http://127.0.0.1:3109`. Start a local server with `S3_PLAYBACK_ENABLED=true`, or set `VIDEO_TEST_START_SERVER=true` to let the test start/stop an isolated built server automatically (build first with `S3_ISOLATED_BUILD=true`). Override with `VIDEO_TEST_BASE_URL` and `LOCAL_MEDIA_BROWSER`. The test does not use real users or AWS.

Verified locally: production build and TypeScript pass; 41 existing storage checks, 20 video boundary/transaction/upload/folder checks, four real FFmpeg media checks, and six Chromium playback checks pass. The browser checks cover bounded initial fetching, continuous playback across boundaries, pause behavior, seeking to distant media, and one named recording opening directly into segmented playback in both admin and student batch views.

## Live acceptance still required

Local generated-media/mocked-boundary checks do not establish live infrastructure readiness. Before rollout, verify a real two-hour recording through your configured S3/MongoDB worker, playback beyond the initial grant lifetime, a worker crash/recovery, replacement/deletion during processing, cross-tenant/enrollment denial, slow-network recovery, and real Safari/iOS playback. Confirm logging redaction and IAM/CORS in the target environment.

The implementation combines validated output metadata and the ordered segment index into the job document, rather than adding a separate output collection. The enforced segment count keeps this bounded for the initial profile; output publication remains versioned and transactional. Separate output records or paginated indices can be added if longer/multi-rendition recordings require them.
