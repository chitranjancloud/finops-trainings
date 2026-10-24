import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SessionShowcase from "@/models/SessionShowcase";

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const filter = all ? {} : { isActive: true };
    const sessions = await SessionShowcase.find(filter)
      .sort({ displayOrder: 1, createdAt: -1 });
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const session = await SessionShowcase.create({
      title: body.title?.trim() || "",
      subtitle: body.subtitle?.trim() || "",
      description: body.description?.trim() || "",
      category: body.category?.trim() || "Training",
      date: body.date?.trim() || "",
      location: body.location?.trim() || "",
      attendees: body.attendees?.trim() || "",
      duration: body.duration?.trim() || "",
      images: (body.images || []).filter(Boolean),
      coverImage: body.coverImage?.trim() || "",
      highlights: (body.highlights || []).filter((h: string) => h?.trim()),
      tags: (body.tags || []).filter((t: string) => t?.trim()),
      instructor: body.instructor?.trim() || "",
      isActive: body.isActive !== false,
      isFeatured: body.isFeatured === true,
      displayOrder: Number(body.displayOrder || 0),
    });
    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
