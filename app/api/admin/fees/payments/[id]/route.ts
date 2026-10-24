import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  findFeePaymentById,
  formatPresentationDates,
  getTenantTimezone,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";

export const runtime = "nodejs";

/** Complete fee payment detail. */
export const GET = withTenantContext(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const { id } = await params;
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

      const payment = await findFeePaymentById(id);
      const account = await FeeAccount.findOne(
        withTenantScope({ _id: payment.feeAccountId })
      ).lean();

      const timeZone = await getTenantTimezone();

      return NextResponse.json({
        success: true,
        timeZone,
        payment: {
          id: String(payment._id),
          receiptNumber: payment.receiptNumber,
          enrollmentId: payment.enrollmentId,
          feeAccountId: payment.feeAccountId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          transactionReference: payment.transactionReference || "",
          notes: payment.notes || "",
          proofUrl: payment.proofUrl || "",
          totalFee: payment.totalFee,
          previousPaidAmount: payment.previousPaidAmount,
          totalPaidAfterPayment: payment.totalPaidAfterPayment,
          remainingBalanceAfterPayment: payment.remainingBalanceAfterPayment,
          paidAt: payment.paidAt,
          recordedAt: payment.recordedAt,
          recordedBy: payment.recordedBy,
          recordedByName: payment.recordedByName,
          receiptStatus: payment.receiptStatus,
          generatedAt: payment.generatedAt,
          approvedBy: payment.approvedBy || "",
          approvedByName: payment.approvedByName || "",
          approvedAt: payment.approvedAt || null,
          emailStatus: payment.emailStatus,
          emailSentAt: payment.emailSentAt || null,
          emailError: payment.emailError || "",
          whatsappStatus: payment.whatsappStatus,
          whatsappSentAt: payment.whatsappSentAt || null,
          whatsappError: payment.whatsappError || "",
          cancelledBy: payment.cancelledBy || "",
          cancelledAt: payment.cancelledAt || null,
          cancelReason: payment.cancelReason || "",
          source: payment.source,
          linkedPaymentId: payment.linkedPaymentId || "",
          ...formatPresentationDates(payment, timeZone),
        },
        student: account
          ? {
              userId: account.userId || "",
              name: account.name || "",
              email: account.email || "",
              whatsapp: account.whatsapp || "",
            }
          : null,
        course: account
          ? {
              courseId: account.courseId || "",
              courseName: account.courseName || "",
            }
          : null,
        batch: account
          ? {
              batchId: account.batchId || "",
              batchName: account.batchName || "",
            }
          : null,
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to load fee payment.");
      return NextResponse.json(body, { status });
    }
  }
);
