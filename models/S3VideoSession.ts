import mongoose from "mongoose";
export interface VideoSession {
  tokenHash: string; tenantId: string; assetId: string; outputId: string;
  userId: string; loginHash: string; deviceHash: string; expiresAt: Date;
}
const schema = new mongoose.Schema<VideoSession>({
  tokenHash: { type: String, required: true, unique: true }, tenantId: { type: String, required: true },
  assetId: { type: String, required: true }, outputId: { type: String, required: true },
  userId: { type: String, required: true }, loginHash: { type: String, required: true },
  deviceHash: { type: String, required: true }, expiresAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default (mongoose.models.S3VideoSession as mongoose.Model<VideoSession> | undefined) || mongoose.model<VideoSession>("S3VideoSession", schema);
