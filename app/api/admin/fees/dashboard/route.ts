import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  getLedgerSummary,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Admin fee dashboard summary — server-side ledger calculations only. */
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

    const accounts = await FeeAccount.find(withTenantScope()).lean();
    const pendingApprovalCount = await FeePayment.countDocuments(
      withTenantScope({ receiptStatus: "PENDING_APPROVAL" })
    );

    let totalFeeAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let fullyPaidStudents = 0;
    let partiallyPaidStudents = 0;
    let unpaidStudents = 0;

    for (const account of accounts) {
      const summary = await getLedgerSummary(
        String(account.enrollmentId),
        Number(account.totalFee || 0)
      );

      totalFeeAmount += summary.totalFee;
      totalPaidAmount += summary.totalPaid;
      totalOutstandingAmount += summary.remainingAmount;

      if (summary.paymentStatus === "FULLY_PAID") fullyPaidStudents += 1;
      else if (
        summary.paymentStatus === "PARTIALLY_PAID" ||
        summary.paymentStatus === "PENDING_APPROVAL"
      ) {
        partiallyPaidStudents += 1;
      } else unpaidStudents += 1;
    }

    return NextResponse.json({
      success: true,
      dashboard: {
        totalStudents: accounts.length,
        fullyPaidStudents,
        partiallyPaidStudents,
        unpaidStudents,
        pendingApprovalCount,
        totalFeeAmount,
        totalPaidAmount,
        totalOutstandingAmount,
      },
    });
  } catch (error) {
    const { body, status } = jsonError(error, "Failed to load fee dashboard.");
    return NextResponse.json(body, { status });
  }
});
