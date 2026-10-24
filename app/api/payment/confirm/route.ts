import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { verifyRazorpaySignature } from "@/lib/payments";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";
import User from "@/models/User";
import Webinar from "@/models/Webinar";
import Course from "@/models/Course";

function normalizeLearningMode(value: any) {
  return value === "live" ? "live" : "recorded";
}

function courseMedia(course: any) {
  return {
    videoUrl: course?.videoUrl || "",
    pdfUrl: course?.pdfUrl || "",
    materialUrl: course?.materialUrl || "",
    materialTitle: course?.materialTitle || "",
    videos: course?.videos || [],
    pdfs: course?.pdfs || [],
    materials: course?.materials || [],
  };
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const user = await User.findById(body.userId);

    if (
      !user ||
      !user.isLoggedIn ||
      user.sessionToken !== body.sessionToken ||
      user.activeDevice !== body.deviceId
    ) {
      return NextResponse.json(
        { success: false, message: "Session expired. Please login again." },
        { status: 401 }
      );
    }

    const payment = await Payment.findById(body.paymentId);
    if (!payment || String(payment.userId) !== String(user._id)) {
      return NextResponse.json(
        { success: false, message: "Payment record not found" },
        { status: 404 }
      );
    }

    const orderId = body.razorpay_order_id || payment.providerOrderId;
    const providerPaymentId =
      body.razorpay_payment_id || `test_payment_${Date.now()}`;
    const signature = body.razorpay_signature || "";

    if (
      payment.provider === "razorpay" &&
      !verifyRazorpaySignature(orderId, providerPaymentId, signature)
    ) {
      payment.status = "failed";
      await payment.save();

      return NextResponse.json(
        { success: false, message: "Payment verification failed" },
        { status: 400 }
      );
    }

    payment.providerPaymentId = providerPaymentId;
    payment.providerOrderId = orderId;
    payment.providerSignature = signature;
    payment.paidAmount = payment.amount;
    payment.remainingAmount = 0;
    payment.status = "paid";
    payment.paidAt = new Date();

    let enrollment = null;
    let webinarRegistration = null;
    let media = null;

    if (payment.itemType === "course") {
      const learningMode = normalizeLearningMode(body.learningMode || payment.receiptMessage);
      const course =
        (await Course.findOne({ slug: payment.itemId })) ||
        (await Course.findById(payment.itemId).catch(() => null));
      if (learningMode === "recorded") media = courseMedia(course);
      enrollment = await Enrollment.findOneAndUpdate(
        {
          userId: String(user._id),
          $or: [
            { courseId: payment.itemId },
            { courseName: payment.itemName },
          ],
        },
        {
          userId: String(user._id),
          courseId: payment.itemId,
          courseName: payment.itemName,
          coursePrice: String(payment.amount),
          learningMode,
          name: user.name,
          email: user.email,
          whatsapp: payment.whatsapp,
          paymentId: String(payment._id),
          paidAmount: payment.amount,
          remainingAmount: 0,
          status: learningMode === "live" ? "Waiting For Batch Assignment" : "enrolled",
          createdAt: new Date(),
        },
        { new: true, upsert: true }
      );
      payment.enrollmentId = String(enrollment._id);
    }

    if (payment.itemType === "webinar") {
      webinarRegistration = await Webinar.create({
        userId: String(user._id),
        webinarId: payment.itemId,
        webinarTitle: payment.itemName,
        name: user.name,
        email: user.email,
        whatsapp: payment.whatsapp,
        price: String(payment.amount),
        paidAmount: payment.amount,
        remainingAmount: 0,
        paymentId: String(payment._id),
        date: new Date().toISOString(),
      });
      payment.webinarRegistrationId = String(webinarRegistration._id);
    }

    await payment.save();

    await createNotification({
      audience: "admin",
      type: "payment",
      title: "Payment received",
      message: `${user.name} paid for ${payment.itemName}.`,
      link: "/admin-page/fees",
      meta: { paymentId: String(payment._id) },
    });

    await createNotification({
      audience: "user",
      userId: String(user._id),
      type: "payment",
      title: "Payment successful",
      message: `Your payment for ${payment.itemName} is confirmed.`,
      link: payment.itemType === "course" ? `/courses/${payment.itemId}` : "/learning/upcoming-webinars",
      meta: { paymentId: String(payment._id) },
    });

    return NextResponse.json({
      success: true,
      payment,
      enrollment,
      media,
      webinarRegistration,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Payment confirmation failed" },
      { status: 500 }
    );
  }
}
