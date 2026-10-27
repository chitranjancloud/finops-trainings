> Current implementation (2026-10-26): all four batch Content categories now use S3, with date filters, database trace/history, replacement and deletion. See [S3_BATCH_CONTENT_GUIDE.md](S3_BATCH_CONTENT_GUIDE.md) for the current setup, behavior and verified tests. Older pilot-only notes below are historical.

> Update 2026-10-26: New uploads in Admin → Batches → Content → Videos now use the S3 uploader with automatic course/batch selection. Students see ready S3 videos under their batch Materials tab via the new GET /api/s3/student/assets endpoint. Existing SharePoint files and non-video uploads are unchanged. The deleted local-media-pilot app is not used.

# S3 implementation: end-to-end review checklist

> Scope update: the NEW requested local HLS/conversion/progress work is planned in [LOCAL_S3_HLS_EXECUTION_PLAN.md](LOCAL_S3_HLS_EXECUTION_PLAN.md). This checklist records the existing MP4 pilot only. HLS and independent local authentication must not be marked completed from its existing test results.

Reviewed: 2026-10-24
Result: all six planned API contracts exist and are connected to handlers. This is an implemented, disabled-by-default MP4 pilot, not a completed production migration.

Legend: checked = implemented or verified as specifically stated; unchecked = pending. Code presence does not mean the corresponding live AWS/browser workflow has passed.

## 1. API inventory: 6 of 6 implemented

| Done | Method and new endpoint | Source file | Handler | Flag |
| --- | --- | --- | --- | --- |
| Yes | POST /api/s3/admin/uploads | app/api/s3/admin/uploads/route.ts | initUpload | S3_UPLOAD_ENABLED |
| Yes | POST /api/s3/admin/uploads/[id]/parts | app/api/s3/admin/uploads/[id]/parts/route.ts | uploadParts | S3_UPLOAD_ENABLED |
| Yes | POST /api/s3/admin/uploads/[id]/complete | app/api/s3/admin/uploads/[id]/complete/route.ts | finishUpload | S3_UPLOAD_ENABLED |
| Yes | POST /api/s3/admin/uploads/[id]/abort | app/api/s3/admin/uploads/[id]/abort/route.ts | cancelUpload | S3_UPLOAD_ENABLED |
| Yes | GET /api/s3/admin/assets | app/api/s3/admin/assets/route.ts | assetList | S3_UPLOAD_ENABLED |
| Yes | POST /api/s3/student/access-url | app/api/s3/student/access-url/route.ts | accessUrl | S3_PLAYBACK_ENABLED |

Implementation lives in lib/storage/s3Api.ts; route files export the appropriate handler through storageRoute. They use the Node.js runtime. Flags must equal the string `true`; missing/false flags return 503 before database or AWS access. All six disabled routes were checked against the compiled application during the previous implementation validation.

Authentication headers: x-user-id, x-session-token, x-device-id. API credentials are never passed in query strings. Admin operations require a verified admin role; access-url also allows enrolled students and verified admin previews. Private API responses use Cache-Control: private, no-store.

### Contract details

1. Upload init: JSON filename, contentType, byteSize, courseId, optional batchId, idempotencyKey. Verifies the target scope, reserves an owned upload slot, creates a private S3 multipart upload and returns uploadSessionId/assetId/partSize/partCount/expiry.
2. Part signing: JSON partNumbers, maximum 20 numbers/request. Requires the owned active upload, valid indexes and unexpired session. Returns one temporary size-bound PUT URL per requested part.
3. Completion: JSON sorted parts [{partNumber, etag}]. Compares real S3 parts, ETags and exact part sizes. Completes the object, verifies stored size/type/tenant/asset metadata and an MP4 signature before publication. Supports repeated completed calls and recovery after S3 succeeds but a DB write fails.
4. Abort: requires upload ownership. Cancels an unfinished multipart upload, updates records, and accepts repeated cancellation. Completed objects are not deleted by this endpoint.
5. Asset list: optional assetId, courseId, batchId, status and page query filters. Returns 20 safe metadata records/page plus owned upload IDs/status for unfinished-upload cancellation. Does not expose keys or bucket browsing.
6. Access URL: JSON assetId. Resolves the stored course/batch association, verifies current session/device/enrollment and ready status, then returns a temporary GET URL, expiry, filename and content type. Reuse this same endpoint for renewal; no separate refresh API is required.

