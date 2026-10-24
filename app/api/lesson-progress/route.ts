import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import LessonProgress from "@/models/LessonProgress";
import User from "@/models/User";

async function verifySession(
  userId: string,
  sessionToken: string,
  deviceId: string
) {
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

/**
 * POST /api/lesson-progress
 * Body: { userId, sessionToken, deviceId, batchId, materialId }
 *
 * Marks a single material as completed for the student.
 * Uses upsert so re-sending is idempotent.
 * Returns updated completion percentage for the batch.
 */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const userId = String(body.userId || "");
    const sessionToken = String(body.sessionToken || "");
    const deviceId = String(body.deviceId || "");
    const batchId = String(body.batchId || "");
    const materialId = String(body.materialId || "");

    if (!userId || !sessionToken || !deviceId || !batchId || !materialId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await verifySession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    // Verify the student has access to this batch
    const batch = await Batch.findById(batchId);
    if (!batch) {
      return NextResponse.json(
        { success: false, message: "Batch not found" },
        { status: 404 }
      );
    }

    const enrollment = await Enrollment.findOne({
      batchBlocked: { $ne: true },
      $or: [
        { userId: String(user._id), batchId: String(batch._id) },
        { userId: String(user._id), batchName: batch.name },
        { email: user.email, batchId: String(batch._id) },
        { email: user.email, batchName: batch.name },
      ],
    });
    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // Find the material in the batch for denormalised fields
    const material = (batch.materials || []).find(
      (m: any) => String(m._id) === materialId
    );

    // Upsert — idempotent completion marking
    await LessonProgress.findOneAndUpdate(
      { userId, batchId, materialId },
      {
        $setOnInsert: {
          userId,
          batchId,
          materialId,
          batchName: batch.name || "",
          materialName: material?.name || "",
          materialType: material?.type || "video",
          courseId: batch.courseId || enrollment.courseId || "",
          courseName: batch.courseName || enrollment.courseName || "",
          completedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // Return updated stats for this batch so the UI can refresh immediately
    const totalMaterials = (batch.materials || []).filter(
      (m: any) => m.isActive !== false
    ).length;

    const completedCount = await LessonProgress.countDocuments({
      userId,
      batchId,
    });

    const completionPct =
      totalMaterials > 0
        ? Math.min(100, Math.round((completedCount / totalMaterials) * 100))
        : 0;

    return NextResponse.json({
      success: true,
      batchId,
      completedCount,
      totalMaterials,
      completionPct,
    });
  } catch (error: any) {
    console.log("LESSON PROGRESS POST ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save progress" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lesson-progress?userId=&sessionToken=&deviceId=&batchId=
 *
 * Returns the set of completed materialIds for the student (optionally
 * filtered to a specific batch).  Also returns per-batch completion %.
 */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const batchId = searchParams.get("batchId") || "";

    const user = await verifySession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    const query: any = { userId };
    if (batchId) query.batchId = batchId;

    const records = await LessonProgress.find(query).sort({ completedAt: 1 });

    // Group by batchId so the client can compute per-batch % without extra calls
    const byBatch: Record<
      string,
      { completedMaterialIds: string[]; courseId: string; courseName: string }
    > = {};

    for (const rec of records) {
      if (!byBatch[rec.batchId]) {
        byBatch[rec.batchId] = {
          completedMaterialIds: [],
          courseId: rec.courseId || "",
          courseName: rec.courseName || "",
        };
      }
      byBatch[rec.batchId].completedMaterialIds.push(rec.materialId);
    }

    return NextResponse.json({
      success: true,
      completedMaterialIds: records.map((r) => r.materialId),
      byBatch,
    });
  } catch (error: any) {
    console.log("LESSON PROGRESS GET ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load progress" },
      { status: 500 }
    );
  }
}
