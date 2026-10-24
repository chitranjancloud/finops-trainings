import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Blog from "@/models/Blog";
import User from "@/models/User";

async function verifyAdmin(body: any) {
  const user = await User.findById(body.userId || "");
  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== body.sessionToken ||
    user.activeDevice !== body.deviceId
  ) {
    return null;
  }
  return user;
}

function makeSlug(value: string) {
  return (
    String(value || "blog")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `blog-${Date.now()}`
  );
}

function payload(body: any) {
  const title = String(body.title || "").trim();
  return {
    title,
    slug: makeSlug(body.slug || title),
    excerpt: String(body.excerpt || "").trim(),
    content: String(body.content || "").trim(),
    category: String(body.category || "Training").trim(),
    author: String(body.author || "FinOps Trainings").trim(),
    coverImage: String(body.coverImage || "").trim(),
    tags: Array.isArray(body.tags)
      ? body.tags.map((tag: string) => String(tag).trim()).filter(Boolean)
      : String(body.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    readTime: String(body.readTime || "5 min read").trim(),
    isPublished: body.isPublished !== false,
    featured: body.featured === true,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : new Date(),
  };
}

export async function GET(req: Request, { params }: any) {
  try {
    await connectDB();
    const lookup = params.id.match(/^[a-f\d]{24}$/i)
      ? { $or: [{ _id: params.id }, { slug: params.id }] }
      : { slug: params.id };
    const blog = await Blog.findOne(lookup);

    if (!blog) {
      return NextResponse.json({ success: false, message: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, blog });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyAdmin(body);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const updated = await Blog.findByIdAndUpdate(params.id, payload(body), { new: true });
    return NextResponse.json({ success: true, blog: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const admin = await verifyAdmin(body);
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await Blog.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
