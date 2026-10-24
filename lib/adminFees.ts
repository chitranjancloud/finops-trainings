import mongoose from "mongoose";

import {
  DEFAULT_TIMEZONE,
  formatDateTime,
} from "@/lib/dates";
import {
  calculatePaymentSnapshot,
  calculateRemaining,
  calculateTotalPaid,
  COUNTABLE_RECEIPT_STATUSES,
  getNextReceiptNumber,
  type FeePaymentLike,
} from "@/lib/fees";
import { moneyLabel, parseMoney } from "@/lib/payments";
import {
  requireTenantId,
  stampTenantId,
  withTenantScope,
} from "@/lib/platform/runtime";
import Enrollment from "@/models/Enrollment";
import FeeAccount from "@/models/FeeAccount";
import FeeAuditLog from "@/models/FeeAuditLog";
import FeePayment from "@/models/FeePayment";
import Course from "@/models/Course";
import TenantSettings from "@/models/TenantSettings";

export const PAYMENT_METHODS = [
  "cash",
  "upi",
  "bank_transfer",
  "card",
  "razorpay",
  "other",
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentStatusLabel =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "FULLY_PAID"
  | "PENDING_APPROVAL";

export class FeeApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FeeApiError";
    this.status = status;
  }
}

export function extractAdminCredentials(source: {
  userId?: string | null;
  sessionToken?: string | null;
  deviceId?: string | null;
}) {
  return {
    userId: String(source.userId || "").trim(),
    sessionToken: String(source.sessionToken || "").trim(),
    deviceId: String(source.deviceId || "").trim(),
  };
}

export function parsePositiveAmount(value: unknown): number {
  if (typeof value === "string" && value.trim() === "") {
    throw new FeeApiError("Payment amount is required.");
  }

  const amount = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(amount)) {
    throw new FeeApiError("Payment amount must be a valid number.");
  }

  if (amount <= 0) {
    throw new FeeApiError("Payment amount must be greater than zero.");
  }

  return amount;
}

export function parsePaidAt(value: unknown): Date {
  if (value === undefined || value === null || value === "") {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new FeeApiError("paidAt must be a valid date/time.");
  }

  return date;
}

export function parsePaymentMethod(value: unknown): PaymentMethod {
  const method = String(value || "").trim().toLowerCase();
  if (!PAYMENT_METHODS.includes(method as PaymentMethod)) {
    throw new FeeApiError(
      "paymentMethod must be one of: cash, upi, bank_transfer, card, razorpay, other."
    );
  }
  return method as PaymentMethod;
}

export async function getTenantTimezone(): Promise<string> {
  const tenantId = requireTenantId();
  const settings = await TenantSettings.findOne({ tenantId })
    .select("timezone")
    .lean();
  return String(settings?.timezone || DEFAULT_TIMEZONE);
}

export function derivePaymentStatus(
  totalFee: number,
  totalPaid: number,
  pendingCount = 0
): PaymentStatusLabel {
  if (pendingCount > 0 && totalPaid < totalFee) {
    return "PENDING_APPROVAL";
  }
  if (totalFee <= 0) return "UNPAID";
  if (totalPaid <= 0) return "UNPAID";
  if (totalPaid >= totalFee) return "FULLY_PAID";
  return "PARTIALLY_PAID";
}

export async function writeFeeAuditLog(input: {
  action: string;
  feePaymentId?: string;
  feeAccountId?: string;
  actorId?: string;
  actorName?: string;
  message?: string;
  meta?: Record<string, unknown> | null;
  ipAddress?: string;
}) {
  await FeeAuditLog.create(
    stampTenantId({
      action: input.action,
      feePaymentId: input.feePaymentId || "",
      feeAccountId: input.feeAccountId || "",
      actorId: input.actorId || "",
      actorName: input.actorName || "",
      message: input.message || "",
      meta: input.meta || null,
      ipAddress: input.ipAddress || "",
    })
  );
}

export async function findEnrollmentById(enrollmentId: string) {
  const id = String(enrollmentId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new FeeApiError("A valid enrollmentId is required.", 400);
  }

  const enrollment = await Enrollment.findOne(withTenantScope({ _id: id }));
  if (!enrollment) {
    throw new FeeApiError("Enrollment not found.", 404);
  }

  return enrollment;
}

export function resolveTotalFeeFromEnrollment(enrollment: any, course?: any) {
  const fromEnrollment = parseMoney(enrollment?.coursePrice);
  if (fromEnrollment > 0) return fromEnrollment;

  const learningMode =
    enrollment?.learningMode === "live" ? "live" : "recorded";
  const modePrice =
    learningMode === "live" ? course?.livePrice : course?.recordedPrice;
  const fromCourse = parseMoney(modePrice || course?.price);
  return fromCourse > 0 ? fromCourse : 0;
}

