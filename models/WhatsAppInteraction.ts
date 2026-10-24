import mongoose from "mongoose";

const WhatsAppInteractionSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    page: { type: String, default: "", trim: true },
    message: { type: String, default: "", trim: true },
    source: { type: String, default: "floating_button", trim: true },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "closed"],
      default: "new",
    },
    userAgent: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.WhatsAppInteraction ||
  mongoose.model("WhatsAppInteraction", WhatsAppInteractionSchema);
