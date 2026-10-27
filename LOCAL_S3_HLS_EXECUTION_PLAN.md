> Updated 2026-10-26: The user requested real S3 mode only. Offline implementation below is historical. See local-media-pilot/README.md and IMPLEMENTATION_STATUS.md for the current S3-only setup and deployment steps.

# Local batch video platform: S3 uploads, HLS and learning progress

Date: 2026-10-24
Status: separate local app and 20 API contracts implemented with offline adapters, real FFmpeg conversion, batch publication and progress. Offline tests pass; live MongoDB/S3 validation and future deployment remain pending. See `local-media-pilot/README.md` and `local-media-pilot/IMPLEMENTATION_STATUS.md` for actual evidence and limits.

User follow-up confirmed: build and test OFFLINE first; no dedicated S3 test bucket exists yet. The working default therefore uses synthetic reference users/batches and isolated local files rather than accessing the running database. Explicit MongoDB/S3 adapters are separate and disabled until later configuration. No production connection or deployment is required to try the local demonstration.
Priority: work end to end locally before considering any deployment or production cutover.

## 1. Requested outcome

An administrator opens the NEW local admin panel, selects a specific existing course/batch, uploads a large recording directly to private S3, and sees its upload/conversion status. A local background worker compresses that recording into small HLS video segments, uploads playlists and segments to a private S3 prefix, and records validated metadata in new collections in the SAME MongoDB database used by the running application.

A student opens the NEW local student panel, sees only authorized batches and only that selected batch's published recordings, plays directly from private S3 with temporary segment links, resumes from their last position, and sees watched/pending progress. The local admin report shows progress for that batch only.

Production server deployment, existing API replacement, production data migration and automatic cutover are excluded. CloudFront, Lambda streaming and MediaConvert are excluded. Local FFmpeg performs conversion.

This expands the earlier six-API, original-MP4 pilot. Multipart upload pieces are NOT HLS playback segments. This phase deliberately adds compression, playlists, batch publication and progress that the existing MP4 pilot does not provide.

## 2. Isolation architecture: same database, new writes only

The implementation should use a separate local Next.js app under `local-media-pilot/`, served only on loopback, for example `http://localhost:3100`. This keeps its admin/student layouts, login, polling and APIs out of the existing app's root layout, Navbar, chatbot and login side effects. Reuse visual patterns and safe pure helpers; do not import legacy API handlers or global Mongoose models into the pilot.

This is still inside this project/workspace, but has its own package/lockfile/config, start scripts and local environment file. It does not alter the main app's normal entry point. Future integration is a separate step after acceptance.

| Resource | Allowed local behavior | Forbidden |
| --- | --- | --- |
| Running production website/server | None | Deploying, restarting, reconfiguring or calling mutation APIs |
| Existing MongoDB users/courses/batches/enrollments/tenant collections | Bounded read-only lookup with authorization | save, update, upsert, delete, seed, index creation or backfill |
| Existing production progress/payment/notification/audit collections | No reads unless a concrete read-only need is documented | Any writes, notifications, emails, fees or payment effects |
| New pilot MongoDB collections | Explicitly namespaced writes | Writing through existing production models |
| Existing SharePoint and existing S3 MP4 pilot | Leave intact | Deleting originals, replacing URLs, changing current API contracts |
| S3 | Dedicated private DEVELOPMENT bucket preferred; otherwise dedicated pilot-only prefix and IAM scope | Production object writes, shared lifecycle edits, public ACLs or root-level deletes |

Sharing a database means reads and new writes still consume database capacity. Logical isolation can prevent intentional changes to existing records, but cannot promise zero performance impact. Use low concurrency, bounded queries and a small first pilot; stop if database latency rises.

Set a server-only immutable `LOCAL_MEDIA_ENV_ID`, e.g. a generated random ID for this pilot. Require it in every new document, query, index key, job and S3 object path. Resolve tenant ID from trusted local configuration plus the existing tenant record; never trust a client tenant/env ID or an arbitrary Host header.

### Database connection and permission boundary

