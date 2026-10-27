# S3 batch content: setup and acceptance guide

Updated 2026-10-26. This is the current implementation; older MP4-only/pilot plans are historical.

## What changed

Admin → Batches → Content now has four private S3 panels: Videos, PDFs, Study Materials and Assignment Files. Every new upload in these panels goes directly from the browser to S3. The old batch-content upload action is explicitly rejected by `/api/upload` rather than silently falling back to SharePoint. Existing SharePoint files remain read-only legacy references and are still visible to students; they were not copied or deleted.

Each panel has a database-backed total/list, lesson-date filter, upload timestamp, record ID, status, pause/resume/cancel, preview, replacement, deletion, audit history and archived-record visibility. Students see current ready files for their enrolled batch and selected category/date. The app does not list the bucket to populate screens.

## Organization and database trace

New S3 keys use stable IDs and an immutable random suffix:

```text
tenant/<tenantId>/courses/<courseId>/batches/<batchId>/<category>/<YYYY-MM-DD>/<assetId>/<uuid>/<safe-filename>
```

The lesson date is selected by the admin, independent of the actual upload timestamp. Renaming a course or batch does not move or break stored objects. Multiple filenames/dates never overwrite each other accidentally.

MongoDB collections:

- `s3assets`: ownership, course/batch/category, lesson date, original filename/MIME/size, S3 key/version/ETag, upload date, replacement links, deletion actor/date and cleanup state.
- `s3uploads`: owned resumable multipart sessions, expected parts/size, idempotency keys, expiry and concurrent-upload slots.
- `s3assetevents`: deduplicated actor/action/time records linked to an asset and related replacement. History remains after deletion.

Replacement uploads a new immutable object and validates its size, MIME, header and ownership before replacing the old current record. A bad replacement leaves the current file available. Concurrent changes fail closed. Retrying the same interrupted completion recovers its state; there is a short DB-update window during promotion, so interrupted completion must be retried before treating the operation as complete. Replaced objects remain private for traceability until an administrator deletes them using Include replaced / deleted.

Delete first removes future student grants, then deletes the recorded S3 object/version. If S3 deletion fails, the UI reports cleanup pending; use Include replaced / deleted → Retry S3 cleanup. Audit metadata is retained. Already buffered data or previously issued URLs can remain usable until expiry when cleanup is pending.

## Supported file types

| Panel | Formats | Maximum |
| --- | --- | --- |
| Videos | MP4 | 10 GiB |
| PDFs | PDF | 500 MiB |
| Study Materials | PDF, DOCX, PPTX, XLSX, TXT, CSV, ZIP, PNG, JPG/JPEG | 500 MiB |
| Assignment Files | Same document/image formats | 500 MiB |

Video uses the original MP4; HLS conversion was removed with the separate local-media-pilot application. PDF previews use the browser PDF renderer. Images open in a new private tab; Office/text/archive files use a short-lived download link. Unsupported executable/HTML/SVG uploads are rejected. Header checks are basic format validation, not antivirus scanning or proof that every document/codec will render.

## Configuration

Use the main application's ignored `.env`, existing database configuration and login. Existing S3 flags and bucket credentials are unchanged. Your bucket was verified in `ap-southeast-2`; do not change it back to `ap-south-1`.

```env
S3_UPLOAD_ENABLED=true
S3_PLAYBACK_ENABLED=true
AWS_REGION=ap-southeast-2
S3_MEDIA_BUCKET=finops-main
```

Credentials remain server-only. IAM must allow GetObject/GetObjectVersion, PutObject, ListMultipartUploadParts, AbortMultipartUpload, DeleteObject and DeleteObjectVersion on the intended `tenant/` prefix. The supplied CloudFormation policy includes deletion permissions; existing manually configured identities need equivalent permissions. No IAM identity/policy was changed automatically by this feature implementation.

The previously configured bucket CORS allows local origins http://localhost:3000 and http://127.0.0.1:3000 with GET/HEAD/PUT and ETag exposed. Add your exact HTTPS frontend origin for deployment. Keep Block Public Access and encryption enabled.

Restart the development server with `npm run dev` after stopping it with Ctrl+C. A full restart matters because Mongoose caches model schemas during hot reload. Production needs a fresh build/deployment. Auto-index creation must be permitted for the new S3 collection indexes, or apply these indexes through your normal DB migration process.

