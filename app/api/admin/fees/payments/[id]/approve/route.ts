import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  findFeePaymentById,
  getClientIp,
  jsonError,
  writeFeeAuditLog,
} from "@/lib/adminFees";
import { deliverApprovedFeeReceipt } from "@/lib/feeDelivery";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import {
  ensureTenantOwnership,
  withTenantContext,
} from "@/lib/platform/runtime";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Approve pending fee payment, then attempt email + WhatsApp delivery. */
export const POST = withTenantContext(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB();

      const body = await req.json().catch(() => ({}));
      const { id } = await params;
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

      const approvedAt = new Date();
      const updated = await FeePayment.findOneAndUpdate(
        ensureTenantOwnership({
          _id: id,
          receiptStatus: "PENDING_APPROVAL",
        }),
        {
          $set: {
            receiptStatus: "APPROVED",
            approvedBy: String(admin._id),
            approvedByName: String(admin.name || ""),
            approvedAt,
          },
        },
        { new: true }
      );

      let paymentDoc = updated;
      let alreadyProcessed = false;

      if (!updated) {
        const current = await findFeePaymentById(id);
        if (
          current.receiptStatus !== "APPROVED" &&
          current.receiptStatus !== "SENT"
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Payment cannot be approved from status: ${current.receiptStatus}.`,
              payment: current,
            },
            { status: 409 }
          );
        }
        paymentDoc = current;
        alreadyProcessed = true;
      } else {
        await writeFeeAuditLog({
          action: "payment_approved",
          feePaymentId: String(updated._id),
          feeAccountId: String(updated.feeAccountId),
          actorId: String(admin._id),
          actorName: String(admin.name || ""),
          message: `Payment ${updated.receiptNumber} approved.`,
          meta: {
            receiptNumber: updated.receiptNumber,
            approvedAt: approvedAt.toISOString(),
          },
          ipAddress: getClientIp(req),
        });
      }

      const delivered = await deliverApprovedFeeReceipt({
        paymentId: String(paymentDoc._id),
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        ipAddress: getClientIp(req),
        channels: "both",
      });

      const emailFailed = delivered.delivery.email.status === "FAILED";
      const whatsappFailed = delivered.delivery.whatsapp.status === "FAILED";
      const anyFailed = emailFailed || whatsappFailed;
      const bothSent =
        delivered.delivery.email.status === "SENT" &&
        delivered.delivery.whatsapp.status === "SENT";

      return NextResponse.json({
        success: true,
        alreadyProcessed,
        deliveryPending: false,
        delivery: delivered.delivery,
        message: alreadyProcessed
          ? anyFailed
            ? "Payment was already approved. Receipt delivery retry completed with failures."
            : "Payment was already approved. Receipt delivery is up to date."
          : anyFailed
            ? "Payment approved, but receipt delivery failed."
            : bothSent
              ? "Payment approved. Receipt sent by email and WhatsApp."
              : "Payment approved. Receipt delivery completed.",
        payment: {
          ...delivered.payment.toObject(),
          ...delivered.presentation,
        },
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to approve fee payment.");
      return NextResponse.json(body, { status });
    }
  }
);
