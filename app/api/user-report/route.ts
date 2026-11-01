import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import {
  withTenantContext,
  withTenantScope,
} from "@/lib/platform/runtime";
import Batch from "@/models/Batch";
import ContentAccessLog from "@/models/ContentAccessLog";
import ContentInventory from "@/models/ContentInventory";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import LessonProgress from "@/models/LessonProgress";
import StudentActivity from "@/models/StudentActivity";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function secondsToLabel(seconds: number) {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function collectMaterialDedupKeys(item: {
  url?: string;
  webUrl?: string;
  name?: string;
  fileName?: string;
}) {
  const keys: string[] = [];
  const urls = [item.url, item.webUrl].filter(Boolean) as string[];

  for (const raw of urls) {
    const driveId = extractSharePointParam(raw, "driveId");
    const itemId = extractSharePointParam(raw, "itemId");
    if (driveId && itemId) {
      keys.push(`sp:${driveId}:${itemId}`);
    }
    if (raw.includes("/api/sharepoint-file")) {
      keys.push(`url:${raw}`);
    }
  }

  if (keys.length === 0) {
    const name = String(item.name || item.fileName || "")
      .trim()
      .toLowerCase();
    if (name) keys.push(`name:${name}`);
  }

  return keys;
}

/** Match student batch UI: ContentInventory + legacy batch.materials (deduped). */
function buildBatchTrackableMaterials(batch: any, inventoryItems: any[]) {
  const inventory = inventoryItems.map((item) => ({
    _id: String(item._id),
    name: item.fileName || "",
    url: item.url,
    webUrl: item.webUrl,
  }));

  const inventoryKeys = new Set<string>();
  for (const item of inventory) {
    for (const key of collectMaterialDedupKeys(item)) {
      inventoryKeys.add(key);
    }
  }

  const legacy = (batch?.materials || [])
    .filter((m: any) => m.isActive !== false)
    .map((m: any) => ({
      _id: String(m._id),
      name: m.name || "",
      url: m.url,
      webUrl: m.webUrl,
    }))
    .filter((item: { _id: string; name: string; url?: string; webUrl?: string }) => {
      const keys = collectMaterialDedupKeys(item);
      return !keys.some((key) => inventoryKeys.has(key));
    });

  return [...inventory, ...legacy];
}

/** Same 90s threshold used by /api/student-activity for gap-based time. */
function estimateSecondsFromAccessLogs(logs: any[]) {
  if (!logs.length) return { active: 0, inactive: 0 };

  const sorted = [...logs].sort(
    (a, b) =>
      new Date(a.accessedAt).getTime() - new Date(b.accessedAt).getTime()
  );

  let active = 30;
  let inactive = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.max(
      0,
      Math.round(
        (new Date(sorted[i].accessedAt).getTime() -
          new Date(sorted[i - 1].accessedAt).getTime()) /
          1000
      )
    );
    if (gap <= 90) active += gap;
    else inactive += gap;
  }

  return { active, inactive };
}

/**
 * Classify an enrollment status into one of three buckets.
 *
 * "enrolled"  → student has paid / is actively learning
 * "reserved"  → seat held, payment pending
 * "other"     → unknown / edge-case statuses
 *
 * Statuses set by the enroll API   : "enrolled", "Waiting For Batch Assignment"
 * Statuses set by the reserve API  : "reserved_payment_pending"
 * Statuses set by admin panel PUT  : "Active", "Completed", "Blocked", free text
 */
function classifyStatus(raw: string): "enrolled" | "reserved" | "other" {
  const s = String(raw || "").toLowerCase().trim();

  if (
    s === "reserved_payment_pending" ||
    s === "reserved" ||
    s.includes("reserved")
  ) {
    return "reserved";
  }

  if (
    s === "enrolled" ||
    s === "active" ||
    s === "completed" ||
    s === "waiting for batch assignment" ||
    s.includes("enrolled") ||
    s.includes("batch") ||
    s.includes("active") ||
    s.includes("completed")
  ) {
    return "enrolled";
  }

  return "other";
}

/* ── Route handler ────────────────────────────────────────────────────────── */

