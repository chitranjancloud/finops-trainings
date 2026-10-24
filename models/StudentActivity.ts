import mongoose from "mongoose";

const StudentActivitySchema = new mongoose.Schema(
  {
    userId: String,
    name: String,
    email: String,
    courseId: String,
    courseName: String,
    deviceId: String,
    sessionToken: String,
    loginAt: {
      type: Date,
      default: Date.now,
    },
    logoutAt: Date,
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    activeSeconds: {
      type: Number,
      default: 0,
    },
    inactiveSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "ended"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.StudentActivity ||
  mongoose.model("StudentActivity", StudentActivitySchema);