import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Testimonial from "@/models/Testimonial";

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedTestimonial =
      await Testimonial.findByIdAndUpdate(
        params.id,
        {
          name: body.name,
          role: body.role || "",
          content: body.content,
          rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
          displayOrder: Number(body.displayOrder) || 0,
          status: body.status || "approved",
        },
        {
          new: true,
        }
      );

    return NextResponse.json({
      success: true,
      testimonial: updatedTestimonial,
    });
  } catch (error: any) {
    console.log("UPDATE TESTIMONIAL ERROR:", error);

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

export async function PATCH(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();
    const status = body.status === "approved" ? "approved" : "rejected";

    const updatedTestimonial = await Testimonial.findByIdAndUpdate(
      params.id,
      {
        status,
        reviewedAt: new Date(),
      },
      {
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      testimonial: updatedTestimonial,
    });
  } catch (error: any) {
    console.log("REVIEW TESTIMONIAL ERROR:", error);

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

    await Testimonial.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("DELETE TESTIMONIAL ERROR:", error);

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
