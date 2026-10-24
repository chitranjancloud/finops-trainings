import { withTenantScope } from "@/lib/platform/runtime";
import Batch from "@/models/Batch";
import ContentInventory from "@/models/ContentInventory";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

export function resolveSharePointIdsFromUrl(rawUrl: string) {
  const url = String(rawUrl || "").trim();
  if (!url.startsWith("/api/sharepoint-file")) return null;

  const driveId = extractSharePointParam(url, "driveId");
  const itemId = extractSharePointParam(url, "itemId");
  if (!driveId || !itemId) return null;
  return { driveId, itemId };
}

export async function verifyBatchEnrollment(user: any, batch: any) {
  return Enrollment.findOne(
    withTenantScope({
      batchBlocked: { $ne: true },
      $or: [
        { userId: String(user._id), batchId: String(batch._id) },
        { userId: String(user._id), batchName: batch.name },
        { email: user.email, batchId: String(batch._id) },
        { email: user.email, batchName: batch.name },
      ],
    })
  );
}

export async function findAuthorizedBatch(batchId: string) {
  const batch = await Batch.findOne(withTenantScope({ _id: batchId }));
  if (!batch || batch.isActive === false) return null;
  return batch;
}

export async function findAuthorizedCourse(courseId: string) {
  return (
    (await Course.findOne(withTenantScope({ slug: courseId }))) ||
    (await Course.findOne(withTenantScope({ _id: courseId })).catch(() => null)) ||
    (await Course.findOne(withTenantScope({ title: courseId })))
  );
}

export async function verifyCourseEnrollment(user: any, course: any) {
  if (user.role === "admin") return true;

  const enrollment = await Enrollment.findOne(
    withTenantScope({
      batchBlocked: { $ne: true },
      $or: [
        { userId: String(user._id), courseId: course.slug },
        { userId: String(user._id), courseId: String(course._id) },
        { userId: String(user._id), courseName: course.title },
        { email: user.email, courseId: course.slug },
        { email: user.email, courseId: String(course._id) },
        { email: user.email, courseName: course.title },
      ],
    })
  );

  return Boolean(enrollment);
}

function sharePointIdsMatch(
  storedUrl: string,
  driveId: string,
  itemId: string
) {
  const ids = resolveSharePointIdsFromUrl(storedUrl);
  return Boolean(ids && ids.driveId === driveId && ids.itemId === itemId);
}

export async function verifySharePointItemAuthorized(opts: {
  driveId: string;
  itemId: string;
  batchId?: string;
  courseId?: string;
}) {
  const { driveId, itemId, batchId, courseId } = opts;

  if (batchId) {
    const batch = await findAuthorizedBatch(batchId);
    if (!batch) return false;

    for (const material of batch.materials || []) {
      if (sharePointIdsMatch(String(material.url || ""), driveId, itemId)) {
        return true;
      }
    }

    for (const resource of [...(batch.tests || []), ...(batch.assignments || [])]) {
      if (sharePointIdsMatch(String(resource.fileUrl || ""), driveId, itemId)) {
        return true;
      }
      if (sharePointIdsMatch(String(resource.answerSheetUrl || ""), driveId, itemId)) {
        return true;
      }
    }

    const inventoryItems = await ContentInventory.find(
      withTenantScope({ batchId: String(batch._id) })
    ).lean();
    for (const item of inventoryItems) {
      const url = String(item.url || "");
      if (sharePointIdsMatch(url, driveId, itemId)) return true;
      if (
        String(item.sharePointDriveId || "") === driveId &&
        String(item.sharePointItemId || "") === itemId
      ) {
        return true;
      }
    }
  }

  if (courseId) {
    const course = await findAuthorizedCourse(courseId);
    if (!course) return false;

    const resourceLists = [
      ...(Array.isArray(course.videos) ? course.videos : []),
      ...(Array.isArray(course.pdfs) ? course.pdfs : []),
      ...(Array.isArray(course.materials) ? course.materials : []),
    ];
    if (course.videoUrl) {
      resourceLists.push({ url: course.videoUrl });
    }
    if (course.pdfUrl) {
      resourceLists.push({ url: course.pdfUrl });
    }
    if (course.materialUrl) {
      resourceLists.push({ url: course.materialUrl });
    }

    for (const resource of resourceLists) {
      if (sharePointIdsMatch(String(resource?.url || resource?.webUrl || ""), driveId, itemId)) {
        return true;
      }
    }
  }

  return false;
}

export function contentTypeFromName(name: string, fallback: string | null) {
  if (fallback && fallback !== "application/octet-stream") return fallback;
  const lower = name.toLowerCase();
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (lower.endsWith(".pptx"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  if (lower.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

export type ViewableContentKind =
  | "video"
  | "pdf"
  | "image"
  | "office"
  | "text"
  | "unknown";

export function viewableKindFromName(
  name: string,
  mime?: string | null
): ViewableContentKind {
  const lower = String(name || "").toLowerCase();
  const type = String(mime || "").toLowerCase();

  if (type.startsWith("video/") || /\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) {
    return "video";
  }
  if (type === "application/pdf" || /\.pdf(\?|$)/.test(lower)) return "pdf";
  if (
    type.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(lower)
  ) {
    return "image";
  }
  if (
    type.startsWith("text/") ||
    /\.(txt|md|csv)(\?|$)/.test(lower)
  ) {
    return "text";
  }
  if (
    type.includes("officedocument") ||
    type.includes("msword") ||
    type.includes("ms-excel") ||
    type.includes("ms-powerpoint") ||
    /\.(docx?|pptx?|xlsx?|odt|ods|odp|rtf)(\?|$)/.test(lower)
  ) {
    return "office";
  }
  return "unknown";
}

export function safeContentFilename(name: string) {
  return (name || "content").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function protectedContentResponseHeaders(
  filename: string,
  contentType: string,
  extra: Record<string, string> = {}
): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "private, no-store, no-cache, must-revalidate",
    "X-Content-Type-Options": "nosniff",
    "X-Download-Options": "noopen",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
    "Accept-Ranges": "bytes",
    ...extra,
  };
}
