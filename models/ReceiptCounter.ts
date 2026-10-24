import mongoose from "mongoose";

const ReceiptCounterSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

ReceiptCounterSchema.index({ tenantId: 1, year: 1 }, { unique: true });

export default mongoose.models.ReceiptCounter ||
  mongoose.model("ReceiptCounter", ReceiptCounterSchema);
