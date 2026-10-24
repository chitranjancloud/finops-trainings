import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { userId, sessionToken, deviceId } = await req.json();

    if (!userId || !sessionToken || !deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Session data missing",
        },
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
        {
          success: false,
          message: "Session expired or logged in somewhere else",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("SESSION VERIFY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}
