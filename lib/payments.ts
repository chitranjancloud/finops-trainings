import crypto from "crypto";

export function parseMoney(value: any) {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/);

  return cleaned ? Number(cleaned[0]) : 0;
}

export function moneyLabel(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!secret || !orderId || !paymentId || !signature) return true;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return digest === signature;
}
