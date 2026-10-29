import assert from "node:assert/strict";
import { uploadS3File } from "../lib/storage/s3Client";

async function main() {
  const original = globalThis.fetch;
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  } });
  const stages: string[] = [];
  const bytes: number[] = [];
  const json = (data: object) => Response.json({ success: true, ...data });
  globalThis.fetch = async (url) => {
    if (String(url).endsWith("/parts")) return json({ parts: [{ url: "https://s3.test/part" }] });
    if (String(url).endsWith("/complete")) return json({ asset: { videoProcessingState: "queued" } });
    if (String(url).startsWith("https://s3.test")) return new Response("", { headers: { etag: "part-etag" } });
    return json({ assetId: "asset1", uploadSessionId: "session1", partCount: 2, partSize: 4, status: "uploading" });
  };
  try {
    await uploadS3File(new File(["123456"], "lesson.mp4"), "course", "batch", new AbortController().signal, () => {}, {
      onStatus: (status) => { stages.push(status.stage); bytes.push(status.uploadedBytes); },
    });
    assert.equal(stages[0], "preparing");
    assert.ok(stages.includes("uploading"));
    assert.equal(stages.at(-1), "verifying");
    assert.equal(bytes.at(-1), 6, "count actual final-part bytes");
    assert.equal(memory.has("s3-pilot-upload-v1"), false);
    console.log("PASS upload stage sequence, exact confirmed bytes and completion cleanup");
  } finally { globalThis.fetch = original; }
}
void main();
