"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────
type Step = "details" | "otp" | "password";

// ─── Animated background particles ───────────────────────
function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: i % 3 === 0 ? "#3b82f6" : i % 3 === 1 ? "#06b6d4" : "#8b5cf6",
            opacity: 0.4,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── OTP digit input ──────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = value.slice(0, i) + value.slice(i + 1);
      onChange(next);
      if (i > 0) inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    if (!char) return;
    const next = value.slice(0, i) + char + value.slice(i + 1);
    onChange(next.slice(0, 6));
    if (i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <motion.input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onClick={() => inputs.current[i]?.select()}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200 bg-white/[0.08] text-white focus:border-[#4d8bff] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.25)]
            ${d.trim()
              ? "border-blue-500 text-blue-300 shadow-[0_0_12px_rgba(37,99,235,0.25)]"
              : "border-slate-700 text-slate-200 focus:border-blue-400"
            }`}
        />
      ))}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
    { label: "Special character", ok: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${n <= score ? colors[score] : "bg-slate-700"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => (
            <span key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? "text-emerald-400" : "text-slate-500"}`}>
              <span>{c.ok ? "✓" : "○"}</span> {c.label}
            </span>
          ))}
        </div>
        {score > 0 && (
          <span className={`text-xs font-semibold ml-2 shrink-0 ${score === 4 ? "text-emerald-400" : score >= 3 ? "text-yellow-400" : "text-orange-400"}`}>
            {labels[score]}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Input field ──────────────────────────────────────────
function Field({
  label, type, value, onChange, placeholder, rightEl, error,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rightEl?: React.ReactNode;
  error?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-wide uppercase">{label}</label>
      <div className={`relative rounded-xl border transition-all duration-200 bg-slate-900/70
        ${focused ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" : error ? "border-red-500/60" : "border-slate-700/80"}
      `}>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none text-sm rounded-xl"
          autoComplete={type === "password" ? "new-password" : undefined}
        />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
      {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><span>⚠</span> {error}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();

  // Form state
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [fieldError, setFieldError] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const showToast = (msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Step 1: validate details + send OTP ──────────────────
  const handleSendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    const errors: typeof fieldError = {};
    if (!name.trim() || name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters)";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    if (Object.keys(errors).length) { setFieldError(errors); return; }
    setFieldError({});
    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
        setCountdown(60);
        showToast("Verification code sent! Check your inbox.", "success");
      } else {
        showToast(data.message || "Failed to send code", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────
  const handleVerifyOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    if (otp.length !== 6) { showToast("Enter the 6-digit code", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailVerified(true);
        setStep("password");
        showToast("Email verified! Set your password.", "success");
      } else {
        showToast(data.message || "Invalid code", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: create account ────────────────────────────────
  const handleSignup = async (e?: FormEvent) => {
    e?.preventDefault();
    const errors: typeof fieldError = {};
    if (password.length < 8) errors.password = "Password must be at least 8 characters";
    if (password !== confirmPassword) errors.confirm = "Passwords do not match";
    if (Object.keys(errors).length) { setFieldError(errors); return; }
    setFieldError({});
    if (!emailVerified) { showToast("Email not verified. Please go back.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password, emailVerified: true }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Account created! Redirecting to login…", "success");
        setTimeout(() => router.push("/login"), 1800);
      } else {
        showToast(data.message || "Signup failed", "error");
      }
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Step progress indicator ───────────────────────────────
  const steps = [
    { id: "details", label: "Your Info", num: 1 },
    { id: "otp", label: "Verify Email", num: 2 },
    { id: "password", label: "Set Password", num: 3 },
  ];
  const currentIdx = steps.findIndex((s) => s.id === step);

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle} className="text-slate-500 hover:text-slate-300 transition-colors">
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      )}
    </button>
  );

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#05080f] text-white px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(37,99,235,0.22),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(139,92,246,0.12),transparent)] pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] bg-blue-600/6 blur-[100px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
      </div>
      <Particles />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-2xl border backdrop-blur-xl flex items-center gap-2.5 max-w-sm
              ${toast.type === "success" ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-300"
                : toast.type === "error" ? "bg-red-950/90 border-red-700/50 text-red-300"
                : "bg-slate-900/90 border-slate-700/50 text-slate-200"}`}
          >
            <span>
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✗" : "ℹ"}
            </span>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#2563eb]/20 to-[#7c3aed]/20 border border-[#2563eb]/30 rounded-2xl px-5 py-2.5 mb-4"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center text-xs font-bold">F</div>
            <span className="font-semibold text-slate-200 tracking-wide text-sm">FinOps Trainings</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Create your account</h1>
          <p className="text-slate-400 text-sm">Join thousands of professionals upskilling with FinOps</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                  ${i < currentIdx ? "bg-blue-500 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]"
                    : i === currentIdx ? "bg-blue-500/20 border-blue-500 text-blue-400"
                    : "bg-transparent border-slate-700 text-slate-600"}`}
                >
                  {i < currentIdx ? "✓" : s.num}
                </div>
                <span className={`text-xs mt-1.5 font-medium whitespace-nowrap transition-colors duration-200
                  ${i === currentIdx ? "text-blue-400" : i < currentIdx ? "text-slate-400" : "text-slate-600"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-1 mb-5 rounded-full transition-all duration-500 ${i < currentIdx ? "bg-blue-500" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.10] rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(4,14,46,0.6)]">
          <div className="h-0.5 bg-gradient-to-r from-[#2563eb] via-[#818cf8] to-[#a78bfa]" style={{ width: `${((currentIdx + 1) / 3) * 100}%`, transition: "width 0.5s ease" }} />

          <div className="p-8">
            <AnimatePresence mode="wait">

              {/* ── STEP 1: Details ── */}
              {step === "details" && (
                <motion.div key="details" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-1">Tell us about yourself</h2>
                    <p className="text-slate-500 text-sm">We'll send a verification code to your email</p>
                  </div>
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <Field
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={setName}
                      placeholder="John Doe"
                      error={fieldError.name}
                    />
                    <Field
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="you@company.com"
                      error={fieldError.email}
                    />
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3.5 mt-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#2563eb] to-[#7c3aed] hover:shadow-[0_8px_32px_rgba(37,99,235,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Sending code…
                        </>
                      ) : (
                        <>Send Verification Code <span>→</span></>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === "otp" && (
                <motion.div key="otp" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <div className="mb-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/></svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-1">Check your inbox</h2>
                    <p className="text-slate-500 text-sm">
                      We sent a 6-digit code to<br />
                      <span className="text-blue-400 font-medium">{email}</span>
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <OtpInput value={otp} onChange={setOtp} />

                    <motion.button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      whileHover={{ scale: otp.length === 6 ? 1.01 : 1 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Verifying…
                        </>
                      ) : "Verify Email →"}
                    </motion.button>

                    <div className="text-center space-y-2">
                      <p className="text-slate-500 text-xs">Didn't receive it? Check your spam folder.</p>
                      {countdown > 0 ? (
                        <p className="text-slate-600 text-xs">Resend in <span className="text-slate-400 font-mono">{countdown}s</span></p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setOtp(""); handleSendOtp(); }}
                          className="text-[#93b4ff] hover:text-white text-xs font-medium transition-colors underline underline-offset-2"
                        >
                          Resend code
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setStep("details"); setOtp(""); }}
                        className="block w-full text-slate-600 hover:text-slate-400 text-xs transition-colors"
                      >
                        ← Change email address
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* ── STEP 3: Password ── */}
              {step === "password" && (
                <motion.div key="password" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <span className="text-emerald-400 text-xs font-medium">Email verified: {email}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-1">Set your password</h2>
                    <p className="text-slate-500 text-sm">Create a strong password to secure your account</p>
                  </div>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Field
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={setPassword}
                        placeholder="Create a strong password"
                        error={fieldError.password}
                        rightEl={eyeBtn(showPassword, () => setShowPassword((v) => !v))}
                      />
                      <PasswordStrength password={password} />
                    </div>
                    <Field
                      label="Confirm Password"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Repeat your password"
                      error={fieldError.confirm}
                      rightEl={eyeBtn(showConfirm, () => setShowConfirm((v) => !v))}
                    />
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full py-3.5 mt-2 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#2563eb] to-[#7c3aed] hover:shadow-[0_8px_32px_rgba(37,99,235,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          Creating Account…
                        </>
                      ) : "Create Account 🎉"}
                    </motion.button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center border-t border-slate-800/60 pt-5">
            <p className="text-slate-500 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
            <p className="text-slate-700 text-xs mt-3">
              By signing up, you agree to our{" "}
              <Link href="/terms-and-conditions" className="hover:text-slate-500 transition-colors">Terms</Link>
              {" & "}
              <Link href="/privacy-policy" className="hover:text-slate-500 transition-colors">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