- Same MongoDB URI/database target, but preferably a dedicated MongoDB identity with READ on the exact existing reference collections and READ/WRITE on an explicit pilot collection allowlist.
- Use a separate `mongoose.createConnection` with a small pool and `autoIndex: false`; do not reuse the existing global connection/models.
- Read legacy reference collections through a restricted repository with projections and explicit tenant/legacy ownership rules. Verify actual deployed collection names before defining permissions; do not guess pluralized names.
- New pilot models bind to explicit collection names below. A controlled bootstrap creates indexes only for allowlisted new collections after checking the environment guard.
- No `syncIndexes`, `dropDatabase`, generic collection cleanup, broad migrations or automatic legacy schema initialization.
- Restrict local test operations to one configured tenant and explicit batch allowlist initially. If the existing tenant fields are absent, use an explicit FinOps-only legacy mapping; do not treat every unscoped record as belonging to every tenant.

## 3. Login without invalidating production sessions

DO NOT call the existing `/api/login`, `/api/logout`, signup, reset-password or device-registration routes from the local pilot. Current production login changes User.sessionToken, activeDevice and isLoggedIn; that could log a user out on the running site.

Implement new local authentication:

1. Read the existing user's email/password hash and role without modifying it; use the existing bcrypt-compatible password verification.
2. Check configured tenant, allowed role/account and pilot authorization. Do not weaken an existing account suspension policy; inspect any account restrictions before implementation.
3. Generate an independent random pilot session, store only its token hash in a NEW session collection, and issue a separate HttpOnly, SameSite=Strict pilot cookie.
4. Secure cookies on HTTPS; allow a documented local-development exception on loopback HTTP only. Bind all local routes to development mode, the exact configured loopback origin and an explicit enable flag; do not trust forwarded headers to bypass those guards.
5. Enforce origin/CSRF protection on mutations, login rate limits, expiry and role checks. Logout revokes only pilot sessions.
6. Do not write pilot credentials into existing `localStorage.user/sessionToken/deviceId`, emit StudentEvent records, update lastLoginAt or send notifications.

Admin and student tests can use separate local browser profiles/sessions. If existing users lack an enrolled test batch, create membership overrides only in a new pilot collection through a controlled seed command for explicitly allowlisted test users/batches. Default is to use existing enrollment READS; never insert fake production enrollments.

## 4. Upload, conversion and playback architecture

```text
Local admin UI
  -> local auth + batch authorization
  -> multipart init/sign APIs
  -> browser uploads original parts directly to private S3
  -> complete API verifies original and enqueues NEW MongoDB job

Local Node worker (separate process, concurrency 1)
  -> claims job with lease
  -> downloads only its pilot original to controlled local temp directory
  -> ffprobe validates streams/duration
  -> FFmpeg compresses + produces VOD HLS playlists/segments
  -> uploads output version to private S3
  -> validates playlist/index/object set
  -> marks processed version READY in new DB collections

Local admin reviews -> explicitly publishes into the selected pilot batch

Local student UI
  -> lists authorized batches
  -> fetches only selected batch's published videos/progress
  -> authorization creates bounded playback grant
  -> player reads small manifest metadata and requests segment URL batches
  -> browser fetches segment BYTES directly from S3
  -> local progress API records validated playback evidence
  -> local admin reads selected-batch progress report
```

The worker runs outside HTTP requests, never inside the production server process. Video bytes are not proxied by the local Next.js API. Small playlists, progress and URL-signing responses do use local APIs.

## 5. S3 structure and original-file handling

Use server-generated opaque IDs, never user-supplied paths:

```text
pilot/<envId>/<tenantId>/batches/<batchId>/assets/<assetId>/
  source/<sourceVersion>/original.mp4
  output/<outputVersion>/master.m3u8
  output/<outputVersion>/480p/index.m3u8
  output/<outputVersion>/480p/segment-000001.ts
  output/<outputVersion>/720p/index.m3u8
  output/<outputVersion>/720p/segment-000001.ts
```

S3 folders are key prefixes, not actual filesystem folders. Store playlists/segments in S3; store their durable keys, rendition/index metadata, counts, durations and job state in MongoDB. Never store video bytes or permanent presigned URLs in MongoDB.

Keep bucket private: Block Public Access, encryption, HTTPS-only, narrow IAM and development-origin CORS. Browser PUT must expose ETag. Browser playback GET must allow required headers and expose appropriate response metadata. Credentials never reach the browser.

Do not enable delete/lifecycle rules on a shared production bucket as part of this pilot. Prefer a dedicated bucket with retained originals and incomplete-multipart cleanup. Failed outputs are unpublished and require an audited, pilot-prefix-only cleanup procedure.

