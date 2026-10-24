import { NextResponse } from "next/server";

import {
  ensureFeeAccountForEnrollment,
  extractAdminCredentials,
  getLedgerSummary,
  jsonError,
} from "@/lib/adminFees";
import { verifyTenantAdmin } from "@/lib/auth/tenantSession";
import { connectDB } from "@/lib/mongodb";
import { withTenantContext, withTenantScope } from "@/lib/platform/runtime";
import Enrollment from "@/models/Enrollment";
import FeePayment from "@/models/FeePayment";

export const runtime = "nodejs";

/** Paginated fee-management student/enrollment list. */
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

    const search = String(searchParams.get("search") || "").trim();
    const courseId = String(searchParams.get("courseId") || "").trim();
    const batchId = String(searchParams.get("batchId") || "").trim();
    const paymentStatus = String(searchParams.get("paymentStatus") || "")
      .trim()
      .toUpperCase();
    const page = Math.max(1, Number(searchParams.get("page") || 1) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") || 25) || 25)
    );

    const enrollmentFilter: Record<string, unknown> = {};
    if (courseId) enrollmentFilter.courseId = courseId;
    if (batchId) enrollmentFilter.batchId = batchId;

    if (search) {
      const receiptMatches = await FeePayment.find(
        withTenantScope({
          receiptNumber: { $regex: search, $options: "i" },
        })
      )
        .select("enrollmentId")
        .lean();

      const enrollmentIdsFromReceipts = [
        ...new Set(
          receiptMatches.map((item: any) => String(item.enrollmentId || ""))
        ),
      ].filter(Boolean);

      enrollmentFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { whatsapp: { $regex: search, $options: "i" } },
        ...(enrollmentIdsFromReceipts.length
          ? [{ _id: { $in: enrollmentIdsFromReceipts } }]
          : []),
      ];
    }

    const enrollments = await Enrollment.find(
      withTenantScope(enrollmentFilter)
    )
      .sort({ createdAt: -1 })
      .lean();

    const rows = [];

    for (const enrollment of enrollments) {
      const { account } = await ensureFeeAccountForEnrollment(enrollment, {
        actorId: String(admin._id),
        actorName: String(admin.name || ""),
        createAudit: true,
      });

      const summary = await getLedgerSummary(
        String(enrollment._id),
        Number(account.totalFee || 0)
      );

      if (paymentStatus && summary.paymentStatus !== paymentStatus) {
        continue;
      }

      rows.push({
        enrollmentId: String(enrollment._id),
        feeAccountId: String(account._id),
        student: {
          userId: String(enrollment.userId || account.userId || ""),
          name: enrollment.name || account.name || "",
          email: enrollment.email || account.email || "",
          whatsapp: enrollment.whatsapp || account.whatsapp || "",
        },
        course: {
          courseId: enrollment.courseId || account.courseId || "",
          courseName: enrollment.courseName || account.courseName || "",
        },
        batch: {
          batchId: enrollment.batchId || account.batchId || "",
          batchName: enrollment.batchName || account.batchName || "",
        },
        totalFee: summary.totalFee,
        totalPaid: summary.totalPaid,
        remainingAmount: summary.remainingAmount,
        paymentStatus: summary.paymentStatus,
        pendingPaymentCount: summary.pendingCount,
        currency: account.currency || "INR",
      });
    }

    const total = rows.length;
    const start = (page - 1) * limit;
    const students = rows.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      students,
    });
  } catch (error) {
    const { body, status } = jsonError(error, "Failed to load fee students.");
    return NextResponse.json(body, { status });
  }
});
