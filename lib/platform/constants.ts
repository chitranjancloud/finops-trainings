/**
 * Platform Foundation constants.
 * Shared status / module keys for SaaS platform models.
 * Not used by the existing FinOps LMS runtime.
 */

// ── Tenant ──────────────────────────────────────────────────────────────────

export const TENANT_STATUSES = [
  "provisioning",
  "trialing",
  "active",
  "suspended",
  "deleted",
] as const;

export type TenantStatus = (typeof TENANT_STATUSES)[number];

// ── Subscription ────────────────────────────────────────────────────────────

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "cancelled",
  "expired",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_CYCLES = ["monthly", "yearly"] as const;

export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ── Domain verification ─────────────────────────────────────────────────────

export const DOMAIN_TYPES = ["subdomain", "custom"] as const;

export type DomainType = (typeof DOMAIN_TYPES)[number];

export const VERIFICATION_STATUSES = ["pending", "verified"] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ── Feature modules ─────────────────────────────────────────────────────────

export const FEATURE_MODULE_KEYS = [
  "marketing_site",
  "lms_core",
  "courses",
  "batches",
  "content_sharepoint",
  "assignments",
  "assessments",
  "certificates",
  "payments",
  "chat",
  "attendance",
  "meetings",
  "internships",
  "crm",
  "blogs",
  "webinars",
  "reports",
  "analytics",
  "device_lock",
  "ai_chatbot",
] as const;

export type FeatureModuleKey = (typeof FEATURE_MODULE_KEYS)[number];

// ── Platform Super Admin roles ──────────────────────────────────────────────

export const PLATFORM_ADMIN_ROLES = [
  "full",
  "billing",
  "support",
  "readonly",
] as const;

export type PlatformAdminRole = (typeof PLATFORM_ADMIN_ROLES)[number];

// ── Storage ─────────────────────────────────────────────────────────────────

export const STORAGE_MODES = ["shared_namespaced", "dedicated"] as const;

export type StorageMode = (typeof STORAGE_MODES)[number];

// ── Platform settings singleton ─────────────────────────────────────────────

/** Fixed key for the single PlatformSettings document. */
export const PLATFORM_SETTINGS_KEY = "default";
