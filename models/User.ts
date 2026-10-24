import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // ✅ Full Name
    name: {
      type: String,
      required: true,
    },

    // ✅ Email
    email: {
      type: String,
      unique: true,
      required: true,
    },

    // ✅ Password
    password: {
      type: String,
      required: true,
    },

    // ✅ Password Setup & Invitations
    passwordSetupRequired: {
      type: Boolean,
      default: false,
    },

    passwordSetupToken: {
      type: String,
      default: "",
    },

    passwordSetupExpires: {
      type: Date,
    },

    invitedBy: {
      type: String,
      default: "",
    },

    inviteSentAt: {
      type: Date,
    },

    // ✅ Login History & Session Tracking
    lastLoginAt: {
      type: Date,
    },

    lastLogoutAt: {
      type: Date,
    },

    // ✅ User Role
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // ✅ Session Token
    sessionToken: {
      type: String,
      default: "",
    },

    // ✅ Login Status
    isLoggedIn: {
      type: Boolean,
      default: false,
    },

    // ✅ Prevent multiple device login
    activeDevice: {
      type: String,
      default: "",
    },
  },

  // ✅ Automatically adds createdAt & updatedAt
  {
    timestamps: true,
  }
);

// ✅ Prevent model overwrite error
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;