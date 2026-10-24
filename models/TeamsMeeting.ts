import mongoose from "mongoose";

const TeamsMeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    courseId: {
      type: String,
      default: "",
      trim: true,
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    teamsUrl: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    startsAt: Date,
    endsAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.TeamsMeeting ||
  mongoose.model("TeamsMeeting", TeamsMeetingSchema);
