import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";
import User from "@/models/User";

// In-memory OTP store: email -> { otp, expiresAt, attempts, sentAt }
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number; sentAt: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/send-otp — send OTP to email
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, message: "Invalid email address" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    await connectDB();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ success: false, message: "Email already registered. Please login." }, { status: 400 });
    }

    // Rate limit: don't allow resend within 60 seconds
    const existingOtp = otpStore.get(normalizedEmail);
    if (existingOtp && Date.now() - existingOtp.sentAt < 60 * 1000) {
      const wait = Math.ceil((60 * 1000 - (Date.now() - existingOtp.sentAt)) / 1000);
      return NextResponse.json({ success: false, message: `Please wait ${wait}s before requesting a new code.` }, { status: 429 });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(normalizedEmail, { otp, expiresAt, attempts: 0, sentAt: Date.now() });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#0d1117 0%,#0f1923 100%);border-radius:20px;border:1px solid rgba(99,179,237,0.15);overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a3a5c 0%,#0d2137 100%);padding:36px 48px 32px;text-align:center;">
                    <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#06b6d4);border-radius:16px;padding:12px 24px;margin-bottom:16px;">
                      <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:1px;">FinOps Trainings</span>
                    </div>
                    <h1 style="color:#e2e8f0;font-size:24px;font-weight:600;margin:0;letter-spacing:-0.5px;">Verify Your Email Address</h1>
                    <p style="color:#94a3b8;font-size:14px;margin:8px 0 0;">Almost there! Use the code below to confirm your email.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px 48px;text-align:center;">
                    <p style="color:#94a3b8;font-size:15px;margin:0 0 28px;">Your one-time verification code is:</p>
                    <div style="background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(6,182,212,0.12));border:2px solid rgba(59,130,246,0.3);border-radius:16px;padding:28px 40px;display:inline-block;margin-bottom:28px;">
                      <span style="font-size:44px;font-weight:800;letter-spacing:16px;color:#60a5fa;font-family:'Courier New',monospace;">${otp}</span>
                    </div>
                    <p style="color:#64748b;font-size:13px;margin:0;">This code expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share it with anyone.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 48px 32px;">
                    <div style="background:rgba(99,179,237,0.05);border:1px solid rgba(99,179,237,0.1);border-radius:12px;padding:16px 20px;">
                      <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
                        If you didn't request this, you can safely ignore this email. Someone may have entered your email address by mistake.
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background:rgba(0,0,0,0.3);padding:20px 48px;text-align:center;border-top:1px solid rgba(255,255,255,0.05);">
                    <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} FinOps Trainings. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const result = await sendEmail({
      to: normalizedEmail,
      subject: "Your FinOps Trainings email verification code",
      html,
      text: `Your FinOps Trainings email verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    });

    if (!result.ok) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ success: false, message: "Failed to send verification email. Please check your email address and try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Verification code sent to your email." });
  } catch (err) {
    console.error("SEND OTP ERROR:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// PUT /api/send-otp — verify the OTP entered by user
export async function PUT(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ success: false, message: "Email and OTP are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const stored = otpStore.get(normalizedEmail);

    if (!stored) {
      return NextResponse.json({ success: false, message: "No verification code found. Please request a new one." }, { status: 400 });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ success: false, message: "Verification code has expired. Please request a new one." }, { status: 400 });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return NextResponse.json({ success: false, message: "Too many incorrect attempts. Please request a new code." }, { status: 429 });
    }

    if (stored.otp !== otp.trim()) {
      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);
      const remaining = 5 - stored.attempts;
      return NextResponse.json({ success: false, message: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` }, { status: 400 });
    }

    // Valid — mark as verified (keep for 5 min so signup can proceed)
    otpStore.set(normalizedEmail, { ...stored, otp: "__verified__", expiresAt: Date.now() + 5 * 60 * 1000 });

    return NextResponse.json({ success: true, message: "Email verified successfully." });
  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
