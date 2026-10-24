"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (sending) return;

    try {
      setSending(true);
      setMessage("");

      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage(
          data.message ||
            "If this email is registered, a password reset link has been sent."
        );
      } else {
        setMessage(data.message || "Unable to send reset link. Please try again.");
      }
    } catch (error) {
      console.log(error);
      setMessage("Unable to send reset link. Please try again.");
    } finally {
      setSending(false);
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
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>

        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center mb-6">
          <Mail size={28} />
        </div>

        <h1 className="text-3xl font-semibold mb-3">Forgot Password</h1>
        <p className="text-slate-400 mb-8">
          Enter your registered email and we will send you a secure password reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-slate-600 outline-none focus:border-[#4d8bff] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.2)] transition-all"
            placeholder="Registered email"
          />

          <button
            type="submit"
            disabled={sending}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] font-black text-white shadow-[0_8px_32px_rgba(37,99,235,0.45)] hover:shadow-[0_12px_48px_rgba(37,99,235,0.65)] hover:-translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {sending ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        )}
      </motion.div>
    </section>
  );
}