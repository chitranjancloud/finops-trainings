import mongoose from "mongoose";

const CertificateHistorySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["generated", "downloaded", "verified", "revoked", "reactivated", "expired"],
      required: true,
    },
    actorId: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    reason: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CertificateSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    certificateCode: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    studentEmail: { type: String, default: "" },
    courseId: { type: String, required: true, index: true },
    courseName: { type: String, required: true },
    batchId: { type: String, default: "" },
    batchName: { type: String, default: "" },
    institutionName: { type: String, default: "FinOps Training" },
    completionDate: { type: Date, required: true },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: Date,
    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
    verificationHash: { type: String, required: true },
    credentialUrl: { type: String, default: "" },
    verificationUrl: { type: String, default: "" },
    badgeIds: [{ type: String }],
    skills: [{ type: String }],
    completion: { type: Number, default: 100 },
    assessmentScore: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: [CertificateHistorySchema],
  },
  { timestamps: true }
);

CertificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

export default mongoose.models.Certificate ||
  mongoose.model("Certificate", CertificateSchema);
