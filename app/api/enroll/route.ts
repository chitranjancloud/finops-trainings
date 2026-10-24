import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";
import User from "@/models/User";

function normalizeLearningMode(value: any) {
  return value === "live" ? "live" : "recorded";
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const {
      userId,
      courseId,
      courseName,
      coursePrice,
      paymentId,
      sessionToken,
      deviceId,
      learningMode: requestedLearningMode,
    } = await req.json();

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
      });
    }

    if (
      !user.isLoggedIn ||
      user.sessionToken !== sessionToken ||
      user.activeDevice !== deviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Session expired. Please login again.",
        },
        { status: 401 }
      );
    }

    const paidPayment = await Payment.findOne({
      _id: paymentId,
      userId: String(user._id),
      itemType: "course",
      status: { $in: ["paid", "receipt_sent"] },
    }).catch(() => null);

    if (!paidPayment) {
      return NextResponse.json(
        {
          success: false,
          message: "Payment required before enrollment.",
        },
        { status: 402 }
      );
    }

    const learningMode = normalizeLearningMode(requestedLearningMode);
    const enrollment = await Enrollment.create({
      userId,
      courseId,
      courseName,
      coursePrice,
      learningMode,
      name: user.name,
      email: user.email,
      whatsapp: paidPayment.whatsapp,
      paymentId: String(paidPayment._id),
      paidAmount: paidPayment.paidAmount || paidPayment.amount,
      remainingAmount: paidPayment.remainingAmount || 0,
      status: learningMode === "live" ? "Waiting For Batch Assignment" : "enrolled",
      createdAt: new Date(),
    });

    await createNotification({
      audience: "admin",
      type: "enrollment",
      title: "New paid course enrollment",
      message: `${user.name} enrolled in ${courseName}.`,
      link: "/admin-page#enrolled-students",
      meta: { enrollmentId: String(enrollment._id), paymentId },
    });

    return NextResponse.json({
      success: true,
      enrollment,
    });
  } catch {
    return NextResponse.json({
      success: false,
      message: "Error enrolling",
    });
  }
}
