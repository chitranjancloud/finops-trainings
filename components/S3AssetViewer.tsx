"use client";
import { useState } from "react";
import S3VideoPlayer from "./S3VideoPlayer";
import { storageRequest } from "@/lib/storage/s3Client";
import type { S3PublicAsset } from "@/lib/storage/s3Types";
type Grant = { url: string; filename: string; contentType: string; expiresAt: string };
export default function S3AssetViewer({ asset }: { asset: S3PublicAsset }) {
  const [grant, setGrant] = useState<Grant | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  if (asset.contentType === "video/mp4") {
    if (["queued", "processing"].includes(asset.videoProcessingState || "")) return <section aria-live="polite"><h4 className="font-semibold">{asset.filename}</h4><p className="mt-2 text-sm">Preparing video segments. This recording will be available here when processing finishes.</p></section>;
    if (asset.videoProcessingState === "failed") return <section role="alert"><h4 className="font-semibold">{asset.filename}</h4><p className="mt-2 text-sm">This recording could not be prepared. An administrator can retry video processing.</p></section>;
    return <S3VideoPlayer key={asset.assetId} assetId={asset.assetId} autoOpen />;
  }
  const open = async () => { setBusy(true); setError(""); setGrant(null); try { setGrant(await storageRequest<Grant>("/api/s3/student/access-url", { assetId: asset.assetId })); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  return <section className="space-y-3"><h4 className="font-semibold">{asset.filename}</h4><button type="button" disabled={busy} onClick={open} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-40">{busy ? "Checking access…" : grant ? "Refresh private access" : "Open private file"}</button>
    {error && <p role="alert" className="text-red-500">{error}</p>}
    {grant && <><p className="text-xs opacity-70">Temporary access expires at {new Date(grant.expiresAt).toLocaleTimeString()}. Refresh access if needed.</p>
      {grant.contentType === "application/pdf" ? <iframe title={grant.filename} src={`${grant.url}#toolbar=0&navpanes=0`} referrerPolicy="no-referrer" className="h-[65vh] w-full rounded border bg-white" /> : grant.contentType.startsWith("image/") ? <a href={grant.url} target="_blank" rel="noreferrer" className="inline-block text-blue-500 underline">View image</a> : <a href={grant.url} target="_blank" rel="noreferrer" className="inline-block text-blue-500 underline">Download {grant.filename}</a>}
    </>}
  </section>;
}
