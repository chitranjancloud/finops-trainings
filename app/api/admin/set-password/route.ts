import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Token and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      role: "admin",
      passwordSetupRequired: true,
      passwordSetupToken: tokenHash,
      passwordSetupExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "This setup link is invalid or expired",
        },
        { status: 400 }
      );
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordSetupRequired = false;
    user.passwordSetupToken = "";
    user.passwordSetupExpires = null;
    user.sessionToken = "";
    user.activeDevice = "";
    user.isLoggedIn = false;

    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password set successfully",
    });
  } catch (error) {
    console.log("SET ADMIN PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to set password",
      },
      { status: 500 }
    );
  }
}