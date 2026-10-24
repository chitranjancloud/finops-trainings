import { NextResponse } from "next/server";

import { buildStructuredSharePointFolderPath } from "@/lib/sharepoint";
import { connectDB } from "@/lib/mongodb";
import Batch from "@/models/Batch";
import ContentInventory from "@/models/ContentInventory";
import Course from "@/models/Course";
import User from "@/models/User";

type FileType = "video" | "pdf" | "study-material" | "assignment";

type MigrationCandidate = {
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
  fileType: FileType;
  fileName: string;
  normalizedFileName: string;
  folderPath: string;
  sharePointItemId: string;
  sharePointDriveId: string;
  url: string;
  webUrl: string;
  uploadedAt: Date;
  source: "batch-material" | "batch-assignment" | "course-content";
};

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

function safeName(value: string) {
  const parsed = value.split(/[\\/]/).pop() || "";
  const withoutQuery = parsed.split("?")[0] || "";

  return withoutQuery.trim() || "legacy-content";
}

function normalizeFileName(value: string) {
  return safeName(value).replace(/[^a-zA-Z0-9._-]/g, "-").trim().toLowerCase();
}

function extractUrlParam(rawUrl: string, key: string) {
  try {
    const parsed = new URL(rawUrl, "http://local");
    return parsed.searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function getSharePointItemId(url: string) {
  return extractUrlParam(url, "itemId") || extractUrlParam(url, "sharePointItemId");
}

function getSharePointDriveId(url: string) {
  return extractUrlParam(url, "driveId") || extractUrlParam(url, "sharePointDriveId");
}

function categoryFromLegacyType(type: string, name: string, url: string): FileType {
  const lowerType = String(type || "").toLowerCase();
  const lower = `${name} ${url}`.toLowerCase();

  if (lowerType === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) {
    return "video";
  }

  if (lowerType === "pdf" || /\.pdf(\?|$)/.test(lower)) {
    return "pdf";
  }

  if (lowerType === "assignment") {
    return "assignment";
  }

  return "study-material";
}

function courseName(course: any) {
  return String(course?.title || course?.name || "").trim();
}

function findCourseForBatch(batch: any, courses: any[]) {
  const courseId = String(batch.courseId || "").trim();
  const batchCourseName = String(batch.courseName || "").trim();

  return (
    courses.find((course: any) => String(course._id) === courseId) ||
    courses.find((course: any) => String(course.slug || "") === courseId) ||
    courses.find((course: any) => courseName(course) === batchCourseName) ||
    null
  );
}

function candidateBase({
  batch,
  course,
  fileType,
  fileName,
  url,
  webUrl,
  source,
  uploadedAt,
}: {
  batch: any;
  course: any;
  fileType: FileType;
  fileName: string;
  url: string;
  webUrl: string;
  source: MigrationCandidate["source"];
  uploadedAt?: Date;
}): MigrationCandidate | null {
  const cleanFileName = safeName(fileName || url || webUrl);
  const normalizedFileName = normalizeFileName(cleanFileName);
  const cleanCourseName = courseName(course) || String(batch.courseName || "").trim();
  const cleanBatchName = String(batch.name || "").trim();
  const folderPath = buildStructuredSharePointFolderPath({
    courseName: cleanCourseName,
    batchName: cleanBatchName,
    category: fileType,
  });

  if (!cleanFileName || !normalizedFileName || !folderPath || (!url && !webUrl)) {
    return null;
  }

  const contentUrl = url || webUrl;

  return {
    courseId: String(course?._id || batch.courseId || "").trim(),
    courseName: cleanCourseName,
    batchId: String(batch._id || "").trim(),
    batchName: cleanBatchName,
    fileType,
    fileName: cleanFileName,
    normalizedFileName,
    folderPath,
    sharePointItemId: getSharePointItemId(contentUrl),
    sharePointDriveId: getSharePointDriveId(contentUrl),
    url,
    webUrl,
    uploadedAt: uploadedAt || batch.updatedAt || batch.createdAt || new Date(),
    source,
  };
}

function collectBatchCandidates(batch: any, course: any) {
  const candidates: MigrationCandidate[] = [];

  (batch.materials || []).forEach((item: any) => {
    if (item?.isActive === false) return;

    const url = String(item.url || "").trim();
    const webUrl = String(item.webUrl || "").trim();
    const fileName = String(item.name || item.title || url || webUrl || "").trim();
    const fileType = categoryFromLegacyType(item.type, fileName, url || webUrl);
    const candidate = candidateBase({
      batch,
      course,
      fileType,
      fileName,
      url,
      webUrl,
      source: "batch-material",
      uploadedAt: item.updatedAt || item.createdAt,
    });

    if (candidate) candidates.push(candidate);
  });

  (batch.assignments || []).forEach((item: any) => {
    if (item?.isActive === false) return;

    const url = String(item.fileUrl || item.link || "").trim();
    const fileName = String(item.title || url || "").trim();
    const candidate = candidateBase({
      batch,
      course,
      fileType: "assignment",
      fileName,
      url,
      webUrl: "",
      source: "batch-assignment",
      uploadedAt: item.updatedAt || item.createdAt || item.dueDate,
    });

    if (candidate) candidates.push(candidate);
  });

  return candidates;
}

function collectCourseCandidates(batch: any, course: any) {
  const candidates: MigrationCandidate[] = [];
  if (!course) return candidates;

  const courseItems = [
    ...((course.videos || []).map((item: any) => ({
      item,
      fileType: "video" as FileType,
      fallbackName: "Course Video",
    }))),
    ...((course.pdfs || []).map((item: any) => ({
      item,
      fileType: "pdf" as FileType,
      fallbackName: "Course PDF",
    }))),
    ...((course.materials || []).map((item: any) => ({
      item,
      fileType: "study-material" as FileType,
      fallbackName: "Study Material",
    }))),
  ];

  if (course.videoUrl) {
    courseItems.push({
      item: { name: "Course Video", url: course.videoUrl },
      fileType: "video",
      fallbackName: "Course Video",
    });
  }

  if (course.pdfUrl) {
    courseItems.push({
      item: { name: "Course PDF", url: course.pdfUrl },
      fileType: "pdf",
      fallbackName: "Course PDF",
    });
  }

  if (course.materialUrl) {
    courseItems.push({
      item: {
        name: course.materialTitle || "Study Material",
        url: course.materialUrl,
      },
      fileType: "study-material",
      fallbackName: "Study Material",
    });
  }

  courseItems.forEach(({ item, fileType, fallbackName }) => {
    const url = String(item.url || "").trim();
    const webUrl = String(item.webUrl || "").trim();
    const fileName = String(item.name || fallbackName || url || webUrl || "").trim();
    const candidate = candidateBase({
      batch,
      course,
      fileType,
      fileName,
      url,
      webUrl,
      source: "course-content",
      uploadedAt: item.updatedAt || item.createdAt || course.updatedAt || course.createdAt,
    });

    if (candidate) candidates.push(candidate);
  });

  return candidates;
}

async function existingInventory(candidate: MigrationCandidate) {
  const checks: any[] = [
    {
      batchId: candidate.batchId,
      fileType: candidate.fileType,
      normalizedFileName: candidate.normalizedFileName,
    },
  ];

  if (candidate.sharePointItemId) {
    checks.push({
      sharePointItemId: candidate.sharePointItemId,
    });
  }

  return ContentInventory.findOne({ $or: checks });
}

function emptySummary() {
  return {
    video: 0,
    pdf: 0,
    "study-material": 0,
    assignment: 0,
  };
}

async function buildVerification() {
  const inventory = await ContentInventory.find().sort({
    courseName: 1,
    batchName: 1,
    fileType: 1,
  });

  const perCourse: Record<string, any> = {};
  const perBatch: Record<string, any> = {};

  inventory.forEach((item: any) => {
    const courseKey = item.courseId || item.courseName || "unmapped-course";
    const batchKey = item.batchId || item.batchName || "unmapped-batch";

    if (!perCourse[courseKey]) {
      perCourse[courseKey] = {
        courseId: item.courseId || "",
        courseName: item.courseName || "Unmapped Course",
        counts: emptySummary(),
      };
    }

    if (!perBatch[batchKey]) {
      perBatch[batchKey] = {
        courseId: item.courseId || "",
        courseName: item.courseName || "Unmapped Course",
        batchId: item.batchId || "",
        batchName: item.batchName || "Unmapped Batch",
        counts: emptySummary(),
      };
    }

    if (perCourse[courseKey].counts[item.fileType] !== undefined) {
      perCourse[courseKey].counts[item.fileType] += 1;
    }

    if (perBatch[batchKey].counts[item.fileType] !== undefined) {
      perBatch[batchKey].counts[item.fileType] += 1;
    }
  });

  return {
    perCourse: Object.values(perCourse),
    perBatch: Object.values(perBatch),
  };
}

async function collectCandidates() {
  const [courses, batches] = await Promise.all([
    Course.find().sort({ createdAt: -1 }),
    Batch.find().sort({ createdAt: -1 }),
  ]);

  const candidates: MigrationCandidate[] = [];

  batches.forEach((batch: any) => {
    const course = findCourseForBatch(batch, courses);
    candidates.push(...collectBatchCandidates(batch, course));
    candidates.push(...collectCourseCandidates(batch, course));
  });

  return {
    courses,
    batches,
    candidates,
  };
}

async function runMigration({ dryRun }: { dryRun: boolean }) {
  const { courses, batches, candidates } = await collectCandidates();
  const migrated: MigrationCandidate[] = [];
  const skipped: MigrationCandidate[] = [];

  for (const candidate of candidates) {
    const existing = await existingInventory(candidate);

    if (existing) {
      skipped.push(candidate);
      continue;
    }

    migrated.push(candidate);

    if (!dryRun) {
      await ContentInventory.create(candidate);
    }
  }

  const verification = await buildVerification();

  return {
    dryRun,
    scanned: {
      courses: courses.length,
      batches: batches.length,
      candidates: candidates.length,
    },
    migrated: migrated.length,
    skippedDuplicates: skipped.length,
    verification,
  };
}

function authFromSearchParams(searchParams: URLSearchParams) {
  return {
    userId: searchParams.get("userId") || "",
    sessionToken: searchParams.get("sessionToken") || "",
    deviceId: searchParams.get("deviceId") || "",
  };
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const auth = authFromSearchParams(searchParams);
    const admin = await verifyAdmin(auth.userId, auth.sessionToken, auth.deviceId);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const { courses, batches, candidates } = await collectCandidates();
    const verification = await buildVerification();

    return NextResponse.json({
      success: true,
      scanned: {
        courses: courses.length,
        batches: batches.length,
        candidates: candidates.length,
      },
      verification,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to verify content inventory migration.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const auth = authFromSearchParams(searchParams);
    const admin = await verifyAdmin(auth.userId, auth.sessionToken, auth.deviceId);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const dryRun = searchParams.get("dryRun") === "1";
    const result = await runMigration({ dryRun });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to migrate legacy content.",
      },
      { status: 500 }
    );
  }
}