/**
 * Phase 4D.2 — AsyncLocalStorage helpers for TenantContext.
 * No middleware / request wiring — callers must invoke explicitly later.
 */
import { AsyncLocalStorage } from "async_hooks";

import { InvalidTenantContextError } from "./errors";
import type { TenantContext } from "./types";

const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Run `fn` with `context` bound for the async continuation.
 * Does not read cookies, sessions, or request bodies.
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T
): T {
  return tenantContextStorage.run(context, fn);
}

/** Async-safe ALS binding for route handlers that await inside the callback. */
export function runWithTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContextStorage.run(context, fn);
}

/**
 * Returns the bound TenantContext, or undefined if none.
 */
export function tryGetTenantContext(): TenantContext | undefined {
  return tenantContextStorage.getStore();
}

/**
 * Returns the bound TenantContext, or throws InvalidTenantContextError.
 */
export function getTenantContext(): TenantContext {
  const ctx = tenantContextStorage.getStore();
  if (!ctx) {
    throw new InvalidTenantContextError();
  }
  return ctx;
}
