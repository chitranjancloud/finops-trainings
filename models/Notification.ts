import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    audience: {
      type: String,
      enum: ["admin", "user", "all"],
      default: "admin",
    },
    userId: { type: String, default: "", trim: true },
    type: { type: String, default: "activity", trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    readBy: [{ type: String }],
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
