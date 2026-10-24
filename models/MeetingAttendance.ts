import mongoose from "mongoose";

const MeetingAttendanceSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamsMeeting",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    courseId: {
      type: String,
      default: "",
    },
    courseName: {
      type: String,
      default: "",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: Date,
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    totalSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["joined", "left"],
      default: "joined",
    },
    deviceId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.MeetingAttendance ||
  mongoose.model("MeetingAttendance", MeetingAttendanceSchema);
