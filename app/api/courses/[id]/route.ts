import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";

import Course from "@/models/Course";
import User from "@/models/User";

async function isAdminRequest(searchParams: URLSearchParams) {
  if (searchParams.get("includeProtected") !== "1") return false;
  const user = await User.findById(searchParams.get("userId") || "");
  return Boolean(
    user &&
      user.role === "admin" &&
      user.isLoggedIn &&
      user.sessionToken === searchParams.get("sessionToken") &&
      user.activeDevice === searchParams.get("deviceId")
  );
}

function publicCourse(course: any) {
  const item = course?.toObject ? course.toObject() : course;
  if (!item) return item;
  const { videoUrl, pdfUrl, materialUrl, materialTitle, videos, pdfs, materials, ...safe } = item;
  return {
    ...safe,
    hasProtectedContent: Boolean(
      videoUrl ||
        pdfUrl ||
        materialUrl ||
        (Array.isArray(videos) && videos.length) ||
        (Array.isArray(pdfs) && pdfs.length) ||
        (Array.isArray(materials) && materials.length)
    ),
  };
}

// GET SINGLE COURSE
export async function GET(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const includeProtected = await isAdminRequest(searchParams);

    const course =
      await Course.findById(
        params.id
      );

    return NextResponse.json({
      success: true,
      course: includeProtected ? course : publicCourse(course),
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}

// UPDATE COURSE
export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedCourse =
      await Course.findByIdAndUpdate(
        params.id,
        body,
        {
          new: true,
        }
      );

    return NextResponse.json({
      success: true,
      course: updatedCourse,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}

// DELETE COURSE
export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    await Course.findByIdAndDelete(
      params.id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json(
      {
        success: false,
      },
      {
        status: 500,
      }
    );
  }
}
