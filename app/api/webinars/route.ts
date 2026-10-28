import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import WebinarEvent from "@/models/WebinarEvent";

export async function GET() {
  try {
    await connectDB();


    const webinars = await WebinarEvent.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      webinars,
    });
  } catch (error: any) {
    console.log("GET WEBINARS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
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

    if (!body.name || !body.title || !body.date || !body.time) {
      return NextResponse.json(
        {
          success: false,
          message: "Speaker name, title, date, and time are required",
        },
        {
          status: 400,
        }
      );
    }

    const webinar = await WebinarEvent.create({
      name: body.name,
      title: body.title,
      date: body.date,
      time: body.time,
      img: body.img || "",
      role: body.role || "",
      price: body.price || "Free",
      displayOrder: Number(body.displayOrder) || 0,
    });

    await createNotification({
      audience: "admin",
      type: "webinar",
      title: "Webinar created",
      message: `${webinar.title} is scheduled on ${webinar.date} at ${webinar.time}.`,
      link: "/admin-page#webinars",
    });

    await createNotification({
      audience: "user",
      type: "webinar",
      title: "New webinar reminder",
      message: `${webinar.title} is coming on ${webinar.date} at ${webinar.time}.`,
      link: "/learning/upcoming-webinars",
    });

    return NextResponse.json({
      success: true,
      webinar,
    });
  } catch (error: any) {
    console.log("CREATE WEBINAR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