/** Phase 4E.4 — Tenant-scoped student report reads. */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId       = searchParams.get("userId")       || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId     = searchParams.get("deviceId")     || "";

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired" },
        { status: 401 }
      );
    }

    const [rawEnrollments, activities, courses, progressRecords, contentLogs] =
      await Promise.all([
        Enrollment.find(
          withTenantScope({
            $or: [{ userId }, { email: user.email }],
          })
        ).sort({ createdAt: -1 }),

        StudentActivity.find(withTenantScope({ userId })).sort({
          loginAt: -1,
        }),

        Course.find(withTenantScope()),

        LessonProgress.find(withTenantScope({ userId })),

        ContentAccessLog.find(withTenantScope({ userId })).sort({
          accessedAt: 1,
        }),
      ]);

    /* ── Deduplicate enrollments ───────────────────────────────────────────
     * A student matched by both userId and email can appear twice for the
     * same course.  Keep the most-recent record per (courseId, batchId).
     */
    const enrollmentKey = (e: any) =>
      `${String(e.courseId || "").trim()}::${String(e.batchId || "").trim()}::${String(e.courseName || "").trim()}`;

    const seenKeys = new Set<string>();
    const enrollments: any[] = [];
    for (const e of rawEnrollments) {
      const key = enrollmentKey(e);
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        enrollments.push(e);
      }
    }

    /* ── Course lookup map ────────────────────────────────────────────────── */
    const courseMap = new Map<string, any>(
      courses.flatMap((c: any) => [
        [String(c._id),           c],
        [String(c.slug  || ""),   c],
        [String(c.title || ""),   c],
      ])
    );

    /* ── Activity time totals ─────────────────────────────────────────────── */
    let totalActiveSeconds = activities.reduce(
      (sum, a: any) => sum + Number(a.activeSeconds || 0),
      0
    );
    let totalInactiveSeconds = activities.reduce(
      (sum, a: any) => sum + Number(a.inactiveSeconds || 0),
      0
    );

    if (totalActiveSeconds === 0 && totalInactiveSeconds === 0 && contentLogs.length > 0) {
      const estimated = estimateSecondsFromAccessLogs(contentLogs);
      totalActiveSeconds = estimated.active;
      totalInactiveSeconds = estimated.inactive;
    }

    /* ── Content access by batch (materials opened/played) ───────────────── */
    const accessedByBatch = new Map<string, Set<string>>();
    for (const log of contentLogs) {
      const batchId = String(log.batchId || "").trim();
      const materialId = String(log.materialId || "").trim();
      if (!batchId || !materialId) continue;
      if (!accessedByBatch.has(batchId)) accessedByBatch.set(batchId, new Set());
      accessedByBatch.get(batchId)!.add(materialId);
    }

    /* ── Progress lookup: batchId → Set<materialId> ───────────────────────── */
    const progressByBatch  = new Map<string, Set<string>>();
    const progressByCourse = new Map<string, Set<string>>();

    for (const p of progressRecords) {
      if (p.batchId) {
        if (!progressByBatch.has(p.batchId)) progressByBatch.set(p.batchId, new Set());
        progressByBatch.get(p.batchId)!.add(p.materialId);
      }
      if (p.courseId) {
        if (!progressByCourse.has(p.courseId)) progressByCourse.set(p.courseId, new Set());
        progressByCourse.get(p.courseId)!.add(p.materialId);
      }
    }

    /* ── Fetch batches the student is assigned to ─────────────────────────── */
    const assignedBatchIds = [
      ...new Set(
        enrollments
          .map((e: any) => String(e.batchId || "").trim())
          .filter(Boolean)
      ),
    ];

    const batches =
      assignedBatchIds.length > 0
        ? await Batch.find(
            withTenantScope({ _id: { $in: assignedBatchIds } })
          )
        : [];

    const inventoryRecords =
      assignedBatchIds.length > 0
        ? await ContentInventory.find(
            withTenantScope({ batchId: { $in: assignedBatchIds } })
          )
        : [];

    const inventoryByBatch = new Map<string, any[]>();
    for (const item of inventoryRecords) {
      const batchId = String(item.batchId || "").trim();
      if (!batchId) continue;
      if (!inventoryByBatch.has(batchId)) inventoryByBatch.set(batchId, []);
      inventoryByBatch.get(batchId)!.push(item);
    }

    const batchMap = new Map<string, any>(
      batches.map((b: any) => [String(b._id), b])
    );

    /* ── Build per-enrollment course reports ──────────────────────────────── */
    const courseReports = enrollments.map((enrollment: any) => {
      const relatedCourse =
        courseMap.get(String(enrollment.courseId || "")) ||
        courseMap.get(String(enrollment.courseName || ""));

      /* Activity for this specific course */
      const relatedActivities = activities.filter((a: any) =>
        String(a.courseId   || "") === String(enrollment.courseId  || "") ||
        String(a.courseName || "") === String(enrollment.courseName || "") ||
        String(a.courseId   || "") === String(relatedCourse?.slug  || "")
      );

      const courseActiveSeconds = relatedActivities.reduce(
        (sum: number, a: any) => sum + Number(a.activeSeconds || 0),
        0
      );

      const batchId = String(enrollment.batchId || "").trim();
      let courseTimeSeconds = courseActiveSeconds;

      if (courseTimeSeconds === 0 && batchId) {
        const batchLogs = contentLogs.filter(
          (log: any) => String(log.batchId || "") === batchId
        );
        if (batchLogs.length > 0) {
          courseTimeSeconds = estimateSecondsFromAccessLogs(batchLogs).active;
        }
      }

      /* ── Completion calculation ──────────────────────────────────────────
       * Rule: completed / total trackable materials in the batch.
       * Trackable = ContentInventory + legacy batch.materials (same as student UI).
       * Completed = LessonProgress marks OR verified content access (view/play/open).
       */
      let completionPct       = 0;
      let completedLessons    = 0;
      let totalLessons        = 0;

      if (batchId) {
        /* Student is in a batch → authoritative source */
        const batch = batchMap.get(batchId);
        if (batch) {
          const trackableMaterials = buildBatchTrackableMaterials(
            batch,
            inventoryByBatch.get(batchId) || []
          );
          totalLessons = trackableMaterials.length;

          if (totalLessons > 0) {
            const completedSet = progressByBatch.get(batchId) || new Set<string>();
            const accessedSet = accessedByBatch.get(batchId) || new Set<string>();
            completedLessons = trackableMaterials.filter(
              (m) => completedSet.has(m._id) || accessedSet.has(m._id)
            ).length;
            completionPct = Math.min(
              100,
              Math.round((completedLessons / totalLessons) * 100)
            );
          }
        }
      } else if (relatedCourse) {
        /* Recorded course — use course-level items if tracked */
        const courseKey = String(
          relatedCourse.slug || relatedCourse._id || ""
        );
        const allItems = [
          ...(relatedCourse.videos    || []),
          ...(relatedCourse.pdfs      || []),
          ...(relatedCourse.materials || []),
        ].filter((item: any) => item?.url || item?.webUrl);

        totalLessons = allItems.length;

        if (totalLessons > 0) {
          const completedSet =
            progressByCourse.get(courseKey) ||
            progressByCourse.get(String(relatedCourse._id)) ||
            new Set<string>();

          completedLessons = allItems.filter((item: any) =>
            completedSet.has(String(item._id || ""))
          ).length;

          completionPct = Math.min(
            100,
            Math.round((completedLessons / totalLessons) * 100)
          );
        }
        // If no trackable lessons exist → completion stays 0 (never fabricate)
      }

      /* Course completion status label */
      let completionStatus = "In Progress";
      if (totalLessons === 0)          completionStatus = "No Content Yet";
      else if (completionPct === 100)  completionStatus = "Completed";
      else if (completionPct === 0)    completionStatus = "Not Started";

      return {
        enrollmentId:     String(enrollment._id),
        courseId:         enrollment.courseId  || relatedCourse?.slug || "",
        courseName:       enrollment.courseName || relatedCourse?.title || "Course",
        status:           enrollment.status || "enrolled",
        statusClass:      classifyStatus(enrollment.status || ""),
        completionStatus,
        batchName:        enrollment.batchName || "",
        batchId:          enrollment.batchId   || "",
        enrolledAt:       enrollment.createdAt,
        price:            enrollment.coursePrice || relatedCourse?.price || "",
        duration:         relatedCourse?.duration || "",
        activeTime:       secondsToLabel(courseTimeSeconds),
        sessions:         relatedActivities.length || (batchId ? (accessedByBatch.get(batchId)?.size || 0) : 0),
        completion:       completionPct,
        completedLessons,
        totalLessons,
        lastSeenAt:
          relatedActivities[0]?.lastSeenAt ||
          (batchId
            ? contentLogs
                .filter((log: any) => String(log.batchId || "") === batchId)
                .at(-1)?.accessedAt || null
            : null),
      };
    });

    /* ── Summary counters ─────────────────────────────────────────────────── */
    const enrolledCourses = enrollments.filter(
      (e: any) => classifyStatus(e.status || "") === "enrolled"
    ).length;

    const reservedCourses = enrollments.filter(
      (e: any) => classifyStatus(e.status || "") === "reserved"
    ).length;

    /* Average completion — only over enrolled (active) courses that have content */
    const enrolledReports = courseReports.filter(
      (r) => classifyStatus(r.status) === "enrolled"
    );

    const averageCompletion =
      enrolledReports.length > 0
        ? Math.round(
            enrolledReports.reduce((sum, r) => sum + (r.completion || 0), 0) /
              enrolledReports.length
          )
        : 0;

    return NextResponse.json({
      success: true,
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
      },
      summary: {
        enrolledCourses,
        reservedCourses,
        totalTime:         secondsToLabel(totalActiveSeconds + totalInactiveSeconds),
        activeTime:        secondsToLabel(totalActiveSeconds),
        averageCompletion,
      },
      courses: courseReports,
      recentActivity: activities.slice(0, 8).map((a: any) => ({
        courseName:  a.courseName || a.courseId || "Course",
        activeTime:  secondsToLabel(a.activeSeconds   || 0),
        inactiveTime: secondsToLabel(a.inactiveSeconds || 0),
        loginAt:  a.loginAt,
        logoutAt: a.logoutAt,
        status:   a.status,
      })),
    });
  } catch (error: any) {
    console.log("USER REPORT ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load report" },
      { status: 500 }
    );
  }
});
