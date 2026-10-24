/**
 * Returns the canonical public URL of the application.
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_APP_URL   - explicitly set in .env / hosting dashboard
 *  2. NEXTAUTH_URL          - common Next.js convention
 *  3. VERCEL_URL            - auto-injected by Vercel (no scheme, so we add https)
 *  4. Current request host  - works for localhost, Vercel, and custom domains
 *  5. http://localhost:3000 - local fallback
 *
 * Always returns a URL without a trailing slash.
 */
export function getAppUrl(req?: Request): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();

    if (
      value &&
      value !== "undefined" &&
      value !== "null" &&
      value !== "false" &&
      value !== "0"
    ) {
      return value.replace(/\/$/, "");
    }
  }

  const forwardedHost = req?.headers.get("x-forwarded-host");
  const host = forwardedHost || req?.headers.get("host");
  const forwardedProto = req?.headers.get("x-forwarded-proto");
  const proto = forwardedProto || (host?.includes("localhost") ? "http" : "https");

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}