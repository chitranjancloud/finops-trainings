/**
 * Phase 4D+ — Public barrel for Runtime Tenant library.
 *
 * Wave 1 CMS reads (4E.2) may import withTenantContext + withTenantScope.
 * Do not use for auth / student / admin / certificates until those phases.
 */

export type {
  TenantContext,
  TenantResolutionSource,
  ResolveTenantFromHostOptions,
} from "./types";

export {
  TenantRuntimeError,
  TenantNotFoundError,
  UnknownTenantError,
  TenantDeletedError,
  TenantSuspendedError,
  TenantProvisioningError,
  TenantDomainMismatchError,
  InvalidTenantContextError,
  SubscriptionInactiveError,
  ModuleDisabledError,
  TenantDomainUnverifiedError,
  InvalidHostError,
} from "./errors";
export type { TenantRuntimeErrorCode } from "./errors";

export {
  MemoryTtlCache,
  getTenantContextCache,
  setTenantContextCacheTtl,
  getTenantContextCacheTtl,
  cacheTenantContext,
  getCachedTenantContext,
  invalidateTenantContextCache,
} from "./cache";
export type { MemoryCacheOptions } from "./cache";

export {
  runWithTenantContext,
  runWithTenantContextAsync,
  getTenantContext,
  tryGetTenantContext,
} from "./context";

export { normalizeHost, resolveTenantFromHost } from "./resolveTenant";

export {
  withTenantContext,
  readRequestHost,
  TENANT_HOST_HEADER,
} from "./withTenantContext";
export type {
  WithTenantContextOptions,
  TenantAwareHandler,
} from "./withTenantContext";

export {
  requireTenantId,
  withTenantScope,
  tenantIdFilter,
  withTenantMatchStage,
  tenantBelongsToCurrentContext,
} from "./scopedQuery";
export type { MongoFilter } from "./scopedQuery";

export {
  stampTenantId,
  stampTenantIdIfMissing,
  withTenantWriteFilter,
  ensureTenantOwnership,
} from "./scopedWrite";
