# Video segmentation for batch recordings

Date: 2026-10-27

Status: implementation applied to the main app. Local build, storage/authorization checks, real generated-media conversion, and Chromium playback checks pass. Live S3/MongoDB long-recording acceptance and Safari/iOS checks remain pending. See `VIDEO_SEGMENTATION_SETUP.md` for setup, actual implementation choices, and limitations.

## 1. Goal and scope

An admin uploads a long MP4 recording through `/admin-page/batches`, under Videos. After background processing, a student plays that recording as one continuous lesson while the browser downloads small video segments as needed.

The frontend must not fetch the entire recording into a Blob, ArrayBuffer, or application memory before playback. It should keep a small playback buffer, request upcoming segments, and release older buffered media.

Only video processing and playback change. PDFs, assignments, study materials, and their existing upload/viewing flows remain outside this feature.

Use prerecorded HLS served as private S3 objects. This is technically HTTP segmented streaming, but it does not require a live streaming server or a managed video streaming service. FFmpeg performs processing in a separate worker.

Do not wait until one segment finishes playing before downloading the next: that creates a network delay at every boundary. Fetch upcoming segments while the current segment plays.

## 2. Verified starting point

The current project already has:

- `components/S3UploadPanel.tsx`: batch content upload interface.
- `lib/storage/s3Client.ts`: resumable multipart upload client.
- `lib/storage/s3Validation.ts`: 16 MiB upload parts, a 10 GiB video limit, and upload verification helpers.
- `lib/storage/s3Types.ts`: video uploads currently accept MP4 only.
- `lib/storage/s3Api.ts`: upload completion, asset listing, replacement, deletion, and access handling.
- `models/S3Asset.ts` and `models/S3Upload.ts`: private asset and upload records.
- `lib/storage/s3Authorization.ts`: tenant session, role, course, and batch enrollment checks.
- `components/S3VideoPlayer.tsx`: playback through a temporary URL for the original video.
- `components/ProtectedVideoPlayer.tsx`: controls, watermark, seeking, and playback callbacks.

Upload parts are transport pieces used to assemble the original S3 object. They are not independently playable video segments.

Earlier HLS planning files exist, but their referenced `local-media-pilot/` implementation folder was not present during inspection. Do not assume that worker, player, or deployment is available.

## 3. Initial implementation choices

| Concern | Initial choice |
| --- | --- |
| Input | Existing MP4 upload flow, maximum 10 GiB |
| Processing | Separate Node worker invoking installed FFmpeg and ffprobe |
| Job queue | New MongoDB collection with atomic claims and renewable leases |
| Worker concurrency | One job per worker initially |
| Video | H.264, maximum 720p, preserve aspect ratio, no upscaling |
| Audio | AAC when audio exists; accept valid silent videos |
| Packaging | VOD HLS with approximately 6-second MPEG-TS segments |
| Quality selection | One rendition initially; adaptive quality is a later extension |
| Storage | Existing private S3 bucket with dedicated versioned output prefixes |
| Browser | HLS.js on supported Media Source browsers; tested native HLS fallback |
| Delivery | Video bytes directly from S3; app handles metadata and authorization |
| Rollout | Feature flag and one test batch before wider enablement |

A two-hour recording has roughly 1,200 six-second segments. Exact counts and durations depend on encoding and the final segment. Segment byte sizes depend on bitrate and content, not duration alone.

## 4. End-to-end flow

```text
Admin selects batch and MP4
  -> existing resumable multipart upload directly to private S3
  -> completion verifies the original object
  -> persist processing intent and queue video job
  -> UI displays Queued / Processing

Background worker
  -> claim job with lease
  -> download original to isolated temporary directory
  -> inspect with ffprobe
  -> encode and package with FFmpeg
  -> validate playlists, durations, and referenced files
  -> upload output to a new private S3 version prefix
  -> publish validated output metadata atomically
  -> UI displays Ready

Student opens lesson
  -> verify tenant session and enrollment
  -> create short-lived playback session
  -> fetch small playlist metadata
  -> obtain temporary URLs for upcoming segment indices
  -> fetch segment bytes directly from S3
  -> append segments to the same video timeline
  -> renew authorization and continue
```

