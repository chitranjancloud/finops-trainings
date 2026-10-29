# Server-only video upload and segmentation plan

Date: 29 October 2026

Update: the user subsequently chose **Vercel + AWS MediaConvert**, with no container/server deployment. The container recommendation below is superseded. Follow [the managed-service setup](deploy/VERCEL_MEDIACONVERT_SETUP.md) for the implemented production path. The website remains on Vercel; MediaConvert processes the original in S3.

## Outcome

The admin uploads a recording directly to private S3. The application verifies it and records a durable processing job in MongoDB. A cloud worker prepares and verifies playback segments, stores them beside the original in S3, and updates the database. Admins and students see one recording with automatically updated status. No laptop process is required after the upload finishes.

The browser must stay open while it sends the original file. Once the server confirms upload completion, the browser can close; segmentation continues independently.

## Recommended architecture

```text
Admin browser --multipart upload--> private S3 original
       |
       +--complete request--> Vercel API --verify--> MongoDB asset + job
                                                      |
                                             Cloud container worker
                                                      |
                          download -> encode -> save segments -> verify
                                                      |
                               private S3 output + atomic DB publication
                                                      |
                         Admin / student UI automatically sees Ready
```

- Keep Vercel for the website, authentication, authorization, upload signing, completion and playback authorization.
- Deploy the existing Node/FFmpeg worker as one supervised Linux container in an Amazon ECS Fargate service, preferably in the S3 bucket's region. Start with desired task count 1.
- Keep MongoDB as the durable queue and progress store. Existing atomic claims and renewable leases prevent two workers from publishing the same job. SQS is not required for this first deployment.
- Keep original and processed media in private S3. Use the existing generated output path under the same recording and lesson date.
- The container needs temporary cloud disk. Configure `VIDEO_TEMP_ROOT=/work/video-temp`; do not carry the laptop's `D:/FinOpsVideoTemp` setting into production. Provision a proposed initial 50 GiB scratch allocation and check the existing source-size + 22 GiB free-space rule before every job. This allocation must also accommodate the container image and runtime usage.
- Start with 2 vCPU / 4 GiB memory as a benchmark configuration, not a performance guarantee. Measure representative recordings before selecting production capacity or increasing concurrent jobs.

Fargate is recommended for managed process replacement. A supervised Docker worker on an EC2 server is an alternative if fixed server administration is preferred. AWS MediaConvert is another option, but would replace the current encoder integration and needs separate evaluation. The recommended first version reuses the current worker.

## Existing implementation versus pending work

Already implemented: direct multipart S3 upload, verified completion, `S3Asset`, `S3Upload`, `S3VideoJob`, source-scoped idempotency, renewable worker leases, bounded retries, output validation, private segmented playback and automatic library refresh.

Pending: a production container image and cloud deployment; worker health/heartbeat reporting; detailed progress tracking and phase presentation; stage timing and monitoring; bounded parallel output uploads; production crash/retry and laptop-off acceptance tests. A deployed cloud worker has not been verified by this plan.

## Upload completion and reliable job creation

1. The completion API verifies S3 object identity, size, content signature, tenant and source version.
2. Save the asset as uploaded with video processing queued. Idempotently upsert the job by tenant, asset, source key/version and encoding profile.
3. Return the asset/job identifiers and queued state promptly. Never run FFmpeg inside this request, and never rely on a detached background promise in a Vercel function.
4. If the API fails between storing the asset and creating the job, completion retry and the existing worker reconciliation repair the missing job. Verify this recovery in production testing.
5. Do not automatically process arbitrary objects added manually to S3. Such uploads need an explicit authorized registration/import path first.

Optional later: S3 completion events may wake an ingest service. Events must validate object ownership and be deduplicated because S3 notifications can repeat or arrive out of order. Filter derived output objects to prevent recursive segmentation. Do not add this second trigger until there is a requirement to ingest uploads outside the application.

## Database tracking

Keep upload completion and playback readiness separate. An original can be safely stored while its segmented output is still processing.

| Record | Tracking |
| --- | --- |
| `S3Upload` | Uploading, completing, completed, cancelled or failed; expected bytes; expiry. Existing multipart state remains separate from encoding. |
| `S3Asset` | Existing `videoProcessingState`: queued, processing, ready or failed; active output ID; duration; safe error code. |
| `S3VideoJob` | Existing state, phase, attempts, lease, next-attempt time and exact versioned segment index. Add progress fields below. |
| Worker heartbeat | Proposed tenant-scoped worker ID, deployed version, last-seen timestamp and current job ID; no secrets or signed URLs. |

Add job fields: `startedAt`, `finishedAt`, `phaseStartedAt`, `downloadedBytes`, `sourceBytes`, `encodedSeconds`, `sourceDurationSeconds`, `uploadedSegments`, `totalSegments`, `uploadedBytes`, `lastProgressAt`, and measured per-phase durations. Store the latest progress at most every 2–5 seconds; do not write once per frame or downloaded chunk. Use a separate attempt record or bounded attempt history so retries retain diagnostic timings.

Every heartbeat/progress update must include tenant, job, attempt ID and valid lease ownership. A stale worker must not overwrite a retry's progress or terminal state. Persist a safe error code and attempt timestamps; keep technical diagnostics in protected logs.

