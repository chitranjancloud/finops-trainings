import mongoose from "mongoose";

const InquirySchema = new mongoose.Schema(
  {
    name: {
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
      default: "",
      trim: true,
    },
    category: {
      type: String,
      default: "Course inquiry",
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "replied"],
      default: "new",
    },
    adminReply: {
      type: String,
      default: "",
    },
    repliedAt: Date,
    emailSentToAdmin: {
      type: Boolean,
      default: false,
    },
    replyEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Inquiry ||
  mongoose.model("Inquiry", InquirySchema);
