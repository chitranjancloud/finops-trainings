import mongoose from "mongoose";

const ContentInventorySchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      default: "",
      trim: true,
    },
    courseName: {
      type: String,
      default: "",
      trim: true,
    },
    batchId: {
      type: String,
      default: "",
      trim: true,
    },
    batchName: {
      type: String,
      default: "",
      trim: true,
    },
    fileType: {
      type: String,
      enum: ["video", "pdf", "study-material", "assignment"],
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedFileName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    folderPath: {
      type: String,
      required: true,
      trim: true,
    },
    sharePointItemId: {
      type: String,
      default: "",
      trim: true,
    },
    sharePointDriveId: {
      type: String,
      default: "",
      trim: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
    },
    webUrl: {
      type: String,
      default: "",
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ContentInventorySchema.index({
  courseId: 1,
  batchId: 1,
  fileType: 1,
  normalizedFileName: 1,
});

ContentInventorySchema.index({
  sharePointItemId: 1,
});

export default mongoose.models.ContentInventory ||
  mongoose.model("ContentInventory", ContentInventorySchema);