"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cancelSavedUpload, storageRequest, uploadS3File } from "@/lib/storage/s3Client";
import { CATEGORY_LABELS, allowedExtensions, localDate, type S3Category, type S3PublicAsset } from "@/lib/storage/s3Types";
import S3AssetViewer from "./S3AssetViewer";
type Event = { action: string; actorId: string; relatedAssetId: string; createdAt: string };
export default function S3UploadPanel({ courseId: selectedCourseId, batchId: selectedBatchId, category = "video" }: { courseId?: string; batchId?: string; category?: S3Category } = {}) {
  const [inputCourseId, setCourseId] = useState(""); const [inputBatchId, setBatchId] = useState("");
  const courseId = selectedCourseId ?? inputCourseId; const batchId = selectedBatchId ?? inputBatchId;
  const [file, setFile] = useState<File | null>(null); const [contentDate, setContentDate] = useState(localDate);
  const [dateFilter, setDateFilter] = useState(""); const [archived, setArchived] = useState(false);
  const [replacing, setReplacing] = useState<S3PublicAsset | null>(null); const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0); const [message, setMessage] = useState("");
  const [assets, setAssets] = useState<S3PublicAsset[]>([]); const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); const [hasMore, setHasMore] = useState(false);
  const [preview, setPreview] = useState<S3PublicAsset | null>(null);
  const [events, setEvents] = useState<{ asset: S3PublicAsset; events: Event[] } | null>(null);
  const controller = useRef<AbortController | null>(null); const fileInput = useRef<HTMLInputElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const list = useCallback(async (nextPage = 1, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({ page: String(nextPage), category, includeArchived: String(archived) });
      if (courseId) params.set("courseId", courseId); if (batchId) params.set("batchId", batchId);
      if (dateFilter) params.set("contentDate", dateFilter);
      const data = await storageRequest<{ assets: S3PublicAsset[]; hasMore: boolean; total: number }>(`/api/s3/admin/assets?${params}`, undefined, signal);
      setAssets(data.assets); setPage(nextPage); setHasMore(data.hasMore); setTotal(data.total);
      setPreview((current) => current ? data.assets.find((asset) => asset.assetId === current.assetId) || null : null);
    } catch (error) { if (!signal?.aborted) setMessage(error instanceof Error ? error.message : "Could not load files."); }
  }, [courseId, batchId, category, dateFilter, archived]);
  useEffect(() => { const abort = new AbortController(); const timer = setTimeout(() => { if (courseId && batchId) void list(1, abort.signal); }, 0); return () => { clearTimeout(timer); abort.abort(); }; }, [courseId, batchId, list]);
  const processing = assets.some((a) => ["queued", "processing"].includes(a.videoProcessingState || ""));
  useEffect(() => {
    if (!processing) return;
    const abort = new AbortController();
    const timer = setInterval(() => { if (!document.hidden && !busy) void list(page, abort.signal); }, 10000);
    return () => { clearInterval(timer); abort.abort(); };
  }, [processing, list, page, busy]);
  const upload = async () => {
    if (!file || !courseId || !batchId || !contentDate) { setMessage("Select a file, lesson date and a saved course/batch first."); return; }
    setBusy(true); setMessage(""); const abort = new AbortController(); controller.current = abort;
    try {
      const result = await uploadS3File(file, courseId.trim(), batchId.trim(), abort.signal, setProgress, { category, contentDate, replacesAssetId: replacing?.assetId });
      setMessage(result.videoProcessingState === "queued" ? "Upload verified. Video queued for processing. Keep the video worker running; any previous recording stays available until processing succeeds." : replacing ? "Replacement verified. The new file is available to students." : "Upload verified. File is available to this batch.");
      setReplacing(null); setFile(null); setProgress(0); if (fileInput.current) fileInput.current.value = ""; await list();
    } catch (error) { setMessage(abort.signal.aborted ? "Paused. Use the same file, date and replacement selection to resume." : error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  };
  const remove = async (asset: S3PublicAsset) => {
    if (!window.confirm(`Delete ${asset.filename}? Student access will be removed and its S3 object deleted. The audit record will remain.`)) return;
    setBusy(true); setPreview(null);
    try { const data = await storageRequest<{ message: string }>(`/api/s3/admin/assets/${asset.assetId}/delete`, {}); setMessage(data.message); await list(page); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Delete failed."); } finally { setBusy(false); }
  };
  return <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 text-slate-900 shadow-sm">
    <div><h2 className="text-lg font-bold">{CATEGORY_LABELS[category]}</h2><p className="text-sm text-slate-500">Private S3 storage · Total files: {total}</p></div>
    {selectedCourseId === undefined && <label className="block text-sm">Course ID<input disabled={busy} value={courseId} onChange={(e) => setCourseId(e.target.value)} className="block w-full rounded border p-2" /></label>}
    {selectedBatchId === undefined && <label className="block text-sm">Batch ID<input disabled={busy} value={batchId} onChange={(e) => setBatchId(e.target.value)} className="block w-full rounded border p-2" /></label>}
    <div className="rounded-xl bg-slate-50 p-3 text-sm"><strong>Storage:</strong> Selected batch / {CATEGORY_LABELS[category]} / {contentDate}<p className="mt-1 text-xs text-slate-500">Files and changes are recorded in the database. Choose the lesson date to organize daily content.</p></div>
    {replacing && <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">Replacing: <strong>{replacing.filename}</strong>. The old file stays available until verification succeeds.<button type="button" disabled={busy} onClick={() => { setReplacing(null); setFile(null); if (fileInput.current) fileInput.current.value = ""; }} className="ml-2 underline">Cancel replacement</button></div>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Lesson date<input type="date" required disabled={busy} value={contentDate} onChange={(e) => setContentDate(e.target.value)} className="block w-full rounded border p-2" /></label>
      <label className="text-sm">{replacing ? "Replacement file" : "Select file"}<input ref={fileInput} disabled={busy} type="file" accept={allowedExtensions(category).map((s) => "." + s).join(",")} onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-2 block w-full text-sm" /></label></div>
    <p className="text-xs text-slate-500">{category === "video" ? "MP4 up to 10 GiB. With video processing enabled, uploading automatically prepares small segments. Each recording keeps one name and plays continuously in the admin preview and student view when ready." : "PDF, Office documents, TXT, CSV, ZIP and images where supported; up to 500 MiB. Office/ZIP files open as downloads."} Resume with the same source file and lesson date.</p>
    <div className="flex flex-wrap gap-2 text-sm"><button type="button" disabled={busy || !file} onClick={upload} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-40">{replacing ? "Replace / resume" : "Upload / resume"}</button>
      <button type="button" disabled={!busy} onClick={() => controller.current?.abort()} className="rounded-xl border px-3 py-2 disabled:opacity-40">Pause upload</button>
      <button type="button" disabled={busy} onClick={async () => { try { await cancelSavedUpload(); setProgress(0); setMessage("Saved upload cancelled."); } catch (e) { setMessage((e as Error).message); } }} className="rounded-xl border px-3 py-2 disabled:opacity-40">Cancel saved upload</button></div>
    {busy && <div><progress max={100} value={progress} className="w-full" /><p className="text-xs">{progress}% uploaded</p></div>}
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    <div className="flex flex-wrap items-end gap-3 text-sm"><label>Filter lesson date<input type="date" disabled={busy} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="block rounded border p-2" /></label><button type="button" disabled={busy} onClick={() => setDateFilter("")} className="underline">All dates</button><label className="flex items-center gap-2"><input type="checkbox" disabled={busy} checked={archived} onChange={(e) => setArchived(e.target.checked)} />Include replaced / deleted</label><button type="button" disabled={busy} onClick={() => list(page)} className="underline">Refresh</button></div>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Existing files</th><th className="p-3">Lesson / upload date</th><th className="p-3">Actions</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.assetId} className="border-t align-top"><td className="max-w-xs p-3"><p className="break-words font-semibold">{asset.filename}</p><p className="text-xs text-slate-500">{(asset.byteSize / 1048576).toFixed(2)} MiB · {asset.status}</p><p className="mt-1 break-all text-xs text-slate-400">Record: {asset.assetId}</p>{asset.videoProcessingState && asset.videoProcessingState !== "not-requested" && <p className="mt-1 text-sm" role="status">Video: {asset.videoProcessingState}{asset.videoDurationSeconds ? ` · ${Math.round(asset.videoDurationSeconds / 60)} min` : ""}{asset.videoProcessingErrorCode && ` · ${asset.videoProcessingErrorCode}`}</p>}{asset.status === "deleted" && asset.cleanupState !== "done" && <p className="text-xs text-amber-700">S3 cleanup pending</p>}</td><td className="whitespace-nowrap p-3">{asset.contentDate}<p className="mt-1 text-xs text-slate-500">{new Date(asset.uploadedAt || asset.createdAt).toLocaleString()}</p></td><td className="space-y-2 p-3"><div className="flex flex-wrap gap-3">
      {asset.status === "ready" && asset.contentType === "video/mp4" && ["failed", "not-requested"].includes(asset.videoProcessingState || "not-requested") && <button type="button" disabled={busy} onClick={async () => { try { const data = await storageRequest<{ message: string }>(`/api/s3/admin/assets/${asset.assetId}/video-retry`, {}); setMessage(data.message); await list(page); } catch (e) { setMessage((e as Error).message); } }} className="text-blue-700 underline">{asset.videoProcessingState === "failed" ? "Retry processing" : "Prepare segments"}</button>}{asset.status === "ready" && <><button type="button" disabled={busy} onClick={() => setPreview(asset)} className="text-blue-700 underline">Open</button><button type="button" disabled={busy} onClick={() => { setReplacing(asset); setContentDate(asset.contentDate || localDate()); setFile(null); if (fileInput.current) { fileInput.current.value = ""; fileInput.current.focus(); } }} className="text-blue-700 underline">Replace</button></>}
      {["ready", "replaced", "failed", "cancelled"].includes(asset.status) || (asset.status === "deleted" && asset.cleanupState !== "done") ? <button type="button" disabled={busy} onClick={() => remove(asset)} className="text-red-700 underline">{asset.status === "deleted" ? "Retry S3 cleanup" : "Delete"}</button> : null}
      <button type="button" disabled={busy} onClick={async () => { try { setEvents(await storageRequest(`/api/s3/admin/assets/${asset.assetId}/history`)); } catch (e) { setMessage((e as Error).message); } }} className="text-slate-600 underline">History</button>
      {asset.uploadSessionId && ["initializing", "uploading", "failed"].includes(asset.uploadStatus || "") && <button type="button" disabled={busy} onClick={async () => { try { await storageRequest(`/api/s3/admin/uploads/${asset.uploadSessionId}/abort`, {}); await list(page); } catch (e) { setMessage((e as Error).message); } }} className="text-red-700 underline">Cancel upload</button>}
    </div></td></tr>)}{!assets.length && <tr><td colSpan={3} className="p-6 text-center text-slate-500">No files for this category and date.</td></tr>}</tbody></table></div>
    <div className="flex gap-4 text-sm"><button type="button" disabled={busy || page <= 1} onClick={() => list(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page}</span><button type="button" disabled={busy || !hasMore} onClick={() => list(page + 1)} className="disabled:opacity-40">Next</button></div>
    {preview && <div className="rounded-xl border p-3"><button type="button" onClick={() => setPreview(null)} className="mb-3 underline">Close preview</button><S3AssetViewer key={preview.assetId} asset={preview} /></div>}
    {events && <div className="rounded-xl bg-slate-50 p-3 text-sm"><button type="button" onClick={() => setEvents(null)} className="mb-2 underline">Close history</button><p className="font-semibold">{events.asset.filename}</p><p className="break-all text-xs">Record: {events.asset.assetId}{events.asset.replacesAssetId && ` · Replaces: ${events.asset.replacesAssetId}`}{events.asset.replacedBy && ` · Replaced by: ${events.asset.replacedBy}`}</p><ul className="mt-2 space-y-2">{events.events.map((event) => <li key={[event.action, event.relatedAssetId].join(":")}>{new Date(event.createdAt).toLocaleString()} · {event.action}<p className="break-all text-xs text-slate-500">User: {event.actorId}{event.relatedAssetId && ` · Related record: ${event.relatedAssetId}`}</p></li>)}</ul></div>}
  </section>;
}