## 5. Data model

Keep original upload state separate from video processing state. Existing asset `status: ready` currently means the original upload is verified; it must not silently become a promise that HLS output exists.

### S3Asset additions

- `videoProcessingState`: `not-requested | queued | processing | ready | failed`.
- `activeVideoOutputId`: validated output version currently available for playback.
- `pendingVideoJobId`: current processing attempt, if any.
- `videoDurationSeconds`: validated duration for display.
- `videoProcessingErrorCode`: safe error category, without credentials or signed URLs.

Expose only required display fields through `S3PublicAsset`. Keep bucket keys and job internals server-side.

### New S3VideoJob collection

Fields: tenant ID, asset ID, source version identity, output version ID, encoding profile version, state, phase, attempt count, next attempt time, lease owner, lease expiry, heartbeat time, timestamps, and sanitized failure code.

Use a unique key across tenant, asset, source identity, and encoding profile to prevent duplicate processing from repeated upload completion requests. A source identity must include the S3 version ID when available, or another immutable upload generation identifier; ETag alone is not a general content hash.

### New S3VideoOutput collection

Fields: tenant ID, asset ID, source identity, output version ID, state, playlist key, rendition metadata, duration, segment count, output bytes, and an ordered segment index containing actual duration and exact S3 key.

For the initial two-hour scale, one bounded index document can be practical. Enforce a maximum size below MongoDB's document limit; move segment entries to a separate indexed collection if necessary. Never return the full storage index to unauthenticated clients.

### Playback sessions

Use an expiring server record or a validated, bounded grant tied to tenant, user, asset, output version, and expiry. It is authorization context, not permission to request arbitrary S3 keys. Recheck session and enrollment on URL renewal. Native playback needs a compatible short-lived manifest credential because a browser's native HLS fetcher cannot attach the app's custom authentication headers.

## 6. Reliable upload-to-job transition

1. Finish existing multipart verification.
2. For videos only, record durable processing intent tied to the verified source.
3. Upsert the corresponding idempotent job.
4. Return upload success with `videoProcessingState: queued`.
5. Repeated completion calls must ensure a missing job is recovered, including the current early-return path for already completed uploads.
6. Run a bounded reconciliation task for verified video sources with processing intent but no runnable job, covering a crash between database writes.

Do not hold an HTTP request open for conversion. Do not rely on a fire-and-forget Promise in a Next.js handler: a restart or serverless lifecycle can terminate it.

Documents continue through the existing completion path without video jobs.

## 7. Worker processing details

### Claiming and retries

- Claim eligible jobs atomically and assign a lease and unique attempt token.
- Renew the lease while FFmpeg runs. A lost lease must stop the attempt or prevent that attempt from publishing output.
- Allow bounded retries with backoff for transient storage or worker errors.
- Mark invalid input as a permanent failure until an admin replaces the source.
- Use attempt-specific output prefixes so an old attempt cannot overwrite another attempt.
- Publish only if the asset still references the same source, is active, and the worker still owns the lease.
- Recover expired leases after crashes; clean abandoned outputs asynchronously.

### Input inspection

Use ffprobe to inspect real streams, codec, dimensions, duration, rotation, and audio presence. Extension and upload header checks do not establish that the file is decodable.

Reject corrupt files, files without a usable video track, and inputs exceeding configured processing limits. Define duration, output file count, disk, CPU, and execution limits before rollout.

### Encoding profile

Start with a 720p maximum H.264 profile and AAC audio. Choose a readable bitrate/quality target for lecture slides after viewing sample recordings. Set predictable keyframes at the segment interval and ensure every segment starts with a suitable random access frame. Use a full VOD playlist and independent segment declarations only when the output satisfies them.

