# Server video job execution ledger

Approved design: VIDEO_SERVER_PROCESSING_PLAN.md.

Implement in place in the existing shared project, preserving current upload behavior and private playback authorization.

1. Test ordered bounded work and safe public progress serialization; implement helpers.
2. Add attempt-scoped database progress, timings and bounded history; instrument download/encoding/upload and parallel verified segment transfer.
3. Add tenant worker heartbeat and safe public progress to existing admin/student lists; present stages with polling.
4. Package a non-root Linux worker and ECS deployment template, secrets/task-role configuration and operations instructions.
5. Run offline storage/video tests, real media fixtures, browser status tests, lint and TypeScript. Review the final change.

Deployment constraints found: Docker and AWS CLI are not installed on this host; no ECS/VPC/registry deployment settings exist in this project. Prepare reviewable cloud artifacts; do not claim the cloud worker is deployed without verifying it.

Ruling: user explicitly selected Vercel + AWS MediaConvert instead of any container/server deployment. Removed the newly prepared container/ECS files. Preserve the local worker as a legacy provider, but exclude managed jobs from its claim/exhaustion paths. Share progress/publication helpers. Add protected, bounded Vercel reconciliation and managed S3 cleanup.

Production preflight: existing AWS_REGION is ap-southeast-2. AWS MediaConvert ListQueues returned 403 AccessDenied; AWS_MEDIACONVERT_ROLE_ARN is absent. No paid job submitted. Provider activation remains unchanged, and the one-minute cron example is not merged into root configuration because Vercel Hobby would reject that schedule. Required IAM, environment and scheduler instructions are in deploy/VERCEL_MEDIACONVERT_SETUP.md.

Ruling: user confirmed Vercel Hobby/free. Removed the one-minute Vercel cron example. Added a disabled-by-default AWS EventBridge + lightweight Lambda status trigger template; it only invokes the protected Vercel endpoint and never handles video files. The website remains on Vercel and AWS MediaConvert performs conversion. AWS permissions, role ARN, secret/environment setup, trigger deployment and production acceptance remain external activation steps.

Review fixes: added per-sync fencing tokens, bounded abortable AWS calls and 16-segment verification checkpoints, submission outcomes, deletion/submission recovery, legacy output cleanup, cleanup deferral to avoid queue starvation, and scoped lookup repair for missing jobs.

Verification: managed integration tests with mocked AWS/database boundaries; scheduler inline handler contract; 20 video authorization/publication checks; 46 storage checks; real FFmpeg audio/silent/corrupt/cancellation fixtures; bounded concurrency/progress tests; browser upload, managed progress, verification, pause and automatic refresh recovery; TypeScript and targeted lint. No production MediaConvert conversion or CloudFormation stack execution was performed. A full Next production build was not run in this turn; C: free space was approximately 1.14 GiB.
