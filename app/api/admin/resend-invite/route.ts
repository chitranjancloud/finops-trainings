import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const admin = await User.findById(userId);
  if (
    !admin ||
    admin.role !== "admin" ||
    !admin.isLoggedIn ||
    admin.sessionToken !== sessionToken ||
    admin.activeDevice !== deviceId
  ) {
    return null;
  }
  return admin;
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const targetAdminId = String(body.targetAdminId || "").trim();

    const admin = await verifyAdmin(
      body.userId || "",
      body.sessionToken || "",
      body.deviceId || ""
    );

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Only an active admin can resend invitations" },
        { status: 401 }
      );
    }

    if (!targetAdminId) {
      return NextResponse.json(
        { success: false, message: "Target admin ID is required" },
        { status: 400 }
      );
    }

    const targetAdmin = await User.findById(targetAdminId);

    if (!targetAdmin || targetAdmin.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Admin not found" },
        { status: 404 }
      );
    }

    if (!targetAdmin.passwordSetupRequired) {
      return NextResponse.json(
        { success: false, message: "This admin has already set their password" },
        { status: 400 }
      );
    }

    const setupToken = randomBytes(32).toString("hex");
    const setupTokenHash = createHash("sha256").update(setupToken).digest("hex");

    const appUrl = getAppUrl(req);
    const setupLink = `${appUrl}/admin/set-password?token=${setupToken}`;

    targetAdmin.passwordSetupToken = setupTokenHash;
    targetAdmin.passwordSetupExpires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    targetAdmin.inviteSentAt = new Date();
    await targetAdmin.save();

    const emailResult = await sendEmail({
      to: targetAdmin.email,
      subject: "Set your FinOps admin password (resent)",
      text: `Hello ${targetAdmin.name}, set your FinOps admin password using this link: ${setupLink}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2>Admin Password Setup (Resent)</h2>
          <p>Hello ${targetAdmin.name},</p>
          <p>${admin.name || "An existing admin"} resent your admin invitation. Use the button below to create your password.</p>
          <p>
            <a href="${setupLink}" style="display:inline-block;background:#06b6d4;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Set Admin Password
            </a>
          </p>
          <p>This link expires in 24 hours.</p>
          <p>If the button does not work, copy and open this link in your browser:<br /><a href="${setupLink}">${setupLink}</a></p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: emailResult.ok
        ? "Invitation resent successfully"
        : "Token refreshed but email could not be sent. Check email settings.",
      emailSent: emailResult.ok,
      setupLink: emailResult.ok ? undefined : setupLink,
    });
  } catch (error: any) {
    console.log("RESEND INVITE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to resend invitation" },
      { status: 500 }
    );
  }
}