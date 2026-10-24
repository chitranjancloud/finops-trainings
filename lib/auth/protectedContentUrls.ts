/**
 * Build authenticated proxy URLs for protected student content.
 * Never returns direct SharePoint/CDN storage URLs to the browser.
 */
export function buildBatchContentProxyUrl(opts: {
  batchId: string;
  userId: string;
  sessionToken: string;
  deviceId: string;
  materialId?: string;
  inventoryId?: string;
  resourceId?: string;
  resourceType?: "test" | "assignment";
  fileKind?: "question" | "answerSheet";
}) {
  const params = new URLSearchParams({
    batchId: opts.batchId,
    userId: opts.userId,
    sessionToken: opts.sessionToken,
    deviceId: opts.deviceId,
  });

  if (opts.inventoryId) {
    params.set("inventoryId", opts.inventoryId);
  } else if (opts.materialId) {
    params.set("materialId", opts.materialId);
  }

  if (opts.resourceId) {
    params.set("resourceId", opts.resourceId);
    if (opts.resourceType) params.set("resourceType", opts.resourceType);
    if (opts.fileKind) params.set("fileKind", opts.fileKind);
  }

  return `/api/batch-content?${params.toString()}`;
}

/** In-website document viewer. Never streams Office files as downloads. */
export function buildBatchContentPreviewUrl(
  opts: Parameters<typeof buildBatchContentProxyUrl>[0]
) {
  return `${buildBatchContentProxyUrl(opts)}&preview=html`;
}

export function buildRecordedContentProxyUrl(opts: {
  courseId: string;
  resourceType: string;
  resourceIndex: number;
  userId: string;
  sessionToken: string;
  deviceId: string;
}) {
  const params = new URLSearchParams({
    courseId: opts.courseId,
    resourceType: opts.resourceType,
    resourceIndex: String(opts.resourceIndex),
    userId: opts.userId,
    sessionToken: opts.sessionToken,
    deviceId: opts.deviceId,
  });

  return `/api/student/recorded-content?${params.toString()}`;
}

export function buildRecordedContentPreviewUrl(
  opts: Parameters<typeof buildRecordedContentProxyUrl>[0]
) {
  return `${buildRecordedContentProxyUrl(opts)}&preview=html`;
}
