import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import AssessmentSubmission from "@/models/AssessmentSubmission";
import Certificate from "@/models/Certificate";
import ContentAccessLog from "@/models/ContentAccessLog";
import Enrollment from "@/models/Enrollment";
import LessonProgress from "@/models/LessonProgress";
import StudentActivity from "@/models/StudentActivity";
import StudentEvent from "@/models/StudentEvent";
import User from "@/models/User";

/* ── Auth helper ──────────────────────────────────────────────────────────── */
async function verifyAdmin(
  userId: string,
  sessionToken: string,
  deviceId: string
) {
  if (!userId || !sessionToken || !deviceId) return null;
  const admin = await User.findById(userId);
  if (
    !admin ||
    admin.role !== "admin" ||
    !admin.isLoggedIn ||
    admin.sessionToken !== sessionToken ||
    admin.activeDevice !== deviceId
  )
    return null;
  return admin;
}

/* ── Formatting helpers ───────────────────────────────────────────────────── */
function fmtSeconds(s: number) {
  const sec = Math.max(0, Math.round(s || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function isLive(lastSeenAt?: Date | null) {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 90_000; // 90 s
}

/* ── Session total-active-seconds calculator ──────────────────────────────── */
function calcActiveSeconds(sessions: any[]) {
  return sessions.reduce((sum, s) => {
    let live = 0;
    if (s.status === "active" && s.lastSeenAt) {
      const elapsed = Math.max(
        0,
        Math.round((Date.now() - new Date(s.lastSeenAt).getTime()) / 1000)
      );
      if (elapsed <= 90) live = elapsed;
    }
    return sum + (s.activeSeconds || 0) + live;
  }, 0);
}

/* ── Build per-student summary ────────────────────────────────────────────── */
async function buildStudentSummary(userId: string, userDoc: any) {
  const [
    enrollments,
    sessions,
    lessonProgress,
    submissions,
    certificates,
    contentLogs,
    events,
  ] = await Promise.all([
    Enrollment.find({ $or: [{ userId }, { email: userDoc.email }] }).sort({
      createdAt: 1,
    }),
    StudentActivity.find({ userId }).sort({ loginAt: -1 }),
    LessonProgress.find({ userId }),
    AssessmentSubmission.find({ userId }),
    Certificate.find({ studentId: userId }),
    ContentAccessLog.find({ userId }).sort({ accessedAt: -1 }).limit(200),
    StudentEvent.find({ userId }).sort({ occurredAt: -1 }).limit(500),
  ]);

  // Dedup enrollments by courseId+batchId
  const seenEnroll = new Set<string>();
  const uniqueEnrollments: any[] = [];
  for (const e of enrollments) {
    const k = `${e.courseId}::${e.batchId}`;
    if (!seenEnroll.has(k)) {
      seenEnroll.add(k);
      uniqueEnrollments.push(e);
    }
  }

  // Sessions
  const totalLoginCount = sessions.length;
  const lastSession = sessions[0] || null;
  const lastLogin = lastSession?.loginAt ?? userDoc.lastLoginAt ?? null;
  const lastLogout = lastSession?.logoutAt ?? userDoc.lastLogoutAt ?? null;
  const lastSeenAt = lastSession?.lastSeenAt ?? null;
  const currentlyActive =
    userDoc.isLoggedIn && isLive(lastSeenAt as Date);
  const currentStatus = currentlyActive ? "Active" : "Inactive";

  const totalActiveSec = calcActiveSeconds(sessions);

  // Lesson progress → per-batch completion
  const batchIds = [...new Set(uniqueEnrollments.map((e) => e.batchId).filter(Boolean))];
  const progressByBatch: Record<string, number> = {};
  for (const e of uniqueEnrollments) {
    if (!e.batchId) continue;
    const completed = lessonProgress.filter(
      (lp) => lp.batchId === e.batchId
    ).length;
    progressByBatch[e.batchId] = completed;
  }

  // Completion % average across enrolled courses
  const completionPcts = uniqueEnrollments.map((e) => {
    const done = progressByBatch[e.batchId] || 0;
    // We'd need batch total; use lessonProgress denominator as proxy
    const total = lessonProgress.filter((lp) => lp.batchId === e.batchId).length || done || 1;
    return done > 0 ? Math.min(100, Math.round((done / Math.max(done, total)) * 100)) : 0;
  });
  const avgCompletion =
    completionPcts.length > 0
      ? Math.round(completionPcts.reduce((a, b) => a + b, 0) / completionPcts.length)
      : 0;

  // Videos watched = content-access logs of type video OR lesson-progress of type video
  const videosWatched = lessonProgress.filter((lp) => lp.materialType === "video").length;
  const materialsAccessed = lessonProgress.filter((lp) => lp.materialType !== "video").length + 
    contentLogs.filter((cl) => cl.materialType !== "video").length;

  // Assignments & tests
  const assignmentsSubmitted = submissions.filter((s) => s.resourceType === "assignment").length;
  const testsAttempted = submissions.filter((s) => s.resourceType === "test").length;

  // Completed courses = certificates issued
  const completedCourses = certificates.filter((c) => c.status === "ACTIVE").length;

  // Per-course activity (for course history tab)
  const courseHistory = uniqueEnrollments.map((e) => {
    const batchDone = progressByBatch[e.batchId] || 0;
    const batchSubs = submissions.filter(
      (s) => s.batchId === e.batchId || s.courseId === e.courseId
    );
    const lastEvent = events.find(
      (ev) => ev.courseId === e.courseId || ev.batchId === e.batchId
    );
    const cert = certificates.find(
      (c) => c.courseId === e.courseId || c.courseId === e.batchId
    );
    return {
      courseId: e.courseId || "",
      courseName: e.courseName || "",
      batchId: e.batchId || "",
      batchName: e.batchName || "",
      enrollmentDate: fmtDate(e.createdAt),
      status: e.status || "",
      progressPct: completionPcts[uniqueEnrollments.indexOf(e)] || 0,
      videosWatched: lessonProgress.filter(
        (lp) => lp.batchId === e.batchId && lp.materialType === "video"
      ).length,
      materialsAccessed: lessonProgress.filter(
        (lp) => lp.batchId === e.batchId && lp.materialType !== "video"
      ).length,
      assignmentsSubmitted: batchSubs.filter((s) => s.resourceType === "assignment").length,
      testsAttempted: batchSubs.filter((s) => s.resourceType === "test").length,
      certificateIssued: cert ? "Yes" : "No",
      lastActivity: lastEvent ? fmtDate(lastEvent.occurredAt) : fmtDate(lastSeenAt),
    };
  });

  // Recent events
  const recentEvents = events.slice(0, 20).map((ev) => ({
    eventType: ev.eventType,
    courseName: ev.courseName || "",
    resourceName: ev.resourceName || "",
    occurredAt: fmtDate(ev.occurredAt),
  }));

  return {
    userId,
    name: userDoc.name || "",
    email: userDoc.email || "",
    enrolledCourses: uniqueEnrollments.length,
    totalLoginCount,
    lastLogin: fmtDate(lastLogin),
    lastLogout: fmtDate(lastLogout),
    lastSeenAt: fmtDate(lastSeenAt),
    currentStatus,
    totalLearningTime: fmtSeconds(totalActiveSec),
    completedCourses,
    avgCompletion,
    videosWatched,
    materialsAccessed,
    assignmentsSubmitted,
    testsAttempted,
    courseHistory,
    recentEvents,
    // for filter
    _isActive: currentlyActive,
    _enrolledCourseNames: uniqueEnrollments.map((e) => e.courseName || ""),
  };
}

/* ── Excel builder ─────────────────────────────────────────────────────────── */
function esc(v: any) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildExcel(students: any[]) {
  const studentHeaders = [
    "Student Name", "Email", "Enrolled Courses", "Total Logins",
    "Last Login", "Last Logout", "Status", "Total Learning Time",
    "Completed Courses", "Avg Completion %", "Videos Watched",
    "Materials Accessed", "Assignments Submitted", "Tests Attempted",
  ];
  const studentKeys = [
    "name", "email", "enrolledCourses", "totalLoginCount",
    "lastLogin", "lastLogout", "currentStatus", "totalLearningTime",
    "completedCourses", "avgCompletion", "videosWatched",
    "materialsAccessed", "assignmentsSubmitted", "testsAttempted",
  ];
  const courseHeaders = [
    "Student Name", "Email", "Course Name", "Batch", "Enrolled On",
    "Status", "Progress %", "Videos Watched", "Materials", "Assignments",
    "Tests", "Certificate", "Last Activity",
  ];
  const courseKeys = [
    "_studentName", "_studentEmail", "courseName", "batchName", "enrollmentDate",
    "status", "progressPct", "videosWatched", "materialsAccessed",
    "assignmentsSubmitted", "testsAttempted", "certificateIssued", "lastActivity",
  ];

  const courseRows: any[] = [];
  for (const s of students) {
    for (const ch of s.courseHistory || []) {
      courseRows.push({ ...ch, _studentName: s.name, _studentEmail: s.email });
    }
  }

  const tbl = (headers: string[], keys: string[], rows: any[]) => `
    <table border="1" style="margin-bottom:20px">
      <thead>
        <tr>${headers.map((h) => `<th style="background:#1d4ed8;color:#fff">${esc(h)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((r) => `<tr>${keys.map((k) => `<td>${esc(r[k])}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
    <style>body{font-family:Arial;font-size:12px} h2{margin-top:20px}</style>
    </head><body>
    <h2>Student Summary</h2>
    ${tbl(studentHeaders, studentKeys, students)}
    <h2>Course Activity History</h2>
    ${tbl(courseHeaders, courseKeys, courseRows)}
    </body></html>`;
}

/* ── GET handler ──────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const format      = searchParams.get("format") || "json";
    const statusFilter = searchParams.get("status") || "all";   // all | active | inactive
    const courseFilter = searchParams.get("course") || "";
    const dateFrom    = searchParams.get("dateFrom") || "";
    const dateTo      = searchParams.get("dateTo") || "";
    const page        = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize    = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50", 10)));

    // 1. All non-admin users who have at least one enrollment
    const allEnrollments = await Enrollment.find({}).select("userId email");
    const userIdSet = new Set<string>();
    const emailToId: Record<string, string> = {};
    for (const e of allEnrollments) {
      if (e.userId) userIdSet.add(String(e.userId));
    }

    const userQuery: any = {
      role: { $ne: "admin" },
      $or: [
        { _id: { $in: [...userIdSet] } },
        { email: { $in: allEnrollments.map((e) => e.email).filter(Boolean) } },
      ],
    };
    if (dateFrom || dateTo) {
      userQuery.createdAt = {};
      if (dateFrom) userQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   userQuery.createdAt.$lte = new Date(dateTo);
    }

    const allUsers = await User.find(userQuery)
      .select("_id name email isLoggedIn lastLoginAt lastLogoutAt")
      .sort({ createdAt: -1 })
      .lean();

    // 2. Build summaries in parallel (batched to avoid DB overload)
    const summaries: any[] = [];
    const BATCH = 10;
    for (let i = 0; i < allUsers.length; i += BATCH) {
      const chunk = allUsers.slice(i, i + BATCH);
      const results = await Promise.all(
        chunk.map((u: any) => buildStudentSummary(String(u._id), u))
      );
      summaries.push(...results);
    }

    // 3. Apply filters
    let filtered = summaries;
    if (statusFilter === "active")   filtered = filtered.filter((s) => s._isActive);
    if (statusFilter === "inactive") filtered = filtered.filter((s) => !s._isActive);
    if (courseFilter) {
      const lc = courseFilter.toLowerCase();
      filtered = filtered.filter((s) =>
        s._enrolledCourseNames.some((n: string) => n.toLowerCase().includes(lc))
      );
    }

    // 4. Excel export — no pagination
    if (format === "excel") {
      return new NextResponse(buildExcel(filtered), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="student-monitoring-${Date.now()}.xls"`,
        },
      });
    }

    // 5. Paginate
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    // Strip internal filter fields
    const clean = paged.map(({ _isActive, _enrolledCourseNames, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      students: clean,
    });
  } catch (err: any) {
    console.log("STUDENT MONITORING GET ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ── POST — record a discrete event ──────────────────────────────────────── */
export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const userId      = String(body.userId      || "");
    const sessionToken = String(body.sessionToken || "");
    const deviceId    = String(body.deviceId    || "");
    const eventType   = String(body.eventType   || "");

    if (!userId || !sessionToken || !deviceId || !eventType) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
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
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    await StudentEvent.create({
      userId,
      name:         user.name  || "",
      email:        user.email || "",
      eventType,
      courseId:     body.courseId     || "",
      courseName:   body.courseName   || "",
      batchId:      body.batchId      || "",
      batchName:    body.batchName    || "",
      resourceId:   body.resourceId   || "",
      resourceName: body.resourceName || "",
      occurredAt:   new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.log("STUDENT EVENT POST ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to record event" },
      { status: 500 }
    );
  }
}
