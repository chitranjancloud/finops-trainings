/**
 * Phase 4D.2 — Host → TenantDomain → Tenant → TenantContext.
 *
 * Independent of cookies, sessions, JWT, body, query, X-Tenant-Id, and auth.
 * Dormant: not called by LMS routes yet.
 */
import { connectDB } from "@/lib/mongodb";
import type { TenantStatus } from "@/lib/platform/constants";
import Tenant from "@/models/Tenant";
import TenantDomain from "@/models/TenantDomain";

import {
  cacheTenantContext,
  getCachedTenantContext,
} from "./cache";
import {
  InvalidHostError,
  TenantDeletedError,
  TenantDomainUnverifiedError,
  TenantNotFoundError,
  TenantProvisioningError,
  TenantSuspendedError,
  UnknownTenantError,
} from "./errors";
import type { ResolveTenantFromHostOptions, TenantContext } from "./types";

/**
 * Normalize a host for TenantDomain lookup.
 * Lowercase, strip port, strip trailing dot, trim.
 */
export function normalizeHost(raw: string): string {
  let host = String(raw || "").trim().toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  // Strip brackets from IPv6 literals if ever passed
  if (host.startsWith("[") && host.includes("]")) {
    host = host.slice(1, host.indexOf("]"));
  }
  const colon = host.lastIndexOf(":");
  if (colon > -1 && host.includes(".") && !host.includes("]")) {
    // hostname:port (not IPv6)
    const maybePort = host.slice(colon + 1);
    if (/^\d+$/.test(maybePort)) {
      host = host.slice(0, colon);
    }
  }
  return host;
}

function assertNormalizedHost(host: string): void {
  if (!host) {
    throw new InvalidHostError("Host is empty");
  }
  if (host !== normalizeHost(host)) {
    throw new InvalidHostError(
      "Host must be normalized (lowercase, no port). Use normalizeHost() first."
    );
  }
  if (host.includes("/") || host.includes(" ") || host.includes("@")) {
    throw new InvalidHostError("Host contains invalid characters");
  }
}

function assertTenantAccessible(tenant: {
  status: string;
  deletedAt?: Date | null;
}): void {
  if (tenant.deletedAt || tenant.status === "deleted") {
    throw new TenantDeletedError();
  }
  if (tenant.status === "suspended") {
    throw new TenantSuspendedError();
  }
  if (tenant.status === "provisioning") {
    throw new TenantProvisioningError();
  }
}

function toContext(
  tenant: { _id: unknown; slug: string; name: string; status: string },
  host: string
): TenantContext {
  return {
    tenantId: String(tenant._id),
    slug: String(tenant.slug),
    name: String(tenant.name),
    status: tenant.status as TenantStatus,
    host,
    resolvedAt: Date.now(),
    resolutionSource: "domain",
  };
}

/**
 * Resolve TenantContext from a **normalized** host only.
 *
 * Pipeline: Host → TenantDomain → Tenant → TenantContext
 */
export async function resolveTenantFromHost(
  host: string,
  options: ResolveTenantFromHostOptions = {}
): Promise<TenantContext> {
  assertNormalizedHost(host);

  if (!options.skipCache) {
    const cached = getCachedTenantContext(host);
    if (cached) return cached;
  }

  await connectDB();

  const domain = await TenantDomain.findOne({ host }).lean();
  if (!domain) {
    throw new TenantNotFoundError(`No tenant domain for host "${host}"`);
  }

  if (domain.verificationStatus !== "verified") {
    throw new TenantDomainUnverifiedError(
      `Domain "${host}" is not verified`
    );
  }

  const tenant = await Tenant.findById(domain.tenantId).lean();
  if (!tenant) {
    throw new UnknownTenantError(
      `No tenant for id "${domain.tenantId}" (host "${host}")`
    );
  }

  assertTenantAccessible(tenant);

  const context = toContext(tenant, host);

  if (!options.skipCache) {
    cacheTenantContext(host, context);
  }

  return context;
}
