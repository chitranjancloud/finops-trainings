/**
 * Phase 4D.4A — withTenantContext route wrapper (SHADOW MODE only).
 *
 * DORMANT: not used by middleware, APIs, or pages yet.
 *
 * Shadow mode:
 * - Resolve host → TenantContext when possible
 * - Bind AsyncLocalStorage when a context is available
 * - On failure: FinOps slug shim; if still unresolved, fail closed (503)
 */
import { connectDB } from "@/lib/mongodb";
import type { TenantStatus } from "@/lib/platform/constants";
import Tenant from "@/models/Tenant";

import { runWithTenantContextAsync } from "./context";
import { TenantRuntimeError } from "./errors";
import { normalizeHost, resolveTenantFromHost } from "./resolveTenant";
import type { TenantContext } from "./types";

/** Internal header reserved for future passive middleware (4D.4B). */
export const TENANT_HOST_HEADER = "x-finops-tenant-host";

const FINOPS_SLUG = "finops";

export type WithTenantContextOptions = {
  /**
   * Shadow mode is the only supported mode in 4D.4A.
   * Kept for explicitness / future enforce mode.
   */
  mode?: "shadow";
  /** Log resolution outcomes (default true). Never sent to clients. */
  log?: boolean;
};

type MaybePromise<T> = T | Promise<T>;

/**
 * App Router–compatible handler signature.
 * Second argument is the Next.js route context (params, etc.).
 */
export type TenantAwareHandler<TRouteContext = unknown, TResult = Response> = (
  req: Request,
  routeContext: TRouteContext
) => MaybePromise<TResult>;

function logShadow(message: string, detail?: unknown) {
  if (detail !== undefined) {
    console.info(`[withTenantContext:shadow] ${message}`, detail);
  } else {
    console.info(`[withTenantContext:shadow] ${message}`);
  }
}

/**
 * Read host for resolution. Prefers future middleware header, then Host.
 * Never reads body, query, cookies, or X-Tenant-Id.
 */
export function readRequestHost(req: Request): string {
  const forwarded = req.headers.get(TENANT_HOST_HEADER);
  if (forwarded && forwarded.trim()) {
    return normalizeHost(forwarded);
  }
  const hostHeader = req.headers.get("host") || "";
  return normalizeHost(hostHeader);
}

async function resolveFinopsShim(host: string): Promise<TenantContext | null> {
  try {
    await connectDB();
    const tenant = await Tenant.findOne({
      slug: FINOPS_SLUG,
      status: { $ne: "deleted" },
    }).lean();

    if (!tenant || tenant.deletedAt) {
      return null;
    }

    if (tenant.status === "suspended" || tenant.status === "provisioning") {
      // Shadow: still bind FinOps identity so ALS is available; do not block.
      // Status remains accurate on the context for later phases.
    }

    return {
      tenantId: String(tenant._id),
      slug: String(tenant.slug),
      name: String(tenant.name),
      status: tenant.status as TenantStatus,
      host,
      resolvedAt: Date.now(),
      resolutionSource: "default_finops_shim",
    };
  } catch {
    return null;
  }
}

/**
 * Shadow resolve: domain resolve → FinOps shim → null when unconfigured.
 * Never throws to the caller for resolution failures.
 */
async function resolveTenantContextShadow(
  host: string,
  log: boolean
): Promise<TenantContext | null> {
  if (!host) {
    if (log) logShadow("empty host — continuing without TenantContext");
    return resolveFinopsShim("unknown");
  }

  try {
    const ctx = await resolveTenantFromHost(host);
    if (log) {
      logShadow("resolved via domain", {
        host,
        tenantId: ctx.tenantId,
        slug: ctx.slug,
      });
    }
    return ctx;
  } catch (err) {
    const code =
      err instanceof TenantRuntimeError ? err.code : "RESOLVE_FAILED";
    if (log) {
      logShadow("domain resolve failed — trying FinOps shim", {
        host,
        code,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const shim = await resolveFinopsShim(host);
  if (shim) {
    if (log) {
      logShadow("resolved via FinOps shim", {
        host,
        tenantId: shim.tenantId,
      });
    }
    return shim;
  }

  if (log) {
    logShadow("no TenantContext available — route cannot run tenant-scoped", {
      host,
    });
  }
  return null;
}

function tenantNotConfiguredResponse(): Response {
  return Response.json(
    {
      success: false,
      error: "Tenant is not configured for this host",
      code: "TENANT_NOT_CONFIGURED",
    },
    { status: 503 }
  );
}

/**
 * Wrap an App Router route handler with shadow tenant resolution.
 *
 * Tenant-scoped handlers must not run without ALS (Phase 4E+).
 */
export function withTenantContext<TRouteContext = unknown, TResult = Response>(
  handler: TenantAwareHandler<TRouteContext, TResult>,
  options: WithTenantContextOptions = {}
): TenantAwareHandler<TRouteContext, TResult> {
  const log = options.log !== false;

  return async (req, routeContext) => {
    const host = readRequestHost(req);
    const tenantCtx = await resolveTenantContextShadow(host, log);

    if (!tenantCtx) {
      return tenantNotConfiguredResponse() as TResult;
    }

    return await runWithTenantContextAsync(tenantCtx, async () =>
      handler(req, routeContext)
    );
  };
}
