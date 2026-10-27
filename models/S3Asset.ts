import mongoose, { type Model, type Types } from "mongoose";

export interface S3AssetRecord {
  _id: Types.ObjectId;
  tenantId: string; createdBy: string; originalFilename: string; safeFilename: string;
  contentType: string; byteSize: number; bucket: string; key: string; versionId: string;
  etag: string; courseId: string; batchId: string;
  category: "video" | "pdf" | "study-material" | "assignment"; contentDate: string; uploadedAt?: Date;
  replacesAssetId: string; replacedBy: string; deletedAt?: Date; deletedBy: string; cleanupState: "" | "pending" | "done";
  status: "uploading" | "validating" | "ready" | "failed" | "cancelled" | "replaced" | "deleted";
  accessCount: number; createdAt: Date; updatedAt: Date;
  videoProcessingState?: "not-requested" | "queued" | "processing" | "ready" | "failed";
  activeVideoOutputId?: string; videoDurationSeconds?: number; videoProcessingErrorCode?: string;
}
const schema = new mongoose.Schema<S3AssetRecord>({
  tenantId: { type: String, required: true }, createdBy: { type: String, required: true },
  originalFilename: { type: String, required: true }, safeFilename: { type: String, required: true },
  contentType: { type: String, required: true }, byteSize: { type: Number, required: true },
  bucket: { type: String, required: true }, key: { type: String, required: true },
  versionId: { type: String, default: "" }, etag: { type: String, default: "" },
  courseId: { type: String, required: true }, batchId: { type: String, default: "" },
  category: { type: String, enum: ["video", "pdf", "study-material", "assignment"], default: "video" },
  contentDate: { type: String, default: "" }, uploadedAt: Date,
  replacesAssetId: { type: String, default: "" }, replacedBy: { type: String, default: "" },
  deletedAt: Date, deletedBy: { type: String, default: "" }, cleanupState: { type: String, enum: ["", "pending", "done"], default: "" },
  status: { type: String, enum: ["uploading", "validating", "ready", "failed", "cancelled", "replaced", "deleted"], default: "uploading" },
  accessCount: { type: Number, default: 0 },
  videoProcessingState: { type: String, enum: ["not-requested", "queued", "processing", "ready", "failed"], default: "not-requested" },
  activeVideoOutputId: { type: String, default: "" }, videoDurationSeconds: { type: Number, default: 0 },
  videoProcessingErrorCode: { type: String, default: "" },
}, { timestamps: true });
schema.index({ tenantId: 1, courseId: 1, batchId: 1, status: 1, createdAt: -1 });
schema.index({ tenantId: 1, batchId: 1, category: 1, contentDate: -1, status: 1 });
schema.index({ tenantId: 1, key: 1 }, { unique: true });
// Next development hot reload can retain a model compiled before category fields
// existed. Refresh that same model so all existing imports use the current schema.
export function refreshCachedAssetModel(model: Model<S3AssetRecord>) {
  if (["category", "contentDate", "uploadedAt", "replacesAssetId", "cleanupState", "videoProcessingState"].some((field) => !model.schema.path(field))) {
    model.schema.add(schema.obj);
    const currentIndexes = new Set(model.schema.indexes().map((entry: [Record<string, unknown>, unknown]) => JSON.stringify(entry[0])));
    for (const [keys, options] of schema.indexes()) if (!currentIndexes.has(JSON.stringify(keys))) model.schema.index(keys, options);
    model.recompileSchema();
  }
  return model;
}
const existing = mongoose.models.S3Asset as Model<S3AssetRecord> | undefined;
export default existing ? refreshCachedAssetModel(existing) : mongoose.model<S3AssetRecord>("S3Asset", schema);
