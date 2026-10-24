import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  formatPresentationDates,
  getTenantTimezone,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Pending-approval fee payments queue. */
export const GET = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const creds = extractAdminCredentials({
      userId: searchParams.get("userId"),
      sessionToken: searchParams.get("sessionToken"),
      deviceId: searchParams.get("deviceId"),
    });

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

    const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 25) || 25)
    );

    const filter = withTenantScope({ receiptStatus: "PENDING_APPROVAL" });
    const total = await FeePayment.countDocuments(filter);
    const payments = await FeePayment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const accountIds = [
      ...new Set(payments.map((item: any) => String(item.feeAccountId || ""))),
    ].filter(Boolean);

    const accounts = await FeeAccount.find(
      withTenantScope({ _id: { $in: accountIds } })
    ).lean();
    const accountMap = new Map(
      accounts.map((account: any) => [String(account._id), account])
    );

    const timeZone = await getTenantTimezone();

    const pending = payments.map((payment: any) => {
      const account = accountMap.get(String(payment.feeAccountId)) || {};
      return {
        id: String(payment._id),
        receiptNumber: payment.receiptNumber,
        enrollmentId: payment.enrollmentId,
        feeAccountId: payment.feeAccountId,
        student: {
          name: account.name || "",
          email: account.email || "",
          whatsapp: account.whatsapp || "",
          userId: account.userId || "",
        },
        course: {
          courseId: account.courseId || "",
          courseName: account.courseName || "",
        },
        batch: {
          batchId: account.batchId || "",
          batchName: account.batchName || "",
        },
        amount: payment.amount,
        totalFee: payment.totalFee,
        previousPaidAmount: payment.previousPaidAmount,
        totalPaidAfterPayment: payment.totalPaidAfterPayment,
        remainingBalanceAfterPayment: payment.remainingBalanceAfterPayment,
        paymentMethod: payment.paymentMethod,
        paidAt: payment.paidAt,
        recordedAt: payment.recordedAt,
        recordedBy: payment.recordedBy,
        recordedByName: payment.recordedByName,
        receiptStatus: payment.receiptStatus,
        createdAt: payment.createdAt,
        ...formatPresentationDates(payment, timeZone),
      };
    });

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pending,
      timeZone,
    });
  } catch (error) {
    const { body, status } = jsonError(
      error,
      "Failed to load pending fee payments."
    );
    return NextResponse.json(body, { status });
  }
});
