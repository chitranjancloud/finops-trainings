import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WebinarEvent from "@/models/WebinarEvent";

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedWebinar = await WebinarEvent.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        title: body.title,
        date: body.date,
        time: body.time,
        img: body.img || "",
        role: body.role || "",
        price: body.price || "Free",
        displayOrder: Number(body.displayOrder) || 0,
      },
      {
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      webinar: updatedWebinar,
    });
  } catch (error: any) {
    console.log("UPDATE WEBINAR ERROR:", error);

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

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    await WebinarEvent.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("DELETE WEBINAR ERROR:", error);

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
