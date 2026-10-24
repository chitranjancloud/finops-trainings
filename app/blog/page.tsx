"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Clock, Search, Sparkles } from "lucide-react";

type Blog = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  coverImage: string;
  tags: string[];
  readTime: string;
  featured: boolean;
  publishedAt: string;
};

const fallbackBlogs: Blog[] = [
  {
    _id: "fallback-1",
    title: "How to Choose the Right Cloud Certification Path",
    slug: "cloud-certification-path",
    excerpt: "A practical way to decide between AWS, Azure, Microsoft 365, security, AI, and FinOps learning tracks.",
    content:
      "Start with the role you want, not the exam name. Cloud administrators should build identity, networking, compute, and monitoring foundations. Solution architects need design depth and cost awareness. Finance and engineering leaders should add FinOps governance, tagging, forecasting, and unit economics.",
    category: "Career Guide",
    author: "FinOps Trainings",
    coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
    tags: ["Cloud", "Certification", "Career"],
    readTime: "6 min read",
    featured: true,
    publishedAt: new Date().toISOString(),
  },
  {
    _id: "fallback-2",
    title: "FinOps Fundamentals Every Cloud Team Should Know",
    slug: "finops-fundamentals",
    excerpt: "Cost visibility, ownership, forecasting, and optimization habits that mature cloud teams build early.",
    content:
      "FinOps is a collaboration model between finance, engineering, product, and leadership. The highest impact teams create clean tagging standards, review usage patterns, right-size resources, and connect cloud spend to business outcomes.",
    category: "FinOps",
    author: "FinOps Trainings",
    coverImage: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
    tags: ["FinOps", "Cloud Cost", "Governance"],
    readTime: "5 min read",
    featured: false,
    publishedAt: new Date().toISOString(),
  },
  {
    _id: "fallback-3",
    title: "Planning Corporate Training That Actually Changes Work",
    slug: "corporate-training-planning",
    excerpt: "A checklist for L&D and technology leaders planning high-signal upskilling programs.",
    content:
      "Strong corporate training starts with role mapping, baseline assessment, hands-on labs, manager visibility, and a post-training adoption plan. The program should end with capability evidence, not only attendance.",
    category: "Corporate Training",
    author: "FinOps Trainings",
    coverImage: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80",
    tags: ["L&D", "Teams", "Upskilling"],
    readTime: "4 min read",
    featured: false,
    publishedAt: new Date().toISOString(),
  },
];

function dateLabel(value: string) {
  return new Date(value || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all");

  useEffect(() => {
    fetch("/api/blogs", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setBlogs(data.success && data.blogs?.length ? data.blogs : fallbackBlogs))
      .catch(() => setBlogs(fallbackBlogs))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(blogs.map((blog) => blog.category || "Training")))],
    [blogs]
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return blogs.filter((blog) => {
      const categoryMatch = active === "all" || blog.category === active;
      const textMatch =
        !text ||
        [blog.title, blog.excerpt, blog.content, blog.category, ...(blog.tags || [])]
          .join(" ")
          .toLowerCase()
          .includes(text);
      return categoryMatch && textMatch;
    });
  }, [blogs, query, active]);

  const featured = filtered.find((blog) => blog.featured) || filtered[0];
  const rest = filtered.filter((blog) => blog._id !== featured?._id);

  if (loading) {
    return <main className="min-h-screen bg-[#0f172a] pt-28 text-white" />;
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <section className="relative overflow-hidden px-6 pb-20 pt-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.14),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-blue-200">
              <Sparkles size={14} /> Blog
            </div>
            <h1 className="text-5xl font-black leading-tight md:text-6xl">
              Training Guides & Career Insights
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Certification paths, FinOps explainers, corporate training playbooks, and practical learning notes from the FinOps team.
            </p>
          </div>

          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-xl flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur">
              <Search size={18} className="text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search blogs, topics, tags..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActive(category)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
                    active === category
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {category === "all" ? "All" : category}
                </button>
              ))}
            </div>
          </div>

          {featured && (
            <article className="mb-8 grid overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="min-h-[360px] bg-slate-900">
                {featured.coverImage ? (
                  <img src={featured.coverImage} alt={featured.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen size={56} className="text-blue-300" />
                  </div>
                )}
              </div>
              <div className="p-8 lg:p-10">
                <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  <span className="rounded-full bg-[#2563eb]/10 px-3 py-1 font-bold text-blue-200">{featured.category}</span>
                  <span className="flex items-center gap-1"><CalendarDays size={14} /> {dateLabel(featured.publishedAt)}</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {featured.readTime}</span>
                </div>
                <h2 className="text-3xl font-black leading-tight lg:text-4xl">{featured.title}</h2>
                <p className="mt-4 text-lg leading-8 text-slate-300">{featured.excerpt}</p>
                <p className="mt-5 line-clamp-4 leading-7 text-slate-400">{featured.content}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {(featured.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">#{tag}</span>
                  ))}
                </div>
                <button className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950">
                  Read Insight <ArrowRight size={16} />
                </button>
              </div>
            </article>
          )}

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((blog) => (
              <article key={blog._id} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:bg-white/[0.07]">
                <div className="h-48 bg-slate-900">
                  {blog.coverImage ? (
                    <img src={blog.coverImage} alt={blog.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="text-blue-300" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span className="rounded-full bg-white/8 px-3 py-1 font-bold text-blue-200">{blog.category}</span>
                    <span>{blog.readTime}</span>
                  </div>
                  <h3 className="line-clamp-2 text-xl font-black">{blog.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{blog.excerpt || blog.content}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
