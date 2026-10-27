> Current implementation (2026-10-26): all four batch Content categories now use S3, with date filters, database trace/history, replacement and deletion. See [S3_BATCH_CONTENT_GUIDE.md](S3_BATCH_CONTENT_GUIDE.md) for the current setup, behavior and verified tests. Older pilot-only notes below are historical.

# SharePoint to private S3: minimal additive execution plan

> Latest local-only HLS/progress scope: see [LOCAL_S3_HLS_EXECUTION_PLAN.md](LOCAL_S3_HLS_EXECUTION_PLAN.md). That new plan adds local conversion, segmented playback, batch-specific screens and watched/pending progress using isolated collections in the existing database. The six-API MP4 pilot below remains intact; it is not evidence that the newer HLS features are already implemented. No deployment or production cutover is planned now.

Date: 2026-10-24
Status: additive API/pilot implementation added. AWS deployment, live playback validation, main-screen cutover and data migration remain pending.
Supersedes: the earlier HLS/segmented-video plan in this file.

## 1. Confirmed scope

For this first implementation, keep the existing application features and screens, and change the storage/delivery provider for selected content from SharePoint to private S3.

- Create NEW APIs for S3. Do not replace, redirect, rename, or delete any existing API during development.
- Keep existing SharePoint content, metadata, integrations, and API response contracts working.
- Keep login, enrollment, batches, courses, assessments, progress tracking, watermarks, chats, payments, certificates, and notifications.
- Keep the current MP4 player and its controls. Add only the access-URL handling needed for S3.
- No CloudFront, Lambda video streaming, HLS playlists, video segmentation, MediaConvert, FFmpeg pipeline, new playback-session service, or conversion callbacks in phase 1.
- Large-file multipart uploading is still included. Upload parts are reassembled by S3 into ONE original file; multipart upload is not segmented video playback.
- Implement and test alongside SharePoint, then separately switch selected frontend callers to the new APIs after acceptance.

The earlier request for compressed HLS chunks is deferred, not implemented by this storage migration. It can be a separate phase after this simpler feature works. Do not claim that an unchanged MP4 becomes smaller just because it is on S3.

## 2. Delivery decision and limits

Use browser-direct upload and browser-direct playback with short-lived object-specific S3 presigned URLs. The application handles small authorization/coordination requests, not complete video files.

```text
UPLOAD
Admin -> new API verifies admin + tenant + course/batch ownership
Admin -> presigned multipart PUTs -> private S3
Admin -> completion API verifies uploaded object -> MongoDB marks asset ready

PLAYBACK
Student -> new access API verifies session/device + tenant + enrollment
Student <- temporary URL for ONE authorized S3 object
Existing video player -> S3 HTTPS GET/Range GET -> video playback
```

This removes video-byte transfer from the app host. It does not eliminate internet transfer: S3 charges for delivered bytes and requests. A presigned URL is a reusable bearer permission until it expires, not a one-time link. Once a GET starts before expiry, its response may continue; later range requests need a valid URL.

Direct S3 delivery exposes the authorized object's temporary URL to the browser. Hiding that URL or blocking all downloading/screenshots is not achievable here. Preserve watermarks and hidden download controls as deterrents; preserve real server-side access checks before signing.

## 3. Existing APIs: all stay in place

| Existing API | Action now | Later selective frontend mapping |
| --- | --- | --- |
| POST /api/upload | Keep intact for existing SharePoint/Cloudinary/local callers | S3-selected uploads use new init/parts/complete APIs |
| /api/admin/content-inventory | Keep SharePoint contract and records intact | Query new S3 asset list alongside legacy inventory |
| /api/student/content-url | Keep intact | S3 inventory assets use new access-url API |
| /api/student/batch-content-url | Keep intact | S3 batch assets use new access-url API |
| /api/student/recorded-content-url | Keep intact | S3 recorded assets use new access-url API |
| /api/student/assessment-content-url | Keep intact | Remains SharePoint until a separately tested document migration |
| /api/student/recorded-content | Keep legacy byte proxy | Do not send S3 videos through this proxy |
| /api/batch-content | Keep legacy byte proxy | Do not send S3 videos through this proxy |
| /api/sharepoint-file | Keep legacy byte proxy | Only legacy SharePoint content uses it |
| /api/sharepoint-picker and /api/sharepoint-config | Keep intact | No S3 replacement required for phase 1 |

