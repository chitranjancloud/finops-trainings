import { NextResponse } from "next/server";

import {
  buildReceiptHtml,
  extractAdminCredentials,
  findFeePaymentById,
  getTenantTimezone,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";

export const runtime = "nodejs";

/**
 * Print-ready HTML receipt preview.
 * Does NOT send email/WhatsApp and does NOT change receiptStatus.
 */
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
      );
      if (!account) {
        return NextResponse.json(
          { success: false, message: "Fee account not found for this payment." },
          { status: 404 }
        );
      }

      const timeZone = await getTenantTimezone();
      const html = buildReceiptHtml({ payment, account, timeZone });

      return new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      const { body, status } = jsonError(error, "Failed to load receipt.");
      return NextResponse.json(body, { status });
    }
  }
);
