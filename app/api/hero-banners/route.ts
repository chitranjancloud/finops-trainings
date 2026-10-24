import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { defaultHeroBanners } from "@/lib/defaultHomepageContent";
import HeroBanner from "@/models/HeroBanner";

export async function GET() {
  try {
    await connectDB();

    if ((await HeroBanner.countDocuments()) === 0) {
      await HeroBanner.insertMany(defaultHeroBanners);
    }

    const banners = await HeroBanner.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error: any) {
    console.log("GET HERO BANNERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner title is required",
        },
        { status: 400 }
      );
    }

    const banner = await HeroBanner.create({
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
    });

    await createNotification({
      audience: "admin",
      type: "banner",
      title: "Hero banner created",
      message: `${banner.title} was added to homepage banners.`,
      link: "/admin-page#hero-banners",
    });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error: any) {
    console.log("CREATE HERO BANNER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