No existing API is modified to silently change providers. No legacy URL is overwritten with a temporary S3 URL. A later provider dispatcher changes only selected new/explicitly migrated content callers.

## 4. New APIs: exactly six required endpoint contracts

All paths below are NEW. Shared route files may export more than one method, but the implementation scope is these six contracts. No generic public S3 proxy is needed.

| # | New method/path | Responsibility |
| --- | --- | --- |
| 1 | POST /api/s3/admin/uploads | Verify admin/tenant and target course/batch; validate filename/type/expected bytes and quota; allocate opaque asset ID/object key; start S3 multipart upload; return uploadSessionId, partSize, expiry |
| 2 | POST /api/s3/admin/uploads/[id]/parts | Verify upload owner/tenant; validate a bounded part-number batch; return presigned UploadPart URLs, without AWS credentials |
| 3 | POST /api/s3/admin/uploads/[id]/complete | Verify owner; list real S3 parts, compare expected part structure, ETags/checksums/bytes; complete idempotently; inspect resulting metadata/format; publish ready asset only after validation |
| 4 | POST /api/s3/admin/uploads/[id]/abort | Verify owner; abort unfinished upload; mark cancelled; safe to repeat |
| 5 | GET /api/s3/admin/assets | Admin-only tenant-scoped paginated asset list; optional assetId/courseId/batchId/status filters; returns safe metadata and upload/validation status |
| 6 | POST /api/s3/student/access-url | Verify account session/device, tenant, ready asset and actual enrollment/content association; return short-lived GET URL, expiresAt, MIME type and filename; log access without the signed URL |

No new manifest, segment-signing, playback-session, refresh, close, conversion-job, job-event or callback API is required. When a playback URL must be renewed, call endpoint 6 again and perform authorization again.

All admin endpoints must use server-side admin checks, not the fact that the request came from an admin page. Endpoint 6 must support a server-verified admin preview without granting students admin access.

Use existing session verification logic via secure request headers initially, consistent with current localStorage-based login. Do not put account-session tokens in query strings. A future HttpOnly-cookie login migration is separate; if cookie authentication is introduced, include CSRF/origin defenses for mutations.

Apply tenant context and scoped queries/writes to every new route. Never treat client-supplied tenantId, bucket name, object key, filename, or courseId alone as authorization.

Example access request:

```json
{ "assetId": "opaque-asset-id", "context": "batch" }
```

The server resolves the asset and its stored course/batch mapping. Client context is only a selector, not permission. Return 401 for invalid sessions, 403 for forbidden access, 404 for missing assets and 409 for assets not yet ready. Private JSON responses use Cache-Control: private, no-store.

## 5. New database models: two only

### models/S3Asset.ts

Fields: tenantId, createdBy, originalFilename, safeFilename, contentType, byteSize, checksum, server-generated bucket/key, optional S3 versionId, courseId, optional batchId, logical resource ID/context, status, legacy source reference for migrations, createdAt/updatedAt.

Statuses: uploading -> validating -> ready; failed/cancelled as applicable. Student reads only allow ready assets. Tenant ownership and course/batch/resource linkage are resolved and validated by the server before publication. Replacing a file creates a new immutable object key; do not overwrite an active video.

### models/S3Upload.ts

Fields: tenantId, assetId, ownerId, S3 multipart uploadId, expectedSize/type, partSize/count bounds, expiry, idempotency key, status and verified completion information.