async function loadCourseForEnrollment(enrollment: any) {
  const courseId = String(enrollment.courseId || "").trim();
  if (!courseId) return null;

  if (mongoose.Types.ObjectId.isValid(courseId)) {
    const byId = await Course.findOne(withTenantScope({ _id: courseId })).catch(
      () => null
    );
    if (byId) return byId;
  }

  return Course.findOne(
    withTenantScope({
      $or: [{ slug: courseId }, { title: enrollment.courseName }],
    })
  ).catch(() => null);
}

export async function ensureFeeAccountForEnrollment(
  enrollment: any,
  options?: { actorId?: string; actorName?: string; createAudit?: boolean }
) {
  const enrollmentId = String(enrollment._id);
  const existing = await FeeAccount.findOne(
    withTenantScope({ enrollmentId })
  );

  if (existing) {
    const syncFields: Record<string, unknown> = {};
    if (enrollment.batchId && existing.batchId !== String(enrollment.batchId)) {
      syncFields.batchId = String(enrollment.batchId || "");
    }
    if (
      enrollment.batchName &&
      existing.batchName !== String(enrollment.batchName)
    ) {
      syncFields.batchName = String(enrollment.batchName || "");
    }
    if (
      enrollment.status &&
      existing.enrollmentStatus !== String(enrollment.status)
    ) {
      syncFields.enrollmentStatus = String(enrollment.status || "");
    }
    if (enrollment.name && existing.name !== enrollment.name) {
      syncFields.name = enrollment.name;
    }
    if (enrollment.email && existing.email !== enrollment.email) {
      syncFields.email = enrollment.email;
    }
    if (enrollment.whatsapp && existing.whatsapp !== enrollment.whatsapp) {
      syncFields.whatsapp = enrollment.whatsapp;
    }

    if (Object.keys(syncFields).length > 0) {
      Object.assign(existing, syncFields);
      await existing.save();
    }

    return { account: existing, created: false };
  }

  const course = await loadCourseForEnrollment(enrollment);
  const totalFee = resolveTotalFeeFromEnrollment(enrollment, course);

  const account = await FeeAccount.create(
    stampTenantId({
      enrollmentId,
      userId: String(enrollment.userId || ""),
      name: String(enrollment.name || ""),
      email: String(enrollment.email || ""),
      whatsapp: String(enrollment.whatsapp || ""),
      courseId: String(enrollment.courseId || ""),
      courseName: String(enrollment.courseName || course?.title || ""),
      batchId: String(enrollment.batchId || ""),
      batchName: String(enrollment.batchName || ""),
      learningMode:
        enrollment.learningMode === "live" ? "live" : "recorded",
      enrollmentStatus: String(enrollment.status || ""),
      enrolledAt: enrollment.createdAt || new Date(),
      totalFee,
      currency: "INR",
      feeSource: "course_price",
    })
  );

  if (options?.createAudit !== false) {
    await writeFeeAuditLog({
      action: "account_created",
      feeAccountId: String(account._id),
      actorId: options?.actorId || "",
      actorName: options?.actorName || "",
      message: `Fee account created for enrollment ${enrollmentId}.`,
      meta: { enrollmentId, totalFee },
    });
  }

  return { account, created: true };
}

export async function getCountablePaymentsForEnrollment(enrollmentId: string) {
  return FeePayment.find(
    withTenantScope({
      enrollmentId: String(enrollmentId),
      receiptStatus: { $in: [...COUNTABLE_RECEIPT_STATUSES] },
    })
  ).lean();
}

export async function getLedgerSummary(enrollmentId: string, totalFee: number) {
  const payments = await getCountablePaymentsForEnrollment(enrollmentId);
  const totalPaid = calculateTotalPaid(payments as FeePaymentLike[]);
  const remainingAmount = calculateRemaining(totalFee, totalPaid);
  const pendingCount = payments.filter(
    (payment: any) => payment.receiptStatus === "PENDING_APPROVAL"
  ).length;

  return {
    totalFee,
    totalPaid,
    remainingAmount,
    pendingCount,
    paymentStatus: derivePaymentStatus(totalFee, totalPaid, pendingCount),
  };
}

