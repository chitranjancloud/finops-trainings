import mongoose from "mongoose";

const SessionShowcaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "Training", trim: true },
    date: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    attendees: { type: String, default: "", trim: true },
    duration: { type: String, default: "", trim: true },
    images: [{ type: String, trim: true }],
    coverImage: { type: String, default: "", trim: true },
    highlights: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    instructor: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.SessionShowcase ||
  mongoose.model("SessionShowcase", SessionShowcaseSchema);
