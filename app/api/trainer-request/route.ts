import { NextResponse } from "next/server";
const nodemailer = require("nodemailer");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "your-email@gmail.com",
        pass: "your-app-password", // 🔥 USE APP PASSWORD
      },
    });

    await transporter.sendMail({
      from: `"Trainer Request" <your-email@gmail.com>`,
      to: "your-email@gmail.com",
      subject: "New Trainer Request",
      text: `
Company: ${body.company}
Email: ${body.email}
Location: ${body.location}
Topic: ${body.topic}
Date: ${body.date}
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("MAIL ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 }
    );
  }
}