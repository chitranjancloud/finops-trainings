import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    excerpt: { type: String, default: "", trim: true },
    content: { type: String, default: "", trim: true },
    category: { type: String, default: "Training", trim: true },
    author: { type: String, default: "FinOps Trainings", trim: true },
    coverImage: { type: String, default: "", trim: true },
    tags: [{ type: String, trim: true }],
    readTime: { type: String, default: "5 min read", trim: true },
    isPublished: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