## 2. Admin upload journey

- [x] Isolated screen: /admin-page/s3-pilot.
- [x] UI component: components/S3UploadPanel.tsx.
- [x] Course MongoDB ID and optional batch MongoDB ID inputs.
- [x] MP4 input; source recordings are not transcoded.
- [x] Client helper: lib/storage/s3Client.ts.
- [x] Direct browser-to-S3 PUTs; file bytes do not pass through a Next.js upload handler.
- [x] 16 MiB upload parts; at most three parallel client workers.
- [x] Retry/backoff and fresh part signatures on retries.
- [x] Progress display, pause, resume and cancel controls.
- [x] One local resumable upload record, tied to user, scope and sampled file fingerprint.
- [x] Server validates completion before marking an asset ready.
- [x] Pilot list exposes ready-video links and owned unfinished-upload cancellation.
- [ ] Actual upload to the configured private AWS bucket.
- [ ] Actual interrupted upload, browser reload, resume and cancellation tests.
- [ ] Reconcile browser completion records with live S3 ETag/CORS behavior.
- [ ] Product UI integration with normal course/batch selectors. The pilot currently uses explicit IDs.

Uploading in multipart pieces does not create streaming segments. S3 reconstructs one original MP4 object.

## 3. Student playback journey

- [x] Isolated screen: /student/s3-pilot/[assetId].
- [x] Wrapper: components/S3VideoPlayer.tsx.
- [x] Explicit Open private video action before requesting access.
- [x] Current login/device, tenant and enrollment checks before each new URL.
- [x] Browser receives bytes from S3, not an application byte proxy.
- [x] Existing ProtectedVideoPlayer reused with opt-in renewal support.
- [x] Video controls, watermark, no-download control hints and protected-content shell retained.
- [x] Source-renewal code preserves playback time and play/pause intent.
- [x] Default access URL TTL: 600 seconds, bounded by actual AWS credential expiry.
- [x] Active playback periodically checks expiry and renews access before it expires.
- [x] Paused/resumed playback reauthorizes when a link is near expiry.
- [x] Explicit authorization denial removes the active player grant.
- [x] Error recovery has a bounded automatic retry path; manual retry remains available.
- [x] Hidden-tab pause behavior reused from ProtectedContentShell.
- [x] Completion callback supported for later normal-screen integration.
- [ ] Actual one-hour video playback across several URL renewals.
- [ ] Seeking backward/forward against S3 range requests.
- [ ] Safari/iOS, Android, Chrome, Firefox and Edge playback tests.
- [ ] Confirm browser autoplay behavior after renewal and after a long pause.
- [ ] Connect pilot playback to normal lesson/progress UI. The callback is available, but the pilot does not itself call lesson-progress APIs.

Expiry does not revoke bytes already buffered, nor immediately stop a GET that began before expiry. Signed URLs remain reusable until expiry. Download/screenshot prevention is not guaranteed.

## 4. Data and storage

- [x] models/S3Asset.ts declares tenant ownership and durable storage metadata.
- [x] models/S3Upload.ts declares owned upload state, expiry and idempotency.
- [x] New S3 queries require an exact tenant ID; no legacy empty-tenant rows are included.
- [x] Idempotency index declared.
- [x] Unique active-slot index declared for three active uploads/admin, including across replicas.
- [x] Upload init awaits index initialization before relying on the active-slot constraint.
- [x] Immutable random object keys prevent normal uploads from overwriting active media.
- [x] Object version ID is retained and used when signing playback where versioning is enabled.
- [x] Only durable IDs/keys are stored; playback URLs are generated on demand.
- [ ] Create/verify actual MongoDB indexes in the target environment (MongoDB 6+ for the chosen partial index).
- [ ] Verify deployed credentials permit index creation, or apply indexes through a controlled migration.
- [ ] Define source retention, failed-object review, database backup and restoration procedures.
- [ ] Deploy periodic reconciliation for expired/abandoned upload records. S3 lifecycle does not release MongoDB upload slots.

