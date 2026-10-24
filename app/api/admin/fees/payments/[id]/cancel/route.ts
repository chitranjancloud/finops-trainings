import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  findFeePaymentById,
  formatPresentationDates,
  getClientIp,
  getTenantTimezone,
  jsonError,
  writeFeeAuditLog,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import {
  ensureTenantOwnership,
  withTenantContext,
} from "@/lib/platform/runtime";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Cancel a PENDING_APPROVAL payment (excluded from totals). */
export const POST = withTenantContext(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    try {
      await connectDB();

      const body = await req.json();
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

      const cancelReason = String(body.cancelReason || body.reason || "").trim();
      if (!cancelReason) {
        return NextResponse.json(
          { success: false, message: "cancelReason is required." },
          { status: 400 }
        );
      }

      const updated = await FeePayment.findOneAndUpdate(
        ensureTenantOwnership({
          _id: id,
          receiptStatus: "PENDING_APPROVAL",
        }),
        {
          $set: {
            receiptStatus: "CANCELLED",
            cancelledBy: String(admin._id),
            cancelledAt: new Date(),
            cancelReason,
          },
        },
        { new: true }
      );

      if (!updated) {
        const current = await findFeePaymentById(id);
        return NextResponse.json(
          {
            success: false,
            message: `Only PENDING_APPROVAL payments can be cancelled. Current status: ${current.receiptStatus}.`,
            payment: current,
          },
          { status: 409 }
        );
      }

      await writeFeeAuditLog({
        action: "payment_cancelled",
        feePaymentId: String(updated._id),
        feeAccountId: String(updated.feeAccountId),
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        message: `Payment ${updated.receiptNumber} cancelled.`,
        meta: { cancelReason, receiptNumber: updated.receiptNumber },
        ipAddress: getClientIp(req),
      });

      const timeZone = await getTenantTimezone();

      return NextResponse.json({
        success: true,
        payment: {
          ...updated.toObject(),
          ...formatPresentationDates(updated, timeZone),
        },
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to cancel fee payment.");
      return NextResponse.json(body, { status });
    }
  }
);
