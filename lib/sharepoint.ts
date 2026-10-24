const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

type SharePointConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  driveId: string;
  siteId: string;
  basePath: string;
};

export function getSharePointConfig(): SharePointConfig {
  return {
    tenantId: process.env.SHAREPOINT_TENANT_ID || "",
    clientId: process.env.SHAREPOINT_CLIENT_ID || "",
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET || "",
    driveId: process.env.SHAREPOINT_DRIVE_ID || "",
    siteId: process.env.SHAREPOINT_SITE_ID || "",
    basePath: process.env.SHAREPOINT_BASE_PATH || "",
  };
}

export function isSharePointConfigured() {
  const config = getSharePointConfig();
  return Boolean(
    config.tenantId &&
      config.clientId &&
      config.clientSecret &&
      (config.driveId || config.siteId)
  );
}

function sanitizePathPart(value: string) {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._ -]/g, "-").trim())
    .filter(Boolean)
    .join("/");
}

function sanitizeFilename(value: string) {
  const fallback = "course-file";
  const parsed = value.split(/[\\/]/).pop() || fallback;
  return parsed.replace(/[^a-zA-Z0-9._ -]/g, "-").trim() || fallback;
}

export function normalizeContentCategory(value: string) {
  const normalized = value.toLowerCase().replace(/[_\s]+/g, "-").trim();

  if (["video", "videos"].includes(normalized)) return "video";
  if (["pdf", "pdfs"].includes(normalized)) return "pdf";
  if (["study-material", "study-materials", "material", "materials"].includes(normalized)) {
    return "study-material";
  }
  if (["assignment", "assignments"].includes(normalized)) return "assignment";

  return "";
}

export function getContentCategoryFolder(value: string) {
  const category = normalizeContentCategory(value);

  if (category === "video") return "Videos";
  if (category === "pdf") return "PDFs";
  if (category === "study-material") return "Study Materials";
  if (category === "assignment") return "Assignments";

  return "";
}

export function buildStructuredSharePointFolderPath({
  courseName,
  batchName,
  category,
}: {
  courseName: string;
  batchName: string;
  category: string;
}) {
  const categoryFolder = getContentCategoryFolder(category);

  if (!courseName || !batchName || !categoryFolder) return "";

  return sanitizePathPart(
    `finops/courses/${courseName}/${batchName}/${categoryFolder}`
  );
}

// Credentials are compared so a configuration change cannot reuse a token
// from another Microsoft tenant/app. This cache never stores student access.
let tokenCache: {
  credentials: string;
  token: string;
  expiresAt: number;
} | null = null;
let pendingToken: { credentials: string; promise: Promise<string> } | null = null;

async function getAccessToken() {
  const config = getSharePointConfig();
  const credentials = JSON.stringify([
    config.tenantId, config.clientId, config.clientSecret,
  ]);
  if (tokenCache?.credentials === credentials && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  if (pendingToken?.credentials === credentials) return pendingToken.promise;

  const promise = requestAccessToken(config).then(({ token, expiresIn }) => {
    tokenCache = {
      credentials,
      token,
      // Refresh before Microsoft expiry; absent/invalid expiry is not cached.
      expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
    };
    return token;
  });
  pendingToken = { credentials, promise };
  try {
    return await promise;
  } finally {
    if (pendingToken?.promise === promise) pendingToken = null;
  }
}

async function requestAccessToken(config: SharePointConfig) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
    }
  );
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "SharePoint token failed");
  }

  const lifetime = Number(data.expires_in);
  return {
    token: data.access_token as string,
    expiresIn: Number.isFinite(lifetime) && lifetime > 0 ? lifetime : 0,
  };
}

async function graphRequest(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${GRAPH_ROOT}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function getSharePointUrlSitePath(rawUrl: string) {
  const url = new URL(rawUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const siteIndex = parts.findIndex((part) =>
    ["sites", "teams"].includes(part.toLowerCase())
  );
  const sitePath =
    siteIndex >= 0 && parts[siteIndex + 1]
      ? `/${parts[siteIndex]}/${decodeURIComponent(parts[siteIndex + 1])}`
      : "/";

  return {
    hostname: url.hostname,
    sitePath,
  };
}

async function lookupSiteByPath(hostname: string, sitePath: string) {
  const res = await graphRequest(`/sites/${hostname}:${sitePath}`);
  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || "SharePoint site not found");
  }

  return data.id as string;
}

