"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Search, Star } from "lucide-react";

type Course = { _id?: string; slug: string; title: string; description?: string; image?: string; duration?: string; level?: string; provider?: string; tag?: string; rating?: string; enrolled?: string; price?: string; recordedPrice?: string; livePrice?: string; isPublished?: boolean; createdAt?: string };
const categories = ["All topics", "Cloud", "FinOps", "AI & Data", "Security", "Business"];
const patterns: Record<string, RegExp> = { Cloud: /cloud|azure|aws|microsoft|365/i, FinOps: /finops|cost|finance/i, "AI & Data": /\bai\b|artificial|data|machine|power bi/i, Security: /security|cyber|soc|iso/i, Business: /business|leadership|communication|project management/i };

function Cover({ course }: { course: Course }) {
  const [failed, setFailed] = useState(false);
  return course.image && !failed ? <img src={course.image} alt="" loading="lazy" className="h-44 w-full object-cover" onError={() => setFailed(true)} /> : <div className="flex h-44 items-center justify-center bg-blue-50 text-blue-600"><BookOpen size={40} strokeWidth={1.4} /></div>;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [sort, setSort] = useState("popular");
  const [limit, setLimit] = useState(6);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/courses", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error("Unable to load courses.");
      setCourses(Array.isArray(data.courses) ? data.courses : []);
    }).catch(error => { if (error.name !== "AbortError") setError("We couldn’t load the courses. Check your connection and try again."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  const filtered = useMemo(() => courses.filter(course => {
    const searchable = [course.title, course.description, course.provider, course.tag].join(" ");
    return searchable.toLowerCase().includes(query.toLowerCase().trim()) && (category === "All topics" || patterns[category].test(searchable));
  }).sort((a, b) => {
    if (sort === "newest") return (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);
    if (sort === "title") return a.title.localeCompare(b.title);
    const count = (value?: string) => Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
    return count(b.enrolled) - count(a.enrolled);
  }), [courses, query, category, sort]);
  const reset = () => { setQuery(""); setCategory("All topics"); setLimit(6); };
  return <section id="top-courses" className="scroll-mt-24 bg-white px-6 py-16 text-slate-950 md:py-20" aria-labelledby="courses-title">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-blue-700">Find your next step</p><h2 id="courses-title" className="mt-3 text-3xl font-bold md:text-4xl">Practical skills. Clear learning paths.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">Explore courses by topic, experience level, and the time you have available.</p></div><Link href="/contact" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-700">Help me choose <ArrowRight size={16} /></Link></div>
      <div className="flex flex-col gap-4 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Search courses</span><Search size={19} className="absolute left-4 top-3.5 text-slate-400" /><input value={query} onChange={event => { setQuery(event.target.value); setLimit(6); }} type="search" placeholder="Search courses, skills, or technologies" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm" /></label><label className="flex items-center gap-3 text-sm text-slate-600">Sort by<select value={sort} onChange={event => setSort(event.target.value)} className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900"><option value="popular">Most enrolled</option><option value="newest">Newest added</option><option value="title">Course name</option></select></label></div>
      <div className="my-5 flex flex-wrap gap-2" role="group" aria-label="Filter courses by topic">{categories.map(topic => <button key={topic} aria-pressed={category === topic} onClick={() => { setCategory(topic); setLimit(6); }} className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${category === topic ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{topic}</button>)}</div>
      <p className="mb-5 text-sm text-slate-500" role="status">{loading ? "Finding your learning options…" : error ? "Courses temporarily unavailable" : `${filtered.length} ${filtered.length === 1 ? "course" : "courses"} found`}</p>
      {loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading courses">{[1,2,3].map(id => <div key={id} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200"><div className="h-44 bg-slate-100" /><div className="space-y-4 p-6"><div className="h-6 w-3/4 rounded bg-slate-100" /><div className="h-16 rounded bg-slate-100" /></div></div>)}</div> : error ? <div role="alert" className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center"><p>{error}</p><button onClick={() => { setLoading(true); setError(""); setRetry(value => value + 1); }} className="mt-4 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white">Try again</button></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><BookOpen className="mx-auto text-blue-600" /><h3 className="mt-4 text-xl font-semibold">{courses.length ? "No matching courses" : "New learning options are on the way"}</h3><p className="mt-2 text-sm text-slate-600">{courses.length ? "Try another topic or a broader search." : "Talk to our team about the training you’re looking for."}</p>{courses.length ? <button onClick={reset} className="mt-4 text-sm font-semibold text-blue-700">Clear filters</button> : <Link href="/contact" className="mt-4 inline-block text-sm font-semibold text-blue-700">Ask about training</Link>}</div> : <>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filtered.slice(0,limit).map(course => <Link key={course._id || course.slug} href={`/courses/${course.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lg"><Cover key={course.image || course.slug} course={course} /><div className="flex flex-1 flex-col p-6"><div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium"><span className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-700">{course.level || "All levels"}</span>{course.isPublished === false && <span className="rounded-md bg-amber-50 px-2.5 py-1 text-amber-800">Enrollment coming soon</span>}</div><h3 className="text-xl font-semibold leading-snug group-hover:text-blue-700">{course.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{course.description || "Explore the course overview, learning outcomes, and available formats."}</p><div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock size={15} />{course.duration || "Flexible duration"}</span>{course.rating && <span className="inline-flex items-center gap-1.5"><Star size={15} className="text-amber-600" />{course.rating}</span>}</div><div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5"><span className="text-sm font-semibold text-slate-900">{course.recordedPrice || course.price || course.livePrice || "Ask about fees"}</span><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">View course <ArrowRight size={16} /></span></div></div></Link>)}</div>
        {filtered.length > limit && <div className="mt-8 text-center"><button onClick={() => setLimit(value => value + 6)} className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold hover:bg-slate-50">Show more courses</button></div>}
      </>}
    </div>
  </section>;
}
