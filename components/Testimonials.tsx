"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Quote, Star } from "lucide-react";

type Testimonial = { _id?: string; name: string; role?: string; content: string; rating?: number; status?: string };
export default function Testimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/testimonials", { signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error("Unavailable");
      setItems((data.testimonials || []).filter((item: Testimonial) => item.status !== "pending" && item.status !== "rejected"));
    }).catch(error => { if (error.name !== "AbortError") setFailed(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  return <section id="testimonials" className="scroll-mt-24 bg-slate-50 px-6 py-16 text-slate-900 md:py-20" aria-labelledby="testimonials-title"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">Learner experiences</p><h2 id="testimonials-title" className="mt-3 text-3xl font-bold md:text-4xl">Learning through the eyes of our community.</h2></div><Link href="/feedback" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Share your experience <ArrowRight size={16} /></Link></div>
    {loading ? <p role="status" className="mt-8 text-sm text-slate-500">Loading learner experiences…</p> : failed ? <div role="status" className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Learner experiences are temporarily unavailable. <button onClick={() => { setLoading(true); setFailed(false); setRetry(value => value + 1); }} className="font-semibold text-blue-700 underline">Try again</button></div> : items.length ? <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.slice(0,3).map((item,index) => <figure key={item._id || index} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7"><Quote size={25} className="text-blue-600" /><blockquote className="my-5 flex-1 text-base leading-7 text-slate-700">{item.content}</blockquote><figcaption className="border-t border-slate-100 pt-4"><p className="text-sm font-semibold">{item.name}</p><p className="mt-1 text-xs text-slate-500">{item.role}</p>{Number(item.rating) > 0 && <span className="mt-3 inline-flex items-center gap-1 text-sm text-amber-700"><Star size={14} />{item.rating}/5</span>}</figcaption></figure>)}</div> : <p className="mt-8 max-w-2xl text-sm leading-7 text-slate-600">Are you learning with us? Share what helped you and what we can improve. Published learner experiences will appear here.</p>}
  </div></section>;
}
