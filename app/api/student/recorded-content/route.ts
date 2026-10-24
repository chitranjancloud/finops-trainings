import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import {
  contentTypeFromName,
  findAuthorizedCourse,
  protectedContentResponseHeaders,
  safeContentFilename,
  verifyCourseEnrollment,
  verifySharePointItemAuthorized,
  viewableKindFromName,
} from "@/lib/auth/protectedContentAccess";
import { serveInWebsitePreviewHtml } from "@/lib/contentPreview";
import { connectDB } from "@/lib/mongodb";
import { fetchSharePointFile } from "@/lib/sharepoint";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

/** Authorized byte proxy for recorded course resources (videos, PDFs, materials). */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const courseId = searchParams.get("courseId") || "";
    const resourceType = (searchParams.get("resourceType") || "material").trim();
    const resourceIndex = Number.parseInt(searchParams.get("resourceIndex") || "", 10);

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!courseId.trim() || !Number.isInteger(resourceIndex) || resourceIndex < 0) {
      return NextResponse.json(
        { success: false, message: "courseId and resourceIndex are required." },
        { status: 400 }
      );
    }

    const course = await findAuthorizedCourse(courseId);
    if (!course || !(await verifyCourseEnrollment(user, course))) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this content." },
        { status: 403 }
      );
    }

    let resources: any[] = [];
    if (resourceType === "video") {
      resources = Array.isArray(course.videos)
        ? course.videos.filter((item: any) => item?.url || item?.webUrl)
        : course.videoUrl
          ? [{ name: "Course Video", url: course.videoUrl }]
          : [];
    } else if (resourceType === "pdf") {
      resources = Array.isArray(course.pdfs)
        ? course.pdfs.filter((item: any) => item?.url || item?.webUrl)
        : course.pdfUrl
          ? [{ name: "Course PDF", url: course.pdfUrl }]
          : [];
    } else {
      resources = Array.isArray(course.materials)
        ? course.materials.filter((item: any) => item?.url || item?.webUrl)
        : course.materialUrl
          ? [{ name: course.materialTitle || "Study Material", url: course.materialUrl }]
          : [];
    }

    const resource = resources[resourceIndex];
    if (!resource) {
      return NextResponse.json(
        { success: false, message: "Recorded resource not found." },
        { status: 404 }
      );
    }

    const rawUrl = String(resource.url || resource.webUrl || "").trim();
    const driveIdMatch = rawUrl.match(/[?&]driveId=([^&]+)/);
    const itemIdMatch = rawUrl.match(/[?&]itemId=([^&]+)/);
    const driveId = driveIdMatch ? decodeURIComponent(driveIdMatch[1]) : "";
    const itemId = itemIdMatch ? decodeURIComponent(itemIdMatch[1]) : "";

    if (!driveId || !itemId) {
      return NextResponse.json(
        { success: false, message: "Content reference is not available." },
        { status: 404 }
      );
    }

    const authorized = await verifySharePointItemAuthorized({
      driveId,
      itemId,
      courseId,
    });
    if (!authorized) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this content." },
        { status: 403 }
      );
    }

    const filename = safeContentFilename(resource.name || "content");
    const previewMode = (searchParams.get("preview") || "").toLowerCase();
    if (previewMode === "html") {
      const proxyUrl = new URL(req.url);
      proxyUrl.searchParams.delete("preview");
      const kind = viewableKindFromName(filename);
      const fallbackProxyPath =
        kind === "pdf" || kind === "image"
          ? `${proxyUrl.pathname}${proxyUrl.search}`
          : "";

      return serveInWebsitePreviewHtml({
        filename,
        driveId,
        itemId,
        fallbackProxyPath,
        req,
      });
    }

    const fileRes = await fetchSharePointFile(driveId, itemId, req.headers.get("range"));
    if (!fileRes.ok && fileRes.status !== 206) {
      return NextResponse.json(
        { success: false, message: "Content could not be loaded.", status: fileRes.status },
        { status: fileRes.status === 404 ? 404 : 502 }
      );
    }

    const contentType = contentTypeFromName(filename, fileRes.headers.get("content-type"));
    if (
      resourceType !== "video" &&
      resourceType !== "pdf" &&
      viewableKindFromName(filename, contentType) === "office"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This file can only be viewed on the website.",
        },
        { status: 403 }
      );
    }
    const headers = protectedContentResponseHeaders(filename, contentType);
    const length = fileRes.headers.get("content-length");
    const range = fileRes.headers.get("content-range");
    if (length) headers["Content-Length"] = length;
    if (range) headers["Content-Range"] = range;

    return new NextResponse(fileRes.body, { status: fileRes.status, headers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load content." },
      { status: 500 }
    );
  }
});