## 5. Security review

- [x] Server-side admin-role verification for all upload/list operations.
- [x] Session token and active-device verification.
- [x] Stored tenant/course/batch mapping controls access, not body-supplied scope.
- [x] Batch must belong to the stored course and be active.
- [x] Existing enrollment/batch-block checks reused.
- [x] Student cannot ask the API to sign an arbitrary bucket/key.
- [x] Upload file-size, part-index, part-size, filename and MIME checks.
- [x] Limited MP4 header inspection; this is NOT full codec, duration or malware validation.
- [x] JSON request bodies bounded to 128 KiB.
- [x] Part-signing requests bounded to 20 indexes and 5,000 calls/upload.
- [x] Per-instance request burst limits implemented.
- [x] Signed URLs and account tokens omitted from application error/audit logs.
- [x] Private/no-store API responses and no-referrer handling.
- [x] Browser receives presigned URLs, not AWS credentials.
- [ ] Verify deployed IAM, unsigned-object denial and actual bucket privacy.
- [ ] Test restricted students/foreign tenants against a real database and bucket.
- [ ] Add a shared/ingress limiter before using several server replicas; current burst limits are not a global quota.
- [ ] Review dependency vulnerabilities reported during installation before production.
- [ ] Harden legacy /api/upload authorization/public-local-file behavior separately before declaring the whole app secure.

## 6. AWS configuration: template exists; deployment pending

- [x] infra/s3/storage.yaml includes a private bucket with Block Public Access.
- [x] Encryption, versioning, Bucket Owner Enforced ownership and deny-HTTP policy included.
- [x] CORS template restricts the origin and exposes ETag/range metadata.
- [x] Two-day lifecycle abort for abandoned multipart bytes included.
- [x] Server-only IAM managed policy template included, unattached until setup.
- [x] infra/s3/pilot.env.example lists server environment settings, defaulting flags OFF.
- [x] Template parsed locally and private-bucket controls checked.
- [ ] Deploy/review stack in a development AWS account.
- [ ] Attach IAM permissions to the application's server identity.
- [ ] Set actual bucket/region/credential provider and exact application origin.
- [ ] Confirm PUT preflight and exposed ETag behavior in the browser.
- [ ] Configure billing alerts and review direct-S3 egress costs.
- [ ] Enable upload flag for the pilot, then playback flag for selected testing.

CloudFront, Lambda streaming, HLS conversion and MediaConvert are not part of this revision.

## 7. Existing application compatibility

- [x] All six routes are NEW /api/s3 routes.
- [x] Existing /api/upload and SharePoint URL/byte proxy implementations retained.
- [x] No existing SharePoint content references overwritten by this feature.
- [x] Existing main admin/batch/course/student screens still use their current provider.
- [x] PDFs, Office previews, assessments and answer sheets remain on their existing paths.
- [x] No source files copied from SharePoint automatically.
- [ ] Integrate explicit S3 provider selection into normal admin/student screens after pilot acceptance.
- [ ] Add a resumable, audited SharePoint-to-S3 import process before migrating old recordings.
- [ ] Implement/test reversible legacy-to-S3 mappings for migrated resources.
- [ ] Migrate a selected subset, verify checksums/size/playback, and retain originals.

New S3-only assets do not have an automatic SharePoint fallback. Disabling S3 flags leaves legacy content working but hides S3-only pilot assets.

## 8. Verification evidence

