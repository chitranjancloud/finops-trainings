import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  findFeeAccountById,
  getClientIp,
  getLedgerSummary,
  jsonError,
  writeFeeAuditLog,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

/** Override FeeAccount.totalFee with audit trail. */
export const PATCH = withTenantContext(
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

      const account = await findFeeAccountById(id);
      const totalFee = Number(body.totalFee);
      const feeOverrideReason = String(body.feeOverrideReason || "").trim();

      if (!Number.isFinite(totalFee) || totalFee <= 0) {
        return NextResponse.json(
          { success: false, message: "totalFee must be greater than zero." },
          { status: 400 }
        );
      }

      if (!feeOverrideReason) {
        return NextResponse.json(
          { success: false, message: "feeOverrideReason is required." },
          { status: 400 }
        );
      }

      const previous = await getLedgerSummary(
        String(account.enrollmentId),
        Number(account.totalFee || 0)
      );

      if (totalFee < previous.totalPaid) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Cannot set totalFee below the amount already committed/paid.",
          },
          { status: 400 }
        );
      }

      const previousTotalFee = Number(account.totalFee || 0);
      account.totalFee = totalFee;
      account.feeSource = "manual_override";
      account.feeOverrideReason = feeOverrideReason;
      account.feeOverrideBy = String(admin._id);
      await account.save();

      await writeFeeAuditLog({
        action: "fee_overridden",
        feeAccountId: String(account._id),
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        message: `Total fee overridden from ${previousTotalFee} to ${totalFee}.`,
        meta: {
          previousTotalFee,
          totalFee,
          feeOverrideReason,
          committedPaid: previous.totalPaid,
        },
        ipAddress: getClientIp(req),
      });

      const summary = await getLedgerSummary(
        String(account.enrollmentId),
        Number(account.totalFee || 0)
      );

      return NextResponse.json({
        success: true,
        account,
        summary,
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to update fee account.");
      return NextResponse.json(body, { status });
    }
  }
);
