import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
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
  const item = course.toObject ? course.toObject() : course;
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

// ======================
// GET ALL COURSES
// ======================

export async function GET(req: Request) {
  try {
    // CONNECT DATABASE
    await connectDB();
    const { searchParams } = new URL(req.url);
    const includeProtected = await isAdminRequest(searchParams);

    // FETCH COURSES
    const courses = await Course.find().sort({
      createdAt: -1,
    }).lean();

    // SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      courses: includeProtected ? courses : courses.map(publicCourse),
    });
  } catch (error: any) {
    console.log("GET COURSES ERROR:", error);

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

// ======================
// CREATE COURSE
// ======================

export async function POST(req: Request) {
  try {
    // CONNECT DATABASE
    await connectDB();

    // GET BODY DATA
    const body = await req.json();

    // CREATE COURSE
    const course = await Course.create(body);

    await createNotification({
      audience: "admin",
      type: "course",
      title: "Course created",
      message: `${course.title || "New course"} was added.`,
      link: "/admin-page#courses",
      meta: { courseId: String(course._id) },
    });

    await createNotification({
      audience: "user",
      type: "course",
      title: "New course added",
      message: `${course.title || "A new course"} is available now.`,
      link: "/",
      meta: { courseId: String(course._id) },
    });

    // SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error: any) {
    console.log("CREATE COURSE ERROR:", error);

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
