// Uses generated media and intercepted APIs only. Run against a local built app.
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { encodeVideo, runMediaTool } from "../lib/video/encoding";
import { mediaTool } from "../lib/video/tools";
import { playbackPlaylist } from "../lib/video/hls";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";

async function main() {
  const root = path.resolve(tmpdir()); const directory = await mkdtemp(path.join(root, "finops-video-ui-"));
  const base = process.env.VIDEO_TEST_BASE_URL || "http://127.0.0.1:3109";
  if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Use a loopback test server.");
  const browser = await chromium.launch({ headless: true, executablePath: process.env.LOCAL_MEDIA_BROWSER || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  let server: ChildProcess | undefined;
  let mediaServer: Server | undefined;
  try {
    if (process.env.VIDEO_TEST_START_SERVER === "true") {
      server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", new URL(base).port || "3109"],
        { windowsHide: true, env: { ...process.env, S3_ISOLATED_BUILD: "true", S3_UPLOAD_ENABLED: "false", S3_PLAYBACK_ENABLED: "true" }, stdio: ["ignore", "pipe", "ignore"] });
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Test server startup timed out")), 20000);
        server!.on("error", (error) => { clearTimeout(timer); reject(error); });
        server!.stdout!.on("data", (data: Buffer) => { if (data.toString().includes("Ready")) { clearTimeout(timer); resolve(); } });
      });
    }
    const input = path.join(directory, "source.mp4"), out = path.join(directory, "output"); await mkdir(out);
    await runMediaTool(mediaTool("ffmpeg"), ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=12", "-t", "90", "-c:v", "libx264", "-pix_fmt", "yuv420p", input]);
    const encoded = await encodeVideo(input, out);
    // Playwright does not reroute redirected requests. Use a real loopback-only
    // media origin to exercise the same cross-origin redirect used by private S3.
    mediaServer = createServer(async (req, res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store");
      const index = Number(req.url?.slice(1));
      if (!/^\/\d+$/.test(req.url || "") || !encoded.segments[index]) { res.writeHead(404); res.end(); return; }
      const bytes = await readFile(path.join(out, encoded.segments[index].filename));
      res.setHeader("Content-Type", "video/mp2t"); res.setHeader("Content-Length", bytes.length); res.end(bytes);
    });
    await new Promise<void>((resolve) => mediaServer!.listen(0, "127.0.0.1", resolve));
    const mediaAddress = mediaServer.address();
    if (!mediaAddress || typeof mediaAddress === "string") throw new Error("Media server address missing");
    const mediaOrigin = `http://127.0.0.1:${mediaAddress.port}`;
    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem("user", JSON.stringify({ _id: "333333333333333333333333", role: location.pathname.startsWith("/admin") ? "admin" : "student", name: "Synthetic Viewer" }));
      localStorage.setItem("sessionToken", "synthetic"); localStorage.setItem("deviceId", "synthetic");
    });
    const token = "a".repeat(43), indices: number[] = [], errors: string[] = [], network: string[] = [];
    const courseId = "333333333333333333333333", batchId = "444444444444444444444444";
    const batch = { _id: batchId, courseId, courseName: "Synthetic Course", name: "Synthetic Batch", code: "SEGMENT-TEST", isActive: true, materials: [], assignments: [], tests: [], notices: [], faculty: [] };
    const lesson = { assetId: "222222222222222222222222", filename: "Synthetic segmented recording", contentType: "video/mp4", category: "video", status: "ready", videoProcessingState: "ready", courseId, batchId, contentDate: "2026-10-27", byteSize: 102400, createdAt: "2026-10-27T00:00:00Z" };
    await context.route("**/api/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === "/api/batches") return route.fulfill({ json: { success: true, batches: [batch], enrollments: [] } });
      if (pathname === "/api/courses") return route.fulfill({ json: { success: true, courses: [{ _id: courseId, title: "Synthetic Course", slug: "synthetic-course" }] } });
      if (pathname === "/api/s3/admin/assets" || pathname === "/api/s3/student/assets") return route.fulfill({ json: { success: true, assets: [null, "video"].includes(new URL(route.request().url()).searchParams.get("category")) ? [lesson] : [], total: 1, hasMore: false } });
      if (pathname === "/api/s3/student/access-url") return route.fulfill({ json: { success: true, mode: "hls", filename: "Synthetic segmented recording", url: `/api/s3/video-playback/${token}/manifest`, playbackToken: token, expiresAt: new Date(Date.now() + 1800000).toISOString() } });
      if (pathname.endsWith("/manifest")) return route.fulfill({ contentType: "application/vnd.apple.mpegurl", body: playbackPlaylist(encoded.segments, (i) => `/api/s3/video-playback/${token}/segment/${i}`) });
      const match = pathname.match(/\/segment\/(\d+)$/);
      if (match) {
        const index = Number(match[1]); indices.push(index);
        return route.fulfill({ status: 307, headers: { Location: `${mediaOrigin}/${index}`, "Cache-Control": "no-store" } });
      }
      return route.fulfill({ json: { success: true, notifications: [], courses: [], batches: [], enrollments: [], inventory: [], submissions: [], byBatch: {}, activeStudents: [], inactiveStudents: [], students: [], count: 0 } });
    });
    const page = await context.newPage(); page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (req) => network.push(`failed:${req.url()}:${req.failure()?.errorText}`));
    page.on("console", (message) => { if (message.type() === "error") network.push(message.text()); });
    await page.goto(`${base}/student/s3-pilot/222222222222222222222222`);
    await page.getByRole("button", { name: "Open private video" }).click();
    await page.waitForFunction(() => { const video = document.querySelector("video"); return video && video.duration >= 89; });
    assert.ok(indices.length < encoded.segments.length / 2, "initial buffer must not download the whole recording");
    console.info("PASS browser: HLS metadata loads and only a small initial segment buffer downloads");
    await page.evaluate(() => {
      const events: string[] = []; (window as unknown as { videoEvents: string[] }).videoEvents = events;
      const video = document.querySelector("video")!;
      for (const name of ["play", "pause", "waiting", "error", "loadedmetadata", "canplay", "seeking", "seeked"]) video.addEventListener(name, () => events.push(`${name}:${video.currentTime.toFixed(2)}`));
    });
    await page.locator("video").evaluate((video: HTMLVideoElement) => { video.playbackRate = 4; video.muted = true; });
    await page.getByRole("button", { name: "Play", exact: true }).click();
    try { await page.waitForFunction(() => (document.querySelector("video")?.currentTime || 0) > 8, undefined, { timeout: 15000 }); }
    catch (error) {
      console.info("Playback diagnostics", await page.evaluate(() => {
        const video = document.querySelector("video")!;
        return { time: video.currentTime, paused: video.paused, readyState: video.readyState, error: video.error?.message,
          buffered: Array.from({ length: video.buffered.length }, (_, i) => [video.buffered.start(i), video.buffered.end(i)]), events: (window as unknown as { videoEvents: string[] }).videoEvents };
      }), { indices, errors, network }); throw error;
    }
    console.info("PASS browser: existing controls play continuously across segment boundaries");
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.waitForTimeout(300); const pausedCount = indices.length;
    await page.waitForTimeout(1500); assert.equal(indices.length, pausedCount);
    console.info("PASS browser: paused player stops forward segment requests");
    const beforeSeek = indices.length;
    await page.locator("video").evaluate((video: HTMLVideoElement) => { video.currentTime = 70; });
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("video")?.currentTime || 0) > 73, undefined, { timeout: 15000 });
    assert.ok(indices.slice(beforeSeek).some((i) => i >= 11));
    assert.ok(!indices.slice(beforeSeek).some((i) => i > 5 && i < 10), "seeking should skip intermediate segments");
    assert.deepEqual(errors, []);
    console.info("PASS browser: seeking fetches nearby segments and playback resumes without JS errors");
    await page.goto(`${base}/admin-page/batches`);
    await page.getByRole("button", { name: /Synthetic Batch/ }).click();
    const adminVideos = page.locator("section").filter({ has: page.getByRole("heading", { name: "Content library", exact: true }) }).last();
    await adminVideos.locator("tbody tr").first().waitFor();
    assert.equal(await adminVideos.locator("tbody tr").count(), 1);
    await adminVideos.getByRole("button", { name: "Preview", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("video")?.duration || 0) >= 89);
    assert.equal(await page.getByRole("button", { name: "Open private video", exact: true }).count(), 0);
    console.info("PASS browser: admin lists one recording and opens its segmented player directly");
    await page.goto(`${base}/student/batches`);
    await page.getByRole("link", { name: /Synthetic Batch/ }).click();
    const studentFiles = page.getByRole("region", { name: "Learning library", exact: true });
    await studentFiles.getByText("Synthetic segmented recording", { exact: true }).waitFor();
    assert.equal(await studentFiles.locator("ul > li").count(), 1);
    await studentFiles.getByRole("button", { name: "Watch lesson", exact: true }).click();
    await page.waitForFunction(() => (document.querySelector("video")?.duration || 0) >= 89);
    assert.equal(await page.getByRole("button", { name: "Open private video", exact: true }).count(), 0);
    console.info("PASS browser: student lists one recording and opens the same segmented player directly");
    if (process.env.VIDEO_TEST_SCREENSHOT_DIR) {
      const screenshots = path.resolve(process.env.VIDEO_TEST_SCREENSHOT_DIR);
      await mkdir(screenshots, { recursive: true });
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(screenshots, "student-batches-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(screenshots, "student-batches-mobile.png"), fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "student page should fit the mobile viewport");
      console.info("PASS browser: student layout fits a mobile viewport; desktop/mobile screenshots saved");
    }
    await context.close();
  } finally {
    await browser.close();
    server?.kill();
    if (mediaServer) { mediaServer.closeAllConnections(); await new Promise<void>((resolve) => mediaServer!.close(() => resolve())); }
    if (path.dirname(directory) === root && path.basename(directory).startsWith("finops-video-ui-")) await rm(directory, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
