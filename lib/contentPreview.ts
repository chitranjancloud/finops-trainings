import { NextResponse } from "next/server";

import { viewableKindFromName } from "@/lib/auth/protectedContentAccess";
import {
  getSharePointItemDownloadUrl,
  getSharePointItemPreview,
} from "@/lib/sharepoint";

const OFFICE_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation";

function escapeHtmlAttr(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function requestEmbedOrigin(req?: Request) {
  const host = (
    req?.headers.get("x-forwarded-host") ||
    req?.headers.get("host") ||
    ""
  )
    .split(",")[0]
    .trim();
  const proto =
    req?.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return "";
}

function withOfficeEmbedParams(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (
      host.includes("officeapps.live.com") ||
      host.includes("office.com")
    ) {
      url.searchParams.set("em", "2");
      url.searchParams.set("wdAllowInteractivity", "False");
      url.searchParams.set("wdHideDownloadButton", "True");
      url.searchParams.set("wdDownloadButton", "False");
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function previewDocumentShell(inner: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Study material</title>
  <style>
    html, body { margin: 0; height: 100%; background: #fff; overflow: hidden; }
    .stage { position: relative; width: 100%; height: 100%; }
    iframe, img, pre { border: 0; width: 100%; height: 100%; display: block; }
    img { object-fit: contain; background: #0f172a; }
    pre { margin: 0; padding: 24px; overflow: auto; font: 13px/1.5 ui-monospace, monospace; }
    .chrome {
      pointer-events: none;
      position: absolute; top: 0; left: 0; right: 0; height: 52px;
      background: linear-gradient(#fff, rgba(255,255,255,.92) 70%, transparent);
      z-index: 5;
    }
    .msg {
      display: flex; align-items: center; justify-content: center;
      height: 100%; padding: 32px; text-align: center;
      font: 15px/1.5 system-ui, sans-serif; color: #334155;
    }
  </style>
</head>
<body>
  <div class="stage">${inner}</div>
</body>
</html>`;
}

function officeIframe(src: string) {
  return `<div class="chrome"></div>
       <iframe
         src="${src}"
         title="Study material"
         sandbox="${OFFICE_IFRAME_SANDBOX}"
         referrerpolicy="origin"
         allowfullscreen
       ></iframe>`;
}

function buildOfficeOnlineEmbedHtml(downloadUrl: string) {
  const embed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    downloadUrl
  )}`;
  return previewDocumentShell(officeIframe(escapeHtmlAttr(withOfficeEmbedParams(embed))));
}

function buildOfficePreviewHtml(preview: {
  getUrl: string;
  postUrl: string;
  postParameters: string;
}) {
  if (preview.postUrl) {
    const fields = new URLSearchParams(preview.postParameters);
    const inputs = [...fields.entries()]
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtmlAttr(key)}" value="${escapeHtmlAttr(value)}" />`
      )
      .join("");

    return previewDocumentShell(
      `<div class="chrome"></div>
       <iframe
         name="study-material-preview"
         title="Study material"
         sandbox="${OFFICE_IFRAME_SANDBOX}"
         referrerpolicy="origin"
         allowfullscreen
       ></iframe>
       <form id="study-material-preview-form" method="POST" action="${escapeHtmlAttr(
         preview.postUrl
       )}" target="study-material-preview">${inputs}</form>
       <script>document.getElementById("study-material-preview-form").submit();</script>`
    );
  }

  if (preview.getUrl) {
    return previewDocumentShell(
      officeIframe(escapeHtmlAttr(withOfficeEmbedParams(preview.getUrl)))
    );
  }

  return "";
}

function buildPdfFallbackHtml(proxyPath: string) {
  const src = escapeHtmlAttr(`${proxyPath}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`);
  return previewDocumentShell(
    `<div class="chrome"></div>
     <iframe src="${src}" title="Study material" referrerpolicy="origin"></iframe>`
  );
}

function buildImageFallbackHtml(proxyPath: string, filename: string) {
  return previewDocumentShell(
    `<img src="${escapeHtmlAttr(proxyPath)}" alt="${escapeHtmlAttr(
      filename
    )}" draggable="false" />`
  );
}

function buildUnavailableHtml() {
  return previewDocumentShell(
    `<div class="msg">This study material can only be viewed on the website. A live preview is not available for this file, and download is disabled.</div>`
  );
}

export function previewHtmlResponse(html: string) {
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, no-cache, must-revalidate",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "frame-ancestors 'self'",
      "Referrer-Policy": "origin",
      "X-Download-Options": "noopen",
    },
  });
}

export async function serveInWebsitePreviewHtml(opts: {
  filename: string;
  driveId?: string;
  itemId?: string;
  fallbackProxyPath?: string;
  req?: Request;
}) {
  const kind = viewableKindFromName(opts.filename);
  const embedOrigin = requestEmbedOrigin(opts.req);

  // PowerPoint/Word/Excel: Office Online embed is more reliable than OneDrive's
  // generic preview page, which often shows "no preview" + Download.
  if (kind === "office" && opts.driveId && opts.itemId) {
    try {
      const downloadUrl = await getSharePointItemDownloadUrl(
        opts.driveId,
        opts.itemId
      );
      if (downloadUrl) {
        return previewHtmlResponse(buildOfficeOnlineEmbedHtml(downloadUrl));
      }
    } catch {
      // fall through to Graph preview
    }
  }

  let preview: Awaited<ReturnType<typeof getSharePointItemPreview>> | null = null;

  if (opts.driveId && opts.itemId) {
    try {
      preview = await getSharePointItemPreview(opts.driveId, opts.itemId, {
        allowOrigin: embedOrigin,
      });
    } catch {
      preview = null;
    }
  }

  if (preview && (preview.getUrl || preview.postUrl)) {
    const html = buildOfficePreviewHtml(preview);
    if (html) return previewHtmlResponse(html);
  }

  if (opts.fallbackProxyPath && (kind === "pdf" || kind === "unknown")) {
    if (kind === "pdf") {
      return previewHtmlResponse(buildPdfFallbackHtml(opts.fallbackProxyPath));
    }
  }

  if (opts.fallbackProxyPath && kind === "image") {
    return previewHtmlResponse(
      buildImageFallbackHtml(opts.fallbackProxyPath, opts.filename)
    );
  }

  return previewHtmlResponse(buildUnavailableHtml());
}
