type Source = { tenantId: string; assetId: string; sourceKey: string };
const objectId = /^[a-f\d]{24}$/;
const generation = /^[a-f\d]{24}\/[a-f\d-]{36}$/;

/** Keep derived files beside this immutable original, inside its lesson date. */
export function videoSourceFolder(source: Source) {
  if (!objectId.test(source.tenantId) || !objectId.test(source.assetId)) throw new Error("INVALID_OUTPUT_SCOPE");
  const parts = source.sourceKey.split("/");
  if (parts.length !== 11 || parts[0] !== "tenant" || parts[1] !== source.tenantId || parts[2] !== "courses" || !objectId.test(parts[3]) ||
      parts[4] !== "batches" || !objectId.test(parts[5]) || parts[6] !== "video" || !/^\d{4}-\d{2}-\d{2}$/.test(parts[7]) ||
      parts[8] !== source.assetId || !/^[a-f\d-]{36}$/.test(parts[9]) || parts.some((part) => !part || part === "." || part === ".." || part.includes("\\"))) throw new Error("INVALID_OUTPUT_SCOPE");
  return parts.slice(0, -1).join("/");
}

export function videoOutputPrefix(source: Source, jobId: string, attemptId: string) {
  if (!generation.test(`${jobId}/${attemptId}`)) throw new Error("INVALID_OUTPUT_SCOPE");
  return `${videoSourceFolder(source)}/output/${jobId}/${attemptId}`;
}

/** Old prefixes remain valid only for scoped cleanup and existing migrations. */
export function assertVideoOutputPrefix(source: Source, prefix: string) {
  const legacy = `tenant/${source.tenantId}/video-output/${source.assetId}/`;
  if (objectId.test(source.tenantId) && objectId.test(source.assetId) && prefix.startsWith(legacy) && generation.test(prefix.slice(legacy.length))) return;
  const current = `${videoSourceFolder(source)}/output/`;
  if (!prefix.startsWith(current) || !generation.test(prefix.slice(current.length))) throw new Error("INVALID_CLEANUP_SCOPE");
}
