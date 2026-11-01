import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import Enrollment from "@/models/Enrollment";
import TeamsMeeting from "@/models/TeamsMeeting";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;

  const user = await User.findById(userId);

  if (
    !user ||
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
    const user = await verifySession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    if (user.role === "admin") {
      const meetings = await TeamsMeeting.find().sort({ startsAt: -1, createdAt: -1 });
      return NextResponse.json({ success: true, meetings });
    }

    const enrollments = await Enrollment.find({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      status: "enrolled",
      batchBlocked: { $ne: true },
    });

    const courseIds = enrollments.map((item: any) => String(item.courseId || "")).filter(Boolean);
    const courseNames = enrollments.map((item: any) => String(item.courseName || "")).filter(Boolean);

    const meetings = await TeamsMeeting.find({
      isActive: true,
      $or: [{ courseId: { $in: courseIds } }, { courseName: { $in: courseNames } }],
    }).sort({ startsAt: 1, createdAt: -1 });

    return NextResponse.json({ success: true, meetings });
  } catch (error: any) {
    console.log("GET TEAMS MEETINGS ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load meetings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifySession(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only active admins can create meetings" },
        { status: 401 }
      );
    }

    if (!body.title || !body.courseName || !body.teamsUrl) {
      return NextResponse.json(
        { success: false, message: "Title, course, and Teams link are required" },
        { status: 400 }
      );
    }

    const meeting = await TeamsMeeting.create({
      title: body.title,
      courseId: body.courseId || "",
      courseName: body.courseName,
      teamsUrl: body.teamsUrl,
      description: body.description || "",
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      isActive: body.isActive !== false,
      createdBy: String(admin._id),
    });

    await createNotification({
      audience: "admin",
      type: "meeting",
      title: "Teams meeting created",
      message: `${meeting.title} was created for ${meeting.courseName}.`,
      link: "/admin-page/meetings",
      meta: { meetingId: String(meeting._id) },
    });

    await createNotification({
      audience: "user",
      type: "meeting",
      title: "New Teams session",
      message: `${meeting.title} is scheduled for ${meeting.courseName}.`,
      link: "/student/meetings",
      meta: { meetingId: String(meeting._id) },
    });

    return NextResponse.json({ success: true, meeting }, { status: 201 });
  } catch (error: any) {
    console.log("CREATE TEAMS MEETING ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to create meeting" },
      { status: 500 }
    );
  }
}
