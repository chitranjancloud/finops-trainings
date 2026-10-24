import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Blog from "@/models/Blog";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }
  return user;
}

function makeSlug(value: string) {
  const base = String(value || "blog")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return base || `blog-${Date.now()}`;
}

function blogPayload(body: any) {
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

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    if (
      all &&
      !(await verifyAdmin(
        searchParams.get("userId") || "",
        searchParams.get("sessionToken") || "",
        searchParams.get("deviceId") || ""
      ))
    ) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const query = all ? {} : { isPublished: true };
    const blogs = await Blog.find(query).sort({
      featured: -1,
      publishedAt: -1,
      createdAt: -1,
    });

    return NextResponse.json({ success: true, blogs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load blogs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const admin = await verifyAdmin(body.userId || "", body.sessionToken || "", body.deviceId || "");
    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = blogPayload(body);
    if (!payload.title) {
      return NextResponse.json({ success: false, message: "Title is required" }, { status: 400 });
    }

    const existing = await Blog.findOne({ slug: payload.slug });
    if (existing) payload.slug = `${payload.slug}-${Date.now().toString(36)}`;

    const blog = await Blog.create(payload);
    return NextResponse.json({ success: true, blog }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save blog" },
      { status: 500 }
    );
  }
}
