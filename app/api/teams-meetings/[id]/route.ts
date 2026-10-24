import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import TeamsMeeting from "@/models/TeamsMeeting";
import User from "@/models/User";

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

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Only active admins can update meetings" },
        { status: 401 }
      );
    }

    const meeting = await TeamsMeeting.findByIdAndUpdate(
      params.id,
      {
        title: body.title,
        courseId: body.courseId || "",
        courseName: body.courseName,
        teamsUrl: body.teamsUrl,
        description: body.description || "",
        startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
        endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        isActive: body.isActive !== false,
      },
      { new: true }
    );

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    console.log("UPDATE TEAMS MEETING ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update meeting" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Only active admins can delete meetings" },
        { status: 401 }
      );
    }

    await TeamsMeeting.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.log("DELETE TEAMS MEETING ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete meeting" },
      { status: 500 }
    );
  }
}
