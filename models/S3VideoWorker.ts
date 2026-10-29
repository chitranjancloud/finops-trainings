import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tenantId: { type: String, required: true }, workerId: { type: String, required: true },
  lastSeenAt: { type: Date, required: true }, version: { type: String, default: "" },
  jobId: { type: String, default: "" },
});
schema.index({ tenantId: 1, workerId: 1 }, { unique: true });
schema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 86400 });
export default mongoose.models.S3VideoWorker || mongoose.model("S3VideoWorker", schema);
