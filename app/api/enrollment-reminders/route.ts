import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";
import EnrollmentReminder from "@/models/EnrollmentReminder";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (!user || user.role !== "admin" || !user.isLoggedIn || user.sessionToken !== sessionToken || user.activeDevice !== deviceId) return null;
  return user;
}

function buildEmailHtml(userName: string, customMessage: string, adminName: string) {
  const escaped = customMessage.replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f7fb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#06b6d4 0%,#0891b2 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">FinOps</h1>
            <p style="margin:8px 0 0;color:#cffafe;font-size:14px;">Professional Finance Education</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Personal Message</p>
            <h2 style="margin:0 0 24px;color:#0f172a;font-size:22px;font-weight:700;">Hello, ${userName} 👋</h2>
            <div style="background:#f8fafc;border-left:4px solid #06b6d4;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px;">
              <p style="margin:0;color:#334155;font-size:15px;line-height:1.7;">${escaped}</p>
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
              <tr>
                <td align="center">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://finops.com"}/courses"
                     style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                    Explore Courses →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
              If you have any questions, simply reply to this email.<br/>
              We're here to help you succeed.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Sent by <strong>${adminName}</strong> · FinOps Team<br/>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://finops.com"}" style="color:#06b6d4;text-decoration:none;">finops.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// GET: list non-enrolled users + email history
export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const afterDays = parseInt(searchParams.get("afterDays") || "0", 10);

    // Find all users who are NOT admin
    const allUsers = await User.find({ role: { $ne: "admin" } })
      .select("_id name email createdAt lastLoginAt isLoggedIn")
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .lean();

    // Find all enrolled user IDs/emails
    const allEnrollments = await Enrollment.find({}).select("userId email").lean();
    const enrolledUserIds = new Set(allEnrollments.map((e: any) => String(e.userId)));
    const enrolledEmails = new Set(allEnrollments.map((e: any) => (e.email || "").toLowerCase()));

    // Filter: users who have logged in but not enrolled
    const now = Date.now();
    const cutoff = afterDays > 0 ? now - afterDays * 24 * 60 * 60 * 1000 : 0;

    const nonEnrolled = allUsers
      .filter((u: any) => {
        const id = String(u._id);
        const email = (u.email || "").toLowerCase();
        if (enrolledUserIds.has(id) || enrolledEmails.has(email)) return false;
        // Must have logged in at least once
        if (!u.lastLoginAt && !u.createdAt) return false;
        // Filter by days since account creation
        if (cutoff > 0) {
          const created = u.createdAt ? new Date(u.createdAt).getTime() : 0;
          if (created > cutoff) return false; // account too new
        }
        return true;
      })
      .map((u: any) => ({
        _id: String(u._id),
        name: u.name || "",
        email: u.email || "",
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      }));

    // Email history for non-enrolled users
    const history = await EnrollmentReminder.find({ status: { $in: ["sent", "failed"] } })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Scheduled
    const scheduled = await EnrollmentReminder.find({ status: "scheduled", scheduledFor: { $gt: new Date() } })
      .sort({ scheduledFor: 1 })
      .lean();

    return NextResponse.json({ success: true, nonEnrolled, history, scheduled });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: send email now or schedule
export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { targets, subject, message, scheduleAfterDays } = body;
    // targets: array of { userId, userName, userEmail }
    if (!targets?.length) return NextResponse.json({ success: false, message: "No recipients" }, { status: 400 });
    if (!subject?.trim()) return NextResponse.json({ success: false, message: "Subject is required" }, { status: 400 });
    if (!message?.trim()) return NextResponse.json({ success: false, message: "Message is required" }, { status: 400 });

    const isScheduled = scheduleAfterDays && parseInt(scheduleAfterDays, 10) > 0;
    const scheduledFor = isScheduled
      ? new Date(Date.now() + parseInt(scheduleAfterDays, 10) * 24 * 60 * 60 * 1000)
      : null;

    const results: any[] = [];

    for (const t of targets) {
      const html = buildEmailHtml(t.userName || t.userEmail, message, admin.name || "Admin");

      if (isScheduled) {
        const record = await EnrollmentReminder.create({
          userId: t.userId,
          userName: t.userName || "",
          userEmail: t.userEmail,
          adminId: String(admin._id),
          subject,
          message,
          htmlBody: html,
          status: "scheduled",
          scheduledFor,
        });
        results.push({ email: t.userEmail, status: "scheduled", id: record._id });
      } else {
        const result = await sendEmail({ to: t.userEmail, subject, html });
        const record = await EnrollmentReminder.create({
          userId: t.userId,
          userName: t.userName || "",
          userEmail: t.userEmail,
          adminId: String(admin._id),
          subject,
          message,
          htmlBody: html,
          status: result.ok ? "sent" : "failed",
          sentAt: result.ok ? new Date() : null,
          provider: result.provider,
          errorMessage: result.ok ? "" : "Email delivery failed",
        });
        results.push({ email: t.userEmail, status: result.ok ? "sent" : "failed", id: record._id });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const scheduled2 = results.filter((r) => r.status === "scheduled").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      success: true,
      sent,
      scheduled: scheduled2,
      failed,
      results,
      message: isScheduled
        ? `Scheduled ${scheduled2} email(s) for ${scheduleAfterDays} day(s) from now.`
        : `Sent ${sent}/${targets.length} email(s). Failed: ${failed}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE: cancel a scheduled reminder
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    await EnrollmentReminder.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
