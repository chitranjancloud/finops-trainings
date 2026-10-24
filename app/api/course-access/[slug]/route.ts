import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

function hasBatch(enrollment: any) {
  return Boolean(
    String(enrollment?.batchId || "").trim() ||
      String(enrollment?.batchName || "").trim()
  );
}

function learningMode(enrollment: any) {
  return enrollment?.learningMode === "live" ? "live" : "recorded";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;
    const { searchParams } = new URL(req.url);

    const course = await Course.findOne({ slug });

    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    const user = await User.findById(searchParams.get("userId") || "");

    if (
      !user ||
      !user.isLoggedIn ||
      user.sessionToken !== searchParams.get("sessionToken") ||
      user.activeDevice !== searchParams.get("deviceId")
    ) {
      return NextResponse.json({
        success: true,
        access: false,
        enrolled: false,
        reason: "login_required",
        message: "Please login to view enrollment status.",
      });
    }

    const enrollment = await Enrollment.findOne({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      status: { $in: ["enrolled", "Waiting For Batch Assignment"] },
      batchBlocked: { $ne: true },
      $and: [
        {
          $or: [
            { courseId: slug },
            { courseId: String(course._id) },
            { courseName: course.title },
          ],
        },
      ],
    }).sort({ createdAt: -1 });

    if (!enrollment) {
      return NextResponse.json({
        success: true,
        access: false,
        enrolled: false,
        reason: "not_enrolled",
        message: "Enroll in this course to start learning through your batch area.",
      });
    }

    if (learningMode(enrollment) === "recorded") {
      return NextResponse.json({
        success: true,
        access: false,
        enrolled: true,
        reason: "recorded_batch_area",
        learningMode: "recorded",
        enrollment,
        message:
          "You are enrolled. Learning materials are available from the Batch Content area.",
      });
    }

    if (!hasBatch(enrollment)) {
      return NextResponse.json({
        success: true,
        access: false,
        enrolled: true,
        learningMode: "live",
        reason: "batch_pending",
        enrollment,
        message:
          "You are enrolled. Course content will be available after admin assigns you a batch.",
      });
    }

    const batch = enrollment.batchId
      ? await Batch.findById(enrollment.batchId)
      : await Batch.findOne({ name: enrollment.batchName });

    if (!batch || batch.isActive === false) {
      return NextResponse.json({
        success: true,
        access: false,
        enrolled: true,
        learningMode: "live",
        reason: "batch_inactive",
        enrollment,
        message:
          "Your batch is not active yet. Learning content will be available after admin activates or assigns your batch.",
      });
    }

    return NextResponse.json({
      success: true,
      access: false,
      enrolled: true,
      reason: "batch_area_only",
      learningMode: "live",
      enrollment,
      batch: {
        _id: batch._id,
        name: batch.name,
        code: batch.code,
        courseName: batch.courseName,
      },
      message:
        "You are enrolled. Please access learning materials from the Batch Content area.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Access check failed" },
      { status: 500 }
    );
  }
}