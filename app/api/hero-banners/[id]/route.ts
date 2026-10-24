import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import HeroBanner from "@/models/HeroBanner";

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();

    const banner = await HeroBanner.findByIdAndUpdate(
      params.id,
      {
        eyebrow: body.eyebrow || "",
        title: body.title,
        description: body.description || "",
        image: body.image || "",
        ctaLabel: body.ctaLabel || "Explore",
        ctaHref: body.ctaHref || "/courses/pl-300",
        badge: body.badge || "",
        accent: body.accent || "cyan",
        displayOrder: Number(body.displayOrder) || 0,
        isActive: body.isActive !== false,
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error: any) {
    console.log("UPDATE HERO BANNER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();

    await HeroBanner.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("DELETE HERO BANNER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
