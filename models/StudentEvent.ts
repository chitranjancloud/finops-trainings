import mongoose from "mongoose";

/**
 * StudentEvent — one document per discrete learner action.
 * Used for the Active Students Monitoring dashboard.
 * Does NOT replace StudentActivity (session heartbeats) or LessonProgress.
 */
const StudentEventSchema = new mongoose.Schema(
  {
    userId:     { type: String, required: true, index: true },
    name:       { type: String, default: "" },
    email:      { type: String, default: "" },

    // What happened
    eventType: {
      type: String,
      enum: [
        "login",
        "logout",
        "course_opened",
        "video_started",
        "video_completed",
        "material_downloaded",
        "assignment_opened",
        "assignment_submitted",
        "test_started",
        "test_submitted",
        "certificate_downloaded",
      ],
      required: true,
      index: true,
    },

    // Context
    courseId:   { type: String, default: "", index: true },
    courseName: { type: String, default: "" },
    batchId:    { type: String, default: "" },
    batchName:  { type: String, default: "" },
    resourceId: { type: String, default: "" },      // materialId / testId / assignmentId
    resourceName: { type: String, default: "" },

    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Compound index for per-student queries ordered by time
StudentEventSchema.index({ userId: 1, occurredAt: -1 });
StudentEventSchema.index({ courseId: 1, occurredAt: -1 });
StudentEventSchema.index({ eventType: 1, occurredAt: -1 });

export default mongoose.models.StudentEvent ||
  mongoose.model("StudentEvent", StudentEventSchema);
