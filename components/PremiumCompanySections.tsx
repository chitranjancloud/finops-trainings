"use client";

import { motion } from "framer-motion";
import {
  Award,
  BadgeCheck,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Headphones,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const whyItems = [
  {
    title: "Industry Trainers",
    text: "Programs are led by working cloud, security, AI, and FinOps practitioners.",
    icon: <GraduationCap size={24} />,
  },
  {
    title: "Real Projects",
    text: "Hands-on labs, business cases, and guided implementation practice.",
    icon: <Layers3 size={24} />,
  },
  {
    title: "Placement Support",
    text: "Resume direction, interview preparation, and role-based career guidance.",
    icon: <Briefcase size={24} />,
  },
  {
    title: "Certification Ready",
    text: "Structured paths aligned with global certification and enterprise needs.",
    icon: <BadgeCheck size={24} />,
  },
  {
    title: "Flexible Learning",
    text: "Live online, classroom, 1-on-1, corporate, and custom team delivery.",
    icon: <Clock3 size={24} />,
  },
];

const metrics = [
  ["2000+", "Students Trained"],
  ["100+", "Corporate Clients"],
  ["20+", "Expert Trainers"],
];

const process = [
  "Consultation",
  "Learning Plan",
  "Hands-on Labs",
  "Certification",
  "Career Support",
];

const cases = [
  {
    client: "Enterprise Cloud Team",
    problem: "Cloud spend was growing without ownership.",
    solution: "FinOps role training, reporting workflows, and cost governance labs.",
    result: "28% improvement in monthly optimization visibility.",
  },
  {
    client: "Security Operations Cohort",
    problem: "Analysts needed structured SOC and compliance capability.",
    solution: "Scenario-based security training with guided incident practice.",
    result: "Faster triage, better reporting, and stronger audit confidence.",
  },
  {
    client: "AI Upskilling Program",
    problem: "Teams wanted practical AI adoption without tool confusion.",
    solution: "Role-based AI sessions, prompt workflows, and applied project reviews.",
    result: "Reusable internal AI workflows launched in 6 weeks.",
  },
];

export default function PremiumCompanySections() {
  return (
    <div className="bg-white text-slate-950">
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="eyebrow">
                Why Choose Us
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Built like a training partner, not a course catalog.
              </h2>
            </div>
            <p className="max-w-xl text-base leading-8 text-slate-600">
              We combine premium delivery, measurable outcomes, and practical
              support so individuals and teams can move from learning to impact.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {whyItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/10"
              >
                <div className="mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb]/10 to-[#7c3aed]/10 border border-[#2563eb]/15 text-[#4d8bff] transition group-hover:from-[#2563eb] group-hover:to-[#7c3aed] group-hover:text-white group-hover:border-transparent">
                  {item.icon}
                </div>
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {metrics.map(([value, label], index) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl bg-gradient-to-br from-[#0d2460] to-[#040e2e] p-7 text-white shadow-xl border border-white/[0.08]"
            >
              <p className="text-4xl font-black tracking-tight bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] bg-clip-text text-transparent">
                {value}
              </p>
              <p className="mt-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                {label}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow">
              Our Process
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              A clear path from requirement to result.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Every learner and corporate team gets a guided journey with
              structure, accountability, and measurable checkpoints.
            </p>
          </div>

          <div className="space-y-4">
            {process.map((step, index) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white text-lg font-black shadow-[0_4px_16px_rgba(37,99,235,0.4)]">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black">{step}</h3>
                  <p className="text-sm text-slate-600">
                    {index === 0 && "Understand goals, audience, schedule, and skill gaps."}
                    {index === 1 && "Build the right course path and delivery model."}
                    {index === 2 && "Practice with guided exercises and real scenarios."}
                    {index === 3 && "Prepare for assessments, credentials, and reviews."}
                    {index === 4 && "Continue with mentoring, reporting, and career support."}
                  </p>
                </div>
                <CheckCircle2 className="ml-auto text-emerald-500" size={22} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-6 py-24 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-300">
                Reviews, Events, Case Studies
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
                Trust signals that feel real.
              </h2>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
              <ShieldCheck className="text-blue-300" />
              <span className="text-sm font-bold text-slate-300">
                ISO, Microsoft, AWS, and enterprise-ready learning paths
              </span>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              {/* FinOps Video Placeholder — swap FINOPS_VIDEO_URL to use a real video */}
              {(() => {
                const FINOPS_VIDEO_URL = ""; // ← Paste YouTube embed URL here when ready
                return (
                  <div className="relative mb-6 flex aspect-video items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950">
                    {FINOPS_VIDEO_URL ? (
                      <iframe
                        src={FINOPS_VIDEO_URL}
                        title="FinOps Training Overview"
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.25),transparent_42%,rgba(139,92,246,0.18))]" />
                        <div className="relative flex flex-col items-center gap-4 text-center px-6">
                          <button className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-2xl transition hover:scale-105">
                            <Play fill="currentColor" size={24} />
                          </button>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">FinOps Training Overview</p>
                          <p className="text-xs text-slate-500">Video will appear here once configured</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <h3 className="text-xl font-black">Client Reviews Video</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Learner stories, corporate feedback, and FinOps training outcomes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-black">Upcoming Events</h3>
                <CalendarDays className="text-blue-300" />
              </div>
              {[
                ["FinOps Cost Control Lab", "Live workshop"],
                ["AI Productivity Bootcamp", "Webinar"],
                ["Azure Security Readiness", "Corporate session"],
              ].map(([title, type]) => (
                <div
                  key={title}
                  className="mb-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-bold">{title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-blue-300">
                    {type}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-black">Trust Badges</h3>
                <Award className="text-amber-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Microsoft", "AWS", "ISO Ready", "PECB", "Cisco", "LinkedIn"].map((badge) => (
                  <div
                    key={badge}
                    className="rounded-2xl border border-white/10 bg-white px-4 py-5 text-center text-sm font-black text-slate-900"
                  >
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {cases.map((item, index) => (
              <motion.div
                key={item.client}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="mb-5 flex items-center gap-3 text-blue-300">
                  {index === 0 && <BarChart3 />}
                  {index === 1 && <Headphones />}
                  {index === 2 && <Sparkles />}
                  <p className="font-black text-white">{item.client}</p>
                </div>
                <p className="text-sm text-slate-400">
                  <strong className="text-slate-200">Problem:</strong> {item.problem}
                </p>
                <p className="mt-3 text-sm text-slate-400">
                  <strong className="text-slate-200">Solution:</strong> {item.solution}
                </p>
                <p className="mt-4 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-200">
                  {item.result}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