## Manual end-to-end acceptance

1. Sign in as admin, open a saved active batch linked to a course, then Content.
2. Choose a lesson date and upload a small MP4, PDF, TXT study file and PDF assignment in their respective panels. Verify each panel lists the correct filename, selected lesson date, actual upload time and database ID.
3. In S3, verify the objects appear under that batch/category/date prefix. The browser Network tab must show PUT uploads and file GETs against S3, with only small metadata requests to the app.
4. Log in as a student enrolled in that batch. Open Materials, switch all four categories and test PDF/video opening, document download and date filtering. A student from a different batch must be denied direct asset access.
5. Admin: Replace a file; verify the old one stays current during upload and only the verified replacement appears afterward. Inspect History and Include replaced / deleted.
6. Try a deliberately invalid replacement file; current content must remain available.
7. Delete a test file and verify the list/student grants update, S3 cleanup completes, and the database history remains. If cleanup is pending, fix S3 permissions and retry cleanup from archived records.
8. Test pause/resume with the identical file/category/date and reload. A partial upload is saved per browser; cancel it before starting a different upload. Only one upload record is saved in that browser, and the server allows three active uploads per administrator.
9. Separately test large files, long video renewal, browser compatibility and concurrency before production rollout.

## Automated verification

```powershell
npm run test:s3
npm run test:s3:live
# The command above is preview-only. Explicit execution creates and cleans a
# generated temporary DB and synthetic S3 objects, without real course records:
npm run test:s3:live -- --run
# With the local app on port 3000 and Chrome installed:
npm run test:s3:ui
```

`LOCAL_MEDIA_BROWSER` can point the browser UI test to an installed Chromium/Edge executable. The UI test intercepts API requests with synthetic responses: it does not change user data. The live test independently exercises actual API handlers, actual MongoDB in a generated `finops_s3_test_*` database, and actual S3 operations. Its synthetic video/PDF bytes test storage validation, not real codec playback/PDF rendering. It requires permission to create/drop only its generated test DB and deletes only its own generated S3 keys/versions.

Executed results: 39 validation/auth/request tests; 10 browser UI checks with synthetic responses; 10 live storage/DB lifecycle checks including all categories, replacement, corrupt replacement, forbidden student deletion, S3 cleanup failure/retry and audit retention. Live test objects and databases were cleaned. TypeScript, targeted ESLint and an isolated production build passed. Real user browser playback/rendering and large/long recordings remain manual acceptance work.

## New and extended APIs

Existing multipart init/parts/complete/abort APIs now support category, lesson date and replacement target. Admin/student asset lists support category/date filters, total counts and pagination. The existing access-url endpoint issues private links for all supported MIME types.

New admin APIs:

- `POST /api/s3/admin/assets/[id]/delete`: scoped admin deletion with retryable S3 cleanup.
- `GET /api/s3/admin/assets/[id]/history`: scoped admin asset metadata and events.

The existing production login, other application features and existing SharePoint objects were not migrated or removed. Do not drop these new DB collections as a way to delete media: use the per-file action so storage and trace state remain coordinated.

Dependency audit: npm currently reports 15 advisories in the application's existing dependency tree (including one critical). No automatic breaking upgrades were applied. Review these before a production rollout; functional tests are not a dependency security audit.

## Category separation repair — 2026-10-26

A cached pre-category Mongoose model dropped category/date fields on uploads. The prior missing-category fallback then listed the PDF under Videos. Cached models now refresh/recompile the added schema paths, and admin/student queries require the exact selected category. A regression test constructs the old cached schema and verifies all four categories persist after refresh.

Repaired the three existing uncategorized records from their immutable S3 category/date paths or legacy MIME metadata: two videos and one PDF. No S3 files were moved or deleted. Verified zero missing categories afterward. Latest checks: 41 code checks, 12 browser UI checks (synthetic responses), TypeScript and targeted ESLint passed. The earlier 10 live lifecycle checks remain separate evidence.

`scripts/repair-s3-categories.cjs` previews missing-category repairs by default; `--apply` updates only those metadata fields with a concurrent-change guard. Prefer a full app restart after schema changes even though the cached-model safeguard now handles this case.
