import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import AssessmentSubmission from "@/models/AssessmentSubmission";
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

    const { testId } = params;
    const batchId = searchParams.get("batchId") || "";

    // Get all submissions for this test (optionally filtered by batch)
    const query: any = { resourceId: testId, resourceType: "test" };
    if (batchId) query.batchId = batchId;

    const submissions = await AssessmentSubmission.find(query).sort({ createdAt: -1 });

    // For each student, get their best submission
    const studentMap = new Map<string, any>();
    for (const sub of submissions) {
      const key = String(sub.userId);
      const existing = studentMap.get(key);
      const score = sub.isMcq ? (sub.obtainedMarks || 0) : (sub.marksAwarded || 0);
      const existingScore = existing
        ? existing.isMcq
          ? (existing.obtainedMarks || 0)
          : (existing.marksAwarded || 0)
        : -1;

      if (!existing || score > existingScore) {
        studentMap.set(key, sub);
      }
    }

    // Build rankings array sorted by score desc, then by time asc (faster = better tie-break)
    const ranked = Array.from(studentMap.values())
      .map((sub) => ({
        _id: String(sub._id),
        userId: String(sub.userId),
        name: sub.name,
        email: sub.email,
        batchId: sub.batchId,
        batchName: sub.batchName,
        isMcq: sub.isMcq,
        obtainedMarks: sub.isMcq ? (sub.obtainedMarks || 0) : (sub.marksAwarded || 0),
        totalMarks: sub.totalMarks || 0,
        percentage: sub.isMcq ? (sub.percentage || 0) : (sub.totalMarks ? Math.round(((sub.marksAwarded || 0) / sub.totalMarks) * 100) : 0),
        correctAnswers: sub.correctAnswers || 0,
        wrongAnswers: sub.wrongAnswers || 0,
        totalQuestions: sub.totalQuestions || 0,
        elapsedSeconds: sub.elapsedSeconds || 0,
        submittedAt: sub.createdAt,
        isPublished: sub.isPublished,
        status: sub.status,
      }))
      .sort((a, b) => {
        if (b.obtainedMarks !== a.obtainedMarks) return b.obtainedMarks - a.obtainedMarks;
        // Tie-break: faster completion
        if (a.elapsedSeconds && b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      });

    // Assign ranks (handle ties)
    let currentRank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].obtainedMarks === ranked[i - 1].obtainedMarks) {
        (ranked[i] as any).rank = (ranked[i - 1] as any).rank;
      } else {
        (ranked[i] as any).rank = currentRank;
      }
      currentRank++;
    }

    return NextResponse.json({ success: true, rankings: ranked, total: ranked.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