Use tenant-first indexes and unique tenant-scoped idempotency indexes. Explicitly declare tenantId in both schemas. Do not assume existing models already implement complete tenant isolation.

Store durable keys/IDs, not presigned URLs. Initially these collections are separate from existing Course, Batch and ContentInventory records, so old readers are unaffected. Any later optional provider/assetId fields on old schemas require a separate backward-compatible change; no required legacy fields are removed.

## 6. Files to add and modify

| File/location | Planned change |
| --- | --- |
| app/api/s3/admin/uploads/route.ts | New upload-init API |
| app/api/s3/admin/uploads/[id]/parts/route.ts | New bounded part-signing API |
| app/api/s3/admin/uploads/[id]/complete/route.ts | New completion/validation API |
| app/api/s3/admin/uploads/[id]/abort/route.ts | New cancellation API |
| app/api/s3/admin/assets/route.ts | New filtered/paginated asset list/status API |
| app/api/s3/student/access-url/route.ts | New enrollment-protected playback/file URL API |
| models/S3Asset.ts; models/S3Upload.ts | Two new tenant-owned models |
| lib/storage/s3.ts | AWS SDK client, multipart helpers, HEAD/limited format inspection, URL signing |
| lib/storage/s3Authorization.ts | Shared admin/tenant/session/resource authorization |
| lib/storage/s3Validation.ts | Upload size/type/part validation and safe key generation |
| lib/storage/s3Client.ts | Browser multipart orchestration, bounded retries, URL renewal helper |
| components/S3UploadPanel.tsx | Reusable opt-in upload panel using only new APIs |
| components/S3VideoPlayer.tsx | Thin access/renewal wrapper around existing ProtectedVideoPlayer |
| app/admin-page/s3-pilot/page.tsx | Isolated admin pilot screen before existing UI integration |
| app/student/s3-pilot/[assetId]/page.tsx | Isolated authorized playback pilot screen |
| package.json and package-lock.json | Add pinned compatible @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner during implementation |
| app/admin-page/batches/page.tsx | Later add opt-in S3 upload/list selection; preserve SharePoint flow |
| app/student/batches/page.tsx | Later choose provider explicitly; legacy remains default |
| components/ProtectedVideoPlayer.tsx | Only minimal optional hooks needed to preserve time/play state during signed-source renewal; preserve default behavior |
| lib/sharepoint.ts; lib/auth/protectedContentUrls.ts | Leave SharePoint implementation/helpers intact |
| infra/s3/ and focused tests | New reviewed infrastructure definitions and regression coverage |

Before implementation, use rg to inspect every upload/player call site, including app/admin-page/page.tsx and app/courses/[slug]/page.tsx. Do not assume the batch screen is the only consumer.

## 7. S3 configuration and security

- One private regional S3 bucket for this phase, opaque keys such as tenant/<tenantId>/assets/<assetId>/<version>/video.mp4.
- Block Public Access, Bucket Owner Enforced ownership, encryption at rest and deny insecure HTTP.
- Dedicated least-privilege IAM permissions. Browser receives only specific presigned UploadPart/GET requests, never AWS keys.
- Configure actual application origins in CORS, upload PUT plus necessary GET/HEAD, allowed content/checksum headers, and exposed ETag/Content-Range/Accept-Ranges/Content-Length.
- S3 access is controlled by IAM/signatures. CORS and bucket-name obscurity are not security barriers.
- Disable public listing; do not expose bucket browsing or arbitrary-key signing endpoints.
- Use S3 Standard for active recordings. Add lifecycle cleanup for incomplete uploads and abandoned staging assets, with an explicit retention policy for published content.
- Use an IAM instance role on EC2. If using Lightsail or another host, confirm the supported credential arrangement rather than assuming EC2 instance-role support; keep least-privilege credentials in a secret store if necessary.
- Configuration names: AWS_REGION, S3_MEDIA_BUCKET, S3_UPLOAD_URL_TTL_SECONDS, S3_ACCESS_URL_TTL_SECONDS, S3_UPLOAD_ENABLED and S3_PLAYBACK_ENABLED. AWS credentials use the configured provider chain/secret system, not NEXT_PUBLIC variables.
- Start upload-part URLs around 10 minutes and playback URLs around 10 minutes, always clamped to actual AWS credential expiry. Limit upload sizes, concurrent uploads, signing calls and active playback policies server-side.
- Redact signed URLs and account-session secrets from logs. Set no-referrer on playback pages to reduce URL leakage.
- Preserve access audit logging and watermark user identity without exposing unnecessary student details.
- Existing /api/upload currently lacks an explicit admin-session check and can save some non-course documents publicly. New routes must not repeat this. Track legacy hardening separately before describing the whole deployment as secure.

