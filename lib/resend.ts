import { Resend } from "resend";

export function getResendClient() {
  const apiKeyRaw = (process.env.RESEND_API_KEY || "").trim();
  const apiKeyLower = apiKeyRaw.toLowerCase();

  if (
    !apiKeyRaw ||
    apiKeyLower === "false" ||
    apiKeyLower === "0" ||
    apiKeyLower === "null" ||
    apiKeyLower === "undefined"
  ) {
    return null;
  }

  return new Resend(apiKeyRaw);
}