## Worker processing stages

1. **Queued:** Wait in MongoDB. Record queue age and check whether a healthy worker exists.
2. **Downloading:** Claim the job atomically, renew the lease, verify the exact source version and download into cloud scratch. Count bytes.
3. **Encoding:** Probe duration and codecs; run the current H.264/AAC segment encoder. Parse FFmpeg machine-readable progress and store encoded seconds. Mark encoding complete only after successful FFmpeg exit and output checks.
4. **Uploading segments:** Upload and HEAD-verify a bounded number concurrently, initially 4. Preserve segment order by index, regardless of upload completion order. Record completed count and bytes. On any failure stop scheduling work, settle or abort in-flight requests, and never publish partial output.
5. **Verifying/publishing:** Validate playlist, durations, source identity and segment index. Save the playlist, then atomically switch the asset's active output and job to ready. Keep an existing replacement available until this succeeds.
6. **Ready:** Set completion time, make segmented playback available, and remove cloud scratch.
7. **Retry/failure:** Record the phase and safe error. Preserve the original; retry transient failures with bounded backoff. Mark permanent validation failures as failed. Retired/incomplete output is cleaned through the existing scoped cleanup flow.

Start with one job per container. Increase encoder threads only in line with the actual CPU allocation. More concurrent segment requests may reduce network overhead, but cannot eliminate encoding time. Do not promise processing duration until phase measurements exist.

## Admin and student presentation

- Admin: `Upload complete — waiting for processing`, then `Downloading 42%`, `Converting 38%`, `Saving segments 240 / 1,200`, `Verifying`, and `Ready to watch`.
- Percentages describe their own phase, not a fabricated overall percentage. Encoding percentage is based on processed timestamp versus duration and is clamped below completion until encoder validation succeeds.
- On a transient failure show `Retry scheduled` with the retry time. On terminal failure show a safe explanation and authorized Retry processing action.
- If worker heartbeats are missing, show `Waiting for worker` rather than an indefinitely active spinner. Do not show an exact queue position unless the queue query can support it reliably.
- Poll the current page every five seconds and refresh on focus/reconnection. Expose only scoped status fields; do not expose S3 keys, secrets, leases or signed URLs in status responses.
- Add processing state/phase to the student's authorized asset response so a queued recording can appear as `Preparing video` without granting playback access. Existing student ready-only filtering must be reviewed here; the admin polling change alone does not provide student pending-state visibility.
- An open admin or student recording should switch to playback when ready. Keep the recording's single name; segment files never become separate lessons.

## Cloud deployment and operations

1. Build a Linux image with Node, the worker entrypoint and verified FFmpeg/ffprobe binaries. Verify binaries execute inside the final image, not just on Windows.
2. Push the image to ECR; create an ECS service with managed restart and graceful termination.
3. Inject MongoDB configuration through a secrets manager. Use the ECS task role for scoped S3 access rather than embedding laptop AWS keys. Permit only the intended source/output operations and required object versions.
4. Configure Atlas networking for the worker and Vercel application independently. Confirm replica-set transactions work from the container.
5. Set segmentation flags and the intended tenant ID. Vercel receives upload/playback configuration; the worker receives worker-specific settings and cloud scratch configuration.
6. Heartbeat the worker, alarm on missing heartbeat, oldest queued-job age, stale processing jobs, repeated failures, low disk, long phase duration and cleanup backlog. A live task alone does not prove it can claim jobs.
7. On deployment or crash, stop taking new jobs and abort active work safely. Lease expiry permits another attempt; a reconciliation pass repairs jobs. New attempts use distinct output scopes, and stale attempts cannot publish.
8. Remove abandoned scratch directories only after proving the owning attempt is no longer active. Preserve the original S3 object until a separate retention policy explicitly authorizes deletion.

## Implementation order and acceptance

1. Containerize and deploy the existing worker; verify S3 access, Atlas connection, transactions, scratch capacity and automatic restart.
2. Add progress schema/phase timing and attempt-scoped writes; test crash, lease loss and duplicate claims before enabling richer UI.
3. Add bounded parallel segment uploads with ordered results and full pre-publication validation. Benchmark one short and one long recording.
4. Extend tenant-authorized admin/student status responses and UI; test retry visibility, worker absence, reconnect and ready transition without refresh.
5. Upload a representative 3–4 GiB recording. After the browser confirms completion, close the browser and power off the laptop. Confirm the cloud worker completes, MongoDB records its phases/times, and both admin/student playback use the verified segments.
6. Kill/restart the worker mid-download, encoding and segment upload. Verify bounded retry, no duplicate publication, retained original, no partial student playback and eventual cleanup.

Acceptance means the production cloud worker and recovery paths are demonstrated. A code change, local successful test or Vercel deployment by itself does not establish server-only processing.

## Official references

- [Vercel Functions limits](https://vercel.com/docs/functions/limitations): function execution is bounded; keep long processing outside the request lifecycle.
- [ECS Fargate task storage](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-storage.html): configure enough cloud temporary storage for source, output and runtime overhead.
- [S3 event notifications](https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventNotifications.html): optional event triggers require duplicate-safe handling.
