"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Users, CalendarDays } from "lucide-react";
import { defaultHeroBanners } from "@/lib/defaultHomepageContent";

type Banner = { title: string; description?: string; image?: string; isActive?: boolean };
export default function Hero() {
  const [banner, setBanner] = useState<Banner | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/hero-banners", { signal: controller.signal }).then(response => response.json()).then(data => {
      if (data.success && Array.isArray(data.banners)) setBanner(data.banners.find((item: Banner) => item.isActive !== false) || null);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return <>
    <section className="relative overflow-hidden bg-slate-950 px-6 py-16 text-white md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-6 text-sm font-semibold text-blue-300">Practical technology training. A clearer next step.</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">{banner?.title || "Build skills you can put to work."}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{banner?.description || "Learn cloud, FinOps, AI, and security through guided training and hands-on practice. Find a learning path that fits your experience and goals."}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/#top-courses" className="inline-flex items-center gap-3 rounded-xl bg-blue-600 px-6 py-3.5 font-semibold text-white hover:bg-blue-500">Explore courses <ArrowRight size={18} /></Link><Link href="/contact" className="inline-flex items-center gap-3 rounded-xl border border-slate-600 px-6 py-3.5 font-semibold text-white hover:bg-slate-800">Talk to an advisor</Link></div>
          <Link href="/#testimonials" className="mt-7 inline-flex items-center gap-2 text-sm text-slate-300 underline-offset-4 hover:text-white hover:underline">Read learner experiences <ArrowRight size={16} /></Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
          <img src={banner?.image || defaultHeroBanners[0]?.image || "/hero.jpg"} alt="Learning with FinOps Trainings" className="h-52 w-full object-cover sm:h-64" />
          <div className="p-6 sm:p-8"><p className="text-sm font-medium text-blue-300">Find your learning format</p><h2 className="mt-2 text-2xl font-semibold">Your goals. Your pace.</h2><div className="mt-6 space-y-4">{[
            { title: "Learn with a trainer", text: "Live online, classroom, or one-to-one", href: "/learning/live-online-training", icon: Users },
            { title: "Learn on your schedule", text: "Explore self-paced course options", href: "/#top-courses", icon: BookOpen },
            { title: "Upskill your team", text: "Training tailored to your organization", href: "/learning/customized-training", icon: CalendarDays },
          ].map(({ title, text, href, icon: Icon }) => <Link key={title} href={href} className="group flex items-center gap-4 rounded-xl border border-slate-700 p-4 hover:border-blue-400"><Icon size={22} className="shrink-0 text-blue-300" /><span className="flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-400">{text}</span></span><ArrowRight size={17} className="text-slate-500 group-hover:text-blue-300" /></Link>)}</div></div>
        </div>
      </div>
    </section>
    <div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-medium text-slate-600">{["Guided practical learning", "Flexible training formats", "Progress and assessments", "Career preparation support"].map(text => <span key={text} className="inline-flex items-center gap-2"><CheckCircle2 size={17} className="text-blue-600" />{text}</span>)}</div></div>
  </>;
}
