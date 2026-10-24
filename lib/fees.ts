import ReceiptCounter from "@/models/ReceiptCounter";

export const COUNTABLE_RECEIPT_STATUSES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
] as const;

export type CountableReceiptStatus = (typeof COUNTABLE_RECEIPT_STATUSES)[number];

export type FeePaymentLike = {
  amount?: number | null;
  receiptStatus?: string | null;
};

export type PaymentSnapshot = {
  totalFee: number;
  previousPaidAmount: number;
  totalPaidAfterPayment: number;
  remainingBalanceAfterPayment: number;
};

export function isCountableFeePayment(
  receiptStatus: string | null | undefined
): receiptStatus is CountableReceiptStatus {
  return COUNTABLE_RECEIPT_STATUSES.includes(
    String(receiptStatus || "") as CountableReceiptStatus
  );
}

export function calculateTotalPaid(payments: FeePaymentLike[]): number {
  return payments
    .filter((payment) => isCountableFeePayment(payment.receiptStatus))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

export function calculateRemaining(totalFee: number, totalPaid: number): number {
  const fee = Number(totalFee || 0);
  const paid = Number(totalPaid || 0);
  return Math.max(fee - paid, 0);
}

export function calculatePaymentSnapshot(
  totalFee: number,
  previousPaid: number,
  amount: number
): PaymentSnapshot {
  const fee = Number(totalFee || 0);
  const priorPaid = Number(previousPaid || 0);
  const paymentAmount = Number(amount || 0);

  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const totalPaidAfterPayment = priorPaid + paymentAmount;

  if (totalPaidAfterPayment > fee) {
    throw new Error("Payment would exceed the total fee.");
  }

  return {
    totalFee: fee,
    previousPaidAmount: priorPaid,
    totalPaidAfterPayment,
    remainingBalanceAfterPayment: calculateRemaining(fee, totalPaidAfterPayment),
  };
}

export function formatReceiptNumber(year: number, seq: number): string {
  return `FT-${year}-${String(seq).padStart(6, "0")}`;
}

/**
 * Atomically allocate the next receipt number for a tenant/year.
 * Must be called server-side inside an established MongoDB connection.
 */
export async function getNextReceiptNumber(
  tenantId: string,
  referenceDate: Date = new Date()
): Promise<string> {
  const year = referenceDate.getFullYear();

  const counter = await ReceiptCounter.findOneAndUpdate(
    { tenantId, year },
    {
      $inc: { seq: 1 },
      $setOnInsert: { tenantId, year },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  const seq = Number(counter?.seq || 0);
  if (seq <= 0) {
    throw new Error("Failed to allocate receipt number.");
  }

  return formatReceiptNumber(year, seq);
}
