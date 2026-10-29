import assert from "node:assert/strict";
import { mapBounded, publicJobProgress } from "../lib/video/progress";

async function main() {
  let running = 0, max = 0;
  const values = await mapBounded([30, 5, 15, 1], 2, async (ms, index) => {
    running++; max = Math.max(max, running);
    await new Promise(resolve => setTimeout(resolve, ms)); running--;
    return index;
  });
  assert.deepEqual(values, [0, 1, 2, 3]); assert.equal(max, 2);
  let settled = false;
  await assert.rejects(mapBounded([0, 1, 2], 2, async (n) => {
    if (n === 0) throw new Error("failed");
    await new Promise(resolve => setTimeout(resolve, 20)); settled = true; return n;
  }), /failed/);
  assert.equal(settled, true, "settle in-flight work before returning failure");
  const progress = publicJobProgress({ state: "processing", phase: "encoding", encodedSeconds: 100, sourceDurationSeconds: 100, sourceKey: "private", attemptId: "secret" }, false);
  assert.equal(progress.percent, 99); assert.equal(progress.phase, "encoding");
  assert.equal("sourceKey" in progress, false); assert.equal("attemptId" in progress, false);
  assert.equal(publicJobProgress({ state: "queued", phase: "queued" }, false).phase, "waiting-worker");
  assert.equal(publicJobProgress({ state: "queued", phase: "retry-wait" }, true).phase, "retry-wait");
  console.log("PASS bounded parallelism, ordered results, settled failures, safe phase progress and worker availability");
}
void main();
