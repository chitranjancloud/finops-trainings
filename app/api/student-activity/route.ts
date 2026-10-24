import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import StudentActivity from "@/models/StudentActivity";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;

  const admin = await User.findById(userId);

  if (
    !admin ||
    admin.role !== "admin" ||
    !admin.isLoggedIn ||
    admin.sessionToken !== sessionToken ||
    admin.activeDevice !== deviceId
  ) {
    return null;
  }

  return admin;
}

function getRangeStart(range: string) {
  const now = new Date();
  const start = new Date(now);

  if (range === "yearly") {
    start.setFullYear(now.getFullYear() - 1);
  } else if (range === "monthly") {
    start.setMonth(now.getMonth() - 1);
  } else {
    start.setDate(now.getDate() - 7);
  }

  return start;
}

function updateDurations(activity: any, now: Date, finalStatus?: "active" | "ended") {
  const lastSeenAt = activity.lastSeenAt ? new Date(activity.lastSeenAt) : now;
  const elapsedSeconds = Math.max(
    0,
    Math.round((now.getTime() - lastSeenAt.getTime()) / 1000)
  );

  if (elapsedSeconds <= 90) {
    activity.activeSeconds = (activity.activeSeconds || 0) + elapsedSeconds;
  } else {
    activity.inactiveSeconds = (activity.inactiveSeconds || 0) + elapsedSeconds;
  }

  activity.lastSeenAt = now;
  activity.status = finalStatus || "active";

  if (finalStatus === "ended") {
    activity.logoutAt = now;
  }
}

function formatDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.round(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

function formatDate(value?: Date | string) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function getDisplayStatus(activity: any) {
  if (activity.status === "ended") return "Ended";

  const lastSeenAt = activity.lastSeenAt ? new Date(activity.lastSeenAt) : null;
  const inactiveSeconds = lastSeenAt
    ? Math.max(0, Math.round((Date.now() - lastSeenAt.getTime()) / 1000))
    : 0;

  return inactiveSeconds > 90 ? "Non-active" : "Active";
}

function toReportRow(activity: any) {
  const liveInactiveSeconds =
    activity.status === "active" && activity.lastSeenAt
      ? Math.max(0, Math.round((Date.now() - new Date(activity.lastSeenAt).getTime()) / 1000))
      : 0;
  const inactiveSeconds =
    (activity.inactiveSeconds || 0) + (liveInactiveSeconds > 90 ? liveInactiveSeconds : 0);
  const activeSeconds = activity.activeSeconds || 0;

  return {
    activityId: String(activity._id || ""),
    studentId: String(activity.userId || ""),
    studentName: activity.name || "Unknown Student",
    email: activity.email || "",
    courseName: activity.courseName || activity.courseId || "Unknown Course",
    courseId: activity.courseId || "",
    totalCourseTime: formatDuration(activeSeconds + inactiveSeconds),
    activeTime: formatDuration(activeSeconds),
    inactiveTime: formatDuration(inactiveSeconds),
    date: activity.loginAt ? new Date(activity.loginAt).toLocaleDateString("en-IN") : "",
    exactTime: formatDate(activity.createdAt),
    loginTime: formatDate(activity.loginAt),
    logoutTime: formatDate(activity.logoutAt),
    lastSeenTime: formatDate(activity.lastSeenAt),
    activityStatus: getDisplayStatus(activity),
  };
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExcel(rows: any[]) {
  const headers = [
    "Student Name",
    "Email",
    "Course",
    "Course ID",
    "Total Course Time",
    "Active Time",
    "Non-active Time",
    "Date",
    "Exact Time",
    "Login Time",
    "Logout Time",
    "Last Seen",
    "Activity Status",
  ];

  const keys = [
    "studentName",
    "email",
    "courseName",
    "courseId",
    "totalCourseTime",
    "activeTime",
    "inactiveTime",
    "date",
    "exactTime",
    "loginTime",
    "logoutTime",
    "lastSeenTime",
    "activityStatus",
  ];

  return `<!doctype html>
    <html>
      <head><meta charset="utf-8" /></head>
      <body>
        <table border="1">
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) =>
                  `<tr>${keys
                    .map((key) => `<td>${escapeHtml(row[key])}</td>`)
                    .join("")}</tr>`
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>`;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const event = String(body.event || "heartbeat");
    const userId = String(body.userId || "");
    const sessionToken = String(body.sessionToken || "");
    const deviceId = String(body.deviceId || "");
    const courseId = String(body.courseId || "");
    const courseName = String(body.courseName || "");

    if (!userId || !sessionToken || !deviceId || !courseId) {
      return NextResponse.json(
        {
          success: false,
          message: "Activity data missing",
        },
        { status: 400 }
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
          message: "Session expired",
        },
        { status: 401 }
      );
    }

    const now = new Date();
    let activity = await StudentActivity.findOne({
      userId,
      courseId,
      deviceId,
      status: { $in: ["active", "inactive"] },
    }).sort({ createdAt: -1 });

    if (!activity) {
      activity = await StudentActivity.create({
        userId,
        name: user.name,
        email: user.email,
        courseId,
        courseName,
        deviceId,
        sessionToken,
        loginAt: now,
        lastSeenAt: now,
        status: "active",
      });
    } else {
      updateDurations(activity, now, event === "stop" ? "ended" : "active");
      activity.courseName = courseName || activity.courseName;
      activity.sessionToken = sessionToken;
      await activity.save();
    }

    return NextResponse.json({
      success: true,
      activityId: activity._id,
    });
  } catch (error) {
    console.log("STUDENT ACTIVITY POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to save activity",
      },
      { status: 500 }
    );
  }
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

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Only an active admin can view student activity",
        },
        { status: 401 }
      );
    }

    const range = searchParams.get("range") || "weekly";
    const format = searchParams.get("format") || "json";
    const studentId = searchParams.get("studentId") || "";
    const start = getRangeStart(range);

    const query: any = {
      loginAt: { $gte: start },
    };

    if (studentId) {
      query.userId = studentId;
    }

    const activities = await StudentActivity.find(query).sort({ loginAt: -1 });
    const rows = activities.map(toReportRow);

    if (format === "excel") {
      return new NextResponse(buildExcel(rows), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="student-activity-${studentId || "all"}-${range}.xls"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      range,
      records: rows,
    });
  } catch (error) {
    console.log("STUDENT ACTIVITY GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load student activity",
      },
      { status: 500 }
    );
  }
}
