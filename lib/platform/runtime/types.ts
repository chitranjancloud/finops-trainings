/**
 * Phase 4D.2 — Runtime TenantContext types.
 * Dormant: not imported by LMS middleware, auth, or APIs yet.
 */
import type { TenantStatus } from "@/lib/platform/constants";

/** How the tenant was resolved for this context. */
export type TenantResolutionSource = "domain" | "default_finops_shim";

/**
 * Minimal request/job-scoped tenant identity.
 * Branding, storage, modules, subscription — later phases.
 */
export type TenantContext = {
  /** String(Tenant._id) — never slug or name */
  tenantId: string;
  slug: string;
  name: string;
  status: TenantStatus;
  /** Normalized host used for resolution */
  host: string;
  /** Epoch ms when this context was built */
  resolvedAt: number;
  resolutionSource: TenantResolutionSource;
};

export type ResolveTenantFromHostOptions = {
  /** Skip in-memory cache (default false) */
  skipCache?: boolean;
};