export function formatPresentationDates(
  payment: any,
  timeZone: string
) {
  return {
    paidAtFormatted: formatDateTime(payment.paidAt, timeZone),
    recordedAtFormatted: formatDateTime(payment.recordedAt, timeZone),
    generatedAtFormatted: formatDateTime(payment.generatedAt, timeZone),
    approvedAtFormatted: formatDateTime(payment.approvedAt, timeZone),
    emailSentAtFormatted: formatDateTime(payment.emailSentAt, timeZone),
    whatsappSentAtFormatted: formatDateTime(payment.whatsappSentAt, timeZone),
    cancelledAtFormatted: formatDateTime(payment.cancelledAt, timeZone),
  };
}

export async function findFeeAccountById(accountId: string) {
  const id = String(accountId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new FeeApiError("A valid fee account id is required.", 400);
  }

  const account = await FeeAccount.findOne(withTenantScope({ _id: id }));
  if (!account) {
    throw new FeeApiError("Fee account not found.", 404);
  }

  return account;
}

export async function findFeePaymentById(paymentId: string) {
  const id = String(paymentId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new FeeApiError("A valid payment id is required.", 400);
  }

  const payment = await FeePayment.findOne(withTenantScope({ _id: id }));
  if (!payment) {
    throw new FeeApiError("Fee payment not found.", 404);
  }

  return payment;
}

export async function recordManualFeePayment(input: {
  enrollmentId: string;
  amount: unknown;
  paidAt?: unknown;
  paymentMethod: unknown;
  transactionReference?: string;
  notes?: string;
  proofUrl?: string;
  admin: { _id: any; name?: string };
  ipAddress?: string;
}) {
  const enrollment = await findEnrollmentById(input.enrollmentId);
  const { account } = await ensureFeeAccountForEnrollment(enrollment, {
    actorId: String(input.admin._id),
    actorName: String(input.admin.name || ""),
    createAudit: true,
  });

  const amount = parsePositiveAmount(input.amount);
  const paidAt = parsePaidAt(input.paidAt);
  const paymentMethod = parsePaymentMethod(input.paymentMethod);
  const recordedAt = new Date();
  const tenantId = requireTenantId();

  // Re-read ledger immediately before create (concurrency safety).
  const ledger = await getLedgerSummary(
    String(enrollment._id),
    Number(account.totalFee || 0)
  );

  let snapshot;
  try {
    snapshot = calculatePaymentSnapshot(
      Number(account.totalFee || 0),
      ledger.totalPaid,
      amount
    );
  } catch (error: any) {
    throw new FeeApiError(error.message || "Invalid payment amount.", 400);
  }

  const receiptNumber = await getNextReceiptNumber(tenantId, paidAt);

  const payment = await FeePayment.create(
    stampTenantId({
      feeAccountId: String(account._id),
      enrollmentId: String(enrollment._id),
      receiptNumber,
      amount,
      paidAt,
      paymentMethod,
      transactionReference: String(input.transactionReference || "").trim(),
      notes: String(input.notes || "").trim(),
      proofUrl: String(input.proofUrl || "").trim(),
      totalFee: snapshot.totalFee,
      previousPaidAmount: snapshot.previousPaidAmount,
      totalPaidAfterPayment: snapshot.totalPaidAfterPayment,
      remainingBalanceAfterPayment: snapshot.remainingBalanceAfterPayment,
      recordedBy: String(input.admin._id),
      recordedByName: String(input.admin.name || ""),
      recordedAt,
      source: "manual",
      receiptStatus: "PENDING_APPROVAL",
      generatedAt: recordedAt,
      emailStatus: "NOT_SENT",
      whatsappStatus: "NOT_SENT",
    })
  );

  // Post-create race check: if concurrent writes exceeded fee, cancel this payment.
  const afterLedger = await getLedgerSummary(
    String(enrollment._id),
    Number(account.totalFee || 0)
  );
  if (afterLedger.totalPaid > Number(account.totalFee || 0)) {
    payment.receiptStatus = "CANCELLED";
    payment.cancelledBy = String(input.admin._id);
    payment.cancelledAt = new Date();
    payment.cancelReason =
      "Automatically cancelled due to concurrent overpayment race.";
    await payment.save();

    throw new FeeApiError(
      "Payment would exceed the total fee due to a concurrent update. Please retry.",
      409
    );
  }

  await writeFeeAuditLog({
    action: "payment_recorded",
    feePaymentId: String(payment._id),
    feeAccountId: String(account._id),
    actorId: String(input.admin._id),
    actorName: String(input.admin.name || ""),
    message: `Manual payment ${receiptNumber} recorded for ${moneyLabel(amount)}.`,
    meta: {
      enrollmentId: String(enrollment._id),
      amount,
      receiptNumber,
      paidAt: paidAt.toISOString(),
      remainingBalanceAfterPayment: snapshot.remainingBalanceAfterPayment,
    },
    ipAddress: input.ipAddress || "",
  });

  return { payment, account, enrollment, snapshot };
}

