import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import ContentInventory from "@/models/ContentInventory";
import {
  buildStructuredSharePointFolderPath,
  isSharePointConfigured,
  normalizeContentCategory,
  uploadFileToSharePoint,
} from "@/lib/sharepoint";

export const runtime = "nodejs";

function getCloudinaryConfig() {
  const cloudinaryUrl = process.env.CLOUDINARY_URL || "";

  if (cloudinaryUrl.startsWith("cloudinary://")) {
    const parsed = new URL(cloudinaryUrl);

    return {
      cloudName: parsed.hostname,
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
    };
  }

  return {
    cloudName:
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
      "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  };
}

function sanitizePathPart(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .join("/");
}

function sanitizeFilename(value: string) {
  const fallback = "course-file";
  const parsed = value.split(/[\\/]/).pop() || fallback;
  const safe = parsed.replace(/[^a-zA-Z0-9._-]/g, "-");

  return safe || fallback;
}

function normalizeFileName(value: string) {
  return sanitizeFilename(value).toLowerCase();
}

function getStructuredFolder(formData: FormData) {
  const courseName = String(formData.get("courseName") || "").trim();
  const batchName = String(formData.get("batchName") || "").trim();
  const category = String(
    formData.get("contentCategory") || formData.get("fileType") || ""
  ).trim();

  return buildStructuredSharePointFolderPath({
    courseName,
    batchName,
    category,
  });
}

async function findDuplicateInventory({
  folderPath,
  fileName,
  sharePointItemId = "",
}: {
  folderPath: string;
  fileName: string;
  sharePointItemId?: string;
}) {
  const normalizedFileName = normalizeFileName(fileName);
  const checks: any[] = [];

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

  await connectDB();
  return ContentInventory.findOne({ $or: checks }).sort({ createdAt: -1 });
}

async function recordContentInventory({
  formData,
  file,
  folderPath,
  uploaded,
}: {
  formData: FormData;
  file: File;
  folderPath: string;
  uploaded: any;
}) {
  const fileType = normalizeContentCategory(
    String(formData.get("contentCategory") || formData.get("fileType") || "")
  );

  if (!fileType || !folderPath) return null;

  await connectDB();

  const existing = await findDuplicateInventory({
    folderPath,
    fileName: file.name,
    sharePointItemId: uploaded.itemId || "",
  });

  const payload = {
    courseId: String(formData.get("courseId") || "").trim(),
    courseName: String(formData.get("courseName") || "").trim(),
    batchId: String(formData.get("batchId") || "").trim(),
    batchName: String(formData.get("batchName") || "").trim(),
    fileType,
    fileName: uploaded.name || file.name,
    normalizedFileName: normalizeFileName(file.name),
    folderPath,
    sharePointItemId: uploaded.itemId || "",
    sharePointDriveId: uploaded.driveId || "",
    url: uploaded.url || "",
    webUrl: uploaded.webUrl || "",
    uploadedAt: new Date(),
  };

  if (existing) {
    return ContentInventory.findByIdAndUpdate(existing._id, payload, {
      new: true,
    });
  }

  return ContentInventory.create(payload);
}

async function savePublicUpload(file: File, folder: string) {
  const safeFolder = sanitizePathPart(folder || "finops/admin");
  const safeFilename = `${Date.now()}-${sanitizeFilename(file.name)}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
  const arrayBuffer = await file.arrayBuffer();

  await mkdir(uploadDir, {
    recursive: true,
  });

  await writeFile(
    path.join(uploadDir, safeFilename),
    Buffer.from(arrayBuffer)
  );

  return `/uploads/${safeFolder}/${safeFilename}`;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const requestedFolder = String(formData.get("folder") || "finops/admin");
    const structuredFolder = getStructuredFolder(formData);
    const folder = structuredFolder || requestedFolder;
    const inventoryEnabled = Boolean(
      normalizeContentCategory(
        String(formData.get("contentCategory") || formData.get("fileType") || "")
      )
    );

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "File is required",
        },
        {
          status: 400,
        }
      );
    }

    const isCourseStorage =
      folder.startsWith("finops/courses") ||
      folder.includes("courses/videos") ||
      folder.includes("courses/pdfs") ||
      folder.includes("courses/materials") ||
      Boolean(structuredFolder);

    if (isCourseStorage) {
      if (!isSharePointConfigured()) {
        return NextResponse.json(
          {
            success: false,
            message:
              "SharePoint course storage is missing. Add SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_DRIVE_ID or SHAREPOINT_SITE_ID.",
          },
          {
            status: 500,
          }
        );
      }

      const duplicateBeforeUpload = inventoryEnabled
        ? await findDuplicateInventory({
            folderPath: folder,
            fileName: file.name,
          })
        : null;
      const uploaded = await uploadFileToSharePoint(file, folder);
      const inventory = inventoryEnabled
        ? await recordContentInventory({
            formData,
            file,
            folderPath: folder,
            uploaded,
          })
        : null;

      return NextResponse.json({
        success: true,
        url: uploaded.url,
        publicId: uploaded.itemId,
        provider: "sharepoint",
        sharePoint: uploaded,
        inventory,
        duplicate: Boolean(duplicateBeforeUpload),
        duplicateReason: duplicateBeforeUpload ? "file-name" : "",
      });
    }

    const shouldStoreLocally =
      folder.includes("pdfs") ||
      folder.includes("materials") ||
      file.type === "application/pdf" ||
      file.type.includes("document") ||
      file.type.includes("spreadsheet") ||
      file.type.includes("presentation") ||
      file.type === "text/plain" ||
      file.type === "text/csv";

    if (shouldStoreLocally) {
      const localUrl = await savePublicUpload(file, folder);

      return NextResponse.json({
        success: true,
        url: localUrl,
        publicId: localUrl,
      });
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cloudinary credentials are missing. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET or CLOUDINARY_URL.",
        },
        {
          status: 500,
        }
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const signature = createHash("sha1")
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("folder", folder);
    uploadFormData.append("timestamp", String(timestamp));
    uploadFormData.append("api_key", apiKey);
    uploadFormData.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      {
        method: "POST",
        body: uploadFormData,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      return NextResponse.json(
        {
          success: false,
          message: uploadData.error?.message || "Cloudinary upload failed",
        },
        {
          status: uploadRes.status,
        }
      );
    }

    return NextResponse.json({
      success: true,
      url: uploadData.secure_url,
      publicId: uploadData.public_id,
    });
  } catch (error: any) {
    console.log("UPLOAD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Upload failed",
      },
      {
        status: 500,
      }
    );
  }
}