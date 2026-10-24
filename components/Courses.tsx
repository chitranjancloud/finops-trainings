"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Briefcase, Clock, Cloud, Cpu, Shield, Star, Users, Zap } from "lucide-react";

const technologies = [
  { title: "Microsoft 365", slug: "microsoft-365", icon: <Cloud size={19} /> },
  { title: "Security", slug: "security", icon: <Shield size={19} /> },
  { title: "AI & Data", slug: "artificial-intelligence", icon: <Cpu size={19} /> },
  { title: "Azure Cloud", slug: "azure", icon: <Cloud size={19} /> },
  { title: "Business Skills", slug: "business-skills", icon: <Zap size={19} /> },
];

const COURSE_BANNER_HEIGHT = "h-[180px]";

function CourseCardPlaceholder() {
  return (
    <div
      className={`${COURSE_BANNER_HEIGHT} w-full flex items-center justify-center bg-gradient-to-br from-[#2563eb]/20 via-[#7c3aed]/15 to-[#2563eb]/25`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb]/25 to-[#7c3aed]/20 border border-[#2563eb]/25 text-[#2563eb] shadow-sm">
        <Briefcase size={28} />
      </div>
    </div>
  );
}

function CourseCardBanner({
  image,
  title,
}: {
  image?: string;
  title?: string;
}) {
  const src = typeof image === "string" ? image.trim() : "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <CourseCardPlaceholder />;
  }

  return (
    <div className={`${COURSE_BANNER_HEIGHT} w-full overflow-hidden`}>
      <img
        src={src}
        alt={title || "Course"}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function Courses() {
  const [activeTab, setActiveTab] = useState("Top Courses");
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();
        if (data.success) setCourses(data.courses || []);
      } catch (error) { console.log(error); }
    };
    fetchCourses();
  }, []);

  return (
    <section id="top-courses" className="relative bg-white px-6 py-24 text-slate-950">
      {/* Subtle top gradient bleed from hero */}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#05080f]/5 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow mb-3">Career-ready courses</p>
            <h2 className="mt-1 text-4xl font-black tracking-tight md:text-5xl">
              Choose the learning track that aligns with your career goals.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Practical courses, real assignments, certification guidance, and placement-focused preparation.
            </p>
          </div>
          <Link href="/contact" className="inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] px-6 py-3 text-sm font-black text-white shadow-[0_4px_20px_rgba(37,99,235,0.35)] hover:shadow-[0_8px_32px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 transition-all">
            Get Counseling <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mb-10 flex w-fit rounded-full border border-slate-200 bg-slate-100 p-1">
          {["Top Courses", "Top Technologies", "New & Trending"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {courses.slice(0, 9).map((course, index) => (
              <Link key={course._id || course.slug || index} href={`/courses/${course.slug}`}>
                <motion.article
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.03 }}
                  className="course-card group flex h-full min-h-[300px] flex-col cursor-pointer"
                >
                  <div className="relative">
                    <CourseCardBanner image={course.image} title={course.title} />
                    <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                      <span className="rounded-full bg-gradient-to-r from-[#2563eb]/10 to-[#7c3aed]/10 border border-[#2563eb]/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#4d8bff]">
                        {course.badge || "Published"}
                      </span>
                      {course.isPublished === false && (
                        <span className="rounded-full bg-amber-500/10 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                          Unpublished
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-black leading-tight transition group-hover:text-[#2563eb]">
                      {course.title}
                    </h3>
                    <p className="mt-4 line-clamp-3 flex-1 text-sm leading-7 text-slate-600">
                      {course.description}
                    </p>

                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
                      <div className="flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                        <span className="inline-flex items-center gap-1"><Clock size={13} /> {course.duration || "Flexible"}</span>
                        <span className="inline-flex items-center gap-1"><Users size={13} /> {course.enrolled || "Learners"}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-black text-amber-500">
                        <Star size={14} fill="currentColor" /> 4.9
                      </span>
                    </div>
                  </div>
                </motion.article>
              </Link>
            ))}
          </div>

          <aside className="rounded-3xl p-7 text-white shadow-2xl overflow-hidden relative" style={{ background: "linear-gradient(135deg, #0d2460 0%, #0f2d5a 50%, #040e2e 100%)" }}>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.2),transparent_60%)]" />
            <div className="relative z-10">
              <p className="eyebrow mb-3">Top Technologies</p>
              <h3 className="mt-1 text-3xl font-black text-white">
                Learn tools companies actually hire for.
              </h3>
              <div className="mt-7 space-y-3">
                {technologies.map((tech) => (
                  <Link
                    key={tech.slug}
                    href={`/technologies/${tech.slug}`}
                    className="flex items-center justify-between rounded-2xl border border-white/[0.10] bg-white/[0.06] p-4 transition-all hover:bg-white/[0.12] hover:border-[#4d8bff]/40 hover:shadow-[0_4px_20px_rgba(37,99,235,0.2)] group"
                  >
                    <span className="flex items-center gap-3 font-bold text-slate-200 group-hover:text-white transition-colors">
                      {tech.icon} {tech.title}
                    </span>
                    <ArrowRight size={16} className="text-slate-500 group-hover:text-[#4d8bff] transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
