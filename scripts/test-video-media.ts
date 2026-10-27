// Real local media conversion. No .env loading, MongoDB, AWS, or private recordings.
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { encodeVideo, runMediaTool } from "../lib/video/encoding";
import { mediaTool } from "../lib/video/tools";

async function main() {
  const root = path.resolve(tmpdir());
  const dir = await mkdtemp(path.join(root, "finops-media-test-"));
  try {
    const input = path.join(dir, "source.mp4");
    await runMediaTool(mediaTool("ffmpeg"), ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=640x360:rate=24", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", "19", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", input]);
    const output = path.join(dir, "audio"); await mkdir(output);
    const audio = await encodeVideo(input, output);
    assert.equal(audio.segments.length, 4);
    assert.ok(Math.abs(audio.duration - 19) < 1);
    assert.ok(audio.segments.slice(0, -1).every((s) => Math.abs(s.duration - 6) < 0.15));
    console.info("PASS real FFmpeg: audio/video fixture produces clean six-second segments and matching duration");
    const silent = path.join(dir, "silent.mp4");
    await runMediaTool(mediaTool("ffmpeg"), ["-nostdin", "-y", "-v", "error", "-i", input, "-an", "-c:v", "copy", silent]);
    const silentOutput = path.join(dir, "silent"); await mkdir(silentOutput);
    assert.equal((await encodeVideo(silent, silentOutput)).segments.length, 4);
    console.info("PASS real FFmpeg: silent recordings remain supported");
    const corrupt = path.join(dir, "corrupt.mp4"); await writeFile(corrupt, "invalid movie");
    await assert.rejects(() => encodeVideo(corrupt, output));
    console.info("PASS real FFmpeg: corrupt inputs are rejected");
    const abort = new AbortController(); abort.abort();
    await assert.rejects(() => encodeVideo(input, output, abort.signal));
    console.info("PASS real FFmpeg: cancellation aborts processing");
  } finally {
    if (path.dirname(dir) === root && path.basename(dir).startsWith("finops-media-test-")) await rm(dir, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
