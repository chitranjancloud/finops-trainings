import mongoose from "mongoose";

const FeePaymentSchema = new mongoose.Schema(
  {
    feeAccountId: {
      type: String,
      required: true,
      index: true,
    },
    enrollmentId: {
      type: String,
      required: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidAt: {
      type: Date,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "upi", "bank_transfer", "card", "razorpay", "other"],
      default: "other",
    },
    transactionReference: { type: String, default: "" },
    notes: { type: String, default: "" },
    proofUrl: { type: String, default: "" },

    totalFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    previousPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPaidAfterPayment: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingBalanceAfterPayment: {
      type: Number,
      default: 0,
      min: 0,
    },

    recordedBy: { type: String, default: "" },
    recordedByName: { type: String, default: "" },
    recordedAt: { type: Date },
    source: {
      type: String,
      enum: ["manual", "razorpay"],
      default: "manual",
    },

    receiptStatus: {
      type: String,
      enum: [
        "PENDING_APPROVAL",
        "APPROVED",
        "SENT",
        "CANCELLED",
        "REJECTED",
      ],
      default: "PENDING_APPROVAL",
      index: true,
    },
    generatedAt: { type: Date },

    approvedBy: { type: String, default: "" },
    approvedByName: { type: String, default: "" },
    approvedAt: { type: Date },

    emailStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "FAILED"],
      default: "NOT_SENT",
    },
    emailSentAt: { type: Date },
    emailError: { type: String, default: "" },

    whatsappStatus: {
      type: String,
      enum: ["NOT_SENT", "SENT", "FAILED"],
      default: "NOT_SENT",
    },
    whatsappSentAt: { type: Date },
    whatsappError: { type: String, default: "" },

    cancelledBy: { type: String, default: "" },
    cancelledAt: { type: Date },
    cancelReason: { type: String, default: "" },

    linkedPaymentId: { type: String, default: "" },
  },
  { timestamps: true }
);

FeePaymentSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
FeePaymentSchema.index({ tenantId: 1, enrollmentId: 1, paidAt: -1 });
FeePaymentSchema.index({ tenantId: 1, receiptStatus: 1, createdAt: -1 });

export default mongoose.models.FeePayment ||
  mongoose.model("FeePayment", FeePaymentSchema);
