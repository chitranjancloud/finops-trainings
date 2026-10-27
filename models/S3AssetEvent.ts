import mongoose from "mongoose";
const schema = new mongoose.Schema({
  tenantId: { type: String, required: true }, assetId: { type: String, required: true },
  action: { type: String, required: true }, actorId: { type: String, required: true },
  relatedAssetId: { type: String, default: "" },
}, { timestamps: true });
schema.index({ tenantId: 1, assetId: 1, action: 1, relatedAssetId: 1 }, { unique: true });
schema.index({ tenantId: 1, assetId: 1, createdAt: -1 });
export default mongoose.models.S3AssetEvent || mongoose.model("S3AssetEvent", schema);
