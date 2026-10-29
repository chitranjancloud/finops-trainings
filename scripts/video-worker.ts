import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { writeFile, rm } from "node:fs/promises";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.VIDEO_WORKER_ENABLED !== "true") throw new Error("Set VIDEO_WORKER_ENABLED=true to start the video worker.");
  const tenantId = process.env.VIDEO_WORKER_TENANT_ID || "";
  if (!/^[a-f\d]{24}$/i.test(tenantId)) throw new Error("Set VIDEO_WORKER_TENANT_ID to the intended tenant ObjectId.");
  const { checkVideoTools, maintainVideoJobs, claimVideoJob, processVideoJob } = await import("../lib/video/worker");
  await checkVideoTools();
  const { connectDB } = await import("../lib/mongodb");
  const mongoose = (await import("mongoose")).default;
  await connectDB();
  const Job = (await import("../models/S3VideoJob")).default;
  const Session = (await import("../models/S3VideoSession")).default;
  const Event = (await import("../models/S3AssetEvent")).default;
  const Worker = (await import("../models/S3VideoWorker")).default;
  await Job.init(); await Session.init(); await Event.init(); await Worker.init();
  // Publication needs transactions so replacement and ready state switch together.
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("Video worker requires MongoDB replica-set/Atlas transactions.");
  const abort = new AbortController();
  const workerId = randomUUID();
  let jobId = "", beating = false;
  const beat = async () => {
    if (beating) return;
    beating = true;
    try {
      await Worker.updateOne({ tenantId, workerId }, { $set: { lastSeenAt: new Date(), jobId, version: process.env.VIDEO_WORKER_VERSION || "unknown" } }, { upsert: true });
      if (process.env.VIDEO_WORKER_HEALTH_FILE) await writeFile(process.env.VIDEO_WORKER_HEALTH_FILE, String(Date.now()), { mode: 0o600 });
    } finally { beating = false; }
  };
  await beat();
  const heartbeat = setInterval(() => { void beat().catch(() => abort.abort()); }, 20000);
  process.on("SIGINT", () => abort.abort()); process.on("SIGTERM", () => abort.abort());
  console.info("Video worker started", { tenantId });
  try {
    while (!abort.signal.aborted) {
      await maintainVideoJobs(tenantId);
      const job = process.env.S3_VIDEO_SEGMENTATION_ENABLED === "true" ? await claimVideoJob(tenantId) : null;
      if (job) { jobId = String(job._id); await beat(); await processVideoJob(job, abort.signal); jobId = ""; await beat(); }
      else await new Promise<void>((resolve) => {
        const finish = () => { clearTimeout(timer); abort.signal.removeEventListener("abort", finish); resolve(); };
        const timer = setTimeout(finish, 5000); abort.signal.addEventListener("abort", finish, { once: true });
      });
    }
  } finally {
    clearInterval(heartbeat);
    await Worker.deleteOne({ tenantId, workerId }).catch(() => undefined);
    if (process.env.VIDEO_WORKER_HEALTH_FILE) await rm(process.env.VIDEO_WORKER_HEALTH_FILE, { force: true });
    await mongoose.disconnect();
  }
}
main().catch((error) => {
  console.error("Video worker stopped", { message: error instanceof Error && /^(Set |Video worker requires)/.test(error.message) ? error.message : "Check worker configuration, FFmpeg, MongoDB and S3 permissions.", name: error instanceof Error ? error.name : "UnknownError" });
  process.exitCode = 1;
});
