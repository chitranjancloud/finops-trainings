import mongoose from "mongoose";

const EnrollmentReminderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    userEmail: { type: String, required: true },
    adminId: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    htmlBody: { type: String, default: "" },
    status: {
      type: String,
      enum: ["sent", "failed", "scheduled"],
      default: "sent",
    },
    scheduledFor: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    provider: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.EnrollmentReminder ||
  mongoose.model("EnrollmentReminder", EnrollmentReminderSchema);
