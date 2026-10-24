import {
  FeeApiError,
  buildReceiptHtml,
  formatPresentationDates,
  getTenantTimezone,
  writeFeeAuditLog,
} from "@/lib/adminFees";
import { formatDateTime } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { moneyLabel } from "@/lib/payments";
import { withTenantScope } from "@/lib/platform/runtime";
import FeeAccount from "@/models/FeeAccount";
import FeePayment from "@/models/FeePayment";

export type DeliveryChannel = "email" | "whatsapp" | "both";

function buildReceiptText(payment: any, account: any, timeZone: string) {
  const currency = account.currency || "INR";
  const remaining = Number(payment.remainingBalanceAfterPayment || 0);
  const paidAtDisplay = formatDateTime(payment.paidAt, timeZone);
  const lines = [
    "FinOps Training",
    "Fee Payment Receipt",
    "",
    `Student Name: ${account.name || "-"}`,
    `Course: ${account.courseName || "-"}`,
    `Batch: ${account.batchName || "To be assigned"}`,
    "",
    `Receipt Number: ${payment.receiptNumber}`,
    `Payment Date & Time: ${paidAtDisplay}`,
    "",
    `Total Fee: ${moneyLabel(payment.totalFee, currency)}`,
    `Previous Paid: ${moneyLabel(payment.previousPaidAmount, currency)}`,
    `Current Payment: ${moneyLabel(payment.amount, currency)}`,
    `Total Paid: ${moneyLabel(payment.totalPaidAfterPayment, currency)}`,
    `Remaining Balance: ${moneyLabel(remaining, currency)}`,
    "",
    `Payment Method: ${String(payment.paymentMethod || "-").replace(/_/g, " ")}`,
    `Transaction Reference: ${payment.transactionReference || "-"}`,
    "",
    "Payment Status: APPROVED",
    remaining <= 0
      ? "FULLY PAID"
      : `REMAINING BALANCE: ${moneyLabel(remaining, currency)}`,
  ];
  return lines.join("\n");
}

function buildWhatsAppMessage(payment: any, account: any, timeZone: string) {
  const currency = account.currency || "INR";
  const remaining = Number(payment.remainingBalanceAfterPayment || 0);
  const paidAtDisplay = formatDateTime(payment.paidAt, timeZone);
  return [
    "FinOps Training — Fee Payment Receipt",
    "",
    `Student: ${account.name || "-"}`,
    `Receipt: ${payment.receiptNumber}`,
    "",
    `Payment: ${moneyLabel(payment.amount, currency)}`,
    `Total Paid: ${moneyLabel(payment.totalPaidAfterPayment, currency)}`,
    `Remaining: ${moneyLabel(remaining, currency)}`,
    "",
    `Payment Date/Time: ${paidAtDisplay}`,
    "",
    "Status: APPROVED",
    remaining <= 0
      ? "FULLY PAID"
      : `Remaining Balance: ${moneyLabel(remaining, currency)}`,
  ].join("\n");
}

async function sendWhatsAppViaExistingProvider(to: string, message: string) {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;

  if (!url || !token) {
    return {
      ok: false as const,
      error:
        "WhatsApp delivery cannot be completed because no usable existing WhatsApp provider/configuration was found.",
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, message }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        error: `WhatsApp provider returned HTTP ${res.status}.`,
      };
    }

    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "WhatsApp provider request failed.",
    };
  }
}

/**
 * Deliver approved fee receipt to FeeAccount.email / FeeAccount.whatsapp.
 * Idempotent: skips channels already marked SENT.
 * Does not roll back APPROVED status on failure.
 */
