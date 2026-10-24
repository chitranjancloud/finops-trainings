import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    title: String,
    slug: String,
    duration: String,
    provider: String,
    tag: String,
    enrolled: String,
    level: String,
    badge: String,
    color: String,
    image: String,
    videoUrl: String,
    pdfUrl: String,
    materialUrl: String,
    materialTitle: String,
    videos: [
      {
        name: String,
        url: String,
        webUrl: String,
      },
    ],
    pdfs: [
      {
        name: String,
        url: String,
        webUrl: String,
      },
    ],
    materials: [
      {
        name: String,
        url: String,
        webUrl: String,
      },
    ],
    description: String,
    sessions: String,
    professionals: String,
    exam: String,
    rating: String,
    learn: [String],
    prerequisites: [String],
    career: String,
    price: String,
    recordedPrice: String,
    livePrice: String,
    // Publishing control — true = visible and enrollable, false = visible but enrollment disabled
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Course ||
  mongoose.model("Course", CourseSchema);
