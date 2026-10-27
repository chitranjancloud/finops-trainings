export const S3_CATEGORIES = ["video", "pdf", "study-material", "assignment"] as const;
export type S3Category = typeof S3_CATEGORIES[number];
export const CATEGORY_LABELS: Record<S3Category, string> = { video: "Videos", pdf: "PDFs", "study-material": "Study Materials", assignment: "Assignment Files" };
export const FILE_TYPES: Record<string, string> = {
  mp4: "video/mp4", pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain", csv: "text/csv", zip: "application/zip", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
};
export function allowedExtensions(category: S3Category) { return category === "video" ? ["mp4"] : category === "pdf" ? ["pdf"] : Object.keys(FILE_TYPES).filter((s) => s !== "mp4"); }
export function localDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
export type S3PublicAsset = { videoProcessingState?: "not-requested" | "queued" | "processing" | "ready" | "failed"; videoDurationSeconds?: number; videoProcessingErrorCode?: string; assetId: string; filename: string; contentType: string; category: S3Category; contentDate: string; status: string; byteSize: number; courseId: string; batchId: string; createdAt: string; uploadedAt?: string; deletedAt?: string; replacedBy?: string; replacesAssetId?: string; cleanupState?: string; uploadSessionId?: string; uploadStatus?: string };
