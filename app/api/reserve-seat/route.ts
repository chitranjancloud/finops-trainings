import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      userId,
      courseId,
      courseName,
      coursePrice,
      sessionToken,
      deviceId,
    } = await req.json();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found"
      });
    }

    if (
      !user.isLoggedIn ||
      user.sessionToken !== sessionToken ||
      user.activeDevice !== deviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Session expired. Please login again.",
        },
        { status: 401 }
      );
    }

    const reservation = await Enrollment.create({
      userId,
      courseId,
      courseName,
      coursePrice,
      name: user.name,
      email: user.email,
      status: "reserved_payment_pending",
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      reservation
    });

  } catch {
    return NextResponse.json({
      success: false
    });
  }
}
