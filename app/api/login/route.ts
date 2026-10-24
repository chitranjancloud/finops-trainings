import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import StudentEvent from "@/models/StudentEvent";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { email, password, deviceId } = await req.json();

    // ✅ Validate input
    if (!email || !password || !deviceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, password, and device are required",
        },
        { status: 400 }
      );
    }

    // ✅ Find user
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 400 }
      );
    }

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password",
        },
        { status: 400 }
      );
    }

    if (
      user.isLoggedIn &&
      user.sessionToken &&
      user.activeDevice &&
      user.activeDevice !== deviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account is already logged in on another device. Please logout there first.",
        },
        { status: 409 }
      );
    }

    const sessionToken = randomUUID();

    user.sessionToken = sessionToken;
    user.activeDevice = deviceId;
    user.isLoggedIn = true;
    user.lastLoginAt = new Date();

    await user.save();

    // Record discrete login event (non-blocking)
    if (user.role !== "admin") {
      StudentEvent.create({
        userId: String(user._id),
        name: user.name || "",
        email: user.email || "",
        eventType: "login",
        occurredAt: new Date(),
      }).catch(() => {});
    }

    // ✅ IMPORTANT: INCLUDE ROLE
    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // ✅ VERY IMPORTANT
    };

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        user: safeUser,
        sessionToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 }
    );
  }
}
