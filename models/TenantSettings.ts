/**
 * TenantSettings — branding, email, SEO, and policy config for one tenant.
 * 1:1 with Tenant. Not read by LMS pages until a later branding phase.
 */
import mongoose from "mongoose";

const TenantSettingsSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    branding: {
      logoUrl: { type: String, default: "" },
      darkLogoUrl: { type: String, default: "" },
      faviconUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#2563eb" },
      secondaryColor: { type: String, default: "#7c3aed" },
      fontFamily: { type: String, default: "" },
    },

    institutionName: {
      type: String,
      default: "",
    },

    emailFromName: {
      type: String,
      default: "",
    },

    emailFromAddress: {
      type: String,
      default: "",
    },

    seoTitle: {
      type: String,
      default: "",
    },

    seoDescription: {
      type: String,
      default: "",
    },

    currency: {
      type: String,
      default: "INR",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    locale: {
      type: String,
      default: "en-IN",
    },

    analytics: {
      gaId: { type: String, default: "" },
      metaPixelId: { type: String, default: "" },
    },

    supportWhatsApp: {
      type: String,
      default: "",
    },

    supportEmail: {
      type: String,
      default: "",
    },

    security: {
      deviceLockEnabled: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: "tenant_settings",
  }
);

export default mongoose.models.TenantSettings ||
  mongoose.model("TenantSettings", TenantSettingsSchema);