export async function deliverApprovedFeeReceipt(input: {
  paymentId: string;
  actorId?: string;
  actorName?: string;
  ipAddress?: string;
  channels?: DeliveryChannel;
}) {
  const channels = input.channels || "both";
  const wantEmail = channels === "email" || channels === "both";
  const wantWhatsapp = channels === "whatsapp" || channels === "both";

  const payment = await FeePayment.findOne(
    withTenantScope({ _id: input.paymentId })
  );
  if (!payment) {
    throw new FeeApiError("Fee payment not found.", 404);
  }

  if (payment.receiptStatus !== "APPROVED" && payment.receiptStatus !== "SENT") {
    throw new FeeApiError(
      `Only APPROVED payments can be delivered. Current status: ${payment.receiptStatus}.`,
      409
    );
  }

  const account = await FeeAccount.findOne(
    withTenantScope({ _id: payment.feeAccountId })
  );
  if (!account) {
    throw new FeeApiError("Fee account not found for this payment.", 404);
  }

  const timeZone = await getTenantTimezone();
  const html = buildReceiptHtml({ payment, account, timeZone });
  const text = buildReceiptText(payment, account, timeZone);

  const result = {
    email: {
      attempted: false,
      skipped: false,
      status: String(payment.emailStatus || "NOT_SENT"),
      error: String(payment.emailError || ""),
    },
    whatsapp: {
      attempted: false,
      skipped: false,
      status: String(payment.whatsappStatus || "NOT_SENT"),
      error: String(payment.whatsappError || ""),
      available: Boolean(
        process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN
      ),
    },
  };

  // EMAIL
  if (wantEmail) {
    if (payment.emailStatus === "SENT") {
      result.email.skipped = true;
    } else {
      result.email.attempted = true;
      const to = String(account.email || "").trim();
      if (!to) {
        payment.emailStatus = "FAILED";
        payment.emailError = "Student email is missing on the fee account.";
        result.email.status = "FAILED";
        result.email.error = payment.emailError;
        await writeFeeAuditLog({
          action: "email_failed",
          feePaymentId: String(payment._id),
          feeAccountId: String(account._id),
          actorId: input.actorId || "",
          actorName: input.actorName || "",
          message: `Email delivery failed for ${payment.receiptNumber}: missing recipient.`,
          meta: { receiptNumber: payment.receiptNumber },
          ipAddress: input.ipAddress || "",
        });
      } else {
        const sent = await sendEmail({
          to,
          subject: `Fee Payment Receipt — ${payment.receiptNumber}`,
          html,
          text,
        });
        if (sent.ok) {
          payment.emailStatus = "SENT";
          payment.emailSentAt = new Date();
          payment.emailError = "";
          result.email.status = "SENT";
          result.email.error = "";
          await writeFeeAuditLog({
            action: "email_sent",
            feePaymentId: String(payment._id),
            feeAccountId: String(account._id),
            actorId: input.actorId || "",
            actorName: input.actorName || "",
            message: `Email receipt sent for ${payment.receiptNumber}.`,
            meta: {
              receiptNumber: payment.receiptNumber,
              provider: sent.provider,
            },
            ipAddress: input.ipAddress || "",
          });
        } else {
          payment.emailStatus = "FAILED";
          payment.emailError =
            "Email delivery failed. Check email provider configuration.";
          result.email.status = "FAILED";
          result.email.error = payment.emailError;
          await writeFeeAuditLog({
            action: "email_failed",
            feePaymentId: String(payment._id),
            feeAccountId: String(account._id),
            actorId: input.actorId || "",
            actorName: input.actorName || "",
            message: `Email delivery failed for ${payment.receiptNumber}.`,
            meta: { receiptNumber: payment.receiptNumber },
            ipAddress: input.ipAddress || "",
          });
        }
      }
    }
  }

  // WHATSAPP
  if (wantWhatsapp) {
    if (payment.whatsappStatus === "SENT") {
      result.whatsapp.skipped = true;
    } else {
      result.whatsapp.attempted = true;
      const to = String(account.whatsapp || "").trim();
      if (!to) {
        payment.whatsappStatus = "FAILED";
        payment.whatsappError =
          "Student WhatsApp number is missing on the fee account.";
        result.whatsapp.status = "FAILED";
        result.whatsapp.error = payment.whatsappError;
        await writeFeeAuditLog({
          action: "whatsapp_failed",
          feePaymentId: String(payment._id),
          feeAccountId: String(account._id),
          actorId: input.actorId || "",
          actorName: input.actorName || "",
          message: `WhatsApp delivery failed for ${payment.receiptNumber}: missing recipient.`,
          meta: { receiptNumber: payment.receiptNumber },
          ipAddress: input.ipAddress || "",
        });
      } else {
        const message = buildWhatsAppMessage(payment, account, timeZone);
        const sent = await sendWhatsAppViaExistingProvider(to, message);
        if (sent.ok) {
          payment.whatsappStatus = "SENT";
          payment.whatsappSentAt = new Date();
          payment.whatsappError = "";
          result.whatsapp.status = "SENT";
          result.whatsapp.error = "";
          await writeFeeAuditLog({
            action: "whatsapp_sent",
            feePaymentId: String(payment._id),
            feeAccountId: String(account._id),
            actorId: input.actorId || "",
            actorName: input.actorName || "",
            message: `WhatsApp receipt sent for ${payment.receiptNumber}.`,
            meta: { receiptNumber: payment.receiptNumber },
            ipAddress: input.ipAddress || "",
          });
        } else {
          payment.whatsappStatus = "FAILED";
          payment.whatsappError = sent.error;
          result.whatsapp.status = "FAILED";
          result.whatsapp.error = sent.error;
          await writeFeeAuditLog({
            action: "whatsapp_failed",
            feePaymentId: String(payment._id),
            feeAccountId: String(account._id),
            actorId: input.actorId || "",
            actorName: input.actorName || "",
            message: `WhatsApp delivery failed for ${payment.receiptNumber}.`,
            meta: { receiptNumber: payment.receiptNumber },
            ipAddress: input.ipAddress || "",
          });
        }
      }
    }
  }

  if (payment.emailStatus === "SENT" || payment.whatsappStatus === "SENT") {
    payment.receiptStatus = "SENT";
  }

  await payment.save();

  return {
    payment,
    account,
    timeZone,
    delivery: result,
    presentation: formatPresentationDates(payment, timeZone),
  };
}
