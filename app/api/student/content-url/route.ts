import { NextResponse } from "next/server";

import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { buildBatchContentProxyUrl } from "@/lib/auth/protectedContentUrls";
import { connectDB } from "@/lib/mongodb";
import {
  stampTenantId,
  withTenantContext,
  withTenantScope,
} from "@/lib/platform/runtime";
import Batch from "@/models/Batch";
import ContentAccessLog from "@/models/ContentAccessLog";
import ContentInventory from "@/models/ContentInventory";
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

function resolveInventorySharePointIds(inventory: {
  sharePointDriveId?: string;
  sharePointItemId?: string;
  url?: string;
}) {
  let driveId = String(inventory.sharePointDriveId || "").trim();
  let itemId = String(inventory.sharePointItemId || "").trim();

  if (!driveId || !itemId) {
    const rawUrl = String(inventory.url || "").trim();
    if (rawUrl) {
      driveId = extractSharePointParam(rawUrl, "driveId");
      itemId = extractSharePointParam(rawUrl, "itemId");
    }
  }

  if (!driveId || !itemId) return null;
  return { driveId, itemId };
}

async function logAccess(opts: {
  user: any;
  batch: any;
  inventory: any;
  action: string;
  req: Request;
}) {
  try {
    const ip =
      opts.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      opts.req.headers.get("x-real-ip") ||
      "unknown";

    await ContentAccessLog.create(
      stampTenantId({
        userId: String(opts.user._id),
        name: opts.user.name,
        email: opts.user.email,
        batchId: String(opts.batch._id),
        batchName: opts.batch.name,
        materialId: String(opts.inventory._id || ""),
        materialName: opts.inventory.fileName || "",
        materialType:
          opts.inventory.fileType === "study-material"
            ? "material"
            : opts.inventory.fileType || "material",
        action: opts.action,
        deviceId: opts.user.activeDevice || "",
        ipAddress: ip,
        userAgent: (opts.req.headers.get("user-agent") || "").slice(0, 400),
        accessedAt: new Date(),
      })
    );
  } catch {
    // non-blocking
  }
}

/** Authorized temporary SharePoint URL for ContentInventory items (no byte proxy). */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const sessionToken = searchParams.get("sessionToken") || "";
    const deviceId = searchParams.get("deviceId") || "";
    const batchId = searchParams.get("batchId") || "";
    const inventoryId = searchParams.get("inventoryId") || "";

    const user = await verifyTenantSession(userId, sessionToken, deviceId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!batchId.trim() || !inventoryId.trim()) {
      return NextResponse.json(
        { success: false, message: "batchId and inventoryId are required." },
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

    const inventoryItem = await ContentInventory.findOne(
      withTenantScope({
        _id: inventoryId,
        batchId: String(batch._id),
      })
    );

    if (!inventoryItem) {
      return NextResponse.json(
        { success: false, message: "Content not found or not available." },
        { status: 404 }
      );
    }

    const sharePointIds = resolveInventorySharePointIds(inventoryItem);
    if (!sharePointIds) {
      return NextResponse.json(
        {
          success: false,
          message: "This content is not stored in SharePoint.",
        },
        { status: 404 }
      );
    }

    const fileType = String(inventoryItem.fileType || "");
    const action = fileType === "video" ? "play" : fileType === "pdf" ? "view" : "open";
    await logAccess({ user, batch, inventory: inventoryItem, action, req });

    const proxyUrl = buildBatchContentProxyUrl({
      batchId,
      inventoryId,
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
        message: error.message || "Failed to resolve content URL.",
      },
      { status: 500 }
    );
  }
});
