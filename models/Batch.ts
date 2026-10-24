import mongoose from "mongoose";

const McqQuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    optionA: { type: String, default: "", trim: true },
    optionB: { type: String, default: "", trim: true },
    optionC: { type: String, default: "", trim: true },
    optionD: { type: String, default: "", trim: true },
    correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
    marks: { type: Number, default: 1 },
  },
  { _id: true }
);

const ResourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    fileUrl: { type: String, default: "", trim: true },
    answerSheetUrl: { type: String, default: "", trim: true },
    link: { type: String, default: "", trim: true },
    dueDate: Date,
    scheduledAt: Date,
    durationMinutes: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    allowRetake: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // MCQ support — if questions array is non-empty, auto-evaluation applies
    isMcq: { type: Boolean, default: false },
    questions: [McqQuestionSchema],
  },
  { _id: true }
);

const NoticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },
    publishAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const FacultySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    role: { type: String, default: "Faculty", trim: true },
    bio: { type: String, default: "", trim: true },
  },
  { _id: true }
);

// Batch-specific material - selected from course content or uploaded directly
const BatchMaterialSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["video", "pdf", "material", "sharepoint"], default: "video" },
    name: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    webUrl: { type: String, default: "", trim: true },
    // If sourced from course content, store the source reference
    sourceType: { type: String, default: "" }, // "course_video", "course_pdf", "course_material", "upload"
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const BatchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    courseId: { type: String, default: "", trim: true },
    courseName: { type: String, default: "", trim: true },
    startDate: Date,
    description: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    inactiveAfterDays: { type: Number, default: 5 },
    tests: [ResourceSchema],
    assignments: [ResourceSchema],
    notices: [NoticeSchema],
    faculty: [FacultySchema],
    // Batch-specific materials (videos, pdfs, study materials)
    materials: [BatchMaterialSchema],
    createdBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Batch || mongoose.model("Batch", BatchSchema);
