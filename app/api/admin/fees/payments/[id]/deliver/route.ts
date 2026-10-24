import { NextResponse } from "next/server";

import {
  extractAdminCredentials,
  getClientIp,
  jsonError,
} from "@/lib/adminFees";
import { deliverApprovedFeeReceipt } from "@/lib/feeDelivery";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

/**
 * Retry fee receipt delivery for APPROVED/SENT payments.
 * Skips channels already marked SENT. Never accepts recipient from client.
 */
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

      const channelRaw = String(body.channel || "both").toLowerCase();
      const channels =
        channelRaw === "email" || channelRaw === "whatsapp"
          ? channelRaw
          : "both";

      const delivered = await deliverApprovedFeeReceipt({
        paymentId: id,
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        ipAddress: getClientIp(req),
        channels,
      });

      const emailFailed = delivered.delivery.email.status === "FAILED";
      const whatsappFailed = delivered.delivery.whatsapp.status === "FAILED";

      return NextResponse.json({
        success: true,
        delivery: delivered.delivery,
        message:
          emailFailed || whatsappFailed
            ? "Delivery retry completed with failures."
            : "Delivery retry completed.",
        payment: {
          ...delivered.payment.toObject(),
          ...delivered.presentation,
        },
      });
    } catch (error) {
      const { body, status } = jsonError(
        error,
        "Failed to deliver fee receipt."
      );
      return NextResponse.json(body, { status });
    }
  }
);
