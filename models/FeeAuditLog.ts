import mongoose from "mongoose";

const FeeAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "account_created",
        "fee_overridden",
        "payment_recorded",
        "payment_approved",
        "payment_cancelled",
        "payment_rejected",
        "email_sent",
        "email_failed",
        "whatsapp_sent",
        "whatsapp_failed",
      ],
      required: true,
      index: true,
    },
    feePaymentId: { type: String, default: "", index: true },
    feeAccountId: { type: String, default: "", index: true },
    actorId: { type: String, default: "" },
    actorName: { type: String, default: "" },
    message: { type: String, default: "" },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: { type: String, default: "" },
    tenantId: {
      type: String,
    },
  },
  { timestamps: true }
);

FeeAuditLogSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.models.FeeAuditLog ||
  mongoose.model("FeeAuditLog", FeeAuditLogSchema);
