/**
 * Phase 4E.2 — Tenant-scoped Mongo filter helpers for LMS reads.
 *
 * tenantId is taken ONLY from AsyncLocalStorage TenantContext
 * (via getTenantContext). Never from request body, query, cookies, or headers.
 *
 * If context is missing → throws InvalidTenantContextError (fail closed).
 * Do not call these helpers outside withTenantContext / runWithTenantContext.
 */
import { getTenantContext } from "./context";

export type MongoFilter = Record<string, unknown>;

const FINOPS_LEGACY_SLUG = "finops";

/**
 * Current request tenantId from Runtime Tenant Context.
 * @throws InvalidTenantContextError when ALS is unbound
 */
export function requireTenantId(): string {
  return getTenantContext().tenantId;
}

/**
 * FinOps Tenant #1 may still have pre-backfill documents without tenantId.
 * Other tenants must remain strictly isolated.
 */
function includesFinOpsLegacyDocuments(): boolean {
  return getTenantContext().slug === FINOPS_LEGACY_SLUG;
}

/**
 * Whether a stored document belongs to the current request tenant.
 * Legacy FinOps rows with empty tenantId are treated as FinOps-owned only.
 */
export function tenantBelongsToCurrentContext(
  documentTenantId: string | null | undefined
): boolean {
  const expected = requireTenantId();
  const actual = String(documentTenantId ?? "").trim();
  if (actual === expected) return true;
  if (!actual && includesFinOpsLegacyDocuments()) return true;
  return false;
}

function tenantScopeClause(): MongoFilter {
  const tenantId = requireTenantId();
  if (!includesFinOpsLegacyDocuments()) {
    return { tenantId };
  }

  return {
    $or: [
      { tenantId },
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: "" },
    ],
  };
}

/**
 * Merge a Mongo filter with tenantId from Runtime Tenant Context.
 *
 * FinOps legacy: also matches documents missing tenantId until backfill completes.
 * Other tenants: strict tenantId match only.
 */
export function withTenantScope<T extends MongoFilter>(
  filter?: T
): MongoFilter {
  const scopeClause = tenantScopeClause();
  const base = { ...(filter || {}) } as MongoFilter;

  // Never trust caller-provided tenantId
  delete base.tenantId;

  if (Object.keys(base).length === 0) {
    return scopeClause;
  }

  if (base.$or || base.$and || base.$nor) {
    return { $and: [scopeClause, base] };
  }

  return { $and: [scopeClause, base] };
}

/**
 * Convenience: `{ tenantId }` only.
 */
export function tenantIdFilter(): { tenantId: string } {
  return { tenantId: requireTenantId() };
}

/**
 * Future: first-stage aggregate $match including tenantId.
 * Not used in Wave 1 (no aggregates in CMS GETs).
 */
export function withTenantMatchStage(
  match: MongoFilter = {}
): { $match: MongoFilter } {
  return { $match: withTenantScope(match) };
}
