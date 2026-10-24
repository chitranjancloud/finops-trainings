"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Play,
  Sparkles,
  Users,
  X,
  ZoomIn,
} from "lucide-react";

type Session = {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  date: string;
  location: string;
  attendees: string;
  duration: string;
  images: string[];
  coverImage: string;
  highlights: string[];
  tags: string[];
  instructor: string;
  isFeatured: boolean;
  displayOrder: number;
};

const FALLBACK_SESSIONS: Session[] = [
  {
    _id: "f1",
    title: "AWS Solutions Architect Bootcamp",
    subtitle: "Hands-on cloud architecture for real-world deployments",
    description:
      "A 3-day intensive bootcamp covering AWS core services, VPC networking, IAM security, EC2/S3/RDS, and serverless architecture. Students built and deployed a fully working cloud application by the end of Day 3.",
    category: "AWS",
    date: "April 2024",
    location: "Mumbai, India",
    attendees: "52",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80",
      "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    highlights: [
      "Live AWS Console Labs",
      "VPC & Security Groups",
      "Serverless with Lambda",
      "Mock Exam & Certification Path",
    ],
    tags: ["AWS", "Cloud", "Architecture", "Certification"],
    instructor: "Arjun Sharma",
    isFeatured: true,
    displayOrder: 1,
  },
  {
    _id: "f2",
    title: "FinOps Foundation Practitioner Workshop",
    subtitle: "Cloud cost optimisation for finance & engineering teams",
    description:
      "An executive-level workshop bringing together finance controllers and DevOps engineers to align on cloud cost governance. Covered tagging strategies, showback/chargeback models, and FinOps maturity frameworks used by Fortune 500 companies.",
    category: "FinOps",
    date: "February 2024",
    location: "Bengaluru, India",
    attendees: "38",
    duration: "2 Days",
    images: [
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
    highlights: [
      "Cost Allocation Deep-dive",
      "Tagging & Chargeback Strategy",
      "FinOps Maturity Assessment",
      "Executive Dashboard Reporting",
    ],
    tags: ["FinOps", "Cost Optimisation", "Cloud Finance"],
    instructor: "Priya Mehta",
    isFeatured: true,
    displayOrder: 2,
  },
  {
    _id: "f3",
    title: "DevSecOps Immersion Program",
    subtitle: "Security-first CI/CD pipeline engineering",
    description:
      "A 3-day structured program combining DevOps culture, CI/CD pipeline automation with GitHub Actions, Docker containerisation, Kubernetes orchestration, and SAST/DAST security scanning integrated into every pipeline stage.",
    category: "DevOps",
    date: "November 2023",
    location: "Pune, India",
    attendees: "64",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
      "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    highlights: [
      "Docker & Kubernetes Hands-on",
      "SAST / DAST Integration",
      "GitHub Actions Pipelines",
      "Threat Modelling Workshop",
    ],
    tags: ["DevSecOps", "Kubernetes", "Docker", "CI/CD"],
    instructor: "Rahul Kulkarni",
    isFeatured: false,
    displayOrder: 3,
  },
  {
    _id: "f4",
    title: "Azure Cloud Administrator Training",
    subtitle: "Enterprise Azure skills for the AZ-104 certification",
    description:
      "Comprehensive 4-day training covering Azure Active Directory, virtual machines, storage accounts, networking, and monitoring. Participants left with a structured study plan and practice lab environment.",
    category: "Azure",
    date: "January 2024",
    location: "Hyderabad, India",
    attendees: "45",
    duration: "4 Days",
    images: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    highlights: [
      "Azure AD & RBAC",
      "VM & Storage Labs",
      "Virtual Networking",
      "AZ-104 Exam Strategy",
    ],
    tags: ["Azure", "Microsoft", "Cloud", "AZ-104"],
    instructor: "Sneha Joshi",
    isFeatured: false,
    displayOrder: 4,
  },
  {
    _id: "f5",
    title: "Corporate FinOps Transformation",
    subtitle: "On-site program for a 500-person engineering org",
    description:
      "A custom 2-day on-site program delivered for a leading BFSI company's cloud and finance leadership. Covered FinOps unit economics, reserved instance planning, and building an internal cloud centre of excellence.",
    category: "Corporate",
    date: "March 2024",
    location: "Chennai, India",
    attendees: "80",
    duration: "2 Days",
    images: [
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
    highlights: [
      "Unit Economics for Cloud",
      "RI & Savings Plans Strategy",
      "Cloud Centre of Excellence",
      "Executive Reporting Dashboards",
    ],
    tags: ["Corporate", "BFSI", "FinOps", "Transformation"],
    instructor: "Vikram Nair",
    isFeatured: true,
    displayOrder: 5,
  },
  {
    _id: "f6",
    title: "Google Cloud Professional Bootcamp",
    subtitle: "GCP core services and Professional Cloud Architect prep",
    description:
      "An intensive 3-day bootcamp on Google Cloud fundamentals, BigQuery, GKE, Cloud Run, and security best practices. Designed to prepare professionals for the GCP Professional Cloud Architect examination.",
    category: "GCP",
    date: "December 2023",
    location: "Delhi, India",
    attendees: "36",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    highlights: [
      "BigQuery & Data Analytics",
      "GKE & Cloud Run Labs",
      "IAM & Security Policies",
      "Architect Exam Mock Test",
    ],
    tags: ["GCP", "Google Cloud", "BigQuery", "Certification"],
    instructor: "Ananya Kapoor",
    isFeatured: false,
    displayOrder: 6,
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Cloud:   { bg: "bg-blue-500/15",    text: "text-blue-300",   dot: "bg-[#2563eb]" },
  FinOps:  { bg: "bg-violet-500/15",  text: "text-violet-300", dot: "bg-violet-400" },
  DevOps:  { bg: "bg-emerald-500/15", text: "text-emerald-300",dot: "bg-emerald-400" },
  AWS:     { bg: "bg-amber-500/15",   text: "text-amber-300",  dot: "bg-amber-400" },
  Azure:   { bg: "bg-blue-500/15",    text: "text-blue-300",   dot: "bg-blue-400" },
  GCP:     { bg: "bg-red-500/15",     text: "text-red-300",    dot: "bg-red-400" },
  Training:{ bg: "bg-pink-500/15",    text: "text-pink-300",   dot: "bg-pink-400" },
};

function getCat(cat: string) {
  return CATEGORY_COLORS[cat] || { bg: "bg-white/10", text: "text-slate-300", dot: "bg-slate-400" };
}

function Placeholder({ title, category }: { title: string; category: string }) {
  const c = getCat(category);
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${c.bg} rounded-2xl`}>
      <div className={`w-14 h-14 rounded-2xl ${c.bg} border border-white/10 flex items-center justify-center`}>
        <Play size={24} className={c.text} />
      </div>
      <p className={`text-sm font-semibold ${c.text} text-center px-4 leading-snug`}>{title}</p>
    </div>
  );
}

function ImageGallery({ images, title, category }: { images: string[]; title: string; category: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!images.length) return <Placeholder title={title} category={category} />;

  return (
    <>
      <div className="relative h-full flex flex-col gap-2">
        <div className="flex-1 relative rounded-2xl overflow-hidden group cursor-zoom-in" onClick={() => setLightbox(active)}>
          <img src={images[active]} alt={title} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <button className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
            <ZoomIn size={14} className="text-white" />
          </button>
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`flex-none w-14 h-10 rounded-xl overflow-hidden border-2 transition ${i === active ? "border-blue-400" : "border-white/10 opacity-60 hover:opacity-100"}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20" onClick={() => setLightbox(null)}>
            <X size={18} />
          </button>
          {images.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightbox((lightbox - 1 + images.length) % images.length); }} className="absolute left-4 w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20">
                <ChevronLeft size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightbox((lightbox + 1) % images.length); }} className="absolute right-4 w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20">
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img src={images[lightbox]} alt="" className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

