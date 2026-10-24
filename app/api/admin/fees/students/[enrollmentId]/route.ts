import { NextResponse } from "next/server";

import {
  ensureFeeAccountForEnrollment,
  extractAdminCredentials,
  findEnrollmentById,
  formatPresentationDates,
  getLedgerSummary,
  getTenantTimezone,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Complete fee profile for one enrollment. */
export const GET = withTenantContext(
  async (req: Request, { params }: { params: Promise<{ enrollmentId: string }> }) => {
    try {
      await connectDB();

      const { searchParams } = new URL(req.url);
      const { enrollmentId } = await params;
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

      const enrollment = await findEnrollmentById(enrollmentId);
      const { account } = await ensureFeeAccountForEnrollment(enrollment, {
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        createAudit: true,
      });

      const summary = await getLedgerSummary(
        String(enrollment._id),
        Number(account.totalFee || 0)
      );

      const timeZone = await getTenantTimezone();
      const payments = await FeePayment.find(
        withTenantScope({ enrollmentId: String(enrollment._id) })
      )
        .sort({ paidAt: -1, createdAt: -1 })
        .lean();

      const paymentHistory = payments.map((payment: any) => ({
        id: String(payment._id),
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference || "",
        notes: payment.notes || "",
        proofUrl: payment.proofUrl || "",
        paidAt: payment.paidAt,
        recordedAt: payment.recordedAt,
        recordedBy: payment.recordedBy,
        recordedByName: payment.recordedByName,
        receiptStatus: payment.receiptStatus,
        approvedAt: payment.approvedAt || null,
        approvedBy: payment.approvedBy || "",
        approvedByName: payment.approvedByName || "",
        emailStatus: payment.emailStatus,
        whatsappStatus: payment.whatsappStatus,
        previousPaidAmount: payment.previousPaidAmount,
        totalPaidAfterPayment: payment.totalPaidAfterPayment,
        remainingBalanceAfterPayment: payment.remainingBalanceAfterPayment,
        ...formatPresentationDates(payment, timeZone),
      }));

      return NextResponse.json({
        success: true,
        profile: {
          student: {
            userId: String(enrollment.userId || account.userId || ""),
            name: enrollment.name || account.name || "",
            email: enrollment.email || account.email || "",
            whatsapp: enrollment.whatsapp || account.whatsapp || "",
          },
          enrollment: {
            enrollmentId: String(enrollment._id),
            courseId: enrollment.courseId || account.courseId || "",
            courseName: enrollment.courseName || account.courseName || "",
            batchId: enrollment.batchId || account.batchId || "",
            batchName: enrollment.batchName || account.batchName || "",
            learningMode:
              enrollment.learningMode || account.learningMode || "recorded",
            enrollmentStatus:
              enrollment.status || account.enrollmentStatus || "",
            enrolledAt: enrollment.createdAt || account.enrolledAt || null,
          },
          fee: {
            feeAccountId: String(account._id),
            totalFee: summary.totalFee,
            totalPaid: summary.totalPaid,
            remainingAmount: summary.remainingAmount,
            paymentStatus: summary.paymentStatus,
            currency: account.currency || "INR",
            feeSource: account.feeSource,
            pendingPaymentCount: summary.pendingCount,
          },
          paymentHistory,
          timeZone,
        },
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to load fee profile.");
      return NextResponse.json(body, { status });
    }
  }
);
