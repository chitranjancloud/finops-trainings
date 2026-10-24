/**
 * Phase 4D.2 — In-memory TTL cache for tenant resolution.
 * No Redis, no Next.js cache, no external store.
 */

import type { TenantContext } from "./types";

export type MemoryCacheOptions = {
  /** Time-to-live in milliseconds (default 120_000) */
  ttlMs?: number;
  /** Max entries before oldest eviction (default 500) */
  maxEntries?: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 120_000;
const DEFAULT_MAX_ENTRIES = 500;

export class MemoryTtlCache<T> {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  constructor(options: MemoryCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.ttlMs),
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

/** Shared host → TenantContext cache for resolveTenantFromHost */
let defaultTtlMs = DEFAULT_TTL_MS;

const tenantContextByHost = new MemoryTtlCache<TenantContext>({
  ttlMs: DEFAULT_TTL_MS,
});

export function getTenantContextCache() {
  return tenantContextByHost;
}

/** Configure default TTL for the shared host cache (milliseconds). */
export function setTenantContextCacheTtl(ttlMs: number): void {
  if (!Number.isFinite(ttlMs) || ttlMs < 0) {
    throw new Error("ttlMs must be a non-negative finite number");
  }
  defaultTtlMs = ttlMs;
}

export function getTenantContextCacheTtl(): number {
  return defaultTtlMs;
}

export function cacheTenantContext(
  host: string,
  context: TenantContext
): void {
  tenantContextByHost.set(host, context, defaultTtlMs);
}

export function getCachedTenantContext(
  host: string
): TenantContext | undefined {
  return tenantContextByHost.get(host);
}

export function invalidateTenantContextCache(host?: string): void {
  if (host) tenantContextByHost.delete(host);
  else tenantContextByHost.clear();
}