Use `hls_time=6`, `hls_playlist_type=vod`, and an unlimited VOD playlist rather than a sliding live playlist. Actual segment boundaries follow keyframes. Re-encode when needed; copying arbitrary source streams does not guarantee clean six-second boundaries or browser compatibility.

Invoke FFmpeg with an argument array, never a shell command built from the uploaded filename. Use a generated temporary path and run the worker with restricted filesystem and network permissions. Do not allow uploaded media to reference arbitrary external resources.

### Validation and publication

1. Validate exit status and probe output.
2. Parse the playlist and confirm all referenced files exist and are nonempty.
3. Check segment count, actual durations, total duration tolerance, codecs, and audio/video sync using representative decode checks.
4. Reject path traversal and external playlist URIs.
5. Upload segments with `video/mp2t` and playlists with the correct HLS content type.
6. Verify uploaded object metadata and sizes; use checksums where available.
7. Save validated output metadata, then atomically set the asset's active output pointer.
8. Remove temporary local files in success and failure paths.

Keep the original recording during initial rollout. Original retention and eventual deletion need an explicit policy; segmentation alone does not authorize source deletion.

## 8. Private S3 layout

```text
tenant/<tenantId>/courses/<courseId>/batches/<batchId>/video/<lesson-date>/
  <assetId>/<source-generation>/
    <original-filename>.mp4
    output/<outputVersion>/<attemptId>/
      index.m3u8
      segment-000001.ts
      segment-000002.ts
  ...
```

All identifiers and keys are generated server-side. Store durable keys in MongoDB, not permanent URLs. Preserve bucket privacy, encryption, and narrow IAM access. Give the worker access only to the source/output prefixes it needs.

Configure CORS for required playback origins, GET/HEAD and range behavior where applicable. Keep existing multipart PUT behavior intact. Avoid overwriting shared bucket configuration without first reading and preserving its existing rules.

## 9. Proposed API contracts

Exact route names can be adjusted during implementation while preserving these responsibilities.

| Endpoint | Purpose |
| --- | --- |
| Existing upload completion | Verify original and durably enqueue video processing |
| `GET /api/s3/admin/assets/:id/video-status` | Return authorized processing phase and safe failure details |
| `POST /api/s3/admin/assets/:id/video-retry` | Idempotently retry an eligible failed video |
| `POST /api/s3/student/video-playback` | Authorize lesson and create playback session |
| `POST /api/s3/student/video-segment-urls` | Authorize bounded output indices and return short-lived S3 URLs |
| `GET /api/s3/video-playback/:sessionId/manifest` | Return an authorized native-compatible VOD manifest when needed |

Reuse existing authenticated request helpers and `storageUser`, `authorizeScope`, and strict tenant scoping. A request supplies asset/session identifiers and validated segment indices, never arbitrary bucket names or object keys.

Use small URL batches, initially three segments. Cache valid links briefly in the player and renew them before expiry. Rate-limit requests with enough allowance for normal sequential viewing and seeking.

Return structured states such as processing, unavailable, access denied, or retryable failure. Redact signed URLs and playback credentials from application logs.

## 10. Frontend playback

### Media Source / HLS.js path

Add a dedicated `S3HlsVideoPlayer` or HLS source adapter while retaining the existing player controls and watermark. Avoid copying the whole protected player into a separate divergent component.

Use a custom HLS loader that maps internal manifest segment identifiers to authorized S3 URLs. Only playlist metadata and signing requests pass through the app; video bytes go directly to S3.

Initial buffer targets:

- Segment length: approximately 6 seconds.
- Forward buffer: approximately 12–18 seconds.
- Retained back buffer: approximately 12 seconds.
- One segment download at a time initially; small link prefetch batches.
- Stop unnecessary forward loading on pause and cancel obsolete requests after seeking.

Configure both normal and maximum forward buffer settings and appropriate byte limits. These are operating targets, not a promise of exactly one segment in memory; HLS.js, the browser, decoder, and HTTP caches also buffer data.

Use one video element and continuous timestamps. Do not replace `<video src>` on every segment. Preserve fullscreen, playback rate, volume, and watermark across segment boundaries.

