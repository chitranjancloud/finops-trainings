import mongoose from "mongoose";

const HeroBannerSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      default: "",
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    ctaLabel: {
      type: String,
      default: "Explore",
      trim: true,
    },
    ctaHref: {
      type: String,
      default: "/courses/pl-300",
      trim: true,
    },
    badge: {
      type: String,
      default: "",
      trim: true,
    },
    accent: {
      type: String,
      enum: ["cyan", "purple", "emerald", "amber", "rose"],
      default: "cyan",
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.HeroBanner ||
  mongoose.model("HeroBanner", HeroBannerSchema);