export function buildReceiptHtml(input: {
  payment: any;
  account: any;
  timeZone: string;
}) {
  const { payment, account, timeZone } = input;
  const currency = account.currency || "INR";
  const remaining = Number(payment.remainingBalanceAfterPayment || 0);
  const fullyPaid = remaining <= 0;

  const paidAtDisplay = formatDateTime(payment.paidAt, timeZone);
  const generatedAtDisplay = formatDateTime(payment.generatedAt, timeZone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Fee Receipt ${payment.receiptNumber}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; }
    h1 { margin: 0 0 4px; color: #2563eb; font-size: 28px; }
    h2 { margin: 0 0 20px; font-size: 18px; color: #334155; }
    .meta { color: #64748b; font-size: 13px; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-bottom: 20px; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; }
    .value { font-size: 15px; font-weight: 700; margin-top: 2px; }
    .section { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 8px; }
    .balance { margin-top: 20px; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 800; text-align: center; }
    .balance.due { background: #fff7ed; color: #c2410c; border: 1px solid #fdba74; }
    .balance.paid { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    td:last-child { text-align: right; font-weight: 700; }
    @media print { body { background: #fff; padding: 0; } .card { border: none; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>FINOPS TRAINING</h1>
    <h2>Fee Payment Receipt</h2>
    <div class="meta">
      Receipt Number: <strong>${payment.receiptNumber}</strong><br/>
      Payment Date &amp; Time: <strong>${paidAtDisplay}</strong><br/>
      Receipt Generated At: <strong>${generatedAtDisplay}</strong>
    </div>

    <div class="section">
      <div class="grid">
        <div>
          <div class="label">Student</div>
          <div class="value">${account.name || "-"}</div>
        </div>
        <div>
          <div class="label">Email</div>
          <div class="value">${account.email || "-"}</div>
        </div>
        <div>
          <div class="label">WhatsApp</div>
          <div class="value">${account.whatsapp || "-"}</div>
        </div>
        <div>
          <div class="label">Student ID</div>
          <div class="value">${account.userId || "-"}</div>
        </div>
        <div>
          <div class="label">Course</div>
          <div class="value">${account.courseName || "-"}</div>
        </div>
        <div>
          <div class="label">Batch</div>
          <div class="value">${account.batchName || "To be assigned"}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <table>
        <tr><td>Total Course Fee</td><td>${moneyLabel(payment.totalFee, currency)}</td></tr>
        <tr><td>Previous Paid</td><td>${moneyLabel(payment.previousPaidAmount, currency)}</td></tr>
        <tr><td>Current Payment</td><td>${moneyLabel(payment.amount, currency)}</td></tr>
        <tr><td>Total Paid</td><td>${moneyLabel(payment.totalPaidAfterPayment, currency)}</td></tr>
        <tr><td>Remaining Balance</td><td>${moneyLabel(remaining, currency)}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="grid">
        <div>
          <div class="label">Payment Method</div>
          <div class="value">${String(payment.paymentMethod || "-").replace(/_/g, " ")}</div>
        </div>
        <div>
          <div class="label">Transaction / Reference</div>
          <div class="value">${payment.transactionReference || "-"}</div>
        </div>
        <div>
          <div class="label">Recorded By</div>
          <div class="value">${payment.recordedByName || "-"}</div>
        </div>
        <div>
          <div class="label">Receipt Status</div>
          <div class="value">${String(payment.receiptStatus || "").replace(/_/g, " ")}</div>
        </div>
      </div>
    </div>

    <div class="balance ${fullyPaid ? "paid" : "due"}">
      ${
        fullyPaid
          ? "FULLY PAID"
          : `REMAINING BALANCE: ${moneyLabel(remaining, currency)}`
      }
    </div>
  </div>
</body>
</html>`;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "";
}

export function jsonError(error: unknown, fallback = "Request failed") {
  if (error instanceof FeeApiError) {
    return {
      body: { success: false, message: error.message },
      status: error.status,
    };
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : fallback;

  // Avoid leaking internal details for unexpected errors.
  const safe =
    message.includes("exceed") ||
    message.includes("greater than") ||
    message.includes("required") ||
    message.includes("valid") ||
    message.includes("not found") ||
    message.includes("Unauthorized")
      ? message
      : fallback;

  return {
    body: { success: false, message: safe },
    status: 500,
  };
}
