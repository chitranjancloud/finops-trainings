"use client";
import { FILE_TYPES, localDate, type S3Category } from "./s3Types";

export function storageHeaders() {
  let user: { _id?: string } = {};
  try { user = JSON.parse(localStorage.getItem("user") || "{}"); } catch { /* expired login */ }
  return {
    "Content-Type": "application/json",
    "x-user-id": user._id || "",
    "x-session-token": localStorage.getItem("sessionToken") || "",
    "x-device-id": localStorage.getItem("deviceId") || "",
  };
}
export class StorageRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function storageRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { method: body === undefined ? "GET" : "POST", headers: storageHeaders(),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal });
  const data = await res.json();
  if (!res.ok || !data.success) throw new StorageRequestError(res.status, data.message || "Storage request failed.");
  return data as T;
}

export type UploadSession = { uploadSessionId: string; assetId: string; partSize: number; partCount: number; status: string; expiresAt: string };
type CompletedPart = { partNumber: number; etag: string };
type ResumeData = { key: string; requestKey: string; session?: UploadSession; parts: CompletedPart[] };
const resumeKey = "s3-pilot-upload-v1";

export async function uploadS3File(file: File, courseId: string, batchId: string, signal: AbortSignal,
  progress: (percent: number, sessionId: string) => void, options: { category?: S3Category; contentDate?: string; replacesAssetId?: string } = {}) {
  const category = options.category || "video";
  const contentDate = options.contentDate || localDate();
  // Fingerprint the selected file's ends to avoid accidentally resuming a different recording.
  const samples = new Uint8Array(await new Blob([file.slice(0, 65536), file.slice(-65536)]).arrayBuffer());
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", samples))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const headers = storageHeaders();
  const key = JSON.stringify([headers["x-user-id"], courseId, batchId, file.name, file.size, file.lastModified, digest, category, contentDate, options.replacesAssetId || ""]);
  let saved: ResumeData | null = null;
  try { saved = JSON.parse(localStorage.getItem(resumeKey) || "null"); } catch { /* ignore stale browser data */ }
  if (saved && saved.key !== key) throw new Error("Another upload is saved in this browser. Resume that file or cancel/discard it first.");
  const state: ResumeData = saved || { key, requestKey: crypto.randomUUID(), parts: [] };
  const persist = () => localStorage.setItem(resumeKey, JSON.stringify(state));
  persist();
  // Re-authorization and idempotent init are required even for a local resume record.
  state.session = await storageRequest<UploadSession>("/api/s3/admin/uploads", {
    filename: file.name, contentType: FILE_TYPES[file.name.split(".").pop()?.toLowerCase() || ""] || "application/octet-stream", byteSize: file.size,
    category, contentDate, replacesAssetId: options.replacesAssetId || "",
    courseId, batchId, idempotencyKey: state.requestKey,
  }, signal);
  persist();
  const session = state.session;
  if (session.status === "completed") {
    const recovered = await storageRequest<{ asset?: { videoProcessingState?: string } }>(`/api/s3/admin/uploads/${session.uploadSessionId}/complete`, { parts: state.parts }, signal);
    localStorage.removeItem(resumeKey);
    return { assetId: session.assetId, videoProcessingState: recovered.asset?.videoProcessingState };
  }
  const completed = new Map(state.parts.map((part) => [part.partNumber, part.etag]));
  const pending = Array.from({ length: session.partCount }, (_, i) => i + 1).filter((n) => !completed.has(n));
  progress(Math.floor(completed.size / session.partCount * 100), session.uploadSessionId);
  let position = 0;
  let failed: unknown;
  const worker = async () => {
    while (position < pending.length && !signal.aborted && !failed) {
      const number = pending[position++];
      try {
        let etag = "";
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const signed = await storageRequest<{ parts: { url: string }[] }>(`/api/s3/admin/uploads/${session.uploadSessionId}/parts`, { partNumbers: [number] }, signal);
            const res = await fetch(signed.parts[0].url, { method: "PUT", body: file.slice((number - 1) * session.partSize, Math.min(number * session.partSize, file.size)), signal, credentials: "omit", referrerPolicy: "no-referrer" });
            if (!res.ok) throw new Error("S3 rejected an upload part. Check bucket CORS and retry.");
            etag = res.headers.get("etag") || "";
            if (!etag) throw new Error("S3 did not expose ETag. Check the bucket CORS settings.");
            break;
          } catch (error) {
            if (signal.aborted || attempt === 2 || (error instanceof StorageRequestError && [400, 401, 403, 409, 413].includes(error.status))) throw error;
            await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
          }
        }
        completed.set(number, etag);
        state.parts = [...completed].map(([partNumber, tag]) => ({ partNumber, etag: tag })).sort((a, b) => a.partNumber - b.partNumber);
        persist();
        progress(Math.floor(completed.size / session.partCount * 100), session.uploadSessionId);
      } catch (error) { failed = error; }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (failed) throw failed;
  if (signal.aborted) throw new DOMException("Upload paused", "AbortError");
  const result = await storageRequest<{ asset?: { videoProcessingState?: string } }>(`/api/s3/admin/uploads/${session.uploadSessionId}/complete`, { parts: state.parts }, signal);
  localStorage.removeItem(resumeKey);
  return { assetId: session.assetId, videoProcessingState: result.asset?.videoProcessingState };
}

export async function cancelSavedUpload() {
  let saved: ResumeData | null = null;
  try { saved = JSON.parse(localStorage.getItem(resumeKey) || "null"); } catch { /* corrupt browser state */ }
  if (saved?.session) await storageRequest(`/api/s3/admin/uploads/${saved.session.uploadSessionId}/abort`, {});
  localStorage.removeItem(resumeKey);
}

export const uploadS3Video = uploadS3File;
