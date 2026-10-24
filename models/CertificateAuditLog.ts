import mongoose from "mongoose";

const CertificateAuditLogSchema = new mongoose.Schema(
  {
    certificateCode: { type: String, default: "", index: true },
    action: {
      type: String,
      enum: ["generated", "downloaded", "verified", "revoked", "reactivated", "expired"],
      required: true,
      index: true,
    },
    actorId: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    message: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.CertificateAuditLog ||
  mongoose.model("CertificateAuditLog", CertificateAuditLogSchema);
