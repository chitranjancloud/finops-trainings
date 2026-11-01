import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { defaultTestimonials } from "@/lib/defaultHomepageContent";
import Enrollment from "@/models/Enrollment";
import Testimonial from "@/models/Testimonial";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);

  if (
    !user ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }

  return user;
}

async function hasEnrollment(user: any) {
  return (
    (await Enrollment.countDocuments({
      $or: [{ userId: String(user._id) }, { email: user.email }],
      status: { $nin: ["rejected", "cancelled", "canceled"] },
    })) > 0
  );
}

export async function GET(req: Request) {
  try {
    await connectDB();

    if ((await Testimonial.countDocuments()) === 0) {
      await Testimonial.insertMany(defaultTestimonials);
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "public";
    const query =
      scope === "admin"
        ? {}
        : {
            $or: [{ status: "approved" }, { status: { $exists: false } }],
          };

    const testimonials = await Testimonial.find(query).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      testimonials,
    });
  } catch (error: any) {
    console.log("GET TESTIMONIALS ERROR:", error);

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

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const isStudentSubmission = body.source === "student";

    if (!body.name || !body.content) {
      return NextResponse.json(
        {
          success: false,
          message: "Name and testimonial content are required",
        },
        {
          status: 400,
        }
      );
    }

    let status = "approved";
    let source = "admin";
    let userId = "";
    let userEmail = "";

    if (isStudentSubmission) {
      const user = await verifySession(
        body.userId || "",
        body.sessionToken || "",
        body.deviceId || ""
      );

      if (!user) {
        return NextResponse.json(
          { success: false, message: "Please login to submit feedback" },
          { status: 401 }
        );
      }

      if (!(await hasEnrollment(user))) {
        return NextResponse.json(
          { success: false, message: "Feedback is available only for enrolled students" },
          { status: 403 }
        );
      }

      status = "pending";
      source = "student";
      userId = String(user._id);
      userEmail = user.email;
    }

    const testimonial = await Testimonial.create({
      name: body.name,
      role: body.role || "",
      content: body.content,
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      displayOrder: Number(body.displayOrder) || 0,
      status,
      source,
      userId,
      userEmail,
    });

    await createNotification({
      audience: "admin",
      type: "testimonial",
      title: isStudentSubmission ? "New testimonial pending" : "Testimonial created",
      message: `${body.name} ${isStudentSubmission ? "submitted feedback for approval" : "was added to testimonials"}.`,
      link: "/admin-page#testimonials",
      meta: { testimonialId: String(testimonial._id) },
    });

    return NextResponse.json({
      success: true,
      testimonial,
    });
  } catch (error: any) {
    console.log("CREATE TESTIMONIAL ERROR:", error);

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
