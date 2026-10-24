import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createCertificateForEnrollment,
  verifyActiveSession,
} from "@/lib/certificates";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";
import Enrollment from "@/models/Enrollment";
import StudentBadge from "@/models/StudentBadge";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user = await verifyActiveSession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const scope = searchParams.get("scope") || "student";
    const query: any = {};

    if (scope !== "admin" || user.role !== "admin") {
      query.studentId = String(user._id);
    } else {
      const search = String(searchParams.get("search") || "").trim();
      const status = String(searchParams.get("status") || "").trim();
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { certificateCode: { $regex: search, $options: "i" } },
          { studentName: { $regex: search, $options: "i" } },
          { studentEmail: { $regex: search, $options: "i" } },
          { courseName: { $regex: search, $options: "i" } },
        ];
      }
    }

    const certificates = await Certificate.find(query).sort({ issuedAt: -1 }).limit(250);
    const studentBadges = await StudentBadge.find(
      scope === "admin" && user.role === "admin" ? {} : { studentId: String(user._id) }
    ).sort({ earnedAt: -1 });
    const badgeDefinitions = await Badge.find({
      badgeId: { $in: studentBadges.map((item: any) => item.badgeId) },
    });

    return NextResponse.json({
      success: true,
      certificates,
      studentBadges,
      badges: badgeDefinitions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load certificates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const enrollment = await Enrollment.findOne({
      _id: body.enrollmentId,
      $or:
        user.role === "admin"
          ? [{ _id: body.enrollmentId }]
          : [{ userId: String(user._id) }, { email: user.email }],
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, message: "Enrollment not found" }, { status: 404 });
    }

    const certificateUser =
      user.role === "admin"
        ? (enrollment.userId
            ? await User.findById(enrollment.userId)
            : await User.findOne({ email: enrollment.email }))
        : user;

    if (!certificateUser) {
      return NextResponse.json({ success: false, message: "Student user not found" }, { status: 404 });
    }

    const result = await createCertificateForEnrollment({
      user: certificateUser,
      enrollment,
      req,
      bypassEligibility: user.role === "admin" && body.manual === true,
      actor: user,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Certificate generation failed" },
      { status: 500 }
    );
  }
}
