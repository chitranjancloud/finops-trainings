import assert from "node:assert/strict";
import { uploadRequest } from "../lib/storage/uploadRecovery";

async function main() {
  let calls = 0;
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { calls++; return new Response("", { status: calls === 1 ? 503 : 200 }); };
    assert.equal((await uploadRequest("https://example.test", {}, undefined, 100, 1)).status, 200);
    assert.equal(calls, 2);
    calls = 0;
    globalThis.fetch = async () => { calls++; return new Response("", { status: 401 }); };
    assert.equal((await uploadRequest("https://example.test", {}, undefined, 100, 1)).status, 401);
    assert.equal(calls, 1, "expired login must not retry");
    globalThis.fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
    await assert.rejects(uploadRequest("https://example.test", {}, undefined, 5, 1), /timed out/i);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(uploadRequest("https://example.test", {}, controller.signal, 100, 1), { name: "AbortError" });
    console.log("PASS transient retry, login expiry, bounded timeout and pause");
  } finally { globalThis.fetch = original; }
}
void main();
