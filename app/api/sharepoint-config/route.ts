import { NextResponse } from "next/server";

import { getSharePointConfig, isSharePointConfigured, getSharePointDriveId } from "@/lib/sharepoint";

export const runtime = "nodejs";

export async function GET() {
  const config = getSharePointConfig();
  const configured = isSharePointConfigured();

  const summary = {
    configured,
    hasClientId: Boolean(config.clientId),
    hasClientSecret: Boolean(config.clientSecret),
    hasTenantId: Boolean(config.tenantId),
    hasSiteId: Boolean(config.siteId),
    hasDriveId: Boolean(config.driveId),
    basePath: config.basePath,
    siteIdValue: config.siteId
      ? `${config.siteId.slice(0, 8)}...` // partial for security
      : "(not set)",
  };

  if (!configured) {
    return NextResponse.json({
      success: false,
      message:
        "SharePoint is not fully configured. Check that SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, SHAREPOINT_CLIENT_SECRET, and SHAREPOINT_SITE_ID (or SHAREPOINT_DRIVE_ID) are all set in your .env.local file.",
      summary,
    });
  }

  try {
    const driveId = await getSharePointDriveId();
    return NextResponse.json({
      success: true,
      message: "SharePoint is configured and accessible.",
      summary,
      driveId: `${driveId.slice(0, 8)}...`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "SharePoint connection failed",
        summary,
        hint: getSiteIdHint(config.siteId),
      },
      { status: 500 }
    );
  }
}

function getSiteIdHint(siteId: string) {
  if (!siteId) {
    return "SHAREPOINT_SITE_ID is empty. Set it to your SharePoint site URL like: https://yourtenant.sharepoint.com/sites/YourSite";
  }
  if (!siteId.includes("sharepoint.com") && !siteId.includes(",")) {
    return (
      `SHAREPOINT_SITE_ID="${siteId}" looks like a plain name, not a URL or Graph ID. ` +
      `Try using the full URL format: https://yourtenant.sharepoint.com/sites/${siteId} ` +
      `Or set SHAREPOINT_DRIVE_ID directly (find it in SharePoint Admin Center or via Graph Explorer).`
    );
  }
  return null;
}
