import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  derivePaymentStatus,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";
import FeePayment from "@/models/FeePayment";
import { COUNTABLE_RECEIPT_STATUSES, calculateRemaining } from "@/lib/fees";

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

    // The overview badge needs a count, not every student's financial ledger.
    if (searchParams.get("view") === "approvals") {
      const pendingApprovalCount = await FeePayment.countDocuments(
        withTenantScope({ receiptStatus: "PENDING_APPROVAL" })
      );
      return NextResponse.json({ success: true, dashboard: { pendingApprovalCount } });
    }

    // Fetch ledger totals once for the tenant, instead of one round trip per account.
    const [accounts, ledgers] = await Promise.all([
      FeeAccount.find(withTenantScope()).select("enrollmentId totalFee").lean(),
      FeePayment.aggregate<{ _id: string; totalPaid: number; pendingCount: number }>([
        { $match: withTenantScope({ receiptStatus: { $in: [...COUNTABLE_RECEIPT_STATUSES] } }) },
        { $group: {
          _id: "$enrollmentId",
          totalPaid: { $sum: "$amount" },
          pendingCount: { $sum: { $cond: [{ $eq: ["$receiptStatus", "PENDING_APPROVAL"] }, 1, 0] } },
        } },
      ]),
    ]);
    const ledgerByEnrollment = new Map(ledgers.map(ledger => [String(ledger._id), ledger]));
    const pendingApprovalCount = ledgers.reduce((sum, ledger) => sum + ledger.pendingCount, 0);

    let totalFeeAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let fullyPaidStudents = 0;
    let partiallyPaidStudents = 0;
    let unpaidStudents = 0;

    for (const account of accounts) {
      const ledger = ledgerByEnrollment.get(String(account.enrollmentId));
      const totalFee = Number(account.totalFee || 0);
      const totalPaid = Number(ledger?.totalPaid || 0);
      const summary = {
        totalFee,
        totalPaid,
        remainingAmount: calculateRemaining(totalFee, totalPaid),
        paymentStatus: derivePaymentStatus(totalFee, totalPaid, ledger?.pendingCount || 0),
      };

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
