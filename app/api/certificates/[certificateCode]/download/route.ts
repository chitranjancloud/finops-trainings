import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { auditCertificate, verifyActiveSession } from "@/lib/certificates";
import Certificate from "@/models/Certificate";
import StudentEvent from "@/models/StudentEvent";

export async function POST(req: Request, { params }: any) {
  try {
    await connectDB();
    const body = await req.json();
    const user = await verifyActiveSession(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );
    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const certificate = await Certificate.findOne({ certificateCode: params.certificateCode });
    if (!certificate || (user.role !== "admin" && certificate.studentId !== String(user._id))) {
      return NextResponse.json({ success: false, message: "Certificate not found" }, { status: 404 });
    }

    certificate.history.push({
      action: "downloaded",
      actorId: String(user._id),
      actorRole: user.role,
    });
    await certificate.save();
    await auditCertificate({
      certificateCode: certificate.certificateCode,
      action: "downloaded",
      actorId: String(user._id),
      actorRole: user.role,
      req,
    });

    // Track certificate_downloaded event (non-blocking)
    if (user.role !== "admin") {
      StudentEvent.create({
        userId:       String(user._id),
        name:         user.name  || "",
        email:        user.email || "",
        eventType:    "certificate_downloaded",
        courseId:     certificate.courseId   || "",
        courseName:   certificate.courseName || "",
        batchId:      certificate.batchId    || "",
        batchName:    certificate.batchName  || "",
        resourceId:   certificate.certificateCode,
        resourceName: certificate.courseName || "Certificate",
        occurredAt:   new Date(),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Download log failed" },
      { status: 500 }
    );
  }
}
