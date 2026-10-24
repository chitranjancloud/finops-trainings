import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";

async function verifyAdmin(searchParams: URLSearchParams) {
  const user = await User.findById(searchParams.get("userId") || "");
  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== searchParams.get("sessionToken") ||
    user.activeDevice !== searchParams.get("deviceId")
  ) {
    return null;
  }

  return user;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(searchParams);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin session expired" },
        { status: 401 }
      );
    }

    const payments = await Payment.find().sort({ createdAt: -1 }).limit(500);

    return NextResponse.json({ success: true, payments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load fees" },
      { status: 500 }
    );
  }
}
