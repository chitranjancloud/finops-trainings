import mongoose, { type Model, type Types } from "mongoose";

export interface S3UploadRecord {
  _id: Types.ObjectId; tenantId: string; assetId: string; ownerId: string;
  uploadId: string; expectedSize: number; partSize: number; partCount: number;
  idempotencyKey: string; slot: number; expiresAt: Date; leaseUntil: Date;
  status: "initializing" | "uploading" | "completing" | "completed" | "aborting" | "cancelled" | "failed";
  signCalls: number; createdAt: Date; updatedAt: Date;
}
const schema = new mongoose.Schema<S3UploadRecord>({
  tenantId: { type: String, required: true }, assetId: { type: String, required: true },
  ownerId: { type: String, required: true }, uploadId: { type: String, default: "" },
  expectedSize: { type: Number, required: true }, partSize: { type: Number, required: true },
  partCount: { type: Number, required: true }, idempotencyKey: { type: String, required: true },
  slot: { type: Number, required: true }, expiresAt: { type: Date, required: true },
  leaseUntil: { type: Date, default: () => new Date(0) },
  status: { type: String, enum: ["initializing", "uploading", "completing", "completed", "aborting", "cancelled", "failed"], default: "initializing" },
  signCalls: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ tenantId: 1, ownerId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ tenantId: 1, ownerId: 1, slot: 1 }, {
  unique: true, partialFilterExpression: { status: { $in: ["initializing", "uploading", "completing", "aborting"] } },
});
schema.index({ tenantId: 1, assetId: 1 });
// Deliberately no TTL deletion: an expired Mongo row does not abort an S3 upload.
export default (mongoose.models.S3Upload as Model<S3UploadRecord> | undefined) || mongoose.model<S3UploadRecord>("S3Upload", schema);
