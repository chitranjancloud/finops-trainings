import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import AssessmentSubmission from "@/models/AssessmentSubmission";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);

  if (
    !user ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }

  return user;
}

function findResource(batch: any, resourceId: string, resourceType: string) {
  const list = resourceType === "assignment" ? batch.assignments || [] : batch.tests || [];
  return list.find((item: any) => String(item._id) === String(resourceId));
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExcel(batchName: string, rows: any[]) {
  const headers = [
    "Batch", "Course", "Type", "Title", "Student", "Email",
    "Submitted At", "Auto Submitted", "MCQ", "Total Q", "Correct", "Wrong",
    "Total Marks", "Obtained Marks", "Percentage", "Marks Awarded", "Status", "Remarks", "File",
  ];
  const keys = [
    "batchName", "courseName", "resourceType", "resourceTitle", "name", "email",
    "createdAt", "autoSubmitted", "isMcq", "totalQuestions", "correctAnswers", "wrongAnswers",
    "totalMarks", "obtainedMarks", "percentage", "marksAwarded", "status", "remarks", "fileUrl",
  ];

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body>
    <table border="1">
      <tr><th colspan="${headers.length}">${escapeHtml(batchName)} - Test & Assignment Records</th></tr>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
      ${rows
        .map(
          (row) =>
            `<tr>${keys
              .map((key) => `<td>${escapeHtml(key === "createdAt" ? new Date(row[key]).toLocaleString("en-IN") : row[key])}</td>`)
              .join("")}</tr>`
        )
        .join("")}
    </table>
  </body></html>`;
}

export async function GET(req: Request) {
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

    const batchId = searchParams.get("batchId") || "";
    const resourceId = searchParams.get("resourceId") || "";
    const format = searchParams.get("format") || "json";
    const query: any = {};

    if (batchId) query.batchId = batchId;
    if (resourceId) query.resourceId = resourceId;
    if (user.role !== "admin") query.userId = String(user._id);

    const submissions = await AssessmentSubmission.find(query).sort({ createdAt: -1 });

    if (format === "excel" && user.role === "admin") {
      const batch = batchId ? await Batch.findById(batchId) : null;
      return new NextResponse(buildExcel(batch?.name || "All Batches", submissions), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${batch?.name || "all"}-assessment-records.xls"`,
        },
      });
    }

    return NextResponse.json({ success: true, submissions });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load submissions" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const user = await verifySession(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const batch = await Batch.findById(body.batchId);
    if (!batch) {
      return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });
    }

    const enrollment = await Enrollment.findOne({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      $and: [
        {
          $or: [
            { batchId: String(batch._id) },
            { batchName: batch.name },
          ],
        },
      ],
      batchBlocked: { $ne: true },
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, message: "You cannot submit for this batch" }, { status: 403 });
    }

    const resourceType = body.resourceType === "assignment" ? "assignment" : "test";
    const resource = findResource(batch, body.resourceId || "", resourceType);

    if (!resource || resource.isActive === false) {
      return NextResponse.json({ success: false, message: "Assessment not available" }, { status: 404 });
    }

    const now = Date.now();
    if (resource.scheduledAt && now < new Date(resource.scheduledAt).getTime()) {
      return NextResponse.json({ success: false, message: "This assessment has not started yet" }, { status: 400 });
    }
    if (resource.dueDate && now > new Date(resource.dueDate).getTime()) {
      return NextResponse.json({ success: false, message: "Submission time is over" }, { status: 400 });
    }

    const existing = await AssessmentSubmission.findOne({
      batchId: String(batch._id),
      resourceId: String(resource._id),
      userId: String(user._id),
    });

    if (existing && resource.allowRetake !== true) {
      return NextResponse.json({ success: false, message: "You already submitted this assessment" }, { status: 400 });
    }

    const durationSeconds = Number(resource.durationMinutes || 0) * 60;
    const elapsedSeconds = Math.max(0, Number(body.elapsedSeconds || 0));
    const autoSubmitted = Boolean(body.autoSubmitted) || (durationSeconds > 0 && elapsedSeconds >= durationSeconds);

    // ── MCQ Auto-evaluation ──────────────────────────────────────────────────
    const isMcq = resource.isMcq === true && Array.isArray(resource.questions) && resource.questions.length > 0;
    let mcqAnswers: { questionId: string; selectedAnswer: string }[] = [];
    let totalQuestions = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    let totalMarks = 0;
    let obtainedMarks = 0;
    let percentage = 0;

    if (isMcq) {
      const submitted: Record<string, string> = {};
      if (Array.isArray(body.mcqAnswers)) {
        for (const a of body.mcqAnswers) {
          submitted[String(a.questionId)] = String(a.selectedAnswer || "").toUpperCase();
        }
      }

      for (const q of resource.questions) {
        const qId = String(q._id);
        const selected = submitted[qId] || "";
        const qMarks = Number(q.marks || 1);
        totalQuestions++;
        totalMarks += qMarks;
        mcqAnswers.push({ questionId: qId, selectedAnswer: selected });

        if (selected === q.correctAnswer) {
          correctAnswers++;
          obtainedMarks += qMarks;
        } else if (selected) {
          wrongAnswers++;
        }
      }

      percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100 * 10) / 10 : 0;
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Build question snapshot for answer sheet review ──────────────────────
    const questionSnapshot: any[] = [];
    if (isMcq) {
      const submittedMap: Record<string, string> = {};
      for (const a of mcqAnswers) submittedMap[a.questionId] = a.selectedAnswer;
      for (const q of resource.questions) {
        const qId = String(q._id);
        questionSnapshot.push({
          questionId: qId,
          question: String(q.question || ""),
          optionA: String(q.optionA || ""),
          optionB: String(q.optionB || ""),
          optionC: String(q.optionC || ""),
          optionD: String(q.optionD || ""),
          correctAnswer: q.correctAnswer,
          selectedAnswer: submittedMap[qId] || "",
          marks: Number(q.marks || 1),
        });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    const submission = await AssessmentSubmission.create({
      batchId: String(batch._id),
      batchName: batch.name,
      courseId: batch.courseId || "",
      courseName: batch.courseName || enrollment.courseName || "",
      resourceId: String(resource._id),
      resourceType,
      resourceTitle: resource.title,
      userId: String(user._id),
      name: body.name || user.name,
      email: body.email || user.email,
      answerText: body.answerText || "",
      fileUrl: body.fileUrl || "",
      elapsedSeconds,
      autoSubmitted,
      isMcq,
      mcqAnswers,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      totalMarks: isMcq ? totalMarks : Number(resource.totalMarks || 0),
      obtainedMarks,
      percentage,
      // For MCQ, marks are auto-determined; admin may override via PATCH
      marksAwarded: isMcq ? obtainedMarks : 0,
      questionSnapshot,
    });

    await createNotification({
      audience: "admin",
      type: resourceType,
      title: `${resourceType === "test" ? "Test" : "Assignment"} submitted`,
      message: `${user.name} submitted ${resource.title} in ${batch.name} at ${new Date().toLocaleString("en-IN")}.`,
      link: resourceType === "test" ? "/admin-page/tests" : "/admin-page/assignments",
      meta: { batchId: String(batch._id), resourceId: String(resource._id), submissionId: String(submission._id) },
    });

    return NextResponse.json({ success: true, submission }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit assessment" },
      { status: 500 }
    );
  }
}
