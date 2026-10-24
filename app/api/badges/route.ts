import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ensureSystemBadges, verifyActiveSession } from "@/lib/certificates";
import Badge from "@/models/Badge";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const user = await verifyActiveSession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Only admins can view badge management" }, { status: 401 });
    }

    await ensureSystemBadges("");
    const badges = await Badge.find().sort({ isSystem: -1, name: 1 });
    return NextResponse.json({ success: true, badges });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load badges" },
      { status: 500 }
    );
  }
}
