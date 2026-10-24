import mongoose from "mongoose";

const BadgeSchema = new mongoose.Schema(
  {
    badgeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "Award" },
    image: { type: String, default: "" },
    courseId: { type: String, default: "", index: true },
    criteria: { type: String, default: "" },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Badge || mongoose.model("Badge", BadgeSchema);
