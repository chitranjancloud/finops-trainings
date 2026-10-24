import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { buildBatchContentProxyUrl } from "@/lib/auth/protectedContentUrls";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";

const RESOURCE_TYPES = ["test", "assignment"] as const;
const FILE_KINDS = ["question", "answerSheet"] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];
type FileKind = (typeof FILE_KINDS)[number];

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function resolveAssessmentSharePointIds(storedUrl: string) {
  const rawUrl = String(storedUrl || "").trim();
  if (!rawUrl.startsWith("/api/sharepoint-file")) return null;

  const driveId = extractSharePointParam(rawUrl, "driveId");
  const itemId = extractSharePointParam(rawUrl, "itemId");
  if (!driveId || !itemId) return null;

  return { driveId, itemId };
}

async function verifyBatchAccess(user: any, batch: any) {
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

function findAssessmentResource(batch: any, resourceId: string, resourceType: ResourceType) {
  const list =
    resourceType === "assignment" ? batch.assignments || [] : batch.tests || [];
  return list.find((item: any) => String(item._id) === resourceId);
}

/** Authorized temporary SharePoint URL for batch tests/assignments (no byte proxy). */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const batchId = searchParams.get("batchId") || "";
    const resourceId = searchParams.get("resourceId") || "";
    const resourceType = (searchParams.get("resourceType") || "").trim() as ResourceType;
    const fileKind = (searchParams.get("fileKind") || "").trim() as FileKind;

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!batchId.trim() || !resourceId.trim()) {
      return NextResponse.json(
        { success: false, message: "batchId and resourceId are required." },
        { status: 400 }
      );
    }

    if (!RESOURCE_TYPES.includes(resourceType)) {
      return NextResponse.json(
        { success: false, message: "A valid resourceType is required." },
        { status: 400 }
      );
    }

    if (!FILE_KINDS.includes(fileKind)) {
      return NextResponse.json(
        { success: false, message: "A valid fileKind is required." },
        { status: 400 }
      );
    }

    const batch = await Batch.findOne(withTenantScope({ _id: batchId }));
    if (!batch || batch.isActive === false || !(await verifyBatchAccess(user, batch))) {
      return NextResponse.json(
        { success: false, message: "You do not have access to this content." },
        { status: 403 }
      );
    }

    const resource = findAssessmentResource(batch, resourceId, resourceType);
    if (!resource || resource.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Assessment not found or not available." },
        { status: 404 }
      );
    }

    const storedUrl =
      fileKind === "answerSheet"
        ? String(resource.answerSheetUrl || "").trim()
        : String(resource.fileUrl || "").trim();

    if (!storedUrl) {
      return NextResponse.json(
        { success: false, message: "Assessment file is not available." },
        { status: 404 }
      );
    }

    const sharePointIds = resolveAssessmentSharePointIds(storedUrl);
    if (!sharePointIds) {
      return NextResponse.json(
        {
          success: false,
          message: "This assessment file is not stored in SharePoint.",
        },
        { status: 404 }
      );
    }

    const proxyUrl = buildBatchContentProxyUrl({
      batchId,
      userId,
      sessionToken,
      deviceId,
      resourceId,
      resourceType,
      fileKind,
    });

    return NextResponse.json({
      success: true,
      url: proxyUrl,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to resolve assessment content URL.",
      },
      { status: 500 }
    );
  }
});
