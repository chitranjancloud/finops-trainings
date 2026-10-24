import mongoose from "mongoose";

const CertificateVerificationSchema = new mongoose.Schema(
  {
    certificateCode: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["VALID", "NOT_FOUND", "INVALID", "REVOKED", "EXPIRED", "RATE_LIMITED"],
      required: true,
      index: true,
    },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    verifiedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.CertificateVerification ||
  mongoose.model("CertificateVerification", CertificateVerificationSchema);