On seek, fetch media around the requested timestamp rather than every earlier segment. Track absolute lesson time and trigger `onEnded` once at the end of the lesson, not for each segment.

When a segment URL expires, renew its authorization and retry in a bounded way. Do not restart the whole recording. On explicit access denial, stop loading and stop playback; previously downloaded media and issued S3 links cannot be instantly revoked.

### Native HLS path

Native HLS needs a separate tested authorization strategy because its network requests do not use the HLS.js custom loader or the app's custom headers.

For the initial S3-only design, generate a personalized manifest containing short-lived application segment resolver URLs. Each resolver validates the playback credential, session, enrollment, output, and segment index, then redirects to a fresh S3 URL. The application handles a small redirect response, not media bytes. Use private/no-store responses and no-referrer policy, and do not expose durable login credentials in URLs.

Keep the playback credential valid for a bounded session window with renewal before expiry. Test manifest refresh, timeline preservation, seeking, and redirects on real Safari/iOS. Native HLS controls its own buffering, so exact HLS.js buffer limits cannot be promised on Safari. If strict buffer control on every platform is mandatory, resolve that requirement before claiming cross-browser completion.

## 11. Admin and student interface

Admin Videos list should show:

- Upload progress using existing controls.
- Queued state after original upload verification.
- Processing phase and elapsed time; show a percentage only if calculated from reliable duration/progress information.
- Ready state with duration and preview.
- Failed state with a safe explanation and retry action.

Keep the recording as one lesson row. Do not display 1,200 segment files as separate lessons or count them as independent uploads.

Student list should show Processing or Temporarily unavailable until a segmented-only lesson is ready. Existing legacy MP4 lessons retain their current playback path. New lessons enrolled in segmented mode should not silently download the original when conversion fails.

## 12. Replacement and deletion

Processing failure during replacement must not remove an already playable lesson. Review the existing `completeReplacement` timing: currently replacement occurs at upload completion, before the proposed HLS conversion. Video replacement must defer the playback cutover until the new output passes validation, while document replacement keeps its existing semantics.

When a replacement is ready, switch the lesson pointer atomically and retire the previous version according to retention policy. A worker completing after deletion or a newer replacement must not reactivate the old asset.

Deletion should prevent new playback grants immediately, cancel pending jobs, and queue cleanup of source and derived output as applicable. Track cleanup retries; short-lived links already issued may remain usable until expiry.

Existing MP4 assets may be converted through an explicit admin action or a bounded backfill later. Do not automatically reprocess all existing recordings on startup.

## 13. Deployment and configuration

Run the worker as a separate supervised process/container with FFmpeg and ffprobe installed. A deployment that only runs short-lived Next.js functions is insufficient for processing a two-hour recording.

Suggested server-only configuration:

- `S3_VIDEO_SEGMENTATION_ENABLED`.
- `VIDEO_WORKER_ENABLED` and worker identity.
- `FFMPEG_PATH`, `FFPROBE_PATH`, and restricted temporary root.
- `VIDEO_WORKER_CONCURRENCY=1`.
- `VIDEO_SEGMENT_SECONDS=6`.
- Encoding profile version and maximum duration/disk/output limits.
- Lease duration, heartbeat interval, retry limit, and backoff.
- Playback session lifetime and S3 segment URL lifetime.

Budget temporary disk for original plus encoded output plus safety headroom per concurrent job. A 10 GiB input limit alone does not define enough disk for every output profile. Check available space before accepting work and while processing.

Monitor queue age, conversion time, failure rate, temporary disk, output bytes, segment authorization errors, and playback stalls. Measure conversion throughput on representative recordings before giving processing-time estimates.

S3 costs include source storage, output storage, PUTs for segments, GETs during playback, and data transfer. Additional renditions increase conversion work and storage; segmentation itself does not guarantee lower total transfer for viewers who watch the entire lesson.

## 14. Implementation sequence and affected files

### Phase 1: processing model and durable queue

