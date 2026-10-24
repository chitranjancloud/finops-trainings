import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { buildBatchContentProxyUrl } from "@/lib/auth/protectedContentUrls";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import Batch from "@/models/Batch";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function resolveBatchMaterialSharePointIds(material: { url?: string }) {
  const rawUrl = String(material.url || "").trim();
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

/** Authorized temporary SharePoint URL for legacy batch.materials (no byte proxy). */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const batchId = searchParams.get("batchId") || "";
    const materialId = searchParams.get("materialId") || "";

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!batchId.trim() || !materialId.trim()) {
      return NextResponse.json(
        { success: false, message: "batchId and materialId are required." },
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

    const material = (batch.materials || []).find(
      (item: any) => String(item._id) === materialId
    );

    if (!material || material.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Content not found or not available." },
        { status: 404 }
      );
    }

    const sharePointIds = resolveBatchMaterialSharePointIds(material);
    if (!sharePointIds) {
      return NextResponse.json(
        {
          success: false,
          message: "This batch material is not stored in SharePoint.",
        },
        { status: 404 }
      );
    }

    const proxyUrl = buildBatchContentProxyUrl({
      batchId,
      materialId,
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
        message: error.message || "Failed to resolve batch content URL.",
      },
      { status: 500 }
    );
  }
});
