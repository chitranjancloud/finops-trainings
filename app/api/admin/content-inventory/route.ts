import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { buildStructuredSharePointFolderPath, normalizeContentCategory } from "@/lib/sharepoint";
import ContentInventory from "@/models/ContentInventory";
import User from "@/models/User";

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

function normalizeFileName(value: string) {
  const parsed = value.split(/[\\/]/).pop() || "";

  return parsed.replace(/[^a-zA-Z0-9._-]/g, "-").trim().toLowerCase();
}

function buildFolderPath({
  courseName,
  batchName,
  fileType,
}: {
  courseName: string;
  batchName: string;
  fileType: string;
}) {
  return (
    buildStructuredSharePointFolderPath({
      courseName,
      batchName,
      category: fileType,
    }) || ""
  );
}

async function findDuplicateInventory({
  courseId,
  batchId,
  fileType,
  fileName,
  sharePointItemId = "",
  folderPath = "",
}: {
  courseId: string;
  batchId: string;
  fileType: string;
  fileName: string;
  sharePointItemId?: string;
  folderPath?: string;
}) {
  const normalizedFileName = normalizeFileName(fileName);
  const checks: Record<string, unknown>[] = [];

  if (normalizedFileName) {
    checks.push({
      ...(courseId ? { courseId } : {}),
      ...(batchId ? { batchId } : {}),
      ...(fileType ? { fileType } : {}),
      normalizedFileName,
    });
  }

  if (folderPath && normalizedFileName) {
    checks.push({
      folderPath,
      normalizedFileName,
    });
  }

  if (sharePointItemId) {
    checks.push({
      sharePointItemId,
    });
  }

  if (!checks.length) return null;

  return ContentInventory.findOne({ $or: checks }).sort({ createdAt: -1 });
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const courseId = (searchParams.get("courseId") || "").trim();
    const batchId = (searchParams.get("batchId") || "").trim();
    const fileType = normalizeContentCategory(searchParams.get("fileType") || "");
    const fileName = (searchParams.get("fileName") || "").trim();
    const sharePointItemId = (searchParams.get("sharePointItemId") || "").trim();

    const query: Record<string, string> = {};

    if (courseId) query.courseId = courseId;
    if (batchId) query.batchId = batchId;
    if (fileType) query.fileType = fileType;

    const inventory = await ContentInventory.find(query).sort({
      uploadedAt: -1,
      createdAt: -1,
    });

    const duplicateChecks: Record<string, unknown>[] = [];
    const normalizedFileName = normalizeFileName(fileName);

    if (normalizedFileName) {
      duplicateChecks.push({
        ...(courseId ? { courseId } : {}),
        ...(batchId ? { batchId } : {}),
        ...(fileType ? { fileType } : {}),
        normalizedFileName,
      });
    }

    if (sharePointItemId) {
      duplicateChecks.push({
        sharePointItemId,
      });
    }

    const duplicateItems = duplicateChecks.length
      ? await ContentInventory.find({ $or: duplicateChecks }).sort({
          uploadedAt: -1,
          createdAt: -1,
        })
      : [];

    const duplicateBy = new Set<string>();

    duplicateItems.forEach((item: any) => {
      if (normalizedFileName && item.normalizedFileName === normalizedFileName) {
        duplicateBy.add("file-name");
      }

      if (sharePointItemId && item.sharePointItemId === sharePointItemId) {
        duplicateBy.add("sharepoint-item-id");
      }
    });

    return NextResponse.json({
      success: true,
      inventory,
      duplicate: duplicateItems.length > 0,
      duplicateBy: Array.from(duplicateBy),
      duplicateItems,
    });
  } catch (error: any) {
    console.log("ADMIN CONTENT INVENTORY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load content inventory",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await verifyAdmin(
      String(body.userId || ""),
      String(body.sessionToken || ""),
      String(body.deviceId || "")
    );

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const courseId = String(body.courseId || "").trim();
    const courseName = String(body.courseName || "").trim();
    const batchId = String(body.batchId || "").trim();
    const batchName = String(body.batchName || "").trim();
    const fileType = normalizeContentCategory(String(body.fileType || ""));
    const fileName = String(body.fileName || "").trim();
    const sharePointItemId = String(body.sharePointItemId || "").trim();
    const sharePointDriveId = String(body.sharePointDriveId || "").trim();
    const url = String(body.url || "").trim();
    const webUrl = String(body.webUrl || "").trim();
    const replaceExisting = body.replaceExisting === true;

    if (!courseId || !batchId || !fileType || !fileName || !sharePointItemId || !url) {
      return NextResponse.json(
        {
          success: false,
          message:
            "courseId, batchId, fileType, fileName, sharePointItemId, and url are required.",
        },
        {
          status: 400,
        }
      );
    }

    const folderPath =
      String(body.folderPath || "").trim() ||
      buildFolderPath({
        courseName,
        batchName,
        fileType,
      });

    if (!folderPath) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not resolve SharePoint folder path for this batch content.",
        },
        {
          status: 400,
        }
      );
    }

    const existing = await findDuplicateInventory({
      courseId,
      batchId,
      fileType,
      fileName,
      sharePointItemId,
      folderPath,
    });

    if (existing && !replaceExisting) {
      return NextResponse.json(
        {
          success: false,
          duplicate: true,
          duplicateBy: ["file-name", "sharepoint-item-id"].filter((key) => {
            if (key === "file-name") {
              return existing.normalizedFileName === normalizeFileName(fileName);
            }
            return existing.sharePointItemId === sharePointItemId;
          }),
          duplicateItems: [existing],
          message: "This SharePoint file is already registered for this batch.",
        },
        {
          status: 409,
        }
      );
    }

    const payload = {
      courseId,
      courseName,
      batchId,
      batchName,
      fileType,
      fileName,
      normalizedFileName: normalizeFileName(fileName),
      folderPath,
      sharePointItemId,
      sharePointDriveId,
      url,
      webUrl,
      uploadedAt: new Date(),
    };

    const inventory = existing
      ? await ContentInventory.findByIdAndUpdate(existing._id, payload, { new: true })
      : await ContentInventory.create(payload);

    return NextResponse.json({
      success: true,
      inventory,
      duplicate: Boolean(existing),
      replaced: Boolean(existing),
    });
  } catch (error: any) {
    console.log("ADMIN CONTENT INVENTORY POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to register content inventory item",
      },
      {
        status: 500,
      }
    );
  }
}
