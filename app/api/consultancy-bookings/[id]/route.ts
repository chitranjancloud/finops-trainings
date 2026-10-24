import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getInquiryAdminEmail, sendEmail } from "@/lib/email";
import ConsultancyBooking from "@/models/ConsultancyBooking";

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
    const booking = await ConsultancyBooking.findById(params.id);

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    const meetingLink = String(body.meetingLink || booking.meetingLink || "").trim();
    const reply = String(body.adminReply || "").trim();

    booking.meetingLink = meetingLink;
    booking.adminReply = reply;
    booking.status = reply ? "replied" : booking.status;
    booking.repliedAt = reply ? new Date() : booking.repliedAt;

    let replyEmailSent = false;
    if (reply || meetingLink) {
      const recipients = [
        booking.email,
        ...(booking.guests || []).map((guest: any) => guest.email),
      ].filter(Boolean);

      const emailResult = await sendEmail({
        to: recipients,
        replyTo: getInquiryAdminEmail(),
        subject: "FinOps Consultancy Booking Update",
        html: `
          <h2>Consultancy Booking Update</h2>
          <p>Hello ${escapeHtml(booking.name || "there")},</p>
          ${reply ? `<p>${escapeHtml(reply).replace(/\n/g, "<br />")}</p>` : ""}
          <p><strong>Date:</strong> ${escapeHtml(booking.bookingDate)}</p>
          <p><strong>Time:</strong> ${escapeHtml(booking.bookingTime)}</p>
          <p><strong>Duration:</strong> 30 minutes</p>
          <p><strong>Meeting Link:</strong> <a href="${escapeHtml(meetingLink)}">${escapeHtml(meetingLink)}</a></p>
        `,
        text:
          `Consultancy Booking Update\n\n${reply}\n\n` +
          `Date: ${booking.bookingDate}\nTime: ${booking.bookingTime}\nDuration: 30 minutes\nMeeting Link: ${meetingLink}\n`,
      });
      replyEmailSent = emailResult.ok;
    }

    booking.replyEmailSent = replyEmailSent;
    await booking.save();

    return NextResponse.json({ success: true, booking, replyEmailSent });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update booking" },
      { status: 500 }
    );
  }
}
