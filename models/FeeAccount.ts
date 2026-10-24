import mongoose from "mongoose";

const FeeAccountSchema = new mongoose.Schema(
  {
    enrollmentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    courseId: { type: String, default: "" },
    courseName: { type: String, default: "" },
    batchId: { type: String, default: "" },
    batchName: { type: String, default: "" },
    learningMode: {
      type: String,
      enum: ["recorded", "live"],
      default: "recorded",
    },
    enrollmentStatus: { type: String, default: "" },
    enrolledAt: { type: Date },
    totalFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    feeSource: {
      type: String,
      enum: ["course_price", "manual_override"],
      default: "course_price",
    },
    feeOverrideReason: { type: String, default: "" },
    feeOverrideBy: { type: String, default: "" },
    tenantId: {
      type: String,
    },
  },
  { timestamps: true }
);

FeeAccountSchema.index({ tenantId: 1, enrollmentId: 1 }, { unique: true });

export default mongoose.models.FeeAccount ||
  mongoose.model("FeeAccount", FeeAccountSchema);
