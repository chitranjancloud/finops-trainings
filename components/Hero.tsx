"use client";

import { motion } from "framer-motion";
import {
  ArrowRight, BadgeCheck, Briefcase, CalendarCheck,
  GraduationCap, Play, ShieldCheck, Sparkles, Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { defaultHeroBanners } from "@/lib/defaultHomepageContent";

type HeroBanner = {
  _id?: string; eyebrow?: string; title: string; description?: string;
  image?: string; ctaLabel?: string; ctaHref?: string; badge?: string; isActive?: boolean;
};

const stats = [
  ["2000+", "Learners trained"],
  ["5,000+", "Hiring companies"],
  ["700+", "Placement drives"],
  ["75 LPA", "Highest package"],
];

export default function PremiumHero() {
  const router = useRouter();
  const [banners, setBanners] = useState<HeroBanner[]>(defaultHeroBanners as HeroBanner[]);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/hero-banners", { cache: "no-store" });
        const data = await res.json();
        const activeItems = Array.isArray(data.banners)
          ? data.banners.filter((item: HeroBanner) => item.isActive !== false) : [];
        if (isMounted && data.success && activeItems.length > 0) {
          setBanners(activeItems); setActiveBanner(0);
        }
      } catch (error) { console.log(error); }
    };
    fetchBanners();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = window.setInterval(() => {
      setActiveBanner((current) => (current + 1) % banners.length);
    }, 5200);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  const banner = banners[activeBanner] || banners[0];
  const heroTitle = banner?.title || "Upgrade your skills.";
  const titleParts = heroTitle.split(".");
  const primaryTitle = titleParts[0]?.trim() || heroTitle;
  const secondaryTitle = titleParts.slice(1).join(".").trim() || banner?.badge || "Build your career";

  return (
    <section className="relative overflow-hidden bg-[#05080f] px-6 pb-16 pt-28 md:pt-32">
      {/* Background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(37,99,235,0.25),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_20%,rgba(139,92,246,0.15),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_30%_30%_at_10%_80%,rgba(37,99,235,0.08),transparent)]" />
      {/* Bottom divider line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2563eb]/40 to-transparent" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>

          {/* Eyebrow */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#93b4ff] shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
            <Sparkles size={14} />
            {banner?.eyebrow || "Job-oriented technology training"}
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[1.03] tracking-tight md:text-7xl text-white">
            {primaryTitle}
            <span className="block bg-gradient-to-r from-[#4d8bff] via-[#818cf8] to-[#a78bfa] bg-clip-text text-transparent">
              {secondaryTitle}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            {banner?.description ||
              "Master FinOps, cloud, AI, security, and enterprise technology with practical training, certification pathways, and placement-focused support."}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => {
                const href = banner?.ctaHref || "/#top-courses";
                if (typeof href === "string" && href.startsWith("/courses")) {
                  router.push("/#top-courses"); return;
                }
                router.push(href);
              }}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] px-7 py-4 text-base font-black text-white shadow-[0_8px_32px_rgba(37,99,235,0.5)] hover:shadow-[0_12px_48px_rgba(37,99,235,0.7)] hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              {banner?.ctaLabel || "Explore Courses"} <ArrowRight size={20} />
            </button>
            <button
              onClick={() => router.push("/contact")}
              className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.06] backdrop-blur-sm px-7 py-4 text-base font-black text-white hover:bg-white/[0.10] hover:border-white/40 transition-all"
            >
              Get Free Counseling <CalendarCheck size={20} />
            </button>
            <button className="inline-flex items-center gap-3 rounded-full px-5 py-4 text-base font-black text-slate-400 transition hover:text-[#93b4ff]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_4px_20px_rgba(37,99,235,0.5)]">
                <Play size={17} fill="currentColor" className="text-white" />
              </span>
              Watch success stories
            </button>
          </div>

          <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              ["80:20 practical approach", ShieldCheck],
              ["Dedicated career coach", Users],
              ["Integrated assignments", GraduationCap],
              ["Placement preparation", Briefcase],
            ].map(([label, Icon]: any) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] backdrop-blur-sm px-4 py-3 text-sm font-bold text-slate-300 shadow-sm"
              >
                <Icon size={18} className="text-[#60a5fa]" />
                {label}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.65 }}
          className="relative"
        >
          {/* Outer glow wrapper */}
          <div className="rounded-[34px] bg-gradient-to-br from-white/[0.08] to-white/[0.04] p-[1px] shadow-[0_32px_80px_rgba(4,14,46,0.6)]">
            <div className="bg-[#080c17] rounded-[33px] p-4">
              <div className="overflow-hidden rounded-[28px] text-white">
                <div className="relative min-h-[420px] p-7" style={{ background: "linear-gradient(135deg, #0d2460 0%, #0f2d5a 50%, #040e2e 100%)" }}>
                  <img
                    src={banner?.image || "/hero.jpg"}
                    alt={banner?.title || "FinOps training"}
                    className="absolute inset-0 h-full w-full object-cover opacity-20"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0d2460]/90 via-[#0f2d5a]/80 to-[#040e2e]/95" />

                  <div className="relative z-10">
                    <div className="mb-10 flex items-center justify-between">
                      <span className="rounded-full bg-gradient-to-r from-[#2563eb]/20 to-[#7c3aed]/20 border border-[#2563eb]/30 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#93b4ff]">
                        {banner?.badge || "FinOps Trainings"}
                      </span>
                      <BadgeCheck className="text-[#4d8bff]" size={28} />
                    </div>

                    <h2 className="max-w-md text-4xl font-black leading-tight text-white">
                      {banner?.title || "A hiring call every 12 hours. Your turn next."}
                    </h2>
                    <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
                      {banner?.description ||
                        "Learn with mentors, work on real projects, prepare your profile, and move toward high-value technology roles."}
                    </p>

                    <div className="mt-10 grid grid-cols-2 gap-4">
                      {stats.map(([value, label]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.08] to-white/[0.04] backdrop-blur-sm p-5"
                        >
                          <p className="text-2xl font-black bg-gradient-to-r from-[#fcd34d] to-[#f59e0b] bg-clip-text text-transparent">{value}</p>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                        </div>
                      ))}
                    </div>

                    {banners.length > 1 && (
                      <div className="mt-7 flex gap-2">
                        {banners.map((item, index) => (
                          <button
                            key={item._id || item.title}
                            onClick={() => setActiveBanner(index)}
                            aria-label={`Show banner ${index + 1}`}
                            className={`h-2 rounded-full transition-all ${
                              activeBanner === index
                                ? "w-10 bg-gradient-to-r from-[#2563eb] to-[#8b5cf6]"
                                : "w-2 bg-white/25 hover:bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
