import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import MeetingAttendance from "@/models/MeetingAttendance";
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

function updateDuration(record: any, now: Date) {
  const lastSeen = record.lastSeenAt ? new Date(record.lastSeenAt) : now;
  const elapsed = Math.max(0, Math.round((now.getTime() - lastSeen.getTime()) / 1000));
  record.totalSeconds = Number(record.totalSeconds || 0) + Math.min(elapsed, 120);
  record.lastSeenAt = now;
}

function formatSeconds(total: number) {
  const seconds = Math.max(0, Math.round(total || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return `${hours}h ${minutes}m ${remaining}s`;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value?: Date | string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function buildExcel(rows: any[]) {
  const headers = [
    "Meeting",
    "Course",
    "Student",
    "Email",
    "Joined At",
    "Left At",
    "Last Seen",
    "Total Time",
    "Status",
  ];
  const keys = [
    "meetingTitle",
    "courseName",
    "name",
    "email",
    "joinedAt",
    "leftAt",
    "lastSeenAt",
    "totalTime",
    "status",
  ];

  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(row[key])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
}

async function toRows(records: any[]) {
  const meetings = await TeamsMeeting.find({
    _id: { $in: records.map((item) => item.meetingId) },
  });
  const meetingMap = new Map(meetings.map((item: any) => [String(item._id), item]));

  return records.map((item: any) => {
    const meeting = meetingMap.get(String(item.meetingId));
    return {
      meetingTitle: meeting?.title || "Teams Meeting",
      courseName: item.courseName || meeting?.courseName || "",
      name: item.name || "",
      email: item.email || "",
      joinedAt: formatDate(item.joinedAt),
      leftAt: formatDate(item.leftAt),
      lastSeenAt: formatDate(item.lastSeenAt),
      totalTime: formatSeconds(item.totalSeconds || 0),
      status: item.status || "",
    };
  });
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const user = await verifySession(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    const meeting = await TeamsMeeting.findById(body.meetingId);

    if (!meeting || meeting.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Meeting is not available" },
        { status: 404 }
      );
    }

    const enrolled = await Enrollment.findOne({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      status: "enrolled",
      $and: [
        {
          $or: [
            { courseId: meeting.courseId },
            { courseName: meeting.courseName },
          ],
        },
      ],
    });

    if (!enrolled) {
      return NextResponse.json(
        { success: false, message: "This meeting is only for enrolled students" },
        { status: 403 }
      );
    }

    const now = new Date();
    let record = await MeetingAttendance.findOne({
      meetingId: meeting._id,
      userId: String(user._id),
      status: "joined",
    }).sort({ createdAt: -1 });

    if (!record) {
      record = await MeetingAttendance.create({
        meetingId: meeting._id,
        userId: String(user._id),
        name: user.name,
        email: user.email,
        courseId: meeting.courseId || enrolled.courseId || "",
        courseName: meeting.courseName || enrolled.courseName || "",
        joinedAt: now,
        lastSeenAt: now,
        deviceId: body.deviceId || "",
        status: "joined",
      });
    } else {
      updateDuration(record, now);
      if (body.event === "leave") {
        record.leftAt = now;
        record.status = "left";
      }
      await record.save();
    }

    if (body.event === "leave" && record.status !== "left") {
      updateDuration(record, now);
      record.leftAt = now;
      record.status = "left";
      await record.save();
    }

    return NextResponse.json({
      success: true,
      attendance: record,
      teamsUrl: meeting.teamsUrl,
    });
  } catch (error: any) {
    console.log("TEAMS ATTENDANCE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save attendance" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifySession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin || admin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only active admins can view attendance" },
        { status: 401 }
      );
    }

    const meetingId = searchParams.get("meetingId") || "";
    const format = searchParams.get("format") || "json";
    const query: any = {};

    if (meetingId) query.meetingId = meetingId;

    const records = await MeetingAttendance.find(query).sort({ joinedAt: -1 });
    const rows = await toRows(records);

    if (format === "excel") {
      return new NextResponse(buildExcel(rows), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="teams-attendance-${meetingId || "all"}.xls"`,
        },
      });
    }

    return NextResponse.json({ success: true, records: rows });
  } catch (error: any) {
    console.log("GET TEAMS ATTENDANCE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load attendance" },
      { status: 500 }
    );
  }
}
