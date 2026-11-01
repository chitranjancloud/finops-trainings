import nodemailer from "nodemailer";
import { getResendClient } from "@/lib/resend";

type SendEmailArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

function getAdminEmail() {
  return (
    process.env.ADMIN_EMAIL ||
    process.env.CONTACT_ADMIN_EMAIL ||
    process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
    "finops668@gmail.com"
  );
}

function getEmailFrom() {
  return (
    process.env.EMAIL_FROM ||
    process.env.CONTACT_FROM_EMAIL ||
    process.env.MAIL_FROM ||
    "FinOps <onboarding@resend.dev>"
  );
}

async function sendViaResend(args: SendEmailArgs) {
  try {
    const resend = getResendClient();
    if (!resend) return false;

    const result = await resend.emails.send({
      from: getEmailFrom(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo: args.replyTo,
    });

    // Resend returns an error object instead of throwing in some SDK versions
    if ((result as any)?.error) {
      console.log("RESEND EMAIL ERROR:", (result as any).error);
      return false;
    }

    return true;
  } catch (error) {
    console.log("RESEND EMAIL EXCEPTION:", error);
    return false;
  }
}

async function sendViaSmtp(args: SendEmailArgs) {
  let transporter;
  try {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !port || !user || !pass) return false;

    const secure = port === 587 ? false : port === 465 ||
      ["true", "1"].includes(process.env.SMTP_SECURE?.trim().toLowerCase() || "");
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS: port === 587,
      tls: { minVersion: "TLSv1.2" },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: getEmailFrom(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });

    return true;
  } catch (error) {
    const smtpError = error as Error & { code?: string; responseCode?: number; command?: string };
    console.log("SMTP EMAIL EXCEPTION:", {
      message: "SMTP failed",
      code: smtpError.code,
      responseCode: smtpError.responseCode,
      command: smtpError.command,
    });
    return false;
  } finally {
    transporter?.close();
  }
}

async function sendViaGmail(args: SendEmailArgs) {
  try {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) return false;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const from = process.env.EMAIL_FROM || `FinOps <${user}>`;

    await transporter.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
    });

    return true;
  } catch (error) {
    console.log("GMAIL EMAIL EXCEPTION:", error);
    return false;
  }
}

export async function sendEmail(args: SendEmailArgs) {
  // Prefer Resend, then SMTP fallback, then Gmail fallback.
  if (await sendViaResend(args)) return { ok: true as const, provider: "resend" as const };
  if (await sendViaSmtp(args)) return { ok: true as const, provider: "smtp" as const };
  if (await sendViaGmail(args)) return { ok: true as const, provider: "gmail" as const };
  return { ok: false as const, provider: "none" as const };
}

export function getInquiryAdminEmail() {
  return getAdminEmail();
}
