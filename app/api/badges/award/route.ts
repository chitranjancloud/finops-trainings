import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { auditCertificate, awardBadge, ensureSystemBadges, verifyActiveSession } from "@/lib/certificates";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";
import Enrollment from "@/models/Enrollment";
import StudentBadge from "@/models/StudentBadge";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyActiveSession(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can award badges" }, { status: 401 });
    }

    const enrollment = await Enrollment.findById(body.enrollmentId);
    if (!enrollment) {
      return NextResponse.json({ success: false, message: "Enrollment not found" }, { status: 404 });
    }

    const student = enrollment.userId
      ? await User.findById(enrollment.userId)
      : await User.findOne({ email: enrollment.email });
    if (!student) {
      return NextResponse.json({ success: false, message: "Student user not found" }, { status: 404 });
    }

    await ensureSystemBadges("");
    const badge = await Badge.findOne({ badgeId: body.badgeId });
    if (!badge) {
      return NextResponse.json({ success: false, message: "Badge not found" }, { status: 404 });
    }

    const courseId = String(enrollment.courseId || body.courseId || "");
    const certificate = await Certificate.findOne({
      studentId: String(student._id),
      $or: [
        { courseId },
        { courseName: enrollment.courseName },
      ],
    }).sort({ issuedAt: -1 });

    const studentBadge = await awardBadge({
      studentId: String(student._id),
      badgeId: badge.badgeId,
      courseId,
      certificateCode: certificate?.certificateCode || "",
    });

    if (certificate && !certificate.badgeIds.includes(badge.badgeId)) {
      certificate.badgeIds.push(badge.badgeId);
      await certificate.save();
    }

    await auditCertificate({
      certificateCode: certificate?.certificateCode || "",
      action: "generated",
      actorId: String(admin._id),
      actorRole: "admin",
      message: `Badge awarded manually: ${badge.name}`,
      req,
    });

    return NextResponse.json({ success: true, studentBadge, badge });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Badge award failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyActiveSession(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can remove badges" }, { status: 401 });
    }

    const studentBadge = await StudentBadge.findById(body.studentBadgeId);
    if (!studentBadge) {
      return NextResponse.json({ success: false, message: "Awarded badge not found" }, { status: 404 });
    }

    if (studentBadge.certificateCode) {
      await Certificate.updateOne(
        { certificateCode: studentBadge.certificateCode },
        { $pull: { badgeIds: studentBadge.badgeId } }
      );
    }

    await StudentBadge.deleteOne({ _id: studentBadge._id });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Badge removal failed" },
      { status: 500 }
    );
  }
}
