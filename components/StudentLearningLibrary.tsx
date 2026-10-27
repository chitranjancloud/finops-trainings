"use client";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, ChevronRight, ClipboardList, FileText, Film, Play, Search, X } from "lucide-react";
import { storageRequest, StorageRequestError } from "@/lib/storage/s3Client";
import { S3_CATEGORIES, CATEGORY_LABELS, type S3Category, type S3PublicAsset } from "@/lib/storage/s3Types";
import S3AssetViewer from "./S3AssetViewer";

const icons = { video: Film, pdf: FileText, "study-material": BookOpen, assignment: ClipboardList };
function lessonDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
}
function detail(asset: S3PublicAsset) {
  const seconds = Math.round(asset.videoDurationSeconds || 0);
  if (asset.contentType === "video/mp4" && seconds) return seconds < 60 ? `${seconds} sec` : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} sec` : ""}`;
  return `${(asset.byteSize / 1048576).toFixed(1)} MB`;
}

export default function StudentLearningLibrary({ batchId, onAvailabilityChange }: { batchId: string; onAvailabilityChange?: (available: boolean) => void }) {
  const [assets, setAssets] = useState<S3PublicAsset[]>([]), [selected, setSelected] = useState<S3PublicAsset | null>(null);
  const [category, setCategory] = useState<S3Category>("video"), [date, setDate] = useState(""), [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(""), [loading, setLoading] = useState(true), [disabled, setDisabled] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (category !== "video" || disabled) return;
    const timer = window.setInterval(() => { if (!document.hidden) setRefresh((n) => n + 1); }, 10000);
    return () => window.clearInterval(timer);
  }, [category, disabled]);
  useEffect(() => {
    const abort = new AbortController(), params = new URLSearchParams({ batchId, category, page: String(page) });
    if (date) params.set("contentDate", date);
    void storageRequest<{ assets: S3PublicAsset[]; total: number; hasMore: boolean }>(`/api/s3/student/assets?${params}`, undefined, abort.signal)
      .then((data) => {
        if (abort.signal.aborted) return;
        setAssets(data.assets); setTotal(data.total); setHasMore(data.hasMore); setLoading(false); setDisabled(false); setError("");
        onAvailabilityChange?.(true);
        setSelected((current) => current ? data.assets.find((a) => a.assetId === current.assetId) || null : null);
      })
      .catch((e) => { if (!abort.signal.aborted) { const unavailable = e instanceof StorageRequestError && e.status === 503; setDisabled(unavailable); onAvailabilityChange?.(!unavailable); setError(e.message); setLoading(false); } });
    return () => abort.abort();
  }, [batchId, category, date, page, refresh, onAvailabilityChange]);
  const reset = () => { setPage(1); setSelected(null); setAssets([]); setLoading(true); setError(""); setSearch(""); };
  const visible = assets.filter((a) => a.filename.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  if (disabled) return null;
  return <section className="space-y-5 text-slate-100" aria-label="Learning library">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Your learning library</p><h3 className="text-xl font-bold tracking-tight">Batch learning files</h3><p className="mt-1 text-sm leading-relaxed text-slate-400">Choose a lesson and learn at your own pace.</p></div>{!loading && <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">{total} {category === "video" ? total === 1 ? "recording" : "recordings" : total === 1 ? "file" : "files"}</span>}</div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="File categories">{S3_CATEGORIES.map((c) => {
      const Icon = icons[c], current = c === category;
      return <button key={c} type="button" aria-pressed={current} onClick={() => { if (!current) { reset(); setCategory(c); } }} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-3 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm ${current ? "border-blue-400/50 bg-blue-500/15 text-blue-200" : "border-white/[0.07] bg-white/[0.025] text-slate-400 hover:border-white/20 hover:text-white"}`}><Icon size={17} className="shrink-0" />{CATEGORY_LABELS[c]}</button>;
    })}</div>
    {selected && <div className="overflow-hidden rounded-2xl border border-blue-400/25 bg-slate-950/70 shadow-lg shadow-black/10"><div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-blue-200"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />{selected.contentType === "video/mp4" ? "Now watching" : "Selected file"}</div><button type="button" aria-label="Close file" onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X size={17} /></button></div><div className="p-3 sm:p-4"><S3AssetViewer key={selected.assetId} asset={selected} /></div></div>}
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-slate-950/25 p-3 sm:flex-row sm:items-center"><label className="relative flex-1"><span className="sr-only">Search files on this page</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files on this page…" className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950/50 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label><label className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={15} /><span className="sr-only">Lesson date</span><input type="date" value={date} onChange={(e) => { reset(); setDate(e.target.value); }} className="min-h-10 min-w-0 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2 text-sm text-slate-200 outline-none [color-scheme:dark] focus:border-blue-400" /></label>{date && <button type="button" onClick={() => { reset(); setDate(""); }} className="shrink-0 rounded-lg px-2 py-2 text-xs font-medium text-blue-300 hover:bg-blue-400/10">All dates</button>}</div>
    {loading && <div role="status" aria-label="Loading learning files" className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5 motion-reduce:animate-none" />)}</div>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-rose-200"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); setRefresh((n) => n + 1); }} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold">Try again</button></div>}
    {!loading && !error && !visible.length && <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><BookOpen size={26} className="mx-auto mb-3 text-slate-500" /><p className="text-sm font-semibold text-slate-200">{search ? "No matching files" : "Nothing shared here yet"}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{search ? "Try another filename on this page." : date ? "Choose another lesson date or view all dates." : "Your instructor’s new uploads will appear here."}</p></div>}
    {!loading && !error && <ul className="space-y-3">{visible.map((a, index) => {
      const preparing = ["queued", "processing"].includes(a.videoProcessingState || ""), failed = a.videoProcessingState === "failed", current = selected?.assetId === a.assetId, Icon = icons[a.category] || FileText;
      return <li key={a.assetId} className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 transition-colors sm:flex-nowrap ${current ? "border-blue-400/40 bg-blue-500/10" : "border-white/[0.07] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"}`}><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${category === "video" ? "bg-blue-400/10 text-blue-300" : "bg-violet-400/10 text-violet-300"}`}><Icon size={20} /></div><div className="min-w-0 flex-1"><p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{category === "video" ? "Recording" : "Resource"} {String((page - 1) * 20 + index + 1).padStart(2, "0")}</p><p className="break-words text-sm font-semibold leading-relaxed text-slate-100">{a.filename}</p><p className="mt-1 text-xs text-slate-500">{lessonDate(a.contentDate)}<span className="mx-2 text-slate-700">·</span>{detail(a)}</p></div><button type="button" disabled={preparing || failed} aria-current={current ? "true" : undefined} onClick={() => setSelected(a)} className={`inline-flex min-h-10 w-full shrink-0 items-center justify-center sm:w-auto gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-default disabled:bg-white/5 disabled:text-slate-500 ${current ? "bg-blue-500/20 text-blue-200" : "bg-blue-500 text-white hover:bg-blue-400"}`}>{!preparing && !failed && (category === "video" ? <Play size={13} fill="currentColor" /> : <ChevronRight size={14} />)}{preparing ? "Preparing video…" : failed ? "Video unavailable" : category === "video" ? current ? "Selected lesson" : "Watch lesson" : "Open"}</button></li>;
    })}</ul>}
    {(page > 1 || hasMore) && <div className="flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs text-slate-400"><button type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setSelected(null); setSearch(""); setError(""); setPage(page - 1); }} className="min-h-10 rounded-lg px-3 hover:bg-white/5 disabled:opacity-30">Previous</button><span>Page {page}</span><button type="button" disabled={!hasMore || loading} onClick={() => { setLoading(true); setSelected(null); setSearch(""); setError(""); setPage(page + 1); }} className="min-h-10 rounded-lg px-3 hover:bg-white/5 disabled:opacity-30">Next</button></div>}
  </section>;
}