export default function SessionShowcase() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<"all" | string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/session-showcase")
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.success && d.sessions?.length ? d.sessions : FALLBACK_SESSIONS);
      })
      .catch(() => setSessions(FALLBACK_SESSIONS))
      .finally(() => setLoading(false));
  }, []);

  const categories = ["all", ...Array.from(new Set(sessions.map((s) => s.category)))];
  const filtered = tab === "all" ? sessions : sessions.filter((s) => s.category === tab);
  const current = filtered[active] || filtered[0];

  useEffect(() => { setActive(0); }, [tab]);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  if (loading) return null;
  if (!sessions.length) return null;

  return (
    <section className="relative bg-[#05080f] text-white overflow-hidden py-24 lg:py-32">
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-500/[0.06] blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-500/[0.07] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] rounded-full bg-white/[0.015] blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-blue-400/20 bg-[#2563eb]/8 px-4 py-2 mb-5">
              <Sparkles size={14} className="text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">Live Sessions Gallery</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.08]">
              Real Sessions,<br />
              <span className="bg-gradient-to-r from-blue-200 to-blue-100 bg-clip-text text-transparent">
                Real Impact
              </span>
            </h2>
            <p className="mt-5 text-slate-400 text-lg max-w-xl leading-relaxed">
              A glimpse into our training sessions, where professionals transform their careers through hands-on learning.
            </p>
          </div>

          <div className="flex gap-6 lg:gap-8">
            {[
              { value: "10K+", label: "Students Trained" },
              { value: "200+", label: "Sessions Delivered" },
              { value: "98%", label: "Satisfaction Rate" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-black bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const c = getCat(cat);
            const isActive = tab === cat;
            return (
              <button
                key={cat}
                onClick={() => setTab(cat)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition border ${
                  isActive
                    ? "bg-white text-slate-900 border-white"
                    : "bg-white/5 text-slate-400 border-white/10 hover:border-white/25 hover:text-white"
                }`}
              >
                {cat !== "all" && <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#05080f]" : c.dot}`} />}
                {cat === "all" ? "All Sessions" : cat}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {current && (
            <div className="rounded-[32px] border border-white/8 bg-white/[0.03] overflow-hidden backdrop-blur-sm">
              <div className="h-[300px] lg:h-[380px] p-4">
                <ImageGallery images={current.images.length ? current.images : (current.coverImage ? [current.coverImage] : [])} title={current.title} category={current.category} />
              </div>

              <div className="p-7 border-t border-white/8">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-white/8 ${getCat(current.category).bg} ${getCat(current.category).text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${getCat(current.category).dot}`} />
                    {current.category}
                  </span>
                  {current.isFeatured && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-400/20 bg-amber-400/10 text-amber-300">
                      <Sparkles size={11} /> Featured
                    </span>
                  )}
                </div>

                <h3 className="text-2xl lg:text-3xl font-black leading-tight">{current.title}</h3>
                {current.subtitle && <p className="text-slate-400 mt-2 text-base">{current.subtitle}</p>}
                {current.description && <p className="text-slate-500 mt-4 text-sm leading-relaxed">{current.description}</p>}

                <div className="flex flex-wrap gap-5 mt-5 text-sm text-slate-400">
                  {current.date && <span className="flex items-center gap-2"><Calendar size={14} className="text-slate-500" /> {current.date}</span>}
                  {current.location && <span className="flex items-center gap-2"><MapPin size={14} className="text-slate-500" /> {current.location}</span>}
                  {current.attendees && <span className="flex items-center gap-2"><Users size={14} className="text-slate-500" /> {current.attendees} Attendees</span>}
                  {current.duration && <span className="flex items-center gap-2"><Clock size={14} className="text-slate-500" /> {current.duration}</span>}
                  {current.instructor && (
                    <span className="flex items-center gap-2 text-blue-400 font-medium">
                      <div className="w-5 h-5 rounded-full bg-[#2563eb]/20 flex items-center justify-center text-[10px] font-black text-blue-300">
                        {current.instructor[0].toUpperCase()}
                      </div>
                      {current.instructor}
                    </span>
                  )}
                </div>

                {current.highlights.length > 0 && (
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {current.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] flex-none" />
                        <span className="text-sm text-slate-300 font-medium leading-tight">{h}</span>
                      </div>
                    ))}
                  </div>
                )}

                {current.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-5">
                    {current.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 rounded-xl text-xs font-semibold bg-white/5 border border-white/8 text-slate-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{filtered.length} Session{filtered.length !== 1 ? "s" : ""}</p>
              {filtered.length > 4 && (
                <div className="flex gap-1.5">
                  <button onClick={() => scroll("left")} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"><ChevronLeft size={15} /></button>
                  <button onClick={() => scroll("right")} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"><ChevronRight size={15} /></button>
                </div>
              )}
            </div>

            <div ref={scrollRef} className="flex xl:flex-col gap-3 overflow-x-auto xl:overflow-x-visible xl:overflow-y-auto xl:max-h-[720px] scrollbar-none pb-2 xl:pb-0">
              {filtered.map((session) => {
                const isSelected = session._id === current?._id;
                const c = getCat(session.category);
                const thumb = session.images[0] || session.coverImage;
                return (
                  <button
                    key={session._id}
                    onClick={() => setActive(filtered.indexOf(session))}
                    className={`flex-none xl:flex-none w-[260px] xl:w-full text-left rounded-2xl border p-4 transition group ${
                      isSelected
                        ? "border-blue-400/40 bg-[#2563eb]/[0.07]"
                        : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-none bg-white/5 border border-white/8">
                        {thumb ? (
                          <img src={thumb} alt={session.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${c.bg}`}>
                            <Play size={18} className={c.text} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          <span className={`text-[11px] font-bold ${c.text}`}>{session.category}</span>
                          {session.isFeatured && <Sparkles size={10} className="text-amber-300" />}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">{session.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">{session.date}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1.5 text-blue-300 text-xs font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-pulse" />
                        Currently Viewing
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <a
              href="/#top-courses"
              className="mt-2 flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.09] hover:border-white/20 px-5 py-4 font-bold text-sm text-white transition group"
            >
              Explore All Courses
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}