Actual S3 is required for the real upload/private-playback acceptance test; an emulator can support offline development but cannot prove AWS IAM/CORS. Creating storage configuration is distinct from deploying the application. No resources are created by this document.

## 6. Local conversion settings and job safety

- Start with H.264 video + AAC audio, 480p and 720p, approximately 10-second MPEG-TS segments with audio muxed into each rendition.
- Use closed/aligned GOPs and aligned segment boundaries across renditions. Use VOD playlists, not an indefinitely growing live playlist. FFmpeg creates playlists and playable media segments; arbitrary byte splitting is insufficient.
- Validate representative slides/code for readability before finalizing bitrate. Start with a measured delivered-bitrate target around 1.2 Mbps for planning, not a quality guarantee.
- Use `ffprobe` to validate file/streams/duration and reject unsupported/encrypted inputs. MIME/filename or the current 32-byte MP4 header check alone is insufficient for this pipeline.
- Spawn FFmpeg with argument arrays and shell disabled; accept only a validated local input path and server-generated output paths. Do not pass arbitrary remote URLs, protocol strings, shell fragments or playlist references from clients.
- Limit duration, input size, resolution, disk budget, runtime, thread count and output count. Initial upload maximum: configurable 10 GiB; actual acceptance must include a multi-GB file.
- Worker concurrency 1 initially. Job claims use atomic updates, renewable leases and a generation/fencing token. Stale workers must not publish after another worker retries the job.
- Capture bounded progress/error metadata; never persist signed URLs or secrets in FFmpeg logs. Authenticate workers through local configuration and constrained DB/S3 permissions, not a public callback endpoint.
- Upload into a new immutable version. Validate every referenced playlist/segment against the generated index and prefix; reject external URLs, `../`, unexpected key/encryption references and missing objects.
- Mark READY only after validation. Admin publication is a separate state. Replacing an asset creates a new version; existing sessions stay pinned to their authorized version.
- Retry failures idempotently; preserve originals and diagnostics. Clean local temp files only under a resolved, verified pilot temp root and only after handles/processes close.

## 7. New pilot collections

All names are explicit `local_media_*` collections; every document is scoped by envId + tenantId. Do not reuse the already-created S3Asset/S3Upload collections for these tests.

| Collection | Information |
| --- | --- |
| local_media_sessions | Independent pilot login token hashes, role/user mapping, expiry/revocation |
| local_media_memberships | Optional allowlisted test membership overrides; disabled by default |
| local_media_assets | Original file, target batch/course, processing/publication state, active version |
| local_media_uploads | Multipart session, ownership, part metadata, expiry, idempotency and quotas |
| local_media_jobs | Local conversion queue, lease/fencing token, progress, attempts/errors |
| local_media_versions | Immutable playlist keys, rendition metadata, trusted segment index, durations/byte sizes |
| local_media_playbacks | Authorized user/batch/asset/version grants, expiry and device/session mapping |
| local_media_progress | User/batch/asset/version resume position, merged watched intervals and completion summary |
| local_media_events | Deduplicated playback/progress evidence with bounded retention |
| local_media_audit | Pilot upload, publication and access events without credentials/signed URLs |

Define unique env/tenant/user/asset/version indexes, upload idempotency, job claims, event sequence deduplication and batch/publication/time sort indexes. TTL may expire pilot login/events, but must not erase unfinished-upload cleanup information. Never create indexes on existing collections.

## 8. NEW local APIs and frontend screens

All routes below are NEW contracts under `/api/local-media/v1`, now dispatched by the separate local app's catch-all API route. They are NOT the six existing `/api/s3` routes. Existing endpoints remain unchanged. The separate app also has one offline-only signed object-store simulator route for testing without AWS.

