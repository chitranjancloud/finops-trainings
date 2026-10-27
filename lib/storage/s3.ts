import {
  S3Client, CreateMultipartUploadCommand, UploadPartCommand, ListPartsCommand,
  CompleteMultipartUploadCommand, AbortMultipartUploadCommand, HeadObjectCommand, GetObjectCommand,
  DeleteObjectCommand, type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageError, type UploadedPart } from "./s3Validation";

let client: S3Client | undefined;
let clientRegion = "";
export function storageConfig() {
  const region = process.env.AWS_REGION || "";
  const bucket = process.env.S3_MEDIA_BUCKET || "";
  if (!region || !bucket) throw new StorageError(503, "S3 storage is not configured.");
  return { region, bucket };
}
export function s3Client() {
  const { region } = storageConfig();
  if (!client || region !== clientRegion) {
    clientRegion = region;
    client = new S3Client({ region, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" });
  }
  return client;
}
export function urlTtl(kind: "upload" | "access") {
  const value = Number(process.env[kind === "upload" ? "S3_UPLOAD_URL_TTL_SECONDS" : "S3_ACCESS_URL_TTL_SECONDS"] || 600);
  return Number.isFinite(value) ? Math.max(60, Math.min(900, Math.floor(value))) : 600;
}
async function effectiveTtl(seconds: number) {
  const credentials = await s3Client().config.credentials();
  if (credentials.expiration) seconds = Math.min(seconds, Math.floor((credentials.expiration.getTime() - Date.now()) / 1000) - 30);
  if (seconds < 30) throw new StorageError(503, "Storage credentials are refreshing. Please retry.");
  return seconds;
}
type ObjectRef = { bucket: string; key: string };
type UploadRef = ObjectRef & { uploadId: string };
export async function startMultipart(ref: ObjectRef, assetId: string, tenantId: string, contentType = "video/mp4") {
  const result = await s3Client().send(new CreateMultipartUploadCommand({
    Bucket: ref.bucket, Key: ref.key, ContentType: contentType, ServerSideEncryption: "AES256",
    Metadata: { assetid: assetId, tenantid: tenantId },
  }));
  if (!result.UploadId) throw new StorageError(502, "Storage could not start the upload.");
  return result.UploadId;
}
export async function signPart(ref: UploadRef, number: number, remaining: number, byteSize: number) {
  const ttl = await effectiveTtl(Math.min(urlTtl("upload"), remaining));
  const url = await getSignedUrl(s3Client(), new UploadPartCommand({ Bucket: ref.bucket, Key: ref.key, UploadId: ref.uploadId, PartNumber: number, ContentLength: byteSize }), { expiresIn: ttl });
  return { partNumber: number, url, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
}
export async function listParts(ref: UploadRef) {
  const parts: UploadedPart[] = [];
  let marker: string | undefined;
  do {
    const result = await s3Client().send(new ListPartsCommand({ Bucket: ref.bucket, Key: ref.key, UploadId: ref.uploadId, PartNumberMarker: marker }));
    for (const part of result.Parts || []) {
      if (part.PartNumber && part.ETag && part.Size !== undefined) parts.push({ PartNumber: part.PartNumber, ETag: part.ETag, Size: part.Size });
    }
    marker = result.IsTruncated ? result.NextPartNumberMarker : undefined;
  } while (marker);
  return parts;
}
export async function completeMultipart(ref: UploadRef, parts: CompletedPart[]) {
  return s3Client().send(new CompleteMultipartUploadCommand({ Bucket: ref.bucket, Key: ref.key, UploadId: ref.uploadId, MultipartUpload: { Parts: parts } }));
}
export async function abortMultipart(ref: UploadRef) {
  try { await s3Client().send(new AbortMultipartUploadCommand({ Bucket: ref.bucket, Key: ref.key, UploadId: ref.uploadId })); }
  catch (error) { if (!(error instanceof Error) || error.name !== "NoSuchUpload") throw error; }
}
export async function inspectObject(ref: ObjectRef) {
  try { return await s3Client().send(new HeadObjectCommand({ Bucket: ref.bucket, Key: ref.key })); }
  catch (error) { if (error instanceof Error && ["NotFound", "NoSuchKey"].includes(error.name)) return null; throw error; }
}
export async function inspectHeader(ref: ObjectRef, versionId?: string) {
  const result = await s3Client().send(new GetObjectCommand({ Bucket: ref.bucket, Key: ref.key, VersionId: versionId || undefined, Range: "bytes=0-31" }));
  return result.Body ? result.Body.transformToByteArray() : new Uint8Array();
}
export async function signAccess(ref: ObjectRef & { safeFilename: string; versionId?: string; contentType?: string }) {
  const ttl = await effectiveTtl(urlTtl("access"));
  const url = await getSignedUrl(s3Client(), new GetObjectCommand({
    Bucket: ref.bucket, Key: ref.key, VersionId: ref.versionId || undefined,
    ResponseContentType: ref.contentType || "video/mp4",
    ResponseContentDisposition: `${["video/mp4", "application/pdf", "image/png", "image/jpeg"].includes(ref.contentType || "video/mp4") ? "inline" : "attachment"}; filename="${ref.safeFilename}"`,
    ResponseCacheControl: "private, no-store",
  }), { expiresIn: ttl });
  return { url, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
}

export async function deleteStoredObject(ref: ObjectRef & { versionId?: string }) {
  await s3Client().send(new DeleteObjectCommand({ Bucket: ref.bucket, Key: ref.key, VersionId: ref.versionId || undefined }));
}
