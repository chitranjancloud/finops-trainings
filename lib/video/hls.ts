/** Strict parser for our single-rendition FFmpeg VOD output, never arbitrary playlists. */
export function parseVideoPlaylist(text: string) {
  if (!text.startsWith("#EXTM3U") || !text.includes("#EXT-X-ENDLIST")) throw new Error("INVALID_PLAYLIST");
  const segments: { filename: string; duration: number }[] = [];
  let duration: number | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF:")) {
      if (duration !== undefined) throw new Error("INVALID_PLAYLIST");
      duration = Number(line.slice(8).split(",")[0]);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 12) throw new Error("INVALID_PLAYLIST");
    } else if (line && !line.startsWith("#")) {
      if (duration === undefined || !/^segment-\d{6}\.ts$/.test(line) || segments.some((s) => s.filename === line)) throw new Error("INVALID_PLAYLIST");
      segments.push({ filename: line, duration }); duration = undefined;
    } else if (/^#EXT-X-(KEY|MAP|STREAM-INF|MEDIA):/.test(line)) throw new Error("INVALID_PLAYLIST");
  }
  if (duration !== undefined || !segments.length || segments.length > 10000) throw new Error("INVALID_PLAYLIST");
  return segments;
}

export function playbackPlaylist(segments: { duration: number }[], segmentUrl: (index: number) => string) {
  return ["#EXTM3U", "#EXT-X-VERSION:3", "#EXT-X-PLAYLIST-TYPE:VOD", "#EXT-X-INDEPENDENT-SEGMENTS",
    `#EXT-X-TARGETDURATION:${Math.ceil(Math.max(...segments.map((s) => s.duration)))}`, "#EXT-X-MEDIA-SEQUENCE:0",
    ...segments.flatMap((s, i) => [`#EXTINF:${s.duration.toFixed(6)},`, segmentUrl(i)]), "#EXT-X-ENDLIST", ""].join("\n");
}
