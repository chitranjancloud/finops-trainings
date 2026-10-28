"use client";

import { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

function getDeviceId() {
  let deviceId = localStorage.getItem("deviceId");

  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem("deviceId", deviceId);
  }

  return deviceId;
}

const subscribeToHydration = () => () => {};

export default function LoginPage() {
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const deviceId = getDeviceId();

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          deviceId,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {


        localStorage.setItem("user", JSON.stringify(data.user));

        if (data.sessionToken) {
          localStorage.setItem("sessionToken", data.sessionToken);
        }

        localStorage.setItem("deviceId", deviceId);

        if (data.user.role === "admin") {
          router.push("/admin-page");
        } else {
          router.push("/student");
        }
      } else {
        setError(data.message || "Check your email and password and try again.");
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setError("Unable to sign in. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#05080f] text-white px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.22),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(139,92,246,0.12),transparent)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md p-8 rounded-3xl overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10"
      >
        <h1 className="text-3xl font-semibold text-center mb-8">
          Welcome Back
        </h1>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && <p id="login-error" role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
          <label htmlFor="login-email" className="block text-sm font-medium text-slate-200">Email address</label>
          <input
            disabled={!ready || loading}
            id="login-email"
            autoComplete="email"
            aria-describedby={error ? "login-error" : undefined}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-slate-600 outline-none focus:border-[#4d8bff] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)] transition-all"
            placeholder="Email"
          />

          <label htmlFor="login-password" className="block text-sm font-medium text-slate-200">Password</label>
          <div className="relative">
            <input
              disabled={!ready || loading}
              id="login-password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-slate-600 pr-12 outline-none focus:border-[#4d8bff] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)] transition-all"
              placeholder="Password"
            />

            <button
              type="button"
              disabled={!ready}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 text-sm text-slate-300 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="flex justify-end -mt-3">
            <button
              type="button"
              onClick={() => router.push("/forgot-password")}
              className="text-sm text-[#93b4ff] hover:text-white transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            disabled={!ready || loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] font-black text-white shadow-[0_8px_32px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_48px_rgba(37,99,235,0.65)] hover:-translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-center mt-6 text-gray-300">
          Don&apos;t have an account?{" "}
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-[#93b4ff] hover:text-white transition-colors cursor-pointer"
          >
            Sign Up
          </button>
        </p>
      </motion.div>
    </section>
  );
}