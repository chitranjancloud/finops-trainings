// Starts only a local compiled app. S3 flags are forcibly disabled; no AWS calls.
const { spawn } = require("node:child_process");
const path = require("node:path");
const net = require("node:net");
const assert = require("node:assert/strict");
async function main() {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(() => resolve(value)); });
  });
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: path.resolve(__dirname, ".."), windowsHide: true,
    env: { ...process.env, S3_ISOLATED_BUILD: "true", S3_UPLOAD_ENABLED: "false", S3_PLAYBACK_ENABLED: "false" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => { output = (output + data).slice(-4000); });
  child.stderr.on("data", (data) => { output = (output + data).slice(-4000); });
  const origin = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error(`Local server exited: ${output}`);
      try { await fetch(`${origin}/admin-page/s3-pilot`, { signal: AbortSignal.timeout(2000) }); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
    }
    assert.ok(ready, `Local server did not become ready: ${output}`);
    const id = "111111111111111111111111";
    const routes = [
      ["POST", "/api/s3/admin/uploads"], ["POST", `/api/s3/admin/uploads/${id}/parts`],
      ["POST", `/api/s3/admin/uploads/${id}/complete`], ["POST", `/api/s3/admin/uploads/${id}/abort`],
      ["GET", "/api/s3/admin/assets"], ["POST", "/api/s3/student/access-url"],
    ];
    for (const [method, route] of routes) {
      const response = await fetch(origin + route, { method, signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 503, route);
      assert.equal((await response.json()).message, "S3 pilot is disabled.");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      console.log(`PASS disabled ${method} ${route}`);
    }
    for (const [route, text] of [["/admin-page/s3-pilot", "S3 pilot is disabled"], [`/student/s3-pilot/${id}`, "S3 playback pilot is disabled"]]) {
      const response = await fetch(origin + route, { signal: AbortSignal.timeout(5000) });
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes(text));
      console.log(`PASS disabled screen ${route}`);
    }
    console.log("8 compiled runtime smoke checks passed.");
  } finally { child.kill(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
