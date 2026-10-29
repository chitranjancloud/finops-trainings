import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseVideoPlaylist } from "./hls";
import { mediaTool } from "./tools";

export async function runMediaTool(binary: string, args: string[], signal?: AbortSignal, timeout = 60000, onLine?: (line: string) => void) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true, shell: false, signal, stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    let partial = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("PROCESS_TIMEOUT")); }, timeout);
    child.stdout.on("data", (data: Buffer) => {
      if (stdout.length < 1024 * 1024) stdout += data.toString();
      if (onLine) {
        const lines = (partial + data.toString()).split(/\r?\n/);
        partial = (lines.pop() || "").slice(-4096);
        for (const line of lines) onLine(line);
      }
    });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error("MEDIA_TOOL_FAILED"));
    });
  });
}

export async function encodeVideo(input: string, output: string, signal?: AbortSignal, onProgress?: (encodedSeconds: number, duration: number) => void) {
  const probe = JSON.parse(await runMediaTool(mediaTool("ffprobe"), ["-v", "error", "-protocol_whitelist", "file,pipe", "-show_streams", "-show_format", "-of", "json", input], signal));
  const duration = Number(probe.format?.duration);
  const video = probe.streams?.find((s: { codec_type: string; disposition?: { attached_pic?: number } }) => s.codec_type === "video" && !s.disposition?.attached_pic);
  if (!video || !Number.isFinite(duration) || duration <= 0 || duration > 12 * 3600 || Number(video.width) > 8192 || Number(video.height) > 8192) throw new Error("INVALID_VIDEO");
  onProgress?.(0, duration);
  const args = ["-nostdin", "-y", "-v", "error", "-protocol_whitelist", "file,pipe", "-i", input,
    "-map", "0:V:0", "-map", "0:a:0?", "-sn", "-dn", "-map_metadata", "-1",
    "-vf", "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-maxrate", "2500k", "-bufsize", "5000k", "-pix_fmt", "yuv420p",
    "-force_key_frames", "expr:gte(t,n_forced*6)", "-sc_threshold", "0", "-threads", String(Math.max(1, Math.min(16, Math.floor(Number(process.env.VIDEO_ENCODER_THREADS) || 2)))),
    "-c:a", "aac", "-b:a", "96k", "-ac", "2", "-ar", "48000",
    "-f", "hls", "-hls_time", "6", "-hls_list_size", "0", "-hls_playlist_type", "vod", "-hls_flags", "independent_segments",
    "-hls_segment_filename", path.join(output, "segment-%06d.ts"), path.join(output, "index.m3u8")];
  args.splice(4, 0, "-progress", "pipe:1", "-nostats");
  let encodedSeconds = 0;
  await runMediaTool(mediaTool("ffmpeg"), args, signal, 24 * 3600000, line => {
    // FFmpeg out_time_us is microseconds; do not treat its legacy out_time_ms as milliseconds.
    if (line.startsWith("out_time_us=")) {
      const seconds = Number(line.slice(12)) / 1_000_000;
      if (Number.isFinite(seconds) && seconds >= 0) { encodedSeconds = Math.max(encodedSeconds, Math.min(seconds, duration)); onProgress?.(encodedSeconds, duration); }
    }
  });
  const playlist = await readFile(path.join(output, "index.m3u8"), "utf8");
  const segments = parseVideoPlaylist(playlist);
  const actualDuration = segments.reduce((total, s) => total + s.duration, 0);
  if (Math.abs(actualDuration - duration) > Math.max(2, duration * 0.005)) throw new Error("DURATION_MISMATCH");
  let outputBytes = 0;
  for (const segment of segments) {
    const size = (await stat(path.join(output, segment.filename))).size;
    if (!size || size > 16 * 1024 * 1024) throw new Error("INVALID_SEGMENT");
    outputBytes += size;
    if (outputBytes > 20 * 1024 ** 3) throw new Error("OUTPUT_TOO_LARGE");
  }
  // Decode boundary samples to catch corrupt output before publication.
  for (const segment of [segments[0], segments[Math.floor(segments.length / 2)], segments[segments.length - 1]]) {
    await runMediaTool(mediaTool("ffmpeg"), ["-nostdin", "-v", "error", "-xerror", "-protocol_whitelist", "file,pipe", "-i", path.join(output, segment.filename), "-t", "1", "-f", "null", "-"], signal);
  }
  return { playlist, segments, duration: actualDuration, outputBytes };
}
