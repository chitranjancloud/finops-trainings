import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import InternshipApplication from "@/models/InternshipApplication";
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

const allowedStatuses = [
  "Submitted",
  "Under Review",
  "Changes Requested",
  "Approved",
  "Rejected",
];

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const admin = await verifyAdmin(body);

    if (!admin) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const status = String(body.status || "").trim();

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    const application = await InternshipApplication.findByIdAndUpdate(
      id,
      {
        status,
        adminFeedback: String(body.adminFeedback || "").trim(),
        reviewedAt: new Date(),
        reviewedBy: String(admin._id),
      },
      { new: true }
    );

    if (!application) {
      return NextResponse.json(
        { success: false, message: "Internship application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.log("UPDATE INTERNSHIP APPLICATION ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Failed to update internship application" },
      { status: 500 }
    );
  }
}