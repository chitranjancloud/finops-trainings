import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || user.role !== "admin" || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) {
    return null;
  }
  return user;
}

export async function POST(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can share tests" }, { status: 401 });
    }

    const { testId, targetBatchIds } = body;

    if (!testId || !Array.isArray(targetBatchIds) || targetBatchIds.length === 0) {
      return NextResponse.json({ success: false, message: "testId and targetBatchIds are required" }, { status: 400 });
    }

    // Get source batch and find the test
    const sourceBatch = await Batch.findById(params.id);
    if (!sourceBatch) {
      return NextResponse.json({ success: false, message: "Source batch not found" }, { status: 404 });
    }

    const sourceTest = sourceBatch.tests.find((t: any) => String(t._id) === String(testId));
    if (!sourceTest) {
      return NextResponse.json({ success: false, message: "Test not found in source batch" }, { status: 404 });
    }

    // Build test copy (strip _id so new ones are created)
    const testCopy = {
      title: sourceTest.title,
      description: sourceTest.description,
      fileUrl: sourceTest.fileUrl,
      answerSheetUrl: sourceTest.answerSheetUrl,
      link: sourceTest.link,
      dueDate: sourceTest.dueDate,
      scheduledAt: sourceTest.scheduledAt,
      durationMinutes: sourceTest.durationMinutes,
      totalMarks: sourceTest.totalMarks,
      allowRetake: sourceTest.allowRetake,
      isActive: sourceTest.isActive,
      isMcq: sourceTest.isMcq,
      questions: (sourceTest.questions || []).map((q: any) => ({
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        marks: q.marks,
      })),
    };

    // Add the test copy to each target batch (skip if a test with same title already exists)
    const results: { batchId: string; batchName: string; skipped: boolean }[] = [];

    for (const batchId of targetBatchIds) {
      const targetBatch = await Batch.findById(batchId);
      if (!targetBatch) continue;

      const alreadyExists = targetBatch.tests.some(
        (t: any) => t.title === testCopy.title
      );

      if (alreadyExists) {
        results.push({ batchId, batchName: targetBatch.name, skipped: true });
        continue;
      }

      await Batch.findByIdAndUpdate(batchId, {
        $push: { tests: testCopy },
      });

      results.push({ batchId, batchName: targetBatch.name, skipped: false });
    }

    const sharedCount = results.filter((r) => !r.skipped).length;
    const skippedCount = results.filter((r) => r.skipped).length;

    let message = `Test shared to ${sharedCount} batch(es).`;
    if (skippedCount > 0) message += ` ${skippedCount} skipped (test already exists).`;

    return NextResponse.json({ success: true, message, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
