import { NextResponse } from "next/server";

import {
  ensureFeeAccountForEnrollment,
  extractAdminCredentials,
  findEnrollmentById,
  getClientIp,
  getLedgerSummary,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext } from "@/lib/platform/runtime";

export const runtime = "nodejs";

/** Idempotent create/sync FeeAccount from Enrollment. */
export const POST = withTenantContext(async (req: Request) => {
  try {
    await connectDB();

    const body = await req.json();
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

    const enrollmentId = String(body.enrollmentId || "").trim();
    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, message: "enrollmentId is required." },
        { status: 400 }
      );
    }

    const enrollment = await findEnrollmentById(enrollmentId);
    const { account, created } = await ensureFeeAccountForEnrollment(
      enrollment,
      {
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        createAudit: true,
      }
    );

    const summary = await getLedgerSummary(
      String(enrollment._id),
      Number(account.totalFee || 0)
    );

    return NextResponse.json({
      success: true,
      created,
      account,
      summary,
      ipAddress: getClientIp(req),
    });
  } catch (error) {
    const { body, status } = jsonError(error, "Failed to sync fee account.");
    return NextResponse.json(body, { status });
  }
});
