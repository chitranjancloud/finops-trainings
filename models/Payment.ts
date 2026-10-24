import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    userId: String,
    name: String,
    email: String,
    whatsapp: String,
    itemType: {
      type: String,
      enum: ["course", "webinar"],
      required: true,
    },
    itemId: String,
    itemName: String,
    courseName: String,
    batchName: {
      type: String,
      default: "",
    },
    amount: {
      type: Number,
      default: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    provider: {
      type: String,
      default: "razorpay",
    },
    providerOrderId: String,
    providerPaymentId: String,
    providerSignature: String,
    status: {
      type: String,
      enum: ["created", "paid", "failed", "receipt_sent"],
      default: "created",
    },
    enrollmentId: String,
    webinarRegistrationId: String,
    paidAt: Date,
    receiptSentAt: Date,
    receiptMessage: String,
  },
  { timestamps: true }
);

export default mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);