| # | Method/path relative to /api/local-media/v1 | Purpose |
| --- | --- | --- |
| 1 | POST /auth/login | Independent pilot authentication; no production session mutation |
| 2 | GET /auth/session | Current pilot role/session information |
| 3 | POST /auth/logout | Revoke only local pilot session |
| 4 | GET /admin/batches | Bounded allowed existing-batch metadata, read-only |
| 5 | GET /admin/batches/[batchId]/media | Paginated pilot media for this one batch |
| 6 | POST /admin/uploads | Authorize selected batch, initialize owned multipart upload |
| 7 | POST /admin/uploads/[id]/parts | Bounded, size-bound upload-part URL signing |
| 8 | POST /admin/uploads/[id]/complete | Verify original, finalize idempotently, enqueue conversion |
| 9 | POST /admin/uploads/[id]/abort | Cancel unfinished upload with ownership checks |
| 10 | GET /admin/assets/[id] | Upload/conversion/publication status with bounded details |
| 11 | POST /admin/assets/[id]/retry | Retry eligible failed processing with a new job/version |
| 12 | POST /admin/assets/[id]/publication | Explicit publish/unpublish of a validated version for its stored batch |
| 13 | GET /admin/batches/[batchId]/progress | Paginated roster/video watched/pending report |
| 14 | GET /student/batches | Only batches this pilot student may access |
| 15 | GET /student/batches/[batchId]/videos | Selected-batch published videos + progress only |
| 16 | POST /student/playbacks | Verify enrollment/publication and create/renew a bounded grant |
| 17 | GET /student/playbacks/[id]/manifest | Small validated master/media playlist or equivalent indexed metadata |
| 18 | POST /student/playbacks/[id]/segments | Sign a bounded set of trusted segment IDs for this authorized version |
| 19 | POST /student/progress | Deduplicated, bounded progress heartbeat/final update |
| 20 | GET /student/batches/[batchId]/progress | Student's own watched/pending summary for selected batch |

No generic arbitrary-S3-key signer, upload-byte proxy, segment-byte proxy, public worker callback or production-update endpoint is needed. Worker claims/processes jobs directly through constrained new repositories. Pagination, ownership, origin and request-size guards apply to every API.

Local screens in the separate app:

- `/login`: independent local pilot login; route by verified role.
- `/admin/batches`: select allowed batch; show only batch metadata needed for uploading.
- `/admin/batches/[id]/media`: upload/resume/cancel, job stage, safe error, retry and publication controls.
- `/admin/batches/[id]/progress`: student/video progress, pending minutes and paginated completion summary.
- `/student/batches`: authorized batches only.
- `/student/batches/[id]`: published lessons, not-started/in-progress/completed indicators.
- `/student/batches/[id]/videos/[assetId]`: protected HLS player with resume and progress.

Use status messages meaningful to users: Uploading, Processing, Ready for review, Published and Failed. Do not expose cloud credentials, internal keys or stack traces.

## 9. Private HLS playback without CloudFront

S3 presigned URLs authorize individual objects, not an entire folder. Signing only master.m3u8 does not authorize child playlists or segments.

Use hls.js with a custom loader for the first supported browser set:

1. Fetch only small trusted manifest/index data from the local API after authorization.
2. Resolve logical rendition/segment IDs through the server-owned version index.
3. Request up to about 12 consecutive segment URLs per signing call; initially expire URLs after about three minutes, clamped to playback grant and AWS credential expiry.
4. Fetch video segment bytes directly from S3. Keep forward buffering around 20-30 seconds; do not fetch the whole recording or every rendition.
5. On seek, sign near the target position and stop unnecessary old work. Pause new loading when paused/hidden without discarding the entire buffered session unnecessarily.
6. Renew authorization while actively playing. Retry an expiry-related failure once with a fresh URL; stop on revoked enrollment or unpublication, and bound other retries.
7. Pin sessions to immutable output versions. Expiry stops new requests; already issued links/received bytes are not instantly revocable.

Native-only Safari playback cannot automatically use a JavaScript hls.js segment loader. Explicitly detect supported MSE/Managed Media Source paths and test iOS/macOS. Implement a separately validated native adapter before promising Safari support; until then show an honest unsupported-browser state for the pilot. Never fall back to public objects or expose the original recording as a bypass.

Keep personalized watermarks, custom controls and browser deterrents. They do not prevent OS screenshots or an authorized user capturing delivered media. DRM is outside this local pilot.

## 10. Watched, pending and resume tracking

Existing LessonProgress only records completion; do not write into it or treat it as detailed viewing evidence. Build the new progress model in isolated collections.

