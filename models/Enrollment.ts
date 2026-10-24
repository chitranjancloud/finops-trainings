import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema({
  userId: String,
  courseId: String,
  courseName: String,
  coursePrice: String,
  learningMode: {
    type: String,
    enum: ["recorded", "live"],
    default: "recorded"
  },

  name: String,
  email: String,
  whatsapp: String,
  paymentId: String,
  paidAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },

  status: String,
  batchName: {
    type: String,
    default: ""
  },
  batchId: {
    type: String,
    default: ""
  },
  batchBlocked: {
    type: Boolean,
    default: false
  },
  batchBlockedAt: Date,
  batchBlockReason: {
    type: String,
    default: ""
  },
  batchAssignedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);
