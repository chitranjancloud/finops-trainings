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
  provider?: "ffmpeg" | "mediaconvert"; externalJobId?: string; providerPercent?: number;
  verificationCursor?: number;
  syncToken?: string;
  submissionState?: "not-started" | "dispatching" | "accepted" | "rejected" | "unknown";
  startedAt?: Date; finishedAt?: Date; phaseStartedAt?: Date; lastProgressAt?: Date;
  sourceBytes?: number; downloadedBytes?: number; encodedSeconds?: number; sourceDurationSeconds?: number;
  uploadedSegments?: number; totalSegments?: number; uploadedBytes?: number;
  phaseDurations?: Record<string, number>;
  attemptHistory?: { attemptId: string; startedAt: Date; finishedAt: Date; state: string; errorCode: string; phaseDurations: Record<string, number> }[];
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
  provider: { type: String, enum: ["ffmpeg", "mediaconvert"], default: "ffmpeg" },
  externalJobId: { type: String, default: "" }, providerPercent: Number, verificationCursor: { type: Number, default: 0 },
  syncToken: { type: String, default: "" },
  submissionState: { type: String, enum: ["not-started", "dispatching", "accepted", "rejected", "unknown"] },
  startedAt: Date, finishedAt: Date, phaseStartedAt: Date, lastProgressAt: Date,
  sourceBytes: { type: Number, default: 0 }, downloadedBytes: { type: Number, default: 0 },
  encodedSeconds: { type: Number, default: 0 }, sourceDurationSeconds: { type: Number, default: 0 },
  uploadedSegments: { type: Number, default: 0 }, totalSegments: { type: Number, default: 0 }, uploadedBytes: { type: Number, default: 0 },
  phaseDurations: { type: mongoose.Schema.Types.Mixed, default: {} },
  attemptHistory: [{ _id: false, attemptId: String, startedAt: Date, finishedAt: Date, state: String, errorCode: String, phaseDurations: mongoose.Schema.Types.Mixed }],
  playlistVersionId: { type: String, default: "" }, duration: { type: Number, default: 0 }, outputBytes: { type: Number, default: 0 },
  segments: [{ _id: false, key: String, duration: Number, versionId: String }],
}, { timestamps: true });
schema.index({ tenantId: 1, assetId: 1, sourceKey: 1, sourceVersionId: 1, profile: 1 }, { unique: true });
schema.index({ tenantId: 1, state: 1, nextAttemptAt: 1, leaseUntil: 1 });
export default (mongoose.models.S3VideoJob as mongoose.Model<VideoJob> | undefined) || mongoose.model<VideoJob>("S3VideoJob", schema);
