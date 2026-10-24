import { NextResponse } from "next/server";
import Razorpay from "razorpay";

import { connectDB } from "@/lib/mongodb";
import { parseMoney } from "@/lib/payments";
import Course from "@/models/Course";
import Payment from "@/models/Payment";
import User from "@/models/User";
import WebinarEvent from "@/models/WebinarEvent";

function normalizeLearningMode(value: any) {
  return value === "live" ? "live" : "recorded";
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

    if (!body.whatsapp || String(body.whatsapp).trim().length < 8) {
      return NextResponse.json(
        { success: false, message: "WhatsApp number is required" },
        { status: 400 }
      );
    }

    let item: any = null;
    if (body.itemType === "course") {
      item =
        (await Course.findOne({ slug: body.itemId })) ||
        (await Course.findById(body.itemId).catch(() => null));
    }
    if (body.itemType === "webinar") {
      item = await WebinarEvent.findById(body.itemId).catch(() => null);
    }

    const itemName = item?.title || body.itemName || "FinOps Training";
    const learningMode = normalizeLearningMode(body.learningMode);
    const modePrice =
      body.itemType === "course"
        ? learningMode === "live"
          ? item?.livePrice
          : item?.recordedPrice
        : "";
    const amount = parseMoney(modePrice || item?.price || body.amount || body.price || 0);
    const payableAmount = amount > 0 ? amount : 0;
    const provider = process.env.PAYMENT_PROVIDER || "razorpay";
    const receipt = `finops_${body.itemType}_${Date.now()}`;
    const hasRazorpayKeys =
      provider === "razorpay" &&
      process.env.RAZORPAY_KEY_ID &&
      process.env.RAZORPAY_KEY_SECRET &&
      payableAmount > 0;

    let order: any = {
      id: `test_order_${Date.now()}`,
      amount: payableAmount * 100,
      currency: "INR",
      receipt,
    };

    if (hasRazorpayKeys) {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || "",
        key_secret: process.env.RAZORPAY_KEY_SECRET || "",
      });

      order = await razorpay.orders.create({
        amount: Math.max(payableAmount * 100, 100),
        currency: "INR",
        receipt,
      });
    }

    const payment = await Payment.create({
      userId: String(user._id),
      name: user.name,
      email: user.email,
      whatsapp: String(body.whatsapp).trim(),
      itemType: body.itemType,
      itemId: body.itemId,
      itemName,
      courseName: body.itemType === "course" ? itemName : "",
      amount: payableAmount,
      paidAmount: 0,
      remainingAmount: payableAmount,
      currency: order.currency || "INR",
      provider,
      providerOrderId: order.id,
      status: "created",
      ...(body.itemType === "course" ? { receiptMessage: learningMode } : {}),
    });

    return NextResponse.json({
      success: true,
      key:
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY ||
        process.env.RAZORPAY_KEY_ID ||
        "",
      order,
      paymentId: String(payment._id),
      amount: payableAmount,
      learningMode,
    });
  } catch (error: any) {
    console.error("PAYMENT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Payment failed" },
      { status: 500 }
    );
  }
}
