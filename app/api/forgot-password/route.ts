import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    const genericMessage =
      "If this email is registered, a password reset link has been sent.";

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({
        success: true,
        message: genericMessage,
      });
    }

    const resetToken = randomBytes(32).toString("hex");
    const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");

    user.passwordSetupToken = resetTokenHash;
    user.passwordSetupExpires = new Date(Date.now() + 1000 * 60 * 60);
    await user.save();

    const appUrl = getAppUrl(req);
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    const emailResult = await sendEmail({
      to: user.email,
      subject: "Reset your FinOps password",
      text: `Hello ${user.name || "there"}, reset your FinOps password using this link: ${resetLink}

This link expires in 1 hour. If you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2>Reset your FinOps password</h2>
          <p>Hello ${user.name || "there"},</p>
          <p>We received a request to reset your FinOps account password. Use the button below to set a new password.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">
              Reset Password
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p>If the button does not work, copy and open this link in your browser:<br /><a href="${resetLink}">${resetLink}</a></p>
        </div>
      `,
    });

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to send reset email. Please try again later.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: genericMessage,
    });
  } catch (error: any) {
    console.log("FORGOT PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to process password reset request.",
      },
      { status: 500 }
    );
  }
}