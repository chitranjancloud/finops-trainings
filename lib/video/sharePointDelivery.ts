import { getSharePointItemDownloadUrl, getSharePointItemPlaybackMetadata } from "@/lib/sharepoint";

/** Opt-in trial. Keep proxy delivery available for tenants requiring it. */
export function directSharePointVideoEnabled() {
  return process.env.SHAREPOINT_VIDEO_DELIVERY === "direct";
}

/**
 * Call only AFTER session, enrollment and object-level authorization.
 * The temporary URL is a bearer capability until Microsoft expires it.
 * Do not persist/cache it or expose the app's Graph access token.
 * Revisit before Microsoft's announced April 2027 tempauth retirement.
 */
export async function redirectToSharePointVideo(driveId: string, itemId: string) {
  const value = await getSharePointItemDownloadUrl(driveId, itemId);
  return playbackRedirect(value);
}

/** Generic file endpoints must not trust the caller's filename to classify videos. */
export async function redirectSharePointVideoIfVideo(driveId: string, itemId: string) {
  const metadata = await getSharePointItemPlaybackMetadata(driveId, itemId);
  const mime = metadata.mimeType.toLowerCase();
  const isVideo = mime.startsWith("video/") ||
    ((!mime || mime === "application/octet-stream") && /\.(mp4|webm|mov|m4v)$/i.test(metadata.name));
  if (!isVideo) return null;
  return playbackRedirect(metadata.downloadUrl);
}

function playbackRedirect(value: unknown) {
  if (typeof value !== "string" || !value) {
    throw new Error("SharePoint direct playback is unavailable. Please contact support.");
  }

  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("SharePoint returned an invalid playback URL.");
  }

  // A 307 preserves Range requests. Only metadata is fetched by our server;
  // the browser requests the video bytes directly from Microsoft's host.
  return new Response(null, {
    status: 307,
    headers: {
      Location: url.toString(),
      "Cache-Control": "private, no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Video-Delivery": "sharepoint-direct",
    },
  });
}
