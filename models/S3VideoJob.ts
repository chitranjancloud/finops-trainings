import mongoose, { type Types } from "mongoose";

export interface VideoJob {
  _id: Types.ObjectId; tenantId: string; assetId: string; sourceKey: string;
  sourceVersionId: string; sourceEtag: string; profile: string;
  state: "queued" | "processing" | "ready" | "failed" | "cancelled";
  phase: string; attempts: number; nextAttemptAt: Date; leaseUntil: Date;
  attemptId: string; errorCode: string; outputPrefix: string;
  segments: { key: string; duration: number; versionId: string }[];
  playlistKey: string; playlistVersionId: string; duration: number; outputBytes: number;
  outputPrefixes: string[];
  cleanupAfter: Date;
}
const schema = new mongoose.Schema<VideoJob>({
  tenantId: { type: String, required: true }, assetId: { type: String, required: true },
  sourceKey: { type: String, required: true }, sourceVersionId: { type: String, default: "" },
  sourceEtag: { type: String, default: "" }, profile: { type: String, default: "720p-v1" },
  state: { type: String, enum: ["queued", "processing", "ready", "failed", "cancelled"], default: "queued" },
  phase: { type: String, default: "queued" }, attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now }, leaseUntil: { type: Date, default: () => new Date(0) },
  attemptId: { type: String, default: "" }, errorCode: { type: String, default: "" },
  outputPrefix: { type: String, default: "" }, playlistKey: { type: String, default: "" },
  outputPrefixes: { type: [String], default: [] },
  cleanupAfter: { type: Date, default: Date.now },
  playlistVersionId: { type: String, default: "" }, duration: { type: Number, default: 0 }, outputBytes: { type: Number, default: 0 },
  segments: [{ _id: false, key: String, duration: Number, versionId: String }],
}, { timestamps: true });
schema.index({ tenantId: 1, assetId: 1, sourceKey: 1, sourceVersionId: 1, profile: 1 }, { unique: true });
schema.index({ tenantId: 1, state: 1, nextAttemptAt: 1, leaseUntil: 1 });
export default (mongoose.models.S3VideoJob as mongoose.Model<VideoJob> | undefined) || mongoose.model<VideoJob>("S3VideoJob", schema);
