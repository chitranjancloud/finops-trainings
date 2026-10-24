import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import ContentInventory from "@/models/ContentInventory";
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

async function verifyBatchAccess(user: any, batch: any) {
  return Enrollment.findOne({
    batchBlocked: { $ne: true },
    $or: [
      { userId: String(user._id), batchId: String(batch._id) },
      { userId: String(user._id), batchName: batch.name },
      { email: user.email, batchId: String(batch._id) },
      { email: user.email, batchName: batch.name },
    ],
  });
}

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
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    const batch = await Batch.findById(batchId);
    if (!batch || batch.isActive === false || !(await verifyBatchAccess(user, batch))) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this batch content." },
        { status: 403 }
      );
    }

    const inventory = await ContentInventory.find({
      batchId: String(batch._id),
    }).sort({
      fileType: 1,
      uploadedAt: -1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      inventory,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load structured content.",
      },
      { status: 500 }
    );
  }
}