async function lookupSiteBySearch(siteName: string) {
  const res = await graphRequest(`/sites?search=${encodeURIComponent(siteName)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "SharePoint site search failed");
  }

  const clean = siteName
    .trim()
    .replace(/^\/?(sites|teams)\//i, "")
    .toLowerCase();
  const sites = data.value || [];
  const exact =
    sites.find((site: any) => String(site.name || "").toLowerCase() === clean) ||
    sites.find((site: any) => String(site.displayName || "").toLowerCase() === clean) ||
    sites.find((site: any) =>
      String(site.webUrl || "").toLowerCase().includes(`/${clean}`)
    ) ||
    sites[0];

  if (!exact?.id) {
    throw new Error(
      `SharePoint site not found for "${siteName}". ` +
        "Use the full site URL (e.g. https://tenant.sharepoint.com/sites/YourSite) in SHAREPOINT_SITE_ID, " +
        "or set SHAREPOINT_DRIVE_ID directly to skip site lookup."
    );
  }

  return exact.id as string;
}

async function resolveSharePointSiteId(siteId: string) {
  const raw = siteId.trim();

  if (!raw) {
    throw new Error("SharePoint site id is missing");
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const site = getSharePointUrlSitePath(raw);
    return lookupSiteByPath(site.hostname, site.sitePath);
  }

  if (raw.includes(".sharepoint.com/")) {
    const site = getSharePointUrlSitePath(`https://${raw}`);
    return lookupSiteByPath(site.hostname, site.sitePath);
  }

  if (raw.includes(".sharepoint.com:/")) {
    const res = await graphRequest(`/sites/${raw}`);
    const data = await res.json();

    if (!res.ok || !data.id) {
      throw new Error(data.error?.message || "SharePoint site not found");
    }

    return data.id as string;
  }

  if (raw.includes(",")) {
    try {
      const res = await graphRequest(`/sites/${raw}`);
      const data = await res.json();
      if (res.ok && data.id) return data.id as string;
    } catch {
      // ignore
    }

    return raw;
  }

  try {
    const res = await graphRequest(`/sites/${encodeURIComponent(raw)}`);
    const data = await res.json();
    if (res.ok && data.id) return data.id as string;
  } catch {
    // Ignore and fall through to search
  }

  return lookupSiteBySearch(raw);
}

export async function getSharePointDriveId() {
  const config = getSharePointConfig();
  if (config.driveId) return config.driveId;

  const siteId = await resolveSharePointSiteId(config.siteId);
  const safeSiteId = siteId.includes(",") ? siteId : encodeURIComponent(siteId);
  const res = await graphRequest(`/sites/${safeSiteId}/drive`);
  const data = await res.json();

  if (!res.ok || !data.id) {
    throw new Error(data.error?.message || "SharePoint drive not found");
  }

  return data.id as string;
}

function buildUploadPath(folder: string, filename: string) {
  const config = getSharePointConfig();
  const folderPath = sanitizePathPart(folder || "courses");
  const safeFilename = `${Date.now()}-${sanitizeFilename(filename)}`;
  return `${sanitizePathPart(config.basePath)}/${folderPath}/${safeFilename}`;
}

function buildFolderPath(folder: string) {
  const config = getSharePointConfig();
  return `${sanitizePathPart(config.basePath)}/${sanitizePathPart(folder || "courses")}`;
}

async function uploadSmallFile(driveId: string, uploadPath: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const res = await graphRequest(
    `/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(uploadPath)}:/content`,
    {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "SharePoint upload failed");
  }

  return data;
}

async function uploadLargeFile(driveId: string, uploadPath: string, file: File) {
  const sessionRes = await graphRequest(
    `/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(uploadPath)}:/createUploadSession`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "rename",
          name: sanitizeFilename(file.name),
        },
      }),
    }
  );
  const session = await sessionRes.json();

  if (!sessionRes.ok || !session.uploadUrl) {
    throw new Error(session.error?.message || "SharePoint upload session failed");
  }

  const chunkSize = 5 * 1024 * 1024;
  let start = 0;
  let uploaded: any = null;

  while (start < file.size) {
    const end = Math.min(start + chunkSize, file.size) - 1;
    const chunkBuffer = Buffer.from(await file.slice(start, end + 1).arrayBuffer());
    const chunkRes = await fetch(session.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunkBuffer.length),
        "Content-Range": `bytes ${start}-${end}/${file.size}`,
      },
      body: chunkBuffer,
    });
    const chunkData = await chunkRes.json().catch(() => ({}));

    if (!chunkRes.ok) {
      throw new Error(chunkData.error?.message || "SharePoint chunk upload failed");
    }

    uploaded = chunkData;
    start = end + 1;
  }

  return uploaded;
}

export async function uploadFileToSharePoint(file: File, folder: string) {
  if (!isSharePointConfigured()) {
    throw new Error(
      "SharePoint is not configured. Add SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_DRIVE_ID or SHAREPOINT_SITE_ID."
    );
  }

  const driveId = await getSharePointDriveId();
  const uploadPath = buildUploadPath(folder, file.name);
  const item =
    file.size <= 4 * 1024 * 1024
      ? await uploadSmallFile(driveId, uploadPath, file)
      : await uploadLargeFile(driveId, uploadPath, file);
  const itemId = item.id;

  if (!itemId) {
    throw new Error("SharePoint upload completed without item id");
  }

  const url = `/api/sharepoint-file?driveId=${encodeURIComponent(
    driveId
  )}&itemId=${encodeURIComponent(itemId)}&name=${encodeURIComponent(file.name)}`;

  return {
    url,
    itemId,
    driveId,
    webUrl: item.webUrl || "",
    name: item.name || file.name,
    folderPath: sanitizePathPart(folder || "courses"),
  };
}

export async function fetchSharePointFile(
  driveId: string,
  itemId: string,
  range?: string | null
) {
  const headers: Record<string, string> = {};
  if (range) headers.Range = range;

  return graphRequest(
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    {
      method: "GET",
      headers,
      redirect: "follow",
    }
  );
}

/**
 * Short-lived Office/SharePoint embed preview (not a file download).
 * POST /drives/{id}/items/{id}/preview
 */
export async function getSharePointItemPreview(
  driveId: string,
  itemId: string,
  options?: { allowOrigin?: string }
) {
  const allowOrigin = String(options?.allowOrigin || "").trim();
  const res = await graphRequest(
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/preview`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        viewer: "office",
        chromeless: true,
        allowEdit: false,
        ...(allowOrigin ? { allowOrigin } : {}),
      }),
    }
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "SharePoint preview failed");
  }

  return {
    getUrl: typeof data.getUrl === "string" ? data.getUrl : "",
    postUrl: typeof data.postUrl === "string" ? data.postUrl : "",
    postParameters:
      typeof data.postParameters === "string" ? data.postParameters : "",
  };
}

/**
 * Returns a short-lived pre-authenticated download URL for a drive item.
 * Does NOT fetch file bytes — safe for direct browser delivery.
 */
export async function getSharePointItemDownloadUrl(
  driveId: string,
  itemId: string
): Promise<string | null> {
  const res = await graphRequest(
    `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}?select=id,name,@microsoft.graph.downloadUrl`
  );
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error?.message || "SharePoint item metadata failed");
  }

  const downloadUrl = data["@microsoft.graph.downloadUrl"];
  if (typeof downloadUrl === "string" && downloadUrl.startsWith("http")) {
    return downloadUrl;
  }

  return null;
}

export async function listSharePointFiles(folder: string, type = "all") {
  if (!isSharePointConfigured()) {
    throw new Error(
      "SharePoint is not configured. Add SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_DRIVE_ID or SHAREPOINT_SITE_ID."
    );
  }

  const driveId = await getSharePointDriveId();
  const folderPath = buildFolderPath(folder);
  const res = await graphRequest(
    `/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(folderPath)}:/children?$top=200`,
    {
      method: "GET",
    }
  );
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(data.error?.message || "SharePoint files could not be loaded");
  }

  const allowed =
    type === "video"
      ? [".mp4", ".webm", ".mov", ".m4v"]
      : type === "pdf"
        ? [".pdf"]
        : [];

  return (data.value || [])
    .filter((item: any) => item.file)
    .filter((item: any) => {
      if (!allowed.length) return true;
      const lower = String(item.name || "").toLowerCase();
      return allowed.some((ext) => lower.endsWith(ext));
    })
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      size: item.size || 0,
      webUrl: item.webUrl || "",
      url: `/api/sharepoint-file?driveId=${encodeURIComponent(
        driveId
      )}&itemId=${encodeURIComponent(item.id)}&name=${encodeURIComponent(item.name)}`,
    }));
}
