import { NextResponse } from "next/server";
import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { fetchSharePointFile } from "@/lib/sharepoint";
import {
  contentTypeFromName,
  findAuthorizedCourse,
  protectedContentResponseHeaders,
  safeContentFilename,
  verifyCourseEnrollment,
  verifySharePointItemAuthorized,
} from "@/lib/auth/protectedContentAccess";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

function safeFilename(value: string) {
  return (
    decodeURIComponent(value || "course-file")
      .split(/[/\\]/)
      .pop()
      ?.split("?")[0]
      ?.replace(/[^a-zA-Z0-9._-]/g, "_") || "course-file"
  );
}

/** Tenant-scoped SharePoint file proxy with object-level authorization. */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const driveId = searchParams.get("driveId") || "";
    const itemId = searchParams.get("itemId") || "";
    const name = safeFilename(searchParams.get("name") || "");
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const courseId = searchParams.get("courseId") || "";
    const batchId = searchParams.get("batchId") || "";

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this SharePoint content." },
        { status: 403 }
      );
    }

    if (!driveId || !itemId) {
      return NextResponse.json(
        { success: false, message: "SharePoint file reference is missing" },
        { status: 400 }
      );
    }

    if (!batchId && !courseId) {
      return NextResponse.json(
        { success: false, message: "Content scope is required." },
        { status: 400 }
      );
    }

    if (batchId) {
      const { findAuthorizedBatch, verifyBatchEnrollment } = await import(
        "@/lib/auth/protectedContentAccess"
      );
      const batch = await findAuthorizedBatch(batchId);
      if (!batch || !(await verifyBatchEnrollment(user, batch))) {
        return NextResponse.json(
          { success: false, message: "You do not have access to this SharePoint content." },
          { status: 403 }
        );
      }
    } else if (courseId) {
      const course = await findAuthorizedCourse(courseId);
      if (!course || !(await verifyCourseEnrollment(user, course))) {
        return NextResponse.json(
          { success: false, message: "You do not have access to this SharePoint content." },
          { status: 403 }
        );
      }
    }

    const authorized = await verifySharePointItemAuthorized({
      driveId,
      itemId,
      batchId: batchId || undefined,
      courseId: courseId || undefined,
    });

    if (!authorized && user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "You do not have access to this SharePoint content." },
        { status: 403 }
      );
    }

    const fileRes = await fetchSharePointFile(driveId, itemId, req.headers.get("range"));

    if (!fileRes.ok && fileRes.status !== 206) {
      return NextResponse.json(
        {
          success: false,
          message: "SharePoint file could not be opened",
          status: fileRes.status,
        },
        { status: fileRes.status === 404 ? 404 : 502 }
      );
    }

    const contentType = contentTypeFromName(name, fileRes.headers.get("content-type"));
    const headers = protectedContentResponseHeaders(name, contentType);
    const length = fileRes.headers.get("content-length");
    const range = fileRes.headers.get("content-range");
    if (length) headers["Content-Length"] = length;
    if (range) headers["Content-Range"] = range;

    return new NextResponse(fileRes.body, {
      status: fileRes.status,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "SharePoint file failed" },
      { status: 500 }
    );
  }
});
