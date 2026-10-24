import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AssessmentSubmission from "@/models/AssessmentSubmission";
import Batch from "@/models/Batch";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) {
    return null;
  }
  return user;
}

export async function GET(req: Request, { params }: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user = await verifySession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const submission = await AssessmentSubmission.findById(params.id).lean() as any;
    if (!submission) {
      return NextResponse.json({ success: false, message: "Submission not found" }, { status: 404 });
    }

    // Students can only view their own submissions
    if (user.role !== "admin" && String(submission.userId) !== String(user._id)) {
      return NextResponse.json({ success: false, message: "Access denied" }, { status: 403 });
    }

    // Only available for MCQ submissions
    if (!submission.isMcq) {
      return NextResponse.json({ success: false, message: "Answer sheet is only available for MCQ tests" }, { status: 400 });
    }

    // If questionSnapshot exists (new submissions), return it directly
    if (Array.isArray(submission.questionSnapshot) && submission.questionSnapshot.length > 0) {
      return NextResponse.json({ success: true, submission, hasSnapshot: true });
    }

    // For old submissions without snapshot: try to reconstruct from live batch data
    // This provides backward compatibility
    const batch = await Batch.findById(submission.batchId).lean() as any;
    let reconstructed: any[] = [];

    if (batch) {
      const resource = (batch.tests || []).find(
        (t: any) => String(t._id) === String(submission.resourceId)
      );

      if (resource && resource.isMcq && Array.isArray(resource.questions)) {
        // Build answer map from mcqAnswers
        const answerMap: Record<string, string> = {};
        if (Array.isArray(submission.mcqAnswers)) {
          for (const a of submission.mcqAnswers) {
            answerMap[String(a.questionId)] = String(a.selectedAnswer || "");
          }
        }

        reconstructed = resource.questions.map((q: any) => ({
          questionId: String(q._id),
          question: String(q.question || ""),
          optionA: String(q.optionA || ""),
          optionB: String(q.optionB || ""),
          optionC: String(q.optionC || ""),
          optionD: String(q.optionD || ""),
          correctAnswer: q.correctAnswer,
          selectedAnswer: answerMap[String(q._id)] || "",
          marks: Number(q.marks || 1),
        }));
      }
    }

    return NextResponse.json({
      success: true,
      submission: { ...submission, questionSnapshot: reconstructed },
      hasSnapshot: false,
      reconstructed: reconstructed.length > 0,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
