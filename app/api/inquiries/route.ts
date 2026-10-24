import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { getInquiryAdminEmail, sendEmail } from "@/lib/email";
import Inquiry from "@/models/Inquiry";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET() {
  try {
    await connectDB();

    const inquiries = await Inquiry.find().sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      inquiries,
    });
  } catch (error: any) {
    console.log("GET INQUIRIES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load inquiries",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const category = String(body.category || "Course inquiry").trim();
    const message = String(body.message || "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          success: false,
          message: "Name, email, and message are required",
        },
        {
          status: 400,
        }
      );
    }

    const inquiry = await Inquiry.create({
      name,
      email,
      phone,
      category,
      message,
      status: "new",
    });

    const adminEmail = getInquiryAdminEmail();

    const emailResult = await sendEmail({
      to: adminEmail,
      replyTo: email,
      subject: `New Contact Inquiry from ${name}`,
      html: `
        <h2>New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Category:</strong> ${escapeHtml(category)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>
      `,
      text: `New Contact Inquiry\n\nName: ${name}\nEmail: ${email}\nWhatsApp: ${phone}\nCategory: ${category}\n\nMessage:\n${message}\n`,
    });

    inquiry.emailSentToAdmin = emailResult.ok;
    await inquiry.save();

    await createNotification({
      audience: "admin",
      type: "inquiry",
      title: "New inquiry received",
      message: `${name} sent a contact inquiry.`,
      link: "/admin-page#inquiries",
      meta: { inquiryId: String(inquiry._id) },
    });

    return NextResponse.json({
      success: true,
      inquiry,
      emailSentToAdmin: emailResult.ok,
    });
  } catch (error: any) {
    console.log("CREATE INQUIRY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to send inquiry",
      },
      {
        status: 500,
      }
    );
  }
}
