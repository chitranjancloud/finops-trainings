import mongoose from "mongoose";

/**
 * Tracks which individual batch materials (videos, PDFs, etc.)
 * a student has marked as completed.
 *
 * One document per (userId + batchId + materialId).
 * Upserted on completion so duplicates are impossible.
 */
const LessonProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    materialId: { type: String, required: true },

    // Denormalised for quick report queries
    batchName: { type: String, default: "" },
    materialName: { type: String, default: "" },
    materialType: {
      type: String,
      enum: ["video", "pdf", "material", "sharepoint"],
      default: "video",
    },

    // courseId / courseName carried from the batch so the report
    // can group completions by course without extra joins
    courseId: { type: String, default: "" },
    courseName: { type: String, default: "" },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound unique index — one completion record per lesson per student
LessonProgressSchema.index(
  { userId: 1, batchId: 1, materialId: 1 },
  { unique: true }
);

export default mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", LessonProgressSchema);
