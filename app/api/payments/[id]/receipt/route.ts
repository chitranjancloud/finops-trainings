import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { moneyLabel } from "@/lib/payments";
import Payment from "@/models/Payment";
import User from "@/models/User";

export async function POST(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const admin = await User.findById(body.userId);

    if (
      !admin ||
      admin.role !== "admin" ||
      !admin.isLoggedIn ||
      admin.sessionToken !== body.sessionToken ||
      admin.activeDevice !== body.deviceId
    ) {
      return NextResponse.json(
        { success: false, message: "Admin session expired" },
        { status: 401 }
      );
    }

    const payment = await Payment.findById(params.id);
    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 }
      );
    }

    const paidAt = payment.paidAt || payment.updatedAt || new Date();
    const receipt = [
      "FinOps Training Payment Receipt",
      `Student: ${payment.name}`,
      `Email: ${payment.email}`,
      `Item: ${payment.itemName}`,
      `Batch: ${payment.batchName || "To be assigned"}`,
      `Received by: FinOps Training`,
      `Paid: ${moneyLabel(payment.paidAmount || payment.amount, payment.currency)}`,
      `Remaining: ${moneyLabel(payment.remainingAmount || 0, payment.currency)}`,
      `Date/Time: ${new Date(paidAt).toLocaleString("en-IN")}`,
      `Payment ID: ${payment.providerPaymentId || payment._id}`,
    ].join("\n");

    payment.receiptSentAt = new Date();
    payment.receiptMessage = receipt;
    payment.status = payment.status === "paid" ? "receipt_sent" : payment.status;
    await payment.save();

    if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
      await fetch(process.env.WHATSAPP_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        },
        body: JSON.stringify({
          to: payment.whatsapp,
          message: receipt,
        }),
      }).catch(console.log);
    }

    await createNotification({
      audience: "user",
      userId: payment.userId,
      type: "payment",
      title: "Receipt sent",
      message: `Receipt for ${payment.itemName} is ready.`,
      link: "/student/report",
      meta: { paymentId: String(payment._id) },
    });

    return NextResponse.json({
      success: true,
      payment,
      receipt,
      whatsappUrl: `https://wa.me/${String(payment.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(receipt)}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send receipt" },
      { status: 500 }
    );
  }
}
