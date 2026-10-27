"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import ProtectedVideoPlayer from "./ProtectedVideoPlayer";
import ProtectedContentShell from "./ProtectedContentShell";
import { storageRequest, StorageRequestError } from "@/lib/storage/s3Client";

type Grant = { url: string; expiresAt: string; filename: string; mode?: "hls"; playbackToken?: string };
export default function S3VideoPlayer({ assetId, onEnded, autoOpen = false }: { assetId: string; onEnded?: () => void; autoOpen?: boolean }) {
  const [grant, setGrant] = useState<Grant | null>(null);
  const [resume, setResume] = useState({ time: 0, playing: false });
  const [error, setError] = useState("");
  const [watermark, setWatermark] = useState("");
  const [loading, setLoading] = useState(false);
  const progress = useRef({ time: 0, playing: false });
  const inFlight = useRef(false);
  const lastErrorRetry = useRef(0);
  const mounted = useRef(true);
  const request = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true);
    try { const user = JSON.parse(localStorage.getItem("user") || "{}"); setWatermark([user.name, user.email].filter(Boolean).join(" | ")); } catch { /* no saved user */ }
    try {
      const next = await storageRequest<Grant>("/api/s3/student/access-url", { assetId });
      if (mounted.current) {
        setResume({ ...progress.current }); setGrant(next); setError("");
      }
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Playback authorization failed.");
        // Do not keep playing buffered content after an explicit access denial.
        if (e instanceof StorageRequestError && [401, 403, 404, 409].includes(e.status)) setGrant(null);
      }
    } finally { inFlight.current = false; if (mounted.current) setLoading(false); }
  }, [assetId]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (!autoOpen) return;
    const timer = window.setTimeout(() => { void request(); }, 0);
    return () => window.clearTimeout(timer);
  }, [autoOpen, request]);
  useEffect(() => {
    if (!grant) return;
    let renewing = false;
    const timer = window.setInterval(() => {
      if (renewing || document.hidden || !progress.current.playing || Date.parse(grant.expiresAt) - Date.now() >= 90000) return;
      if (grant.mode !== "hls") { void request(); return; }
      renewing = true;
      void storageRequest<{ expiresAt: string }>("/api/s3/student/video-playback/renew", { token: grant.playbackToken })
        .then((data) => { if (mounted.current) setGrant((current) => current && current.playbackToken === grant.playbackToken ? { ...current, expiresAt: data.expiresAt } : current); })
        .catch((e) => { if (mounted.current) { setError(e instanceof Error ? e.message : "Playback renewal failed."); if (e instanceof StorageRequestError && [401, 403, 404, 409].includes(e.status)) setGrant(null); } })
        .finally(() => { renewing = false; });
    }, 15000);
    return () => window.clearInterval(timer);
  }, [grant, request]);
  const track = useCallback((time: number, playing: boolean) => { progress.current = { time, playing }; }, []);
  return <ProtectedContentShell suppressWatermark><section className="space-y-3">
    {!grant && <button disabled={loading} onClick={() => request()} className="rounded bg-blue-700 px-5 py-3 text-white disabled:opacity-50">{loading ? "Checking access…" : "Open private video"}</button>}
    {grant && <>
      <h2 className="font-semibold">{grant.filename}</h2>
      <ProtectedVideoPlayer src={grant.url} sourceMode={grant.mode === "hls" ? "hls" : "mp4"} watermarkLabel={watermark} tenantLabel="FinOps Trainings" preserveOnSourceChange resumeAt={resume.time} resumePlaying={resume.playing} onPlaybackState={track} onEnded={onEnded}
        onBeforePlay={async () => {
          if (Date.parse(grant.expiresAt) - Date.now() < 30000) { progress.current.playing = true; await request(); return false; }
          return true;
        }}
        onError={() => {
          // One automatic retry per minute; no endless expired/unsupported-file loop.
          if (Date.now() - lastErrorRetry.current > 60000) { lastErrorRetry.current = Date.now(); void request(); }
          else setError("Video could not be played. Verify the recording format or retry access.");
        }} />
    </>}
    {error && <div role="alert" className="rounded border border-red-300 p-3 text-red-700"><p>{error}</p><button disabled={loading} onClick={() => request()} className="mt-2 underline">Retry access</button></div>}
  </section></ProtectedContentShell>;
}
