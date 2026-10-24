import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
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

function getDefaultMeetingLink() {
  return (
    process.env.CONSULTANCY_MEETING_LINK ||
    process.env.NEXT_PUBLIC_CONSULTANCY_MEETING_LINK ||
    "https://meet.google.com/finops-consultancy"
  );
}

function bookingHtml(booking: any) {
  return `
    <h2>FinOps Consultancy Booking Confirmed</h2>
    <p>Hello ${escapeHtml(booking.name)},</p>
    <p>Your 30 minute consultancy session is booked.</p>
    <p><strong>Date:</strong> ${escapeHtml(booking.bookingDate)}</p>
    <p><strong>Time:</strong> ${escapeHtml(booking.bookingTime)}</p>
    <p><strong>Duration:</strong> 30 minutes</p>
    <p><strong>Meeting Link:</strong> <a href="${escapeHtml(booking.meetingLink)}">${escapeHtml(booking.meetingLink)}</a></p>
  `;
}

export async function GET() {
  try {
    await connectDB();

    const bookings = await ConsultancyBooking.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, bookings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load bookings" },
      { status: 500 }
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
    const bookingDate = String(body.bookingDate || "").trim();
    const bookingTime = String(body.bookingTime || "").trim();
    const guests = Array.isArray(body.guests)
      ? body.guests
          .map((guest: any) => ({
            name: String(guest.name || "").trim(),
            email: String(guest.email || "").trim().toLowerCase(),
          }))
          .filter((guest: any) => guest.name && guest.email)
      : [];
    const meetingLink = String(body.meetingLink || getDefaultMeetingLink()).trim();

    if (!name || !email || !bookingDate || !bookingTime) {
      return NextResponse.json(
        { success: false, message: "Name, email, date, and time are required" },
        { status: 400 }
      );
    }

    const booking = await ConsultancyBooking.create({
      name,
      email,
      phone,
      bookingDate,
      bookingTime,
      durationMinutes: 30,
      meetingLink,
      guests,
      status: "booked",
    });

    const userEmail = await sendEmail({
      to: email,
      replyTo: getInquiryAdminEmail(),
      subject: "Consultancy Booking Confirmed - FinOps",
      html: bookingHtml(booking),
      text: `Consultancy Booking Confirmed\nDate: ${bookingDate}\nTime: ${bookingTime}\nDuration: 30 minutes\nMeeting Link: ${meetingLink}`,
    });

    let guestEmailSent = false;
    if (guests.length > 0) {
      const guestResult = await sendEmail({
        to: guests.map((guest: any) => guest.email),
        replyTo: email,
        subject: "You are invited to a FinOps consultancy meeting",
        html: bookingHtml(booking),
        text: `You are invited to a FinOps consultancy meeting\nDate: ${bookingDate}\nTime: ${bookingTime}\nDuration: 30 minutes\nMeeting Link: ${meetingLink}`,
      });
      guestEmailSent = guestResult.ok;
    }

    booking.emailSentToUser = userEmail.ok;
    booking.emailSentToGuests = guestEmailSent;
    await booking.save();

    await createNotification({
      audience: "admin",
      type: "consultancy",
      title: "New consultancy booking",
      message: `${name} booked consultancy on ${bookingDate} at ${bookingTime}.`,
      link: "/admin-page#consultancy-bookings",
      meta: { bookingId: String(booking._id) },
    });

    return NextResponse.json({
      success: true,
      booking,
      emailSentToUser: userEmail.ok,
      emailSentToGuests: guestEmailSent,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to book consultancy" },
      { status: 500 }
    );
  }
}
