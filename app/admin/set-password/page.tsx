"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function SetAdminPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a]" />}>
      <SetAdminPasswordForm />
    </Suspense>
  );
}

function SetAdminPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  if (!token) {
    return (
      <section className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-300 flex items-center justify-center mb-6 mx-auto">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-bold">Invalid Setup Link</h1>
          <p className="text-slate-300 mt-3">
            This password setup link is missing a token. Please use the exact link sent to your email.
            If the link has expired, ask an existing admin to resend your invitation.
          </p>
        </div>
      </section>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (saving) return;

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/admin/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Password set successfully. Please login.");
        router.push("/login");
      } else {
        alert(data.message || "Unable to set password");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to set password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl p-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-6">
          <ShieldCheck size={28} />
        </div>

        <h1 className="text-3xl font-bold">Set Admin Password</h1>
        <p className="text-slate-300 mt-2 mb-6">
          Create your password to activate the admin account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            minLength={6}
            required
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-5 py-4 outline-none"
          />

          <input
            type="password"
            minLength={6}
            required
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-2xl bg-white/10 border border-white/15 px-5 py-4 outline-none"
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-500 hover:bg-[#2563eb] disabled:bg-[#0a2f52] disabled:text-slate-400 transition rounded-2xl py-4 font-semibold"
          >
            {saving ? "Saving..." : "Set Password"}
          </button>
        </form>
      </div>
    </section>
  );
}
