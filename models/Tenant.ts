/**
 * Tenant — one customer organization on the multi-tenant platform.
 * FinOps will become Tenant #1 in a later phase. Unused by LMS runtime today.
 */
import mongoose from "mongoose";

import { TENANT_STATUSES } from "@/lib/platform/constants";

const TenantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    // URL-safe unique identifier (e.g. finops)
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: TENANT_STATUSES,
      default: "provisioning",
      index: true,
    },

    ownerEmail: {
      type: String,
      default: "",
    },

    ownerName: {
      type: String,
      default: "",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    locale: {
      type: String,
      default: "en-IN",
    },

    notes: {
      type: String,
      default: "",
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "tenants",
  }
);

TenantSchema.index({ createdAt: -1 });

export default mongoose.models.Tenant || mongoose.model("Tenant", TenantSchema);
