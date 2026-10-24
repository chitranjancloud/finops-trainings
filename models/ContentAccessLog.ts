import mongoose from "mongoose";

const ContentAccessLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    batchId: { type: String, required: true, index: true },
    batchName: { type: String, default: "" },
    materialId: { type: String, default: "" },
    materialName: { type: String, default: "" },
    materialType: {
      type: String,
      enum: ["video", "pdf", "material", "sharepoint"],
      default: "video",
    },
    action: {
      type: String,
      enum: ["view", "play", "open"],
      default: "view",
    },
    deviceId: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    accessedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// TTL index: auto-delete logs older than 90 days
ContentAccessLogSchema.index({ accessedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.models.ContentAccessLog ||
  mongoose.model("ContentAccessLog", ContentAccessLogSchema);
