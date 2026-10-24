import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import WhatsAppInteraction from "@/models/WhatsAppInteraction";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }
  return user;
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const interactions = await WhatsAppInteraction.find().sort({ createdAt: -1 }).limit(500);
    return NextResponse.json({ success: true, interactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to load WhatsApp data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers.get("user-agent") || "";
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    const interaction = await WhatsAppInteraction.create({
      name: String(body.name || "").trim(),
      email: String(body.email || "").trim(),
      phone: String(body.phone || "").trim(),
      page: String(body.page || "").trim(),
      message: String(body.message || "").trim(),
      source: String(body.source || "floating_button").trim(),
      userAgent,
      ip,
    });

    return NextResponse.json({ success: true, interaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "WhatsApp inquiry failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const updated = await WhatsAppInteraction.findByIdAndUpdate(
      body.id,
      { status: body.status || "new" },
      { new: true }
    );

    return NextResponse.json({ success: true, interaction: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "WhatsApp update failed" }, { status: 500 });
  }
}
