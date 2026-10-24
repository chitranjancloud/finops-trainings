import mongoose from "mongoose";

const InternshipApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: "",
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    interestedPosition: {
      type: String,
      required: true,
      trim: true,
    },
    currentEducation: {
      type: String,
      required: true,
      trim: true,
    },
    skills: {
      type: String,
      required: true,
      trim: true,
    },
    resumeUrl: {
      type: String,
      required: true,
      trim: true,
    },
    resumeName: {
      type: String,
      default: "",
      trim: true,
    },
    additionalMessage: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["Submitted", "Under Review", "Changes Requested", "Approved", "Rejected"],
      default: "Submitted",
    },
    adminFeedback: {
      type: String,
      default: "",
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: String,
      default: "",
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.InternshipApplication ||
  mongoose.model("InternshipApplication", InternshipApplicationSchema);