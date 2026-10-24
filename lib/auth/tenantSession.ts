/**
 * Phase 4E.4 — Tenant-aware session user lookup for student (and mixed) APIs.
 * tenantId comes only from Runtime Tenant Context (withTenantScope).
 */
import User from "@/models/User";
import {
  tenantBelongsToCurrentContext,
  withTenantScope,
} from "@/lib/platform/runtime";

export async function verifyTenantSession(
  userId: string,
  sessionToken: string,
  deviceId: string
) {
  if (!userId || !sessionToken || !deviceId) return null;

  const user = await User.findOne(withTenantScope({ _id: userId }));

  if (
    !user ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }

  if (!tenantBelongsToCurrentContext(user.tenantId)) {
    return null;
  }

  return user;
}

/** Phase 4E.6 — Tenant-scoped session + admin role check for admin GET reads. */
export async function verifyTenantAdmin(
  userId: string,
  sessionToken: string,
  deviceId: string
) {
  const user = await verifyTenantSession(userId, sessionToken, deviceId);
  if (!user || user.role !== "admin") return null;
  return user;
}
