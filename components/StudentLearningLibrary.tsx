"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, ChevronRight, ClipboardList, FileText, Film, Play, Search } from "lucide-react";
import { storageRequest, StorageRequestError } from "@/lib/storage/s3Client";
import { S3_CATEGORIES, CATEGORY_LABELS, type S3Category, type S3PublicAsset } from "@/lib/storage/s3Types";
import S3AssetViewer from "./S3AssetViewer";
import S3TransferStatus from "./S3TransferStatus";

const icons = { video: Film, pdf: FileText, "study-material": BookOpen, assignment: ClipboardList };
function lessonDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Date not set";
}
function detail(asset: S3PublicAsset) {
  const seconds = Math.round(asset.videoDurationSeconds || 0);
  if (asset.contentType === "video/mp4" && seconds) return seconds < 60 ? `${seconds} sec` : `${Math.floor(seconds / 60)} min${seconds % 60 ? ` ${seconds % 60} sec` : ""}`;
  return `${(asset.byteSize / 1048576).toFixed(1)} MB`;
}
function unavailable(asset: S3PublicAsset) {
  return ["queued", "processing", "failed"].includes(asset.videoProcessingState || "");
}

type LibraryProps = { batchId: string; onAvailabilityChange?: (available: boolean) => void; compact?: boolean };

