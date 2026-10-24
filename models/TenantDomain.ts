/**
 * TenantDomain — hostname → tenant mapping for multi-domain routing.
 * Unused until middleware host resolution is introduced in a later phase.
 */
import mongoose from "mongoose";

import {
  DOMAIN_TYPES,
  VERIFICATION_STATUSES,
} from "@/lib/platform/constants";

const TenantDomainSchema = new mongoose.Schema(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    // Normalized lowercase host (e.g. finopstrainings.com)
    host: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: DOMAIN_TYPES,
      default: "subdomain",
    },

    isPrimary: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: "pending",
    },

    verificationToken: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "tenant_domains",
  }
);

TenantDomainSchema.index({ tenantId: 1, isPrimary: 1 });

export default mongoose.models.TenantDomain ||
  mongoose.model("TenantDomain", TenantDomainSchema);
