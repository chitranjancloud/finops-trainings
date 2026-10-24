import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, sessionToken, deviceId } = await req.json();

    if (!userId || !sessionToken || !deviceId) {
      return NextResponse.json(
        { success: false, eligible: false, message: "Please login to submit feedback" },
        { status: 401 }
      );
    }

    const user = await User.findById(userId);

    if (
      !user ||
      !user.isLoggedIn ||
      user.sessionToken !== sessionToken ||
      user.activeDevice !== deviceId
    ) {
      return NextResponse.json(
        { success: false, eligible: false, message: "Session expired" },
        { status: 401 }
      );
    }

    const count = await Enrollment.countDocuments({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      status: { $nin: ["rejected", "cancelled", "canceled"] },
    });

    return NextResponse.json({
      success: true,
      eligible: count > 0,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, eligible: false, message: error.message || "Eligibility check failed" },
      { status: 500 }
    );
  }
}
