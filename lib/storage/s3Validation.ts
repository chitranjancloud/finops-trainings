import { S3_CATEGORIES, FILE_TYPES, allowedExtensions, type S3Category } from "./s3Types";
export class StorageError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const PART_SIZE = 16 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 10 * 1024 * 1024 * 1024;
export const MAX_PART_BATCH = 20;

export function objectId(value: unknown, label = "ID"): string {
  if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
    throw new StorageError(400, `Invalid ${label}.`);
  }
  return value;
}

export function contentDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new StorageError(400, "Select a valid lesson date (YYYY-MM-DD).");
  const date = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < "2000-01-01" || value > "2100-12-31") throw new StorageError(400, "Invalid lesson date.");
  return value;
}
export function categoryInput(value: unknown): S3Category {
  if (!S3_CATEGORIES.includes(value as S3Category)) throw new StorageError(400, "Invalid content category.");
  return value as S3Category;
}
export function uploadInput(body: Record<string, unknown>) {
  const filename = String(body.filename || "").trim();
  const category = categoryInput(body.category || "video");
  const extension = filename.split(".").pop()?.toLowerCase() || "";
  if (!filename || filename.length > 180 || /[/\\\x00-\x1f]/.test(filename) || !allowedExtensions(category).includes(extension)) throw new StorageError(400, "Choose a supported file for this category (filename up to 180 characters).");
  const mime = FILE_TYPES[extension];
  if (body.contentType && body.contentType !== mime && body.contentType !== "application/octet-stream") throw new StorageError(400, "File type does not match its extension.");
  const size = body.byteSize; const max = category === "video" ? MAX_VIDEO_BYTES : 500 * 1024 * 1024;
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < (category === "video" ? 32 : 1) || size > max) throw new StorageError(400, "File exceeds its category size limit (video 10 GiB, documents 500 MiB).");
  const idempotencyKey = String(body.idempotencyKey || "");
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(idempotencyKey)) throw new StorageError(400, "Invalid upload request key.");
  return { filename, byteSize: size, contentType: mime, category, contentDate: contentDate(body.contentDate || new Date().toISOString().slice(0, 10)),
    courseId: objectId(body.courseId, "course ID"), batchId: objectId(body.batchId, "batch ID"),
    replacesAssetId: body.replacesAssetId ? objectId(body.replacesAssetId, "replacement asset ID") : "", idempotencyKey, partCount: Math.ceil(size / PART_SIZE) };
}
export function validFileHeader(bytes: Uint8Array, mime: string): boolean {
  const begins = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  if (mime === "video/mp4") return isMp4Header(bytes);
  if (mime === "application/pdf") return begins(37, 80, 68, 70, 45);
  if (mime === "image/png") return begins(137, 80, 78, 71, 13, 10, 26, 10);
  if (mime === "image/jpeg") return begins(255, 216, 255);
  if (mime === "application/zip" || mime.includes("openxmlformats")) return begins(80, 75, 3, 4) || begins(80, 75, 5, 6);
  if (["text/plain", "text/csv"].includes(mime)) return bytes.length > 0 && !bytes.includes(0) && !/^\s*<(?:!doctype|html|script|svg)/i.test(new TextDecoder().decode(bytes));
  return false;
}

export function partNumbers(value: unknown, count: number): number[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_PART_BATCH ||
      value.some((n) => !Number.isInteger(n) || n < 1 || n > count) || new Set(value).size !== value.length) {
    throw new StorageError(400, "Invalid upload part numbers (maximum 20 per request).");
  }
  return value as number[];
}

export type UploadedPart = { PartNumber: number; ETag: string; Size: number };
export function verifyParts(actual: UploadedPart[], supplied: unknown, size: number, partSize: number) {
  const count = Math.ceil(size / partSize);
  if (!Array.isArray(supplied) || supplied.length !== count || actual.length !== count) {
    throw new StorageError(409, "Upload is incomplete. Resume the remaining parts.");
  }
  const sorted = [...actual].sort((a, b) => a.PartNumber - b.PartNumber);
  sorted.forEach((part, i) => {
    const client = supplied[i] as { partNumber?: unknown; etag?: unknown } | null;
    const expected = Math.min(partSize, size - i * partSize);
    if (part.PartNumber !== i + 1 || part.Size !== expected || !part.ETag ||
        client?.partNumber !== i + 1 || client?.etag !== part.ETag) {
      throw new StorageError(409, "Upload part verification failed. Retry or resume the upload.");
    }
  });
  return sorted.map(({ PartNumber, ETag }) => ({ PartNumber, ETag }));
}

export function isMp4Header(bytes: Uint8Array) {
  // ISO BMFF ftyp signature; codec/fast-start compatibility still needs playback QA.
  return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
}

export function safeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180);
}
