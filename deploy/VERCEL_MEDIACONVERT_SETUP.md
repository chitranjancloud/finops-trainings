# Vercel + private S3 + managed MediaConvert

The website stays on Vercel. AWS MediaConvert reads the uploaded original from S3 and writes HLS segments beside it. There is no EC2, ECS, Docker deployment, laptop worker, or video temporary directory in this production path.

## Current activation status

The integration is implemented in code. Production activation is not complete. A read-only MediaConvert ListQueues check using the configured AWS credentials returned HTTP 403 AccessDenied, and `AWS_MEDIACONVERT_ROLE_ARN` is unset. No paid conversion job has been submitted. The existing provider is left unchanged until permissions and scheduling are ready.

## AWS permissions

1. Deploy `mediaconvert-role.cloudformation.json` with the existing media bucket and tenant ID. It creates only a MediaConvert service role with S3 access restricted to that tenant. Review the change set. It does not move the application, create another media bucket, or change bucket privacy.
2. Grant the Vercel application's AWS principal the actions in `mediaconvert-caller-policy.example.json`, replacing the region and service-role ARN placeholders. Its existing S3 credentials still need the current HEAD/GET/versioned output-verification and cleanup permissions. Do not give the browser these permissions or secret keys.
3. If the bucket uses a customer-managed KMS key or a restrictive bucket policy, explicitly grant the service role the required decrypt/encrypt/data-key and S3 permissions. The generated policy assumes the current S3-managed encryption configuration.

## Vercel environment variables

Preserve the existing MongoDB, S3 bucket, AWS credentials, private playback and upload configuration. Add these server-only variables in the Vercel project:

```dotenv
VIDEO_PROCESSING_PROVIDER=mediaconvert
AWS_MEDIACONVERT_ROLE_ARN=<CloudFormation service-role ARN>
VIDEO_PROCESSING_TENANT_ID=<existing tenant ObjectId>
CRON_SECRET=<new random secret of at least 32 characters>
S3_VIDEO_SEGMENTATION_ENABLED=true
```

The existing bucket region is `ap-southeast-2`; the MediaConvert client uses the same `AWS_REGION`. Verify production uses the intended bucket/region too. Keep `S3_UPLOAD_ENABLED=true` and `S3_PLAYBACK_ENABLED=true`. Do not set worker-enabled flags, FFmpeg paths or a laptop D: temp path for managed processing.

Redeploy after changing Vercel variables. Restart a local development server after these model changes so an older cached Mongoose schema is not reused.

## Required automatic reconciliation

This project uses Vercel **Hobby/free**. Do not add a one-minute Vercel cron: Hobby rejects it at deployment. Deploy `mediaconvert-hobby-scheduler.cloudformation.json` instead. This creates an EventBridge one-minute schedule and a small Lambda that only calls the existing protected Vercel endpoint. It neither downloads videos nor performs conversion, and does not host or move the application. AWS usage charges for this trigger are separate from MediaConvert.

Supply the production Vercel origin and the same random `CRON_SECRET` configured in Vercel. The secret parameter is NoEcho and is never committed. Initially leave ScheduleState=DISABLED. Deploy Vercel first, test an authorized endpoint call, then set ScheduleState=ENABLED and verify successful Lambda invocations. The function sends `Authorization: Bearer <CRON_SECRET>` and waits for the bounded response. Direct EventBridge API destinations have a five-second response timeout, so they are deliberately not used for a verifier that can take longer.

The protected endpoint is `/api/internal/video-jobs`. It takes its tenant from server configuration, never query parameters. Without this scheduled trigger, AWS conversion can finish but verification/publication may remain pending after the browser closes. If deployment protection or a firewall blocks the trigger, configure an intentional production exception or authenticated bypass without weakening the endpoint's own secret check.

Each call checks a bounded batch, records provider state and percentage, and verifies at most 128 segment objects per job pass, checkpointing every 16 segments. Large playlists continue on later calls. Shared request cancellation and a scheduling deadline bound AWS work; separate synchronization tokens prevent a timed-out invocation from modifying the next owner's lease or results. A call may run additional passes within its time budget. The endpoint has a 60-second maximum; it does not download entire videos or run FFmpeg.

Do not rely on browser polling, Vercel detached promises, or a laptop process for job completion. The five-second UI refresh reads the latest stored status; AWS and scheduled updates may arrive less frequently.

## Job behavior

- Verified upload queues a tenant/source/version/profile job and submits it to MediaConvert with durable attempt metadata.
- A missing role produces Processing setup required; a rejected submission becomes a visible failure. The original remains safely stored.
- An ambiguous CreateJob response is recovered by searching AWS jobs for the exact tenant/job/attempt metadata. It is never blindly resubmitted after AWS's one-minute idempotency window. If the bounded search cannot find it, an administrator must inspect AWS and the database before retrying.
- Progress moves through submitted, probing, encoding, saving segments, checking playback and ready. AWS percentages describe the overall managed job, not an invented phase percentage.
- On COMPLETE, Vercel verifies the source identity, strictly generated media playlist, duration, every segment's size and TS packet signature, and exact object version. Only then does a transaction publish the output. The original is never offered as a processing fallback.
- Retry processing creates a new attempt/output scope. Repeated application requests do not create duplicate paid jobs. Upload replacements preserve the previous recording until publication succeeds.
- The scheduled endpoint also removes retired/deleted output in bounded versioned pages. Running managed jobs are cancelled and their terminal status confirmed before cleanup. Uncertain submissions retain their files for review.
- Older queued FFmpeg jobs can be adopted by the managed submitter. Do not run a laptop worker against production after switching providers.

## Acceptance checks

1. Verify API permissions, a real service-role ARN, deployed Vercel variables, and successful authorized scheduled invocations.
2. Upload short recordings with audio and without audio. Verify AWS accepts the settings and that output is playable in admin and enrolled student views. Offline tests do not establish AWS encoder acceptance or production audio behavior.
3. Upload a representative long recording, wait for confirmed upload completion, close the browser and switch off the laptop. Confirm AWS processing and Vercel reconciliation reach Ready independently.
4. Verify a duplicate completion request does not create another paid job; test network ambiguity and cron overlap/lease recovery.
5. Test corrupt media, denied permissions, replacement conflict and delete while processing. Confirm no partial or unauthorized playback and eventual cleanup.
6. Measure AWS conversion and verification duration before promising processing times. MediaConvert has separate AWS charges; no conversion cost or speed guarantee is made here.

## References

- [MediaConvert job progress](https://docs.aws.amazon.com/mediaconvert/latest/ug/how-mediaconvert-jobs-progress.html)
- [MediaConvert idempotency window](https://docs.aws.amazon.com/mediaconvert/latest/apireference/idempotency.html)
- [Vercel Cron usage](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [EventBridge scheduled rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html)
- [EventBridge API destination timeout](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html)
