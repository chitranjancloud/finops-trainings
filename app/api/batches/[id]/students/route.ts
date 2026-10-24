import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";
import StudentActivity from "@/models/StudentActivity";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || user.role !== "admin" || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) {
    return null;
  }
  return user;
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

function buildExcel(batch: any, type: string, rows: any[]) {
  const headers = ["Student Name", "Email", "Course", "Batch", "Last Seen", "Status", "Blocked"];
  const keys = ["name", "email", "courseName", "batchName", "lastSeenAt", "activityStatus", "blocked"];

  return `<!doctype html>
  <html>
    <head><meta charset="utf-8" /></head>
    <body>
      <table border="1">
        <tr><th colspan="${headers.length}">${escapeHtml(batch.name)} - ${escapeHtml(type)} Students</th></tr>
        <tr><th colspan="${headers.length}">Inactive after ${escapeHtml(batch.inactiveAfterDays || 5)} day(s)</th></tr>
        <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        ${rows
          .map(
            (row) =>
              `<tr>${keys.map((key) => `<td>${escapeHtml(row[key])}</td>`).join("")}</tr>`
          )
          .join("")}
      </table>
    </body>
  </html>`;
}

async function rowsForBatch(batch: any) {
  const batchId = String(batch._id);
  // Find by batchId (new) OR batchName (legacy)
  const enrollments = await Enrollment.find({
    $or: [
      { batchId: batchId },
      { batchName: batch.name, batchId: { $in: ["", null, undefined] } },
    ],
  }).sort({ createdAt: -1 });

  const cutoff = Date.now() - Math.max(1, Number(batch.inactiveAfterDays || 5)) * 24 * 60 * 60 * 1000;

  return Promise.all(
    enrollments.map(async (item: any) => {
      const activity = await StudentActivity.findOne({
        $or: [
          { userId: String(item.userId || "") },
          { email: String(item.email || "") },
        ],
        ...(item.courseId ? { courseId: item.courseId } : {}),
      }).sort({ lastSeenAt: -1, createdAt: -1 });

      const lastSeen = activity?.lastSeenAt || activity?.loginAt || item.batchAssignedAt || item.createdAt;
      const inactive = !lastSeen || new Date(lastSeen).getTime() < cutoff;

      return {
        _id: String(item._id),
        userId: item.userId || "",
        name: item.name || "Unknown Student",
        email: item.email || "",
        courseId: item.courseId || "",
        courseName: item.courseName || batch.courseName || "",
        batchName: batch.name,
        batchId: batchId,
        lastSeenAt: formatDate(lastSeen),
        status: item.status || "enrolled",
        batchBlocked: item.batchBlocked === true,
        blocked: item.batchBlocked === true ? "Yes" : "No",
        activityStatus: item.batchBlocked === true ? "Blocked" : inactive ? "Inactive" : "Active",
      };
    })
  );
}

export async function GET(req: Request, { params }: any) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin) {
      return NextResponse.json({ success: false, message: "Only admins can view batch students" }, { status: 401 });
    }

    const batch = await Batch.findById(params.id);
    if (!batch) {
      return NextResponse.json({ success: false, message: "Batch not found" }, { status: 404 });
    }

    const rows = await rowsForBatch(batch);
    const activeStudents = rows.filter((row) => row.activityStatus === "Active");
    const inactiveStudents = rows.filter((row) => row.activityStatus !== "Active");
    const type = searchParams.get("type") || "all";
    const format = searchParams.get("format") || "json";

    if (format === "excel") {
      const selected =
        type === "active" ? activeStudents : type === "inactive" ? inactiveStudents : rows;
      return new NextResponse(buildExcel(batch, type, selected), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${batch.name}-${type}-students.xls"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      inactiveAfterDays: batch.inactiveAfterDays || 5,
      students: rows,
      activeStudents,
      inactiveStudents,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load batch students" },
      { status: 500 }
    );
  }
}
