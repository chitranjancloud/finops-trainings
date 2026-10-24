"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  MessageSquareText,
  Send,
  Sparkles,
  Star,
} from "lucide-react";

export default function FeedbackPage() {
  const [user, setUser] = useState<any>(null);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    role: "",
    content: "",
    rating: "5",
  });

  useEffect(() => {
    const checkEligibility = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");

      if (!storedUser || !sessionToken || !deviceId) {
        setMessage("Please login with your enrolled student account to submit feedback.");
        setLoading(false);
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);

      try {
        const res = await fetch("/api/testimonials/eligibility", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: parsedUser._id,
            sessionToken,
            deviceId,
          }),
        });

        const data = await res.json();
        setEligible(Boolean(data.eligible));

        if (!data.eligible) {
          setMessage(data.message || "Feedback is available only for enrolled students.");
        }
      } catch (error) {
        setMessage("Unable to verify your enrollment right now.");
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, []);

  const submitFeedback = async () => {
    if (!form.content.trim()) {
      setMessage("Please write your feedback before submitting.");
      return;
    }

    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");

    try {
      setSubmitting(true);
      setMessage("");

      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "student",
          userId: user?._id,
          sessionToken,
          deviceId,
          name: user?.name || "Student",
          role: form.role || "Verified Learner",
          content: form.content,
          rating: form.rating,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Feedback submission failed");
      }

      setForm({
        role: "",
        content: "",
        rating: "5",
      });
      setMessage("Thank you. Your feedback has been sent to admin for approval.");
    } catch (error: any) {
      setMessage(error.message || "Feedback submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f172a] px-6 pt-28 pb-20 text-white">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,211,238,0.12),transparent_35%,rgba(16,185,129,0.1)_72%,transparent)]" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-slate-300 transition hover:text-white">
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.055] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-blue-100">
              <Sparkles size={14} />
              Verified feedback
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">
              Share your learning experience
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Feedback is open only for enrolled learners. Once approved by admin, your testimonial appears on the public homepage.
            </p>

            <div className="mt-10 grid gap-4">
              <Info icon={<CheckCircle2 size={20} />} title="Enrollment checked" text="Only students with course enrollment can submit." />
              <Info icon={<MessageSquareText size={20} />} title="Admin reviewed" text="Every submission is accepted or rejected before publishing." />
              <Info icon={<Star size={20} />} title="Published testimonial" text="Accepted feedback becomes visible to everyone." />
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white p-6 text-slate-950 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
            {loading ? (
              <Gate icon={<Sparkles size={24} />} title="Checking eligibility..." text="Please wait while we verify your enrolled account." />
            ) : !eligible ? (
              <Gate
                icon={<LockKeyhole size={24} />}
                title="Feedback locked"
                text={message || "Feedback is available only for enrolled students."}
              />
            ) : (
              <>
                <div className="rounded-3xl bg-slate-950 p-6 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                    New testimonial
                  </p>
                  <h2 className="mt-3 text-3xl font-black">
                    Hi {user?.name || "Student"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Your feedback will be sent to admin for approval.
                  </p>
                </div>

                <div className="mt-6 grid gap-4">
                  <input
                    type="text"
                    placeholder="Role / Company / Course"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="rounded-2xl border border-gray-200 px-5 py-4 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />

                  <select
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: e.target.value })}
                    className="rounded-2xl border border-gray-200 px-5 py-4 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>

                  <textarea
                    rows={8}
                    placeholder="Write your feedback..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="resize-none rounded-2xl border border-gray-200 px-5 py-4 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />

                  {message && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-900">
                      {message}
                    </div>
                  )}

                  <button
                    onClick={submitFeedback}
                    disabled={submitting}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 font-black text-white transition hover:bg-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit Feedback"}
                    <Send size={18} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-blue-300/10 text-blue-200">
          {icon}
        </div>
        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Gate({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-950 text-blue-200">
        {icon}
      </div>
      <h2 className="mt-5 text-3xl font-black">{title}</h2>
      <p className="mt-3 max-w-md leading-7 text-slate-500">{text}</p>
      <Link href="/login" className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white transition hover:bg-black">
        Go to Login
      </Link>
    </div>
  );
}
