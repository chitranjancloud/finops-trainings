"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelSavedUpload, storageRequest, uploadS3File, StorageRequestError, type UploadProgress } from "@/lib/storage/s3Client";
import { CATEGORY_LABELS, allowedExtensions, localDate, type S3Category, type S3PublicAsset } from "@/lib/storage/s3Types";
import { FileText, Film, MoreHorizontal, RefreshCw, SlidersHorizontal } from "lucide-react";
import S3AssetViewer from "./S3AssetViewer";
import S3TransferStatus from "./S3TransferStatus";
type Event = { action: string; actorId: string; relatedAssetId: string; createdAt: string };
export default function S3UploadPanel({ courseId: selectedCourseId, batchId: selectedBatchId, category: initialCategory = "video", library = false }: { library?: boolean; courseId?: string; batchId?: string; category?: S3Category } = {}) {
  const [category, setCategory] = useState<S3Category>(initialCategory);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showUpload, setShowUpload] = useState(!library);
  const [search, setSearch] = useState("");
  const [inputCourseId, setCourseId] = useState(""); const [inputBatchId, setBatchId] = useState("");
  const courseId = selectedCourseId ?? inputCourseId; const batchId = selectedBatchId ?? inputBatchId;
  const [file, setFile] = useState<File | null>(null); const [contentDate, setContentDate] = useState(localDate);
  const [dateFilter, setDateFilter] = useState(""); const [archived, setArchived] = useState(false);
  const [replacing, setReplacing] = useState<S3PublicAsset | null>(null); const [busy, setBusy] = useState(false);
  const [transfer, setTransfer] = useState<UploadProgress | null>(null); const [message, setMessage] = useState("");
  const [syncError, setSyncError] = useState(false);
  const [assets, setAssets] = useState<S3PublicAsset[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false);
  const [preview, setPreview] = useState<S3PublicAsset | null>(null);
  useEffect(() => {
    if (!preview) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [preview]);
  const [events, setEvents] = useState<{ asset: S3PublicAsset; events: Event[] } | null>(null);
  const controller = useRef<AbortController | null>(null); const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const list = useCallback(async (nextPage = 1, signal?: AbortSignal, background = false) => {
    try {
      const params = new URLSearchParams({ page: String(nextPage), includeArchived: String(archived) });
      if (!library || filterCategory !== "all") params.set("category", library ? filterCategory : category);
      if (search.trim()) params.set("search", search.trim());
      if (courseId) params.set("courseId", courseId); if (batchId) params.set("batchId", batchId);
      if (dateFilter) params.set("contentDate", dateFilter);
      const data = await storageRequest<{ assets: S3PublicAsset[]; hasMore: boolean; total: number }>(`/api/s3/admin/assets?${params}`, undefined, signal);
      if (signal?.aborted) return;
      setSyncError(false);
      setAssets(data.assets); setPage(nextPage); setHasMore(data.hasMore); setTotal(data.total);
      setTransfer(current => current?.assetId && data.assets.some(a => a.assetId === current.assetId && ["ready", "deleted", "cancelled", "replaced"].includes(a.status)) ? null : current);
      setPreview((current) => current ? data.assets.find((asset) => asset.assetId === current.assetId) || null : null);
    } catch (error) { if (!signal?.aborted) { setSyncError(true); if (!background) setMessage(error instanceof Error ? error.message : "Could not load files."); } }
  }, [courseId, batchId, category, dateFilter, archived, library, filterCategory, search]);
  useEffect(() => { const abort = new AbortController(); const timer = setTimeout(() => { if (courseId && batchId) void list(1, abort.signal); }, 0); return () => { clearTimeout(timer); abort.abort(); }; }, [courseId, batchId, list]);
  useEffect(() => {
    if (!courseId || !batchId) return;
    const abort = new AbortController();
    let pending = false;
    const refresh = async () => {
      if (document.hidden || pending || abort.signal.aborted) return;
      pending = true;
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), 20000);
      try {
        await list(page, AbortSignal.any([abort.signal, timeout.signal]), true);
        if (timeout.signal.aborted && !abort.signal.aborted) setSyncError(true);
      } finally { clearTimeout(timer); pending = false; }
    };
    const timer = setInterval(() => void refresh(), 5000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    window.addEventListener("online", visible);
    return () => { clearInterval(timer); abort.abort(); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); window.removeEventListener("online", visible); };
  }, [courseId, batchId, list, page]);
  const upload = async () => {
    if (!file || !courseId || !batchId || !contentDate) { setMessage("Select a file, lesson date and a saved course/batch first."); return; }
    setBusy(true); setMessage(""); const abort = new AbortController(); controller.current = abort;
    try {
      if (transfer?.stage === "restart") await cancelSavedUpload();
      const result = await uploadS3File(file, courseId.trim(), batchId.trim(), abort.signal, () => {}, { category, contentDate, replacesAssetId: replacing?.assetId, onStatus: setTransfer });
      setMessage(result.videoProcessingState === "queued" ? "Upload verified. Follow the live video status below. Any previous recording stays available until preparation succeeds." : replacing ? "Replacement verified. The new file is available to students." : "Upload verified. File is available to this batch.");
      setTransfer(null); setReplacing(null); setFile(null); if (fileInput.current) fileInput.current.value = ""; await list();
    } catch (error) { setTransfer(current => current ? { ...current, stage: abort.signal.aborted ? "paused" : error instanceof StorageRequestError && error.code === "UPLOAD_RESTART_REQUIRED" ? "restart" : "failed" } : null); setMessage(abort.signal.aborted ? "Paused. Use the same file, date and replacement selection to resume." : error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  };
  const remove = async (asset: S3PublicAsset) => {
    if (!window.confirm(`Delete ${asset.filename}? Student access will be removed and its S3 object deleted. The audit record will remain.`)) return;
    setBusy(true); setPreview(null);
    try { const data = await storageRequest<{ message: string }>(`/api/s3/admin/assets/${asset.assetId}/delete`, {}); setMessage(data.message); await list(page); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Delete failed."); } finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 text-slate-900 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{library ? "Content library" : CATEGORY_LABELS[category]}</h2><p className="mt-1 text-sm text-slate-500">{total} files · Learning resources for this batch</p></div>{library && <button disabled={busy} onClick={() => setShowUpload(!showUpload)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">{showUpload ? "Close upload" : "+ Upload files"}</button>}</div>
    {library && <div className="flex flex-wrap gap-2" aria-label="Content type">{[["all", "All files"], ...Object.entries(CATEGORY_LABELS)].map(([key,label]) => <button key={key} disabled={busy} onClick={() => setFilterCategory(key)} aria-pressed={filterCategory === key} className={"rounded-lg px-3 py-2 text-sm font-medium " + (filterCategory === key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>{label}</button>)}</div>}
    {showUpload && <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
    {library && <label className="block text-sm font-medium">Content type<select disabled={busy || !!replacing} value={category} onChange={e => { setCategory(e.target.value as S3Category); setFile(null); if(fileInput.current) fileInput.current.value = ""; }} className="mt-1 block w-full rounded-lg border bg-white p-2">{Object.entries(CATEGORY_LABELS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    {selectedCourseId === undefined && <label className="block text-sm">Course ID<input disabled={busy} value={courseId} onChange={(e) => setCourseId(e.target.value)} className="block w-full rounded border p-2" /></label>}
    {selectedBatchId === undefined && <label className="block text-sm">Batch ID<input disabled={busy} value={batchId} onChange={(e) => setBatchId(e.target.value)} className="block w-full rounded border p-2" /></label>}
    <div className="hidden"><strong>Storage:</strong> Selected batch / {CATEGORY_LABELS[category]} / {contentDate}<p className="mt-1 text-xs text-slate-500">Files and changes are recorded in the database. Choose the lesson date to organize daily content.</p></div>
    {replacing && <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Replacing: <strong>{replacing.filename}</strong>. The old file stays available until verification succeeds.<button type="button" disabled={busy} onClick={() => { setReplacing(null); setFile(null); if (fileInput.current) fileInput.current.value = ""; }} className="ml-2 underline">Cancel replacement</button></div>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Lesson date<input type="date" required disabled={busy} value={contentDate} onChange={(e) => setContentDate(e.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="text-sm">{replacing ? "Replacement file" : "Select file"}<input ref={fileInput} disabled={busy} type="file" accept={allowedExtensions(category).map((s) => "." + s).join(",")} onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /></label></div>
    <p className="text-xs text-slate-500">{category === "video" ? "MP4 up to 10 GiB. With video processing enabled, uploading automatically prepares small segments. Each recording keeps one name and plays continuously in the admin preview and student view when ready." : "PDF, Office documents, TXT, CSV, ZIP and images where supported; up to 500 MiB. Office/ZIP files open as downloads."} Resume with the same source file and lesson date.</p>
    <div className="flex flex-wrap gap-2 text-sm"><button type="button" disabled={busy || !file} onClick={upload} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-40">{transfer?.stage === "restart" ? "Start new upload" : replacing ? "Replace / resume" : "Upload / resume"}</button>
      <button type="button" disabled={!busy} onClick={() => controller.current?.abort()} className="rounded-xl border px-3 py-2 disabled:opacity-40">Pause upload</button>
      <button type="button" disabled={busy} onClick={async () => { try { await cancelSavedUpload(); setTransfer(null); setMessage("Saved upload cancelled."); await list(page); } catch (e) { setMessage((e as Error).message); } }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Cancel saved upload</button></div>

    </div>}
    {transfer && <S3TransferStatus state={transfer.stage} transfer={transfer} />}
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    <p role="status" className={"text-xs " + (syncError ? "text-amber-700" : "text-slate-500")}>{syncError ? "Status updates interrupted. Showing the last known status; retrying automatically." : "Statuses update automatically. No page refresh needed."}</p>
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      {library && <label className="min-w-[180px] flex-1"><span className="mb-1 block text-xs font-medium text-slate-500">Search files</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by file name…" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 outline-blue-500" /></label>}
      <label><span className="mb-1 block text-xs font-medium text-slate-500">Lesson date</span><input type="date" disabled={busy} value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
      {dateFilter && <button disabled={busy} onClick={() => setDateFilter("")} className="px-2 py-2 text-blue-700">Clear date</button>}
      <details className="relative"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5"><SlidersHorizontal size={16} />More filters{archived && <span className="h-2 w-2 rounded-full bg-blue-600" />}</summary><div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"><label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={archived} onChange={e => setArchived(e.target.checked)} className="mt-1" /><span>Include replaced and deleted files</span></label></div></details>
      <button type="button" disabled={busy} onClick={() => list(page)} aria-label="Refresh files" title="Refresh files" className="rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 hover:text-blue-700"><RefreshCw size={18} /></button>
    </div>
    <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Lesson date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{assets.map((asset) => {
      const state = asset.status === "ready" && ["queued", "processing", "failed"].includes(asset.videoProcessingState || "") ? asset.videoProcessingState! : asset.status;
      const liveTransfer = transfer?.assetId === asset.assetId ? transfer : undefined;
      const displayState = liveTransfer?.stage || (state === "uploading" ? "incomplete" : state);
      const Icon = asset.category === "video" ? Film : FileText;
      return <tr key={asset.assetId} className="border-t border-slate-100 align-top transition hover:bg-slate-50/60"><td className="min-w-[220px] max-w-sm px-4 py-4"><div className="flex items-start gap-3"><span className={"rounded-lg p-2 " + (asset.category === "video" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600")}><Icon size={18} /></span><div className="min-w-0"><p className="break-words font-medium text-slate-800">{asset.filename}</p><p className="mt-1 text-xs text-slate-500">{(asset.byteSize / 1048576).toFixed(2)} MiB{asset.videoDurationSeconds ? " · " + Math.max(1, Math.round(asset.videoDurationSeconds / 60)) + " min" : ""}</p>{asset.videoProcessingErrorCode && <p className="mt-1 text-xs text-red-700">{asset.videoProcessingErrorCode}</p>}{asset.status === "deleted" && asset.cleanupState !== "done" && <p className="mt-1 text-xs text-amber-700">Cleanup pending</p>}</div></div></td><td className="px-4 py-4 text-xs text-slate-500">{CATEGORY_LABELS[asset.category]}</td><td className="whitespace-nowrap px-4 py-4 text-slate-600">{asset.contentDate ? new Date(asset.contentDate + "T00:00:00").toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"}) : "—"}</td><td className="px-4 py-4"><S3TransferStatus compact state={displayState} transfer={liveTransfer} /></td><td className="px-4 py-4"><div className="flex items-center justify-end gap-2">{asset.status === "ready" && <button disabled={busy} onClick={() => setPreview(asset)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700">Preview</button>}<details className="relative"><summary aria-label={"More actions for " + asset.filename} className="cursor-pointer list-none rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><MoreHorizontal size={18} /></summary><div className="relative z-10 mt-2 flex min-w-32 flex-col items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {asset.status === "ready" && asset.contentType === "video/mp4" && ["failed", "not-requested"].includes(asset.videoProcessingState || "not-requested") && <button type="button" disabled={busy} onClick={async () => { try { const data = await storageRequest<{ message: string }>(`/api/s3/admin/assets/${asset.assetId}/video-retry`, {}); setMessage(data.message); await list(page); } catch (e) { setMessage((e as Error).message); } }} className="text-blue-700 underline">{asset.videoProcessingState === "failed" ? "Retry processing" : "Prepare segments"}</button>}{asset.status === "ready" && <><button type="button" disabled={busy} onClick={() => { setShowUpload(true); setCategory(asset.category); setReplacing(asset); setContentDate(asset.contentDate || localDate()); setFile(null); if (fileInput.current) { fileInput.current.value = ""; fileInput.current.focus(); } }} className="text-blue-700 underline">Replace</button></>}
      {["ready", "replaced", "failed", "cancelled"].includes(asset.status) || (asset.status === "deleted" && asset.cleanupState !== "done") ? <button type="button" disabled={busy} onClick={() => remove(asset)} className="text-red-700 underline">{asset.status === "deleted" ? "Retry S3 cleanup" : "Delete"}</button> : null}
      <button type="button" disabled={busy} onClick={async () => { try { setEvents(await storageRequest(`/api/s3/admin/assets/${asset.assetId}/history`)); } catch (e) { setMessage((e as Error).message); } }} className="text-slate-600 underline">History</button>
      {asset.uploadSessionId && ["initializing", "uploading", "failed"].includes(asset.uploadStatus || "") && <button type="button" disabled={busy} onClick={async () => { try { await storageRequest(`/api/s3/admin/uploads/${asset.uploadSessionId}/abort`, {}); await list(page); } catch (e) { setMessage((e as Error).message); } }} className="text-red-700 underline">Cancel upload</button>}
    </div></details></div></td></tr>; })}{!assets.length && <tr><td colSpan={5} className="p-6 text-center text-slate-500">No files for this category and date.</td></tr>}</tbody></table></div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>{total ? "Showing " + ((page - 1) * 20 + (assets.length ? 1 : 0)) + "–" + ((page - 1) * 20 + assets.length) + " of " + total + " files" : "No files found"}</span>{(page > 1 || hasMore) && <div className="flex items-center gap-3"><button disabled={busy || page <= 1} onClick={() => list(page - 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Previous</button><span>Page {page}</span><button disabled={busy || !hasMore} onClick={() => list(page + 1)} className="rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-40">Next</button></div>}</div>
    {preview && <div role="dialog" aria-modal="true" aria-label="File preview" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6" onClick={() => setPreview(null)}><div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}><button type="button" onClick={() => setPreview(null)} className="mb-3 underline">Close preview</button><S3AssetViewer key={preview.assetId} asset={preview} /></div></div>}
    {events && <div className="rounded-xl bg-slate-50 p-3 text-sm"><button type="button" onClick={() => setEvents(null)} className="mb-2 underline">Close history</button><p className="font-semibold">{events.asset.filename}</p><p className="break-all text-xs">Record: {events.asset.assetId}{events.asset.replacesAssetId && ` · Replaces: ${events.asset.replacesAssetId}`}{events.asset.replacedBy && ` · Replaced by: ${events.asset.replacedBy}`}</p><ul className="mt-2 space-y-2">{events.events.map((event) => <li key={[event.action, event.relatedAssetId].join(":")}>{new Date(event.createdAt).toLocaleString()} · {event.action}<p className="break-all text-xs text-slate-500">User: {event.actorId}{event.relatedAssetId && ` · Related record: ${event.relatedAssetId}`}</p></li>)}</ul></div>}
  </section>;
}