- Load expected duration from validated server-side conversion metadata, not a client-provided total.
- Record last position for resume separately from covered/unique watched intervals. Seeking to the end must not mark the intervening lesson watched.
- Send progress every approximately 20-30 seconds while actually playing, plus best-effort pause/end/visibility updates. Do not write on every timeupdate frame or segment request.
- Accept only bounded positions/rates, ordered sequence IDs and plausible wall-clock deltas for the current authorized playback. Merge overlapping intervals so replaying a section does not double count coverage.
- Discontinuities/seeks do not credit skipped content. Account for a bounded supported playback rate, stalls and pauses. Concurrent tabs/events require deduplication and optimistic concurrency or atomic updates.
- Example completion rule: at least 95% unique timeline coverage plus reaching near the end. Make the rule explicit/configurable and test it; clicking the end alone cannot satisfy it.
- Video pending seconds = validated duration minus unique covered seconds. Batch completion uses only currently published authorized videos with a documented version/reset policy.
- Distinguish not started, in progress, completed and unavailable. Failed/unpublished recordings do not inflate a student's pending lesson total.
- A new encoding of the same lesson may preserve progress only under an explicit compatible-duration mapping; otherwise start a new version's progress and retain history.
- Server checks plus playback events discourage simple forged progress; they cannot prove a human paid attention. Reports are platform viewing records, not proctoring evidence.

Admin report: selected batch, student, published video, watched/pending minutes, percentage, last activity and completion. Enforce role and tenant scope, pagination and a small response projection; avoid full production student data exports.

## 11. Only load the selected batch

- Student batch list contains only verified memberships; batch videos endpoint requires independent authorization again.
- Media queries include envId, tenantId, batchId and published status with a compound index; never download all assets and filter in the browser.
- Fetch a paginated lesson summary first. Obtain manifests/segment links only when that student opens a lesson.
- Lazy-mount the active player; unmount/abort it when switching batch/lesson. Do not preload all videos on the batch screen.
- Load the student's own progress only. Admin reports use server-side batch filtering and pagination.
- While active, poll only the selected pending job with backoff. Stop polling after ready/failure or when hidden. No five-second global polling.
- Do not call legacy notifications/nav-badges/student-activity APIs from the separate pilot layout.

## 12. Implementation files and current-code reuse

Proposed directories:

```text
local-media-pilot/
  app/(auth)/login/ ... admin/ ... student/ ... api/local-media/v1/...
  components/BatchUploadPanel.tsx, BatchMediaList.tsx, HlsLessonPlayer.tsx, BatchProgressReport.tsx
  lib/pilot/{config,guards,db,auth,legacyReads,repositories,validation}.ts
  lib/storage/{s3,multipart,signing}.ts
  lib/media/{manifestIndex,playback,progress}.ts
  models/                 explicit local_media_* collection bindings
  worker/{index,claim,probe,encode,publish,tempPaths}.ts
  scripts/{preflight,bootstrapPilot,seedPilotMemberships,reconcilePilot}.ts
  tests/                 unit, repository, API, worker and browser coverage
  .env.example           placeholders only; .env.local stays ignored
  README.md              exact local startup/configuration and evidence
```

Reuse reviewed algorithms from lib/storage/s3Validation.ts and multipart/signing helpers, but adapt imports so they do not load production models or connections. Preserve all existing six S3 APIs and their MP4 pilot screens. Add a new local HLS player instead of changing legacy playback behavior.

No edits to production User/Enrollment/Batch/Course/LessonProgress schemas or existing API handlers for this phase. Any future integration must be reviewed separately.

## 13. Local configuration and startup

Required future server-only configuration: explicit LOCAL_MEDIA_ENABLED, LOCAL_MEDIA_ENV_ID, LOCAL_MEDIA_ORIGIN, LOCAL_MEDIA_TENANT_ID, batch allowlist, existing MongoDB database target through a restricted credential, AWS region/bucket/pilot prefix and role/profile, absolute FFmpeg/ffprobe paths, verified temp root, upload/duration/disk/thread limits, and pilot session settings.

Do not read or print secret values into documentation, CLI output, browser bundles or Git. Do not overwrite the main app's .env. The nested app's .env.local is independently ignored.

Future local run order:

