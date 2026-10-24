/**
 * Phase 4D.2 — Typed runtime tenant errors (definitions only).
 * Not thrown by LMS routes yet; resolver uses a subset.
 */

export type TenantRuntimeErrorCode =
  | "TENANT_NOT_FOUND"
  | "UNKNOWN_TENANT"
  | "TENANT_DELETED"
  | "TENANT_SUSPENDED"
  | "TENANT_PROVISIONING"
  | "TENANT_DOMAIN_MISMATCH"
  | "INVALID_TENANT_CONTEXT"
  | "SUBSCRIPTION_INACTIVE"
  | "MODULE_DISABLED"
  | "TENANT_DOMAIN_UNVERIFIED"
  | "INVALID_HOST";

export class TenantRuntimeError extends Error {
  readonly code: TenantRuntimeErrorCode;
  readonly statusCode: number;

  constructor(
    code: TenantRuntimeErrorCode,
    message: string,
    statusCode: number = 400
  ) {
    super(message);
    this.name = "TenantRuntimeError";
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class TenantNotFoundError extends TenantRuntimeError {
  constructor(message = "No tenant mapped for this host") {
    super("TENANT_NOT_FOUND", message, 404);
    this.name = "TenantNotFoundError";
  }
}

export class UnknownTenantError extends TenantRuntimeError {
  constructor(message = "TenantDomain points to a missing tenant") {
    super("UNKNOWN_TENANT", message, 404);
    this.name = "UnknownTenantError";
  }
}

export class TenantDeletedError extends TenantRuntimeError {
  constructor(message = "Tenant has been deleted") {
    super("TENANT_DELETED", message, 410);
    this.name = "TenantDeletedError";
  }
}

export class TenantSuspendedError extends TenantRuntimeError {
  constructor(message = "Tenant is suspended") {
    super("TENANT_SUSPENDED", message, 403);
    this.name = "TenantSuspendedError";
  }
}

export class TenantProvisioningError extends TenantRuntimeError {
  constructor(message = "Tenant is still provisioning") {
    super("TENANT_PROVISIONING", message, 503);
    this.name = "TenantProvisioningError";
  }
}

/** Reserved for auth wiring — user.tenantId ≠ host context.tenantId */
export class TenantDomainMismatchError extends TenantRuntimeError {
  constructor(message = "Authenticated tenant does not match host tenant") {
    super("TENANT_DOMAIN_MISMATCH", message, 403);
    this.name = "TenantDomainMismatchError";
  }
}

export class InvalidTenantContextError extends TenantRuntimeError {
  constructor(
    message = "TenantContext is not available outside runWithTenantContext"
  ) {
    super("INVALID_TENANT_CONTEXT", message, 500);
    this.name = "InvalidTenantContextError";
  }
}

/** Reserved for subscription enforcement phases */
export class SubscriptionInactiveError extends TenantRuntimeError {
  constructor(message = "Tenant subscription is inactive") {
    super("SUBSCRIPTION_INACTIVE", message, 403);
    this.name = "SubscriptionInactiveError";
  }
}

/** Reserved for feature-module gates */
export class ModuleDisabledError extends TenantRuntimeError {
  constructor(message = "Feature module is disabled for this tenant") {
    super("MODULE_DISABLED", message, 403);
    this.name = "ModuleDisabledError";
  }
}

export class TenantDomainUnverifiedError extends TenantRuntimeError {
  constructor(message = "Tenant domain is not verified") {
    super("TENANT_DOMAIN_UNVERIFIED", message, 403);
    this.name = "TenantDomainUnverifiedError";
  }
}

export class InvalidHostError extends TenantRuntimeError {
  constructor(message = "Host is missing or not normalized") {
    super("INVALID_HOST", message, 400);
    this.name = "InvalidHostError";
  }
}
