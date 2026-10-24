import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || user.role !== "admin" || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) {
    return null;
  }
  return user;
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

export async function GET(req: Request, { params }: any) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can view batch" }, { status: 401 });
    }
    const batch = await Batch.findById(params.id);
    if (!batch) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can update batches" }, { status: 401 });
    }

    const name = String(body.name || "").trim();
    const code = String(body.code || "").trim().toUpperCase();

    if (!name || !code) {
      return NextResponse.json({ success: false, message: "Batch name and code are required" }, { status: 400 });
    }

    const duplicate = await Batch.findOne({ code, _id: { $ne: params.id } });
    if (duplicate) {
      return NextResponse.json({ success: false, message: "Batch code must be unique" }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      name,
      code,
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
    };

    if (body.materials !== undefined) {
      data.materials = cleanMaterials(body.materials);
    }

    const oldBatch = await Batch.findById(params.id);
    const batch = await Batch.findByIdAndUpdate(params.id, data, { new: true });

    // If batch name changed, update enrollment records (backward compat)
    if (oldBatch && oldBatch.name !== name) {
      await Enrollment.updateMany(
        { $or: [{ batchId: params.id }, { batchName: oldBatch.name }] },
        { $set: { batchName: name, batchId: params.id } }
      );
    }

    await createNotification({
      audience: "admin",
      type: "batch",
      title: "Batch updated",
      message: `${batch?.name || name} was updated.`,
      link: "/admin-page/batches",
      meta: { batchId: params.id },
    });

    await createNotification({
      audience: "user",
      type: "batch",
      title: "Batch content updated",
      message: `${batch?.name || name} has new or updated content.`,
      link: "/student/batches",
      meta: { batchId: params.id },
    });

    return NextResponse.json({ success: true, batch });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update batch" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can delete batches" }, { status: 401 });
    }

    const batch = await Batch.findById(params.id);
    if (!batch) {
      return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });
    }

    // Remove batch assignment from all enrollments that belong to this batch
    await Enrollment.updateMany(
      { $or: [{ batchId: params.id }, { batchName: batch.name }] },
      {
        $set: {
          batchName: "",
          batchId: "",
          batchBlocked: false,
          batchBlockReason: "",
          batchBlockedAt: null,
          batchAssignedAt: null,
        },
      }
    );

    await Batch.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true, message: "Batch deleted and student assignments cleared." });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete batch" },
      { status: 500 }
    );
  }
}
