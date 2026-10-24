import mongoose from "mongoose";

const StudentBadgeSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, index: true },
    badgeId: { type: String, required: true, index: true },
    courseId: { type: String, default: "", index: true },
    certificateCode: { type: String, default: "" },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

StudentBadgeSchema.index(
  { studentId: 1, badgeId: 1, courseId: 1 },
  { unique: true }
);

export default mongoose.models.StudentBadge ||
  mongoose.model("StudentBadge", StudentBadgeSchema);