- Extend `models/S3Asset.ts` and `lib/storage/s3Types.ts` with video-only display state.
- Add job/output models and processing helpers under `lib/video/` or `lib/storage/video/`.
- Update video completion/reconciliation in `lib/storage/s3Api.ts`.
- Verify idempotency, crash recovery, and tenant/source scoping.

### Phase 2: worker

- Add a worker entry point, FFmpeg/ffprobe runner, output validator, S3 output uploader, lease renewal, and cleanup.
- Add a worker package script and deployment/run instructions.
- Verify conversion and retry using a short valid fixture before a full recording.

### Phase 3: authorization and playback

- Add playback session, segment URL signing, and native manifest/resolver routes.
- Add the HLS client dependency and loader adapter.
- Update `components/S3VideoPlayer.tsx` and the existing protected player integration.
- Keep `components/S3AssetViewer.tsx` routing documents as before.

### Phase 4: admin integration and lifecycle

- Update `components/S3UploadPanel.tsx` with processing state and retry.
- Integrate with the Videos section in `app/admin-page/batches/page.tsx`.
- Verify `components/S3BatchContent.tsx` and student batch playback use processed output for enabled videos.
- Implement safe replacement cutover and derived-output cleanup.

### Phase 5: acceptance and controlled rollout

- Enable one test batch, process a representative two-hour recording, and complete the acceptance checks below.
- Document worker startup, failure recovery, retention, and rollback.
- Expand enablement only after playback and operational checks pass.

## 15. Acceptance checks

1. A valid two-hour MP4 uploads with pause/resume and appears as one lesson.
2. Repeated completion/retry requests create no duplicate active conversion job.
3. Worker restart or lease expiry recovers safely; stale attempts cannot publish.
4. Corrupt, silent, rotated, unusual-resolution, and unsupported-codec inputs receive the correct processing result.
5. Student playback starts after a small amount of media downloads; network inspection shows segment requests rather than a full original MP4 fetch.
6. Playback crosses boundaries without audio gaps or resetting controls.
7. Seeking near the end fetches nearby segments without downloading earlier media.
8. Buffer/memory usage remains bounded during a long session; paused playback does not keep fetching the full lesson.
9. Full-length playback survives multiple signed URL renewals.
10. Slow network, interrupted segment requests, and temporary S3 failures recover with bounded retries and useful UI.
11. Wrong tenant, unenrolled user, expired session, altered segment index, and arbitrary object key attempts are denied.
12. Safari/iOS native HLS playback, redirects, renewal, seeking, and actual buffering behavior are verified separately.
13. Failed replacement preserves the existing playable recording; successful replacement switches only after validation.
14. Deletion during conversion prevents late publication and eventually removes eligible derived objects.
15. PDFs, study materials, assignments, legacy MP4 playback, watermark, controls, and completion callbacks still work.

Use meaningful automated checks for state transitions, job ownership, authorization, playlist validation, and signing bounds. Use browser network and real media playback checks for continuity, memory, and Safari behavior; unit tests alone cannot prove these.

## 16. Rollback and completion definition

Disable new conversion jobs through the feature flag and stop workers safely. Preserve existing validated output and original recordings. Keep the playback adapter available for already published HLS lessons, or explicitly switch those lessons to an approved original-MP4 fallback. Do not simply disable HLS serving while lessons still reference it.

The feature is complete only when the worker runs in the target environment, a representative long recording passes end-to-end acceptance, renewal works beyond initial link expiry, lifecycle operations are safe, and the admin/student interfaces display correct states.

## 17. Technical references

- FFmpeg HLS muxer, segment timing, keyframes, and VOD playlist options: https://ffmpeg.org/ffmpeg-formats.html
- HLS.js player configuration, buffer controls, and loaders: https://github.com/video-dev/hls.js/blob/master/docs/API.md

Recheck the installed HLS.js version and local Next.js documentation before implementing APIs or source adapters. Initial encoding and buffer values in this document are proposed defaults to validate with real lecture recordings.