1. Preflight: verify loopback binding, local enable flag, namespace, restricted DB identity, FFmpeg tools, free disk and private S3/CORS. Fail closed on production/shared prefixes or missing env scope.
2. Bootstrap only allowlisted NEW collection indexes and optional approved pilot membership fixtures. Produce a dry-run summary before any live DB writes.
3. Start the separate local web app on loopback port 3100 and the local worker as a separate foreground process.
4. Log in through the pilot login; confirm no production session fields changed through read-only comparison.
5. Upload a representative recording through the selected batch panel; observe uploading -> queued -> processing -> ready -> published.
6. Log in as an enrolled student in another browser profile and complete the playback/progress acceptance flow.

These are planned commands/workflows; do not present them as already installed or running.

## 14. Ordered work and acceptance gates

- [ ] Freeze existing API/main-screen behavior with current regression tests; record baseline without exposing production data.
- [ ] Create separate local app, namespace/loopback guards and ignored local configuration.
- [ ] Build restricted DB repositories and independent pilot authentication. Tests must fail if any legacy write method is invoked.
- [ ] Define and bootstrap only new collections/indexes; verify references to existing batches are read-only.
- [ ] Implement new admin/student batch selection and new multipart upload contracts.
- [ ] Test a multi-GB browser-direct upload, interruption/resume, duplicate completion and cancellation.
- [ ] Implement local worker with lease/fencing, disk limits, safe FFmpeg execution and failure recovery.
- [ ] Generate/validate/upload HLS outputs and playlist index; publish explicitly into the one chosen pilot batch.
- [ ] Implement private segment signing/custom loader and selected-batch-only frontend loading.
- [ ] Test one-hour playback, seeking, quality switching, slow network, long pause and URL expiry/renewal.
- [ ] Implement unique watched coverage, resume, pending totals, ordered heartbeats and selected-batch admin report.
- [ ] Test skipped/replayed intervals, duplicate/out-of-order/concurrent events, near-end seeking, blocked users and unpublication.
- [ ] Validate live AWS CORS/IAM and real DB new-collection behavior in a small controlled pilot.
- [ ] Verify original user session/device, batches, enrollments, production progress and notifications remain unchanged by pilot operations.
- [ ] Record build/type/lint/unit/API/browser results and actual S3/disk/worker usage. A mocked test is not live proof.
- [ ] Review local acceptance evidence before discussing future deployment; no automatic cutover.

### Mandatory end-to-end test scenario

Admin selects Batch A -> uploads a large MP4 directly to private S3 -> pauses/resumes -> completion queues conversion -> worker produces playable segments/playlists -> all output metadata saved only in pilot collections -> admin publishes -> authorized Batch A student sees it -> Batch B student is denied -> student watches a section, skips ahead and closes -> only actual validated coverage is credited -> reopening resumes -> admin sees correct watched/pending report -> expired links renew -> production login/session and existing content records remain unchanged.

Also kill/restart the worker mid-conversion, retry failed jobs, test unpublished media, wrong tenant/batch/asset IDs, malformed uploads, expired local sessions, and cleanup dry runs that cannot reach production prefixes/collections.

## 15. Cost, rollback and remaining limits

Local application hosting/conversion avoids deploying a paid web or conversion service, but real S3 storage, PUT/GET and internet delivery can still cost money. Downloading the original from S3 to the local worker also consumes transfer; final viewing traffic remains billable. Start with a few controlled videos/students, not 500 real daily users on a development machine.

500 x one hour x 30 days remains 15,000 viewing hours; at a measured combined average 1.2 Mbps, approximately 8.1 decimal TB/month before overhead. Compression may reduce bytes; segmentation alone does not. No CloudFront allowance is assumed.

Rollback: stop only the local app/worker and disable LOCAL_MEDIA_ENABLED. Leave production untouched. Retain original recordings and pilot records for inspection. Cleanup must target the exact allowlisted local_media collections/documents and pilot/envId prefix, support dry-run, and never use broad database/bucket deletion. Already issued presigned links expire according to their lifetime.

Known gates: actual AWS/DB credentials and permissions, installed FFmpeg/ffprobe, local disk/CPU capacity, browser support, shared-DB load and live end-to-end evidence. None has been verified merely by writing this plan.

## References

- FFmpeg HLS muxer, keyframe alignment, VOD playlists: https://ffmpeg.org/ffmpeg-formats.html#hls
- AWS object-specific presigned URLs and expiry: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- Existing implementation evidence: S3_IMPLEMENTATION_CHECKLIST.md
- Existing MP4 pilot setup: infra/s3/README.md
