import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { sendEmail } from "@/lib/email";
import Inquiry from "@/models/Inquiry";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const reply = String(body.adminReply || "").trim();

    if (!reply) {
      return NextResponse.json(
        {
          success: false,
          message: "Reply message is required",
        },
        {
          status: 400,
        }
      );
    }

    const inquiry = await Inquiry.findById(params.id);

    if (!inquiry) {
      return NextResponse.json(
        {
          success: false,
          message: "Inquiry not found",
        },
        {
          status: 404,
        }
      );
    }

    let replyEmailSent = false;

    if (inquiry.email) {
      const emailResult = await sendEmail({
        to: inquiry.email,
        replyTo: process.env.ADMIN_EMAIL || undefined,
        subject: "Reply from FinOps",
        html: `
          <h2>Reply from FinOps</h2>
          <p>Hello ${escapeHtml(inquiry.name || "there")},</p>
          <p>${escapeHtml(reply).replace(/\n/g, "<br />")}</p>
          <hr />
          <p><strong>Your message:</strong></p>
          <p>${escapeHtml(inquiry.message || "").replace(/\n/g, "<br />")}</p>
        `,
        text:
          `Reply from FinOps\n\n` +
          `Hello ${inquiry.name || "there"},\n\n` +
          `${reply}\n\n` +
          `---\nYour message:\n${inquiry.message || ""}\n`,
      });

      replyEmailSent = emailResult.ok;
    }

    inquiry.adminReply = reply;
    inquiry.status = "replied";
    inquiry.repliedAt = new Date();
    inquiry.replyEmailSent = replyEmailSent;
    await inquiry.save();

    return NextResponse.json({
      success: true,
      inquiry,
      replyEmailSent,
    });
  } catch (error: any) {
    console.log("REPLY INQUIRY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to reply to inquiry",
      },
      {
        status: 500,
      }
    );
  }
}