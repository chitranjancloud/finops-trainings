import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { auditCertificate, verifyActiveSession } from "@/lib/certificates";
import Certificate from "@/models/Certificate";
import CertificateAuditLog from "@/models/CertificateAuditLog";
import CertificateVerification from "@/models/CertificateVerification";
import StudentBadge from "@/models/StudentBadge";

export async function PATCH(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyActiveSession(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can manage certificates" }, { status: 401 });
    }

    const status = String(body.status || "").toUpperCase();
    if (!["ACTIVE", "REVOKED", "EXPIRED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid certificate status" }, { status: 400 });
    }

    const certificate = await Certificate.findOne({ certificateCode: params.certificateCode });
    if (!certificate) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 });
    }

    certificate.status = status;
    certificate.history.push({
      action: status === "ACTIVE" ? "reactivated" : status.toLowerCase(),
      actorId: String(admin._id),
      actorRole: "admin",
      reason: body.reason || "",
    });
    await certificate.save();

    await auditCertificate({
      certificateCode: certificate.certificateCode,
      action: status === "ACTIVE" ? "reactivated" : status === "REVOKED" ? "revoked" : "expired",
      actorId: String(admin._id),
      actorRole: "admin",
      message: body.reason || `Certificate status changed to ${status}`,
      req,
    });

    return NextResponse.json({ success: true, certificate });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Certificate update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyActiveSession(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can delete certificates" }, { status: 401 });
    }

    const certificate = await Certificate.findOne({ certificateCode: params.certificateCode });
    if (!certificate) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 });
    }

    await StudentBadge.deleteMany({ certificateCode: certificate.certificateCode });
    await CertificateVerification.deleteMany({ certificateCode: certificate.certificateCode });
    await CertificateAuditLog.deleteMany({ certificateCode: certificate.certificateCode });
    await Certificate.deleteOne({ _id: certificate._id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Certificate deletion failed" },
      { status: 500 }
    );
  }
}