## 8. Upload behavior

1. Admin selects the same recording and course/batch/category as today.
2. New init API authenticates, validates scope/quota, and creates draft asset/upload records.
3. Browser PUTs file parts directly to S3, initially at three parallel uploads; use bounded retries/backoff and retrieve fresh part signatures after expiry.
4. Completion API lists and verifies actual S3 parts before completing. Handle S3-completed-but-DB-write-failed cases idempotently using the server-owned immutable key and HEAD metadata.
5. Validate actual object bytes/format with a bounded inspection, not only client MIME or extension. Allow browser-compatible MP4 recordings initially. Do not automatically transcode incompatible uploads; report unsupported format and retain a safe failed/unpublished status.
6. Mark ready and expose the new asset through the S3 admin list. No existing SharePoint inventory is overwritten.
7. Cancel/expiry aborts uncompleted multipart uploads. Persist enough uploadSessionId/part metadata locally to resume while authorization remains valid; API owner verification is always required.

Use browser-compatible H.264/AAC MP4 files. Recordings should have their MP4 metadata near the start (fast-start) for efficient playback. If existing files do not, report that compatibility/efficiency issue; any repackaging/compression step is a separate approved enhancement.

## 9. Playback and expiry behavior

- Reuse the current player, zoom/fullscreen/seek controls, preload=none, progress callbacks and watermark behavior.
- Obtain a URL only when playback is requested; load/seek directly against S3, which supports byte-range GETs. The browser controls buffering; this phase does not guarantee a strict seconds-ahead buffer.
- Refresh shortly before expiry while the student is actively watching. Recheck enrollment and session through the SAME access-url API.
- Avoid swapping src and remounting every render. A new URL can reset browser media state: explicitly preserve currentTime, paused/playing state, metadata and completion behavior during renewal. The existing player's key=src and reset-on-src-change must be handled deliberately, with regression tests.
- If paused for a long time, renew before resuming. Handle later range-request expiry with a bounded retry, not an infinite 403 loop.
- Validate one-hour playback across multiple renewals, forward/back seeking, Safari/iOS, hidden tabs and session revocation before integration.
- Logout/blocking stops new URL issuance. Existing signed URLs can remain usable until expiry and already buffered content cannot be recalled.
- Do not add per-segment authorization, HLS dependencies, or an application byte proxy in this phase.

## 10. Feature parity and rollout boundaries

Start with videos because they generate the streaming load. Existing PDFs, tests, assignments, Office previews and answer-sheet rules remain on their current paths during the pilot, so their features do not disappear.

S3 does not provide SharePoint/Office's document-preview service. Do not silently replace those previews with public links or downloads. Moving PDFs/Office content later needs a separately verified viewer/access design; first migration can move all supported videos without claiming all document features have migrated.

Rollout order:

