import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SessionShowcase from "@/models/SessionShowcase";

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();
    const body = await req.json();
    const session = await SessionShowcase.findByIdAndUpdate(
      params.id,
      {
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
      },
      { new: true }
    );
    return NextResponse.json({ success: true, session });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();
    await SessionShowcase.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