| Check | Result | Scope |
| --- | --- | --- |
| S3 offline regression suite | 28 passed; rerun during this review | Validation, flag behavior, authorization, signing, multipart and completion recovery with mocked DB/AWS boundaries |
| SharePoint token-cache suite | 6 passed during implementation | Existing token caching regression |
| Existing protected-content suite | 10 passed during implementation | Legacy proxy helpers, access matching and seek calculations |
| Compiled runtime smoke suite | 8 passed during implementation | Six disabled APIs and two disabled pilot screens on localhost |
| TypeScript validation | Passed during implementation | New generated route types included |
| Focused lint | Passed during implementation | New S3 modules/pages/components and build config |
| Isolated production build | Passed during implementation | .next-s3-check build including page generation |
| AWS/DB/browser live end-to-end | Pending | No live upload or authorized S3 video playback has been verified |

The previously reported 52 checks = 28 + 6 + 10 + 8. They are not 52 live AWS tests. The fresh rerun in this review was the 28-test S3 suite; unchanged prior results are recorded rather than represented as rerun.

Commands: `npm run test:s3`; `node scripts/smoke-s3-disabled.cjs` after an isolated build. See infra/s3/README.md for the isolated build command and setup instructions.

## 9. Remaining execution order

1. Confirm direct-S3 budget and prepare development AWS/MongoDB configuration.
2. Deploy the reviewed private-bucket template, attach IAM and configure origin/credentials/indexes.
3. Enable only the isolated pilot and upload three representative MP4s.
4. Verify pause/resume/cancel and one-hour signed-URL renewal/seek behavior.
5. Verify unauthorized, blocked and foreign-tenant requests fail against real infrastructure.
6. Measure delivered bytes, signing CPU, buffering and cost with a small pilot.
7. Integrate normal-screen provider selection and progress callbacks without deleting old APIs.
8. Add migration/reconciliation operations, test rollback, then migrate selected recordings.
9. Expand rollout only after those gates pass.

Review conclusion: API creation is complete for the agreed six-contract pilot. Deployment, live validation, normal-screen integration, operational cleanup and migration are still outstanding. The whole production transition must not be marked complete yet.

## Batch-page S3 integration — 2026-10-26

- Admin Batches → Content → Videos now renders the direct-S3 uploader with course and batch selected automatically. It no longer renders the old SharePoint video upload action. Other content categories retain their existing upload flow; legacy SharePoint video names remain visible.
- Students see ready S3 videos in their batch Materials tab and open them in the existing private S3 player.
- Added GET /api/s3/student/assets?batchId=...&page=... with current-session, tenant, active batch, course mapping and enrollment authorization. Only ready assets are returned, paginated; no object keys or signed URLs are included.
- Current mocked storage/auth tests: 31 passed. TypeScript, targeted ESLint and isolated production build passed. Existing global config skips lint during build; targeted lint was run separately.
- Live read-only bucket access succeeded after correcting the environment region to ap-southeast-2. The previously absent bucket CORS was configured and verified for http://localhost:3000 and http://127.0.0.1:3000, GET/HEAD/PUT with ETag exposed. Add the exact deployed HTTPS origin before testing a hosted frontend.
- No production video was migrated or deleted, and no authenticated end-to-end browser upload has been claimed.

## Upload-init 502 fix — 2026-10-26

The local upload POST returned 502 even without credentials, placing the failure before storage authentication. Rebuilding a framework Request using new Request(req, {headers}) failed in the local Next runtime. The S3 wrapper now copies the URL, method, sanitized headers, signal and body explicitly, with duplex=half for streamed request bodies and no body for GET/HEAD. Internal tenant headers remain stripped. Sanitized failure-stage logging and stable public error codes were added without SDK message/credential exposure.

Local unauthenticated POST now returns the expected 401. Two regression tests cover framework-style streamed requests and bodyless GET requests; 33 S3 checks pass. TypeScript and targeted ESLint pass. Actual authenticated browser upload still needs retry; no course recording was uploaded by the diagnostic.
