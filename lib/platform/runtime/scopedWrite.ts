/**
 * Phase 4F.2 — Tenant-scoped Mongo write helpers.
 *
 * tenantId is taken ONLY from AsyncLocalStorage TenantContext
 * (via getTenantContext). Never from request body, query, params, cookies, or headers.
 *
 * If context is missing → throws InvalidTenantContextError (fail closed).
 * Do not call these helpers outside withTenantContext / runWithTenantContext.
 */
import { TenantDomainMismatchError } from "./errors";
import {
  requireTenantId,
  withTenantScope,
  type MongoFilter,
} from "./scopedQuery";

export { requireTenantId };

type TenantStampable = Record<string, unknown>;

function stripClientTenantId<T extends TenantStampable>(
  doc: T
): Omit<T, "tenantId"> {
  const { tenantId: _ignored, ...rest } = doc as T & { tenantId?: unknown };
  return rest as Omit<T, "tenantId">;
}

function stampDoc<T extends TenantStampable>(
  doc: T,
  tenantId: string
): T & { tenantId: string } {
  return { ...stripClientTenantId(doc), tenantId } as T & { tenantId: string };
}

function stampDocIfMissing<T extends TenantStampable>(
  doc: T,
  tenantId: string
): T & { tenantId: string } {
  const existing = (doc as { tenantId?: unknown }).tenantId;
  const existingStr =
    existing === undefined || existing === null ? "" : String(existing).trim();

  if (existingStr) {
    if (existingStr !== tenantId) {
      throw new TenantDomainMismatchError(
        "Document tenantId does not match Runtime Tenant Context"
      );
    }
    return doc as T & { tenantId: string };
  }

  return stampDoc(doc, tenantId);
}

/**
 * Stamp tenantId from Runtime Tenant Context onto one document or many.
 * Any client-supplied tenantId on each document is overwritten.
 */
export function stampTenantId<T extends TenantStampable>(
  data: T
): T & { tenantId: string };
export function stampTenantId<T extends TenantStampable>(
  data: T[]
): Array<T & { tenantId: string }>;
export function stampTenantId<T extends TenantStampable>(
  data: T | T[]
): (T & { tenantId: string }) | Array<T & { tenantId: string }> {
  const tenantId = requireTenantId();

  if (Array.isArray(data)) {
    return data.map((doc) => stampDoc(doc, tenantId));
  }

  return stampDoc(data, tenantId);
}

/**
 * Stamp tenantId only when missing on one document or many.
 * If tenantId is present but mismatches context → throws (fail closed).
 */
export function stampTenantIdIfMissing<T extends TenantStampable>(
  data: T
): T & { tenantId: string };
export function stampTenantIdIfMissing<T extends TenantStampable>(
  data: T[]
): Array<T & { tenantId: string }>;
export function stampTenantIdIfMissing<T extends TenantStampable>(
  data: T | T[]
): (T & { tenantId: string }) | Array<T & { tenantId: string }> {
  const tenantId = requireTenantId();

  if (Array.isArray(data)) {
    return data.map((doc) => stampDocIfMissing(doc, tenantId));
  }

  return stampDocIfMissing(data, tenantId);
}

/**
 * Merge a Mongo filter with tenantId for create/update/delete write paths.
 * Client-supplied tenantId in the filter is always overwritten by context.
 */
export function withTenantWriteFilter<T extends MongoFilter>(
  filter?: T
): MongoFilter {
  return withTenantScope(filter);
}

/**
 * Enforce tenant ownership on update/delete filters.
 * Semantically identical to withTenantWriteFilter — use at write boundaries
 * so cross-tenant mutations are impossible.
 */
export function ensureTenantOwnership<T extends MongoFilter>(
  filter?: T
): MongoFilter {
  return withTenantScope(filter);
}
