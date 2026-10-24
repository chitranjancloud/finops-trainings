import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { buildRecordedContentProxyUrl } from "@/lib/auth/protectedContentUrls";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";

const RECORDED_RESOURCE_TYPES = ["video", "pdf", "material"] as const;
type RecordedResourceType = (typeof RECORDED_RESOURCE_TYPES)[number];

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function normalizeCourseResourceList(course: any, resourceType: RecordedResourceType) {
  if (resourceType === "video") {
    const list = Array.isArray(course.videos)
      ? course.videos.filter((item: any) => item?.url || item?.webUrl)
      : [];
    if (list.length > 0) return list;
    return course.videoUrl
      ? [{ name: "Course Video", url: course.videoUrl, webUrl: course.videoUrl }]
      : [];
  }

  if (resourceType === "pdf") {
    const list = Array.isArray(course.pdfs)
      ? course.pdfs.filter((item: any) => item?.url || item?.webUrl)
      : [];
    if (list.length > 0) return list;
    return course.pdfUrl
      ? [{ name: "Course PDF", url: course.pdfUrl, webUrl: course.pdfUrl }]
      : [];
  }

  const list = Array.isArray(course.materials)
    ? course.materials.filter((item: any) => item?.url || item?.webUrl)
    : [];
  if (list.length > 0) return list;
  return course.materialUrl
    ? [
        {
          name: course.materialTitle || "Study Material",
          url: course.materialUrl,
          webUrl: course.materialUrl,
        },
      ]
    : [];
}

function resolveSharePointIdsFromResource(resource: { url?: string }) {
  const rawUrl = String(resource.url || "").trim();
  if (!rawUrl.startsWith("/api/sharepoint-file")) return null;

  const driveId = extractSharePointParam(rawUrl, "driveId");
  const itemId = extractSharePointParam(rawUrl, "itemId");
  if (!driveId || !itemId) return null;

  return { driveId, itemId };
}

async function findCourse(courseId: string) {
  return (
    (await Course.findOne(withTenantScope({ slug: courseId }))) ||
    (await Course.findOne(withTenantScope({ _id: courseId })).catch(() => null)) ||
    (await Course.findOne(withTenantScope({ title: courseId })))
  );
}

async function verifyCourseAccess({
  userId,
  sessionToken,
  deviceId,
  courseId,
}: {
  userId: string;
  sessionToken: string;
  deviceId: string;
  courseId: string;
}) {
  const user = await verifyTenantSession(userId, sessionToken, deviceId);
  if (!user) return { ok: false as const, status: 401, message: "Session expired. Please log in again." };

  if (user.role === "admin") {
    const course = await findCourse(courseId);
    if (!course) {
      return { ok: false as const, status: 404, message: "Course not found." };
    }
    return { ok: true as const, user, course };
  }

  if (!courseId) {
    return { ok: false as const, status: 400, message: "courseId is required." };
  }

  const course = await findCourse(courseId);
  if (!course) {
    return { ok: false as const, status: 404, message: "Course not found." };
  }

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

  if (!enrollment) {
    return {
      ok: false as const,
      status: 403,
      message: "You do not have access to this recorded course content.",
    };
  }

  return { ok: true as const, user, course };
}

/** Authorized temporary SharePoint URL for recorded course resources (no byte proxy). */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const courseId = searchParams.get("courseId") || "";
    const resourceType = (searchParams.get("resourceType") || "").trim() as RecordedResourceType;
    const resourceIndex = Number.parseInt(searchParams.get("resourceIndex") || "", 10);

    if (!courseId.trim()) {
      return NextResponse.json(
        { success: false, message: "courseId is required." },
        { status: 400 }
      );
    }

    if (!RECORDED_RESOURCE_TYPES.includes(resourceType)) {
      return NextResponse.json(
        { success: false, message: "A valid resourceType is required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(resourceIndex) || resourceIndex < 0) {
      return NextResponse.json(
        { success: false, message: "A valid resourceIndex is required." },
        { status: 400 }
      );
    }

    const access = await verifyCourseAccess({ userId, sessionToken, deviceId, courseId });
    if (!access.ok) {
      return NextResponse.json(
        { success: false, message: access.message },
        { status: access.status }
      );
    }

    const resources = normalizeCourseResourceList(access.course, resourceType);
    const resource = resources[resourceIndex];
    if (!resource) {
      return NextResponse.json(
        { success: false, message: "Recorded resource not found." },
        { status: 404 }
      );
    }

    const sharePointIds = resolveSharePointIdsFromResource(resource);
    if (!sharePointIds) {
      return NextResponse.json(
        {
          success: false,
          message: "This recorded resource is not stored in SharePoint.",
        },
        { status: 404 }
      );
    }

    const proxyUrl = buildRecordedContentProxyUrl({
      courseId,
      resourceType,
      resourceIndex,
      userId,
      sessionToken,
      deviceId,
    });

    return NextResponse.json({
      success: true,
      url: proxyUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to resolve recorded content URL.",
      },
      { status: 500 }
    );
  }
});
