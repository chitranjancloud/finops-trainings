import mongoose from "mongoose";

const McqAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedAnswer: { type: String, enum: ["A", "B", "C", "D", ""], default: "" },
  },
  { _id: false }
);

// Snapshot of each question at the time of submission (for answer sheet review)
const QuestionSnapshotSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    question: { type: String, default: "" },
    optionA: { type: String, default: "" },
    optionB: { type: String, default: "" },
    optionC: { type: String, default: "" },
    optionD: { type: String, default: "" },
    correctAnswer: { type: String, enum: ["A", "B", "C", "D"], default: "A" },
    selectedAnswer: { type: String, enum: ["A", "B", "C", "D", ""], default: "" },
    marks: { type: Number, default: 1 },
  },
  { _id: false }
);

const AssessmentSubmissionSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, trim: true },
    batchName: { type: String, default: "", trim: true },
    courseId: { type: String, default: "", trim: true },
    courseName: { type: String, default: "", trim: true },
    resourceId: { type: String, required: true, trim: true },
    resourceType: {
      type: String,
      enum: ["test", "assignment"],
      required: true,
    },
    resourceTitle: { type: String, default: "", trim: true },
    userId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },

    // Descriptive / manual submission fields (preserved)
    answerText: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "", trim: true },
    autoSubmitted: { type: Boolean, default: false },
    elapsedSeconds: { type: Number, default: 0 },

    // MCQ auto-evaluation fields
    isMcq: { type: Boolean, default: false },
    mcqAnswers: [McqAnswerSchema],
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    obtainedMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },

    // Question snapshot for answer sheet review (saved at submission time)
    // Backward compatible: old submissions will have empty array
    questionSnapshot: [QuestionSnapshotSchema],

    // Admin review fields
    status: {
      type: String,
      enum: ["submitted", "checked"],
      default: "submitted",
    },
    marksAwarded: { type: Number, default: 0 },
    remarks: { type: String, default: "", trim: true },
    adminComment: { type: String, default: "", trim: true },
    adminFeedback: { type: String, default: "", trim: true },
    isPublished: { type: Boolean, default: false },
    checkedAt: Date,
    publishedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.AssessmentSubmission ||
  mongoose.model("AssessmentSubmission", AssessmentSubmissionSchema);
