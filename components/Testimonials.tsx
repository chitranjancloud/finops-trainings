"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  Briefcase,
  CheckCircle2,
  MonitorSmartphone,
  Quote,
  ShieldCheck,
  Star,
  Users,
  Users2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { defaultTestimonials } from "@/lib/defaultHomepageContent";

const offerings = [
  {
    title: "Expert Instructors",
    desc: "Learn from working professionals with practical delivery experience.",
    icon: <Users size={22} />,
    accent: "text-blue-300",
    link: "/features/expert-instructors",
  },
  {
    title: "Hands-on Learning",
    desc: "Build confidence through guided labs, exercises, and real scenarios.",
    icon: <ShieldCheck size={22} />,
    accent: "text-emerald-300",
    link: "/features/hands-on-learning",
  },
  {
    title: "Industry Recognized",
    desc: "Earn certificates that help strengthen your professional profile.",
    icon: <Award size={22} />,
    accent: "text-amber-300",
    link: "/features/industry-recognized",
  },
  {
    title: "Career Support",
    desc: "Get interview guidance, resume direction, and placement assistance.",
    icon: <Briefcase size={22} />,
    accent: "text-rose-300",
    link: "/features/career-support",
  },
  {
    title: "Flexible Learning",
    desc: "Choose learning formats that work with your schedule and goals.",
    icon: <MonitorSmartphone size={22} />,
    accent: "text-blue-300",
    link: "/features/flexible-learning",
  },
  {
    title: "Community Access",
    desc: "Join peers, mentors, and FinOps professionals for continued growth.",
    icon: <Users2 size={22} />,
    accent: "text-violet-300",
    link: "/features/community-access",
  },
];

export default function DynamicPremiumSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const fetchTestimonials = async () => {
      try {
        const res = await fetch("/api/testimonials", {
          cache: "no-store",
        });

        const data = await res.json();

        if (
          isMounted &&
          data.success &&
          Array.isArray(data.testimonials) &&
          data.testimonials.length > 0
        ) {
          setTestimonials(data.testimonials);
          setActiveIndex(0);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchTestimonials();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTestimonial = testimonials[activeIndex] || testimonials[0];

  return (
    <section className="relative overflow-hidden bg-white text-gray-900 py-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="bg-[#0f1419] rounded-3xl p-12 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
            <div className="max-w-2xl">
              <p className="eyebrow mb-4">
                Built for serious career growth
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
                Unique Offerings
              </h2>
              <p className="text-slate-400 mt-4 leading-relaxed">
                Premium training support, practical learning, and career-focused guidance in one complete learning experience.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-black text-gold"> 2000+</p>
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
                  Learners
                </p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">98%</p>
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
                  Satisfaction
                </p>
              </div>
              <div>
                <p className="text-2xl font-black text-white">24/7</p>
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
                  Support
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {offerings.map((item, i) => (
              <motion.button
                key={item.title}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(item.link)}
                className="group text-left rounded-2xl border border-white/10 bg-white/[0.035] p-6 hover:bg-white/[0.07] hover:border-[#2563eb]/30 hover:shadow-[0_8px_32px_rgba(37,99,235,0.12)] transition-all min-h-[190px]"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div
                    className={`w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center ${item.accent}`}
                  >
                    {item.icon}
                  </div>
                  <ArrowUpRight
                    size={18}
                    className="text-slate-600 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1 transition"
                  />
                </div>

                <h3 className="text-lg font-bold text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mt-3">
                  {item.desc}
                </p>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-16 pt-14 border-t border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-300 mb-4">
                Proven by outcomes
              </p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-black">
                What Our Learners Say
              </h2>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 size={18} className="text-emerald-300" />
              Verified learner feedback from recent programs
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
            <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-sm p-7 md:p-10 min-h-[360px] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.3 }}
                >
                  <Quote className="text-blue-300/70 mb-8" size={42} />

                  <p className="text-2xl md:text-3xl text-black leading-snug font-semibold">
                    "{activeTestimonial?.content}"
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mt-10">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 p-[1px]">
                        <div className="w-full h-full rounded-2xl bg-[#1e293b] flex items-center justify-center">
                          <span className="text-sm font-black">
                            {activeTestimonial?.name?.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-black">
                          {activeTestimonial?.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {activeTestimonial?.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          fill={
                            i < (activeTestimonial?.rating || 5)
                              ? "#fbbf24"
                              : "none"
                          }
                          className={
                            i < (activeTestimonial?.rating || 5)
                              ? "text-amber-400"
                              : "text-slate-700"
                          }
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="space-y-3">
                {testimonials.slice(0, 4).map((item, i) => (
                  <button
                    key={`${item.name}-${i}`}
                    type="button"
                    onClick={() => setActiveIndex(i)}
                    className={`w-full text-left rounded-2xl border p-5 transition ${
                      i === activeIndex
                        ? "border-[#2563eb]/40 bg-[#2563eb]/15"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-black">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {item.role}
                        </p>
                      </div>
                      <ArrowUpRight
                        size={16}
                        className={
                          i === activeIndex ? "text-blue-300" : "text-slate-600"
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-700 mt-4 line-clamp-2">
                      {item.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-3 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                aria-label={`Show testimonial ${i + 1}`}
                className={`transition-all duration-300 rounded-full h-1.5 ${
                  i === activeIndex
                    ? "w-9 bg-gradient-to-r from-[#2563eb] to-[#8b5cf6]"
                    : "w-2 bg-white/15 hover:bg-white/35"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
