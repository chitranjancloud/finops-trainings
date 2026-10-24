import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import StudentEvent from "@/models/StudentEvent";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, sessionToken, deviceId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User is required",
        },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (
      user &&
      user.sessionToken === sessionToken &&
      user.activeDevice === deviceId
    ) {
      user.sessionToken = "";
      user.activeDevice = "";
      user.isLoggedIn = false;
      user.lastLogoutAt = new Date();

      await user.save();

      // Record discrete logout event (non-blocking)
      if (user.role !== "admin") {
        StudentEvent.create({
          userId: String(user._id),
          name: user.name || "",
          email: user.email || "",
          eventType: "logout",
          occurredAt: new Date(),
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}