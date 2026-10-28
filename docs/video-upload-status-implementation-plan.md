# Automatic upload status implementation plan

Goal: show upload and processing stages without manual page refresh.

Design: [video-upload-status-design.md](video-upload-status-design.md).

- Add upload lifecycle notifications to s3Client and retry notifications to uploadRecovery; preserve existing callers and resume records.
- Render a reusable accessible status display with confirmed bytes and percentage, verification, retry, pause, queue, processing, failure and ready states.
- Track the active asset by ID; show its status in the upload panel and matching library row. Never fabricate another browser's progress.
- Poll the library every five seconds without overlapping requests; refresh on visibility/focus, abort requests on cleanup, and retain rows when background refresh fails.
- Test lifecycle transitions with mocked upload requests, retry notifications, TypeScript and lint. The remote worker must run to advance queued videos.

## Verification

Implemented and checked locally: upload lifecycle and exact-byte tests, retry notification tests, 41 offline storage checks, TypeScript, targeted lint, and a Chromium component test covering upload, verification, queue, processing, ready, pause, processing failure, and failed background refresh recovery. The browser test also checks status presence at a mobile viewport. It uses synthetic APIs and does not upload real files or exercise the production worker.

Deployment is still required for the Vercel site to receive these changes.