export default function StudentLearningLibrary({ batchId, onAvailabilityChange, compact = false }: LibraryProps) {
  const [assets, setAssets] = useState<S3PublicAsset[]>([]);
  const [selected, setSelected] = useState<S3PublicAsset | null>(null);
  const [category, setCategory] = useState<S3Category>("video");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  const browseRef = useRef<HTMLDivElement>(null);
  const hadSelection = useRef(false);
  const selectedId = selected?.assetId;

  useEffect(() => {
    if (category !== "video" || disabled) return;
    const timer = window.setInterval(() => { if (!document.hidden) setRefresh(value => value + 1); }, 5000);
    const wake = () => { if (!document.hidden) setRefresh(value => value + 1); };
    document.addEventListener("visibilitychange", wake); window.addEventListener("online", wake);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", wake); window.removeEventListener("online", wake); };
  }, [category, disabled]);

  useEffect(() => {
    const abort = new AbortController();
    const params = new URLSearchParams({ batchId, category, page: String(page) });
    if (date) params.set("contentDate", date);
    void storageRequest<{ assets: S3PublicAsset[]; total: number; hasMore: boolean }>(`/api/s3/student/assets?${params}`, undefined, abort.signal)
      .then(data => {
        if (abort.signal.aborted) return;
        setAssets(data.assets); setTotal(data.total); setHasMore(data.hasMore); setLoading(false); setDisabled(false); setError("");
        onAvailabilityChange?.(true);
        setSelected(current => current ? data.assets.find(asset => asset.assetId === current.assetId) || null : null);
      })
      .catch(error => {
        if (abort.signal.aborted) return;
        const unavailable = error instanceof StorageRequestError && error.status === 503;
        setDisabled(unavailable); onAvailabilityChange?.(!unavailable); setError(error.message); setLoading(false);
      });
    return () => abort.abort();
  }, [batchId, category, date, page, refresh, onAvailabilityChange]);

  useEffect(() => {
    if (selectedId) {
      hadSelection.current = true;
      viewerRef.current?.focus({ preventScroll: true });
      viewerRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    } else if (hadSelection.current) {
      hadSelection.current = false;
      browseRef.current?.focus({ preventScroll: true });
      browseRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }, [selectedId]);

  const reset = () => { setPage(1); setSelected(null); setAssets([]); setLoading(true); setError(""); setSearch(""); };
  const visible = assets.filter(asset => asset.filename.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  if (disabled) return null;

  if (selected) return (
    <section aria-label="Selected learning file" className="space-y-5 text-slate-100">
      <div ref={viewerRef} tabIndex={-1} className="scroll-mt-40 outline-none">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={() => setSelected(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-blue-200 hover:text-white"><ArrowLeft size={16} />Back to learning files</button><span className="text-xs text-slate-400">{lessonDate(selected.contentDate)} · {detail(selected)}</span></div>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950 p-3 sm:p-4"><p className="mb-3 text-xs font-semibold text-blue-300">{selected.contentType === "video/mp4" ? "Now watching" : "Selected resource"}</p><S3AssetViewer key={selected.assetId} asset={selected} /></div>
          <aside aria-label={category === "video" ? "Lesson playlist" : "Resource list"} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025]">
            <div className="border-b border-white/[0.07] px-4 py-4"><h3 className="text-sm font-semibold text-white">{category === "video" ? "In this lesson list" : "More resources"}</h3><p className="mt-1 text-xs text-slate-400">{assets.length} {assets.length === 1 ? "item" : "items"} on this page</p></div>
            <ol className="max-h-[480px] divide-y divide-white/[0.06] overflow-y-auto">{assets.map((asset, index) => <li key={asset.assetId}><button type="button" disabled={unavailable(asset)} aria-current={selected.assetId === asset.assetId ? "true" : undefined} onClick={() => setSelected(asset)} className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors disabled:opacity-40 ${selected.assetId === asset.assetId ? "bg-blue-400/10" : "hover:bg-white/[0.04]"}`}><span className={`mt-0.5 text-xs tabular-nums ${selected.assetId === asset.assetId ? "text-blue-300" : "text-slate-500"}`}>{String((page - 1) * 20 + index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block break-words text-xs font-medium leading-6 text-slate-200">{asset.filename}</span><span className="mt-1 block text-xs text-slate-400">{unavailable(asset) ? "Not available yet" : detail(asset)}</span></span></button></li>)}</ol>
          </aside>
        </div>
      </div>
    </section>
  );

  return (
    <section ref={browseRef} tabIndex={-1} className="scroll-mt-40 space-y-5 text-slate-100 outline-none" aria-label="Learning library">
      {!compact && <div><h3 className="text-xl font-semibold">Batch learning files</h3><p className="mt-2 text-sm leading-7 text-slate-400">Choose a recording or resource to start learning.</p></div>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="File categories">{S3_CATEGORIES.map(value => {
        const Icon = icons[value], current = value === category;
        return <button key={value} type="button" aria-pressed={current} onClick={() => { if (!current) { reset(); setCategory(value); } }} className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${current ? "border-blue-400/40 bg-blue-400/10 text-blue-200" : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"}`}><Icon size={16} />{CATEGORY_LABELS[value]}</button>;
      })}</div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><label className="relative flex-1"><span className="sr-only">Search files on this page</span><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search learning files" className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/40 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label><label className="flex items-center gap-2 text-xs text-slate-400"><CalendarDays size={16} /><span className="sr-only">Lesson date</span><input type="date" value={date} onChange={event => { reset(); setDate(event.target.value); }} className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none [color-scheme:dark] focus:border-blue-400" /></label>{date && <button type="button" onClick={() => { reset(); setDate(""); }} className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-medium text-blue-300 hover:bg-blue-400/10">All dates</button>}</div>
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-slate-200">{CATEGORY_LABELS[category]}</h3><span className="text-xs text-slate-400" role="status">{loading ? "Loading…" : `${total} ${category === "video" ? total === 1 ? "recording" : "recordings" : total === 1 ? "file" : "files"}`}</span></div>
      {loading && <div role="status" aria-label="Loading learning files" className="space-y-3">{[0, 1, 2].map(index => <div key={index} className="h-24 animate-pulse rounded-xl bg-white/5 motion-reduce:animate-none" />)}</div>}
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-rose-200"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); setRefresh(value => value + 1); }} className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-semibold">Try again</button></div>}
      {!loading && !error && !visible.length && <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center"><BookOpen size={26} className="mx-auto mb-3 text-slate-500" /><p className="text-sm font-semibold text-slate-200">{search ? "No matching files" : "Nothing shared here yet"}</p><p className="mt-2 text-xs leading-6 text-slate-400">{search ? "Try another filename on this page." : date ? "Choose another lesson date or view all dates." : "Your instructor’s new uploads will appear here."}</p></div>}
      {!loading && !error && <ul className="space-y-3">{visible.map((asset, index) => {
        const preparing = ["queued", "processing"].includes(asset.videoProcessingState || "");
        const failed = asset.videoProcessingState === "failed";
        const Icon = icons[asset.category] || FileText;
        return <li key={asset.assetId} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-white/15 sm:flex-nowrap"><span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-400/10 text-blue-300"><Icon size={20} /></span><div className="min-w-0 flex-1"><p className="mb-1 text-xs text-slate-400">{category === "video" ? "Recording" : "Resource"} {String((page - 1) * 20 + index + 1).padStart(2, "0")}</p><p className="break-words text-sm font-medium leading-6 text-slate-100">{asset.filename}</p><p className="mt-1 text-xs text-slate-400">{lessonDate(asset.contentDate)} · {detail(asset)}</p>{(preparing || failed) && <div className="mt-2"><S3TransferStatus compact state={asset.videoProcessingState!} job={asset.videoProgress} /></div>}</div><button type="button" disabled={preparing || failed} onClick={() => setSelected(asset)} className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-400 disabled:cursor-default disabled:bg-white/5 disabled:text-slate-500 sm:w-auto">{!preparing && !failed && (category === "video" ? <Play size={13} fill="currentColor" /> : <ChevronRight size={15} />)}{preparing ? "Preparing video…" : failed ? "Video unavailable" : category === "video" ? "Watch lesson" : "Open resource"}</button></li>;
      })}</ul>}
      {(page > 1 || hasMore) && <div className="flex items-center justify-between border-t border-white/[0.07] pt-4 text-xs text-slate-400"><button type="button" disabled={page === 1 || loading} onClick={() => { setLoading(true); setSelected(null); setSearch(""); setError(""); setPage(value => value - 1); }} className="min-h-10 rounded-lg px-3 hover:bg-white/5 disabled:opacity-30">Previous</button><span>Page {page}</span><button type="button" disabled={!hasMore || loading} onClick={() => { setLoading(true); setSelected(null); setSearch(""); setError(""); setPage(value => value + 1); }} className="min-h-10 rounded-lg px-3 hover:bg-white/5 disabled:opacity-30">Next</button></div>}
    </section>
  );
}
