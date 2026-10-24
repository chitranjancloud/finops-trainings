import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import AssessmentSubmission from "@/models/AssessmentSubmission";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);

  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }

  return user;
}

export async function PATCH(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can update submissions" }, { status: 401 });
    }

    const updateFields: any = {
      status: "checked",
      checkedAt: new Date(),
    };

    if (body.marksAwarded !== undefined) updateFields.marksAwarded = Number(body.marksAwarded || 0);
    if (body.remarks !== undefined) updateFields.remarks = body.remarks || "";
    if (body.adminComment !== undefined) updateFields.adminComment = body.adminComment || "";
    if (body.adminFeedback !== undefined) updateFields.adminFeedback = body.adminFeedback || "";

    // Publish / unpublish
    if (body.isPublished !== undefined) {
      updateFields.isPublished = Boolean(body.isPublished);
      if (body.isPublished) updateFields.publishedAt = new Date();
    }

    const submission = await AssessmentSubmission.findByIdAndUpdate(
      params.id,
      updateFields,
      { new: true }
    );

    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
    }

    // Notify student when result is published
    if (body.isPublished) {
      await createNotification({
        audience: "user",
        userId: submission.userId,
        type: submission.resourceType,
        title: `${submission.resourceType === "test" ? "Test" : "Assignment"} result published`,
        message: `Your result for ${submission.resourceTitle} is now available.`,
        link: "/student/batches",
        meta: { submissionId: String(submission._id), batchId: submission.batchId },
      });
    } else {
      await createNotification({
        audience: "user",
        userId: submission.userId,
        type: submission.resourceType,
        title: `${submission.resourceType === "test" ? "Test" : "Assignment"} result updated`,
        message: `${submission.resourceTitle} has marks and comments from admin.`,
        link: "/student/batches",
        meta: { submissionId: String(submission._id), batchId: submission.batchId },
      });
    }

    return NextResponse.json({ success: true, submission });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update submission" },
      { status: 500 }
    );
  }
}
