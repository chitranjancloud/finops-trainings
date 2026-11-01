# Direct SharePoint video playback trial

Set `SHAREPOINT_VIDEO_DELIVERY=direct` in the server environment and restart
Next.js. This is enabled in the local, git-ignored `.env.local`. For a deployed
test, add the same variable in your hosting dashboard and deploy the code.
Unset the variable or set it to `proxy` to restore byte proxy delivery.

The existing player still requests the authenticated content endpoint. After
session, enrollment and file authorization, video responses return a temporary
307 redirect to Microsoft's HTTPS download URL. The app fetches Graph metadata
only. Video bytes and seek/range requests go to Microsoft. Batch access logging
and player controls remain in place. PDFs and document previews are unchanged.
Missing playback URLs fail visibly rather than silently falling back to proxying.

## Test

1. Restart with `npm run dev`, sign in, and open Student → Batches.
2. Play both a batch/inventory video and a recorded-course video. Seek forward,
   pause/resume, and check the existing player controls.
3. In browser Network, enable Preserve log. The initial content request should
   return 307 with `X-Video-Delivery: sharepoint-direct`; the following media
   requests should go to a Microsoft host (often 206 Partial Content).
4. Confirm an unenrolled account cannot obtain the redirect, and PDFs still open.
5. If playback fails, inspect the Microsoft request status and reload the page
   to obtain a fresh temporary URL. Do not share the Location header, media URL,
   or unredacted HAR: temporary URLs grant file access while valid.

Offline verification:

```sh
node --test scripts/test-sharepoint-direct-playback.cjs scripts/test-mongodb-connection.cjs
node scripts/test-sharepoint-token-cache.mjs
npx tsc --noEmit --incremental false
```

## Diagnose a missing redirect

If the app returns a Microsoft authentication error instead of a 307, the browser
cannot make the second request to SharePoint. The token request must succeed
before a temporary playback URL can be obtained. Changing the Referer or adding
the website domain does not repair an invalid Microsoft client secret.

Run a fresh, uncached authentication check:

```sh
# Local project, loading the local Next.js environment:
npm run check:sharepoint -- --local

# Inside the actual Railway production container (for example via railway ssh):
npm run check:sharepoint
```

Compare tenant/client IDs, secret length and secret fingerprint. The command
never prints the secret or token. A different fingerprint means different
effective secrets; code 7000215 means Microsoft rejected the configured secret.
Use the actual running container rather than a local shell with exported
Railway variables, particularly when variables are sealed. Network/DNS errors
are reported separately from Microsoft's credential errors.

## Limitations

This trial uses pre-authenticated URLs: students do not need Microsoft sign-in,
but anyone holding the URL can use it until Microsoft expires it. App logout or
enrollment removal cannot immediately revoke an issued URL. Hiding download
controls is not DRM. This changes delivery, not file sharing permissions; the
app's Graph token and client secret stay on the server. Temporary file URLs are
never persisted or cached by this feature.

Microsoft announced removal of embedded authorization from affected Graph file
URLs beginning April 1, 2027. This trial is not a permanent authenticated-player
solution. Revisit browser authentication or a dedicated video delivery service
before that rollout, and test tenant policies and browser playback compatibility.

Reference: https://devblogs.microsoft.com/microsoft365dev/pre-authenticated-tempauth-urls-are-retiring-move-to-microsoft-entra-id-tokens-before-april-1-2027/
