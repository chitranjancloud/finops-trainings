import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  formatPresentationDates,
  getClientIp,
  getTenantTimezone,
  jsonError,
  recordManualFeePayment,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

/** Record a manual fee installment (PENDING_APPROVAL — no delivery). */
export const POST = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const body = await req.json();
    const creds = extractAdminCredentials(body);
    const admin = await verifyTenantAdmin(
      creds.userId,
      creds.sessionToken,
      creds.deviceId
    );
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const enrollmentId = String(body.enrollmentId || "").trim();
    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, message: "enrollmentId is required." },
        { status: 400 }
      );
    }

    const { payment, account, snapshot } = await recordManualFeePayment({
      enrollmentId,
      amount: body.amount,
      paidAt: body.paidAt,
      paymentMethod: body.paymentMethod,
      transactionReference: body.transactionReference,
      notes: body.notes,
      proofUrl: body.proofUrl,
      admin,
      ipAddress: getClientIp(req),
    });

    const timeZone = await getTenantTimezone();

    return NextResponse.json({
      success: true,
      deliveryPending: true,
      message:
        "Payment recorded. Receipt is pending approval. Email and WhatsApp were not sent.",
      payment: {
        ...payment.toObject(),
        ...formatPresentationDates(payment, timeZone),
      },
      account,
      snapshot,
      timeZone,
    });
  } catch (error) {
    const { body, status } = jsonError(error, "Failed to record fee payment.");
    return NextResponse.json(body, { status });
  }
});
