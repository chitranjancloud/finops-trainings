import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import Batch from "@/models/Batch";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) {
    return null;
  }
  return user;
}

function makeCode(name: string) {
  const prefix = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 14);
  return `${prefix || "BATCH"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function cleanResources(items: any[] = []) {
  return items
    .filter((item) => String(item.title || "").trim())
    .map((item) => ({
      title: String(item.title || "").trim(),
      description: String(item.description || "").trim(),
      fileUrl: String(item.fileUrl || "").trim(),
      answerSheetUrl: String(item.answerSheetUrl || "").trim(),
      link: String(item.link || "").trim(),
      dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : undefined,
      durationMinutes: Number(item.durationMinutes || 0),
      totalMarks: Number(item.totalMarks || 0),
      allowRetake: item.allowRetake === true,
      isActive: item.isActive !== false,
      isMcq: item.isMcq === true,
      questions: item.isMcq === true && Array.isArray(item.questions)
        ? item.questions
            .filter((q: any) => String(q.question || "").trim())
            .map((q: any) => ({
              question: String(q.question || "").trim(),
              optionA: String(q.optionA || "").trim(),
              optionB: String(q.optionB || "").trim(),
              optionC: String(q.optionC || "").trim(),
              optionD: String(q.optionD || "").trim(),
              correctAnswer: ["A", "B", "C", "D"].includes(q.correctAnswer) ? q.correctAnswer : "A",
              marks: Math.max(1, Number(q.marks || 1)),
            }))
        : [],
    }));
}

function cleanNotices(items: any[] = []) {
  return items
    .filter((item) => String(item.title || "").trim())
    .map((item) => ({
      title: String(item.title || "").trim(),
      message: String(item.message || "").trim(),
      priority: ["normal", "important", "urgent"].includes(item.priority) ? item.priority : "normal",
      publishAt: item.publishAt ? new Date(item.publishAt) : undefined,
      isActive: item.isActive !== false,
    }));
}

function cleanFaculty(items: any[] = []) {
  return items
    .filter((item) => String(item.name || "").trim())
    .map((item) => ({
      name: String(item.name || "").trim(),
      email: String(item.email || "").trim(),
      phone: String(item.phone || "").trim(),
      role: String(item.role || "Faculty").trim(),
      bio: String(item.bio || "").trim(),
    }));
}

function cleanMaterials(items: any[] = []) {
  return items
    .filter((item) => String(item.name || "").trim() || String(item.url || "").trim())
    .map((item) => ({
      type: ["video", "pdf", "material", "sharepoint"].includes(item.type) ? item.type : "video",
      name: String(item.name || "").trim(),
      url: String(item.url || "").trim(),
      webUrl: String(item.webUrl || "").trim(),
      sourceType: String(item.sourceType || "upload").trim(),
      isActive: item.isActive !== false,
    }));
}

function batchPayload(body: any) {
  const name = String(body.name || "").trim();
  return {
    name,
    code: String(body.code || makeCode(name)).trim().toUpperCase(),
    courseId: String(body.courseId || "").trim(),
    courseName: String(body.courseName || "").trim(),
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    description: String(body.description || "").trim(),
    isActive: body.isActive !== false,
    inactiveAfterDays: Math.max(1, Number(body.inactiveAfterDays || 5)),
    tests: cleanResources(body.tests),
    assignments: cleanResources(body.assignments),
    notices: cleanNotices(body.notices),
    faculty: cleanFaculty(body.faculty),
    materials: cleanMaterials(body.materials),
  };
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

    const scope = searchParams.get("scope") || "admin";

    if (scope === "student") {
      if (!user) {
        return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
      }

      // Find enrollments by userId or email, with a batchId assigned
      const allEnrollments = await Enrollment.find({
        $or: [{ userId: String(user._id) }, { email: user.email }],
        batchBlocked: { $ne: true },
      }).sort({ createdAt: -1 });

      const enrollments = allEnrollments.filter(
        (item: any) =>
          (item.learningMode || "recorded") === "live" &&
          (String(item.batchId || "").trim() || String(item.batchName || "").trim())
      );

      const recordedEnrollments = allEnrollments.filter(
        (item: any) => (item.learningMode || "recorded") === "recorded"
      );

      const pendingLiveEnrollments = allEnrollments.filter(
        (item: any) =>
          (item.learningMode || "recorded") === "live" &&
          !String(item.batchId || "").trim() &&
          !String(item.batchName || "").trim()
      );

      const batchIds = enrollments
        .map((item: any) => String(item.batchId || "").trim())
        .filter(Boolean);

      // Also support legacy batchName-based (for backward compat)
      const batchNames = enrollments
        .map((item: any) => String(item.batchName || "").trim())
        .filter(Boolean);

      const batches = await Batch.find({
        $or: [
          { _id: { $in: batchIds } },
          ...(batchNames.length > 0 ? [{ name: { $in: batchNames }, isActive: true }] : []),
        ],
        isActive: true,
      }).sort({ startDate: -1, createdAt: -1 });

      const recordedCourses = await Promise.all(
        recordedEnrollments.map(async (enrollment: any) => {
          const course =
            (await Course.findOne({ slug: enrollment.courseId })) ||
            (await Course.findById(enrollment.courseId).catch(() => null)) ||
            (await Course.findOne({ title: enrollment.courseName }));
          return {
            enrollment,
            course,
          };
        })
      );

      return NextResponse.json({
        success: true,
        batches,
        enrollments,
        recordedCourses,
        pendingLiveEnrollments,
      });
    }

    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can view batches" }, { status: 401 });
    }

    const courseId = searchParams.get("courseId") || "";
    const query: any = {};
    if (courseId) query.courseId = courseId;

    const batches = await Batch.find(query).sort({ startDate: -1, createdAt: -1 });
    return NextResponse.json({ success: true, batches });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load batches" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifySession(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin || admin.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can create batches" }, { status: 401 });
    }

    const p = batchPayload(body);
    if (!p.name) {
      return NextResponse.json({ success: false, message: "Batch name is required" }, { status: 400 });
    }

    const existing = await Batch.findOne({ code: p.code });
    if (existing) {
      p.code = makeCode(p.name);
    }

    const batch = await Batch.create({ ...p, createdBy: String(admin._id) });

    await createNotification({
      audience: "admin",
      type: "batch",
      title: "New batch created",
      message: `${batch.name} was created for ${batch.courseName || "a course"}.`,
      link: "/admin-page/batches",
      meta: { batchId: String(batch._id) },
    });

    await createNotification({
      audience: "user",
      type: "batch",
      title: "New batch available",
      message: `${batch.name} is now available.`,
      link: "/student/batches",
      meta: { batchId: String(batch._id) },
    });

    return NextResponse.json({ success: true, batch }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save batch" },
      { status: 500 }
    );
  }
}
