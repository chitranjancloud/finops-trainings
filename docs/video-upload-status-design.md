# Video upload status presentation

Show progress beside the recording in the content library, so the admin can understand what is happening without reopening the upload form.

## Approaches

- Recommended: a compact progress bar and status detail in the existing table row, plus the current upload controls above the table. Keeps every recording and its progress together.
- Alternative: a separate upload dashboard. More space, but adds navigation and separates progress from the recording.

## Proposed presentation

- Preparing upload: checking the selected file and starting or recovering its upload session.
- Uploading: confirmed percentage, confirmed bytes out of total size, and a blue progress bar. Explain that this measures completed parts. Keep Pause available.
- Retrying: indicate a temporary connection problem while automatic retry runs. Preserve the last confirmed progress.
- Paused / needs attention: retain progress and say to select the same file and lesson date to resume. A refreshed page must not claim that an upload is still actively transferring.
- Verifying: once all parts are transferred, show “Upload received — verifying file” instead of suggesting the video is ready.
- Queued: “Upload complete — waiting to prepare video.”
- Processing: “Preparing video for playback.” Use an indeterminate indicator because the worker does not currently report reliable encoding percentages.
- Ready: green check and “Ready to watch.”
- Failed: clear explanation and the existing appropriate resume or retry-processing action.

Only show upload percentage for the upload tracked by this browser. Do not invent progress for uploads from other browsers or worker processing. Update processing statuses automatically after upload. Keep the recording name, date, and actions visible on narrow screens.

This changes presentation and upload progress notifications; it does not change S3 permissions, upload expiry, or video encoding. Implementation should verify pause, failed-part retry, completion verification, and processing transitions, and inspect desktop and mobile layouts.
