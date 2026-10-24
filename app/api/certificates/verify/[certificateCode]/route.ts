import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { auditCertificate, validateCertificateIntegrity } from "@/lib/certificates";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";
import CertificateVerification from "@/models/CertificateVerification";

const verificationHits = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  const now = Date.now();
  const current = verificationHits.get(ip);
  if (!current || current.resetAt < now) {
    verificationHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return { limited: false, ip };
  }
  current.count += 1;
  return { limited: current.count > 60, ip };
}

async function logVerification(req: Request, code: string, status: string) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    await CertificateVerification.create({
      certificateCode: code,
      status,
      ipAddress: ip,
      userAgent: (req.headers.get("user-agent") || "").slice(0, 400),
      verifiedAt: new Date(),
    });
    await auditCertificate({
      certificateCode: code,
      action: "verified",
      actorRole: "public",
      message: status,
      req,
    });
  } catch {}
}

export async function GET(req: Request, { params }: any) {
  try {
    await connectDB();
    const limited = rateLimit(req);
    const code = String(params.certificateCode || "").trim().toUpperCase();

    if (limited.limited) {
      await logVerification(req, code, "RATE_LIMITED");
      return NextResponse.json({ success: false, status: "RATE_LIMITED" }, { status: 429 });
    }

    const certificate = await Certificate.findOne({ certificateCode: code });
    if (!certificate) {
      await logVerification(req, code, "NOT_FOUND");
      return NextResponse.json({ success: false, status: "NOT_FOUND" }, { status: 404 });
    }

    if (certificate.status === "REVOKED") {
      await logVerification(req, code, "REVOKED");
      return NextResponse.json({ success: false, status: "REVOKED", certificate });
    }

    if (certificate.status === "EXPIRED" || (certificate.expiresAt && new Date(certificate.expiresAt) < new Date())) {
      await logVerification(req, code, "EXPIRED");
      return NextResponse.json({ success: false, status: "EXPIRED", certificate });
    }

    if (!validateCertificateIntegrity(certificate)) {
      await logVerification(req, code, "INVALID");
      return NextResponse.json({ success: false, status: "INVALID" }, { status: 409 });
    }

    const badges = await Badge.find({ badgeId: { $in: certificate.badgeIds || [] } });
    await logVerification(req, code, "VALID");
    return NextResponse.json({
      success: true,
      status: "VALID",
      certificate,
      badges,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, status: "INVALID", message: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