1. Build six new API contracts and two models with flags default OFF.
2. Test through isolated admin/student pilot pages; existing screens/callers remain unchanged.
3. Upload a few new test MP4s directly to S3 and verify privacy/playback/expiry.
4. Add opt-in S3 support beside SharePoint in existing admin UI.
5. Dispatch only explicitly S3-associated resources to the new access-url API; existing resources keep calling existing endpoints.
6. Migrate a small selected set using a resumable admin-only SharePoint-to-S3 import script outside student requests. Preserve original source references and validate size/checksum.
7. After validation, update selected frontend callers to use the new APIs for migrated content. This is the requested later replacement step; legacy API implementations still remain available.
8. Expand only after measured quality, security, cost and rollback acceptance.

Rollback: turn off S3 provider selection for migrated items and restore their stored legacy reference. New S3-only files have no automatic SharePoint fallback: keep them explicitly available or pause publication. Never delete originals during pilot.

## 11. Cost and performance check

500 students x one hour/day x 30 days = 15,000 hours/month. At 1.2 Mbps combined audio/video, delivery is approximately 8.1 decimal TB/month before headroom. Unchanged larger source files can be much more expensive.

Monthly cost = application host + MongoDB + S3 stored GB + PUT/GET requests + S3 internet egress + backups/logging/taxes. There is no CloudFront or transcoding fee in this phase, but also no assumed CDN transfer allowance.

Direct S3 can cost more overall than CDN delivery. Use the actual regional AWS quote and a pilot's measured bytes/viewed-hour. Do not reuse the earlier $39 server/CDN subtotal or advertise this as free streaming. Budgets alerts notify; they are not automatic hard spending caps.

The intended, testable result is lower app-host origin transfer and less server streaming work. Total cost savings remain unproven until measured. Separate peak concurrent-user tests from the 500-daily-student count.

## 12. Implementation order and acceptance

- [ ] Read applicable repository instructions and version-matched Next.js docs before implementation; the currently installed next/dist/docs directory was absent during planning.
- [ ] Inventory current API callers and record legacy behavior for comparison.
- [ ] Set upload/asset limits, browser support, identity transport and exact response schemas.
- [ ] Add private bucket/IAM/CORS/lifecycle definitions and cost alerts in development.
- [ ] Add two explicit tenant-owned schemas and three S3 helper modules.
- [ ] Implement the four new admin upload endpoints and one admin list/status endpoint.
- [ ] Implement the one new student access endpoint with verified course/batch/enrollment mapping.
- [ ] Build isolated pilot pages and the upload/player wrappers.
- [ ] Verify expiry renewal, seek preservation, video completion tracking and access logging.
- [ ] Test admin spoofing, missing/expired session, forged tenant/object IDs, blocked enrollment and expired URLs.
- [ ] Test bad MIME/format/size, duplicate completion, cancellation, resumable parts and failed DB finalization recovery.
- [ ] Confirm unsigned S3 GET/list requests fail; signed URLs permit only their exact object and operation.
- [ ] Confirm uploads/video responses bypass Next.js in browser traces; application routes only return small coordination data.
- [ ] Verify one-hour playback and all target browsers, especially Safari/iOS.
- [ ] Run focused tests, typecheck and production build; retain separate live AWS test evidence.
- [ ] Run a 20-50-student pilot; measure S3 bytes, API/database load, URL-renewal failures and actual cost.
- [ ] Integrate opt-in provider selection, verify old APIs/features still work, then migrate selected records.
- [ ] Validate rollback and review full-volume costs before broad rollout.

API count acceptance: exactly six new contracts for phase 1; no existing endpoint removed or repurposed. Introduce additional endpoints only if a concrete implementation requirement is documented, not by carrying over the earlier HLS design.

## 13. Reference and scope notes

- S3 pricing and internet egress: https://aws.amazon.com/s3/pricing/
- Presigned object URLs, reuse and expiry: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
- AWS regional estimate: https://calculator.aws/

Implementation note: the six `/api/s3` contracts, two S3 models, shared helpers, isolated pilot screens, private bucket template and offline regression checks have now been added. See `infra/s3/README.md` for setup and operational limitations. Existing SharePoint API implementations and main-screen provider selection remain intact. Neither AWS deployment nor data migration has been performed.
