"use client";
import { useEffect, useRef, type RefObject } from "react";

/** Attach segmented media to the existing video element and controls. */
export function useVideoSource(ref: RefObject<HTMLVideoElement | null>, src: string, mode: "mp4" | "hls", onError?: () => void) {
  const errorRef = useRef(onError);
  useEffect(() => { errorRef.current = onError; }, [onError]);
  useEffect(() => {
    const video = ref.current;
    if (!video || mode !== "hls") return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    void import("hls.js").then(({ default: Hls }) => {
      if (disposed) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 18, maxMaxBufferLength: 18, backBufferLength: 12,
          maxBufferSize: 8 * 1024 * 1024, startFragPrefetch: false, lowLatencyMode: false });
        const pause = () => hls.stopLoad();
        const play = () => hls.startLoad(-1);
        const seek = () => { hls.startLoad(video.currentTime); };
        video.addEventListener("pause", pause); video.addEventListener("play", play); video.addEventListener("seeking", seek);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal || [401, 403, 404, 409].includes(data.response?.code || 0)) {
            video.pause(); hls.stopLoad(); errorRef.current?.();
          }
        });
        hls.attachMedia(video); hls.loadSource(src);
        destroy = () => {
          video.removeEventListener("pause", pause); video.removeEventListener("play", play); video.removeEventListener("seeking", seek);
          hls.destroy();
        };
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        destroy = () => { video.pause(); video.removeAttribute("src"); video.load(); };
      } else errorRef.current?.();
    }).catch(() => { if (!disposed) errorRef.current?.(); });
    return () => { disposed = true; destroy?.(); };
  }, [ref, src, mode]);
}
