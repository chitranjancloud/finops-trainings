import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import InternshipApplication from "@/models/InternshipApplication";
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

async function verifyStudent(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);

  if (
    !user ||
    user.role !== "user" ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }

  return user;
}

function clean(value: any) {
  return String(value || "").trim();
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const query: any = {};

    if (status && status !== "All") query.status = status;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { interestedPosition: regex },
        { currentEducation: regex },
        { skills: regex },
        { status: regex },
      ];
    }

    const applications = await InternshipApplication.find(query).sort({
      applicationDate: -1,
      createdAt: -1,
    });

    return NextResponse.json({ success: true, applications });
  } catch (error: any) {
    console.log("GET INTERNSHIP APPLICATIONS ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Failed to load internship applications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const student = await verifyStudent(
      clean(body.userId),
      clean(body.sessionToken),
      clean(body.deviceId)
    );

    if (!student) {
      return NextResponse.json(
        { success: false, message: "Please login before applying for internships." },
        { status: 401 }
      );
    }

    const email = clean(body.email).toLowerCase();
    const enrollment = await Enrollment.findOne({
      $or: [{ userId: String(student._id) }, { email }],
    });

    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be enrolled in a course before applying for internships.",
        },
        { status: 403 }
      );
    }

    const payload = {
      userId: String(student._id),
      fullName: clean(body.fullName),
      email,
      phone: clean(body.phone),
      interestedPosition: clean(body.interestedPosition),
      currentEducation: clean(body.currentEducation),
      skills: clean(body.skills),
      resumeUrl: clean(body.resumeUrl),
      resumeName: clean(body.resumeName),
      additionalMessage: clean(body.additionalMessage),
      status: "Submitted",
      applicationDate: new Date(),
    };

    if (
      !payload.fullName ||
      !payload.email ||
      !payload.phone ||
      !payload.interestedPosition ||
      !payload.currentEducation ||
      !payload.skills ||
      !payload.resumeUrl
    ) {
      return NextResponse.json(
        { success: false, message: "All required fields and resume upload are required." },
        { status: 400 }
      );
    }

    const application = await InternshipApplication.create(payload);

    return NextResponse.json({ success: true, application }, { status: 201 });
  } catch (error: any) {
    console.log("CREATE INTERNSHIP APPLICATION ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit internship application" },
      { status: 500 }
    );
  }
}