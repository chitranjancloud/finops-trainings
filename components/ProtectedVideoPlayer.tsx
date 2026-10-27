"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVideoSource } from "@/lib/video/useVideoSource";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  clampSeekTarget,
  clampVideoSeekPosition,
  formatVideoTime,
  VIDEO_SEEK_SECONDS,
} from "@/lib/video/seekControls";

type ProtectedVideoPlayerProps = {
  src: string;
  sourceMode?: "mp4" | "hls";
  className?: string;
  onEnded?: () => void;
  onError?: () => void;
  watermarkLabel?: string;
  tenantLabel?: string;
  /** Opt-in for S3 URL renewal. Legacy callers retain source-reset behavior. */
  preserveOnSourceChange?: boolean;
  resumeAt?: number;
  resumePlaying?: boolean;
  onPlaybackState?: (time: number, playing: boolean) => void;
  onBeforePlay?: () => Promise<boolean>;
};

const SEEK_SECONDS = VIDEO_SEEK_SECONDS;
const ZOOM_MIN = 1;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.25;
const WATERMARK_POSITIONS = [
  "bottom-3 right-3 text-right",
  "bottom-3 left-3 text-left",
  "top-3 right-3 text-right",
  "top-3 left-3 text-left",
] as const;

export default function ProtectedVideoPlayer({
  src,
  sourceMode = "mp4",
  className = "",
  onEnded,
  onError,
  watermarkLabel = "",
  tenantLabel = "",
  preserveOnSourceChange = false,
  resumeAt = 0,
  resumePlaying = false,
  onPlaybackState,
  onBeforePlay,
}: ProtectedVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoSource(videoRef, src, sourceMode, onError);
  const progressRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [watermarkIndex, setWatermarkIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_MIN);

  useEffect(() => {
    if (preserveOnSourceChange) return;
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setWatermarkIndex(0);
    setZoom(ZOOM_MIN);
    scrubbingRef.current = false;
    pendingSeekRef.current = null;
  }, [src, preserveOnSourceChange]);

  useEffect(() => {
    // A renewed src with preload=none otherwise waits indefinitely for Play,
    // even if the student was already watching when access was renewed.
    if (preserveOnSourceChange && resumePlaying) {
      void videoRef.current?.play().catch(() => setPlaying(false));
    }
  }, [src, preserveOnSourceChange, resumePlaying]);

  useEffect(() => {
    const syncFullscreen = () => {
      const active =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element })
          .webkitFullscreenElement;
      setIsFullscreen(Boolean(active && active === containerRef.current));
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  useEffect(() => {
    if (!watermarkLabel && !tenantLabel) return undefined;

    const timer = window.setInterval(() => {
      setWatermarkIndex((index) => (index + 1) % WATERMARK_POSITIONS.length);
    }, 25000);

    return () => window.clearInterval(timer);
  }, [watermarkLabel, tenantLabel]);

  const getDuration = useCallback(() => {
    const video = videoRef.current;
    const value = video?.duration ?? duration;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }, [duration]);

  const seekTo = useCallback(
    (target: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clamped = clampSeekTarget(target, getDuration());
      video.currentTime = clamped;
      setCurrentTime(clamped);
    },
    [getDuration]
  );

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bar = progressRef.current;
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      if (rect.width <= 0) return;

      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const target = clampSeekTarget(ratio * getDuration(), getDuration());
      // Preview the position while dragging. Changing currentTime on every
      // pointer move can start many overlapping video range requests.
      pendingSeekRef.current = target;
      setCurrentTime(target);
    },
    [getDuration]
  );

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (onBeforePlay && !(await onBeforePlay())) return;
      try { await video.play(); setPlaying(true); }
      catch { setPlaying(false); }
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const seekBack = () => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(
      clampVideoSeekPosition(video.currentTime, -SEEK_SECONDS, getDuration())
    );
  };

  const seekForward = () => {
    const video = videoRef.current;
    if (!video) return;
    seekTo(
      clampVideoSeekPosition(video.currentTime, SEEK_SECONDS, getDuration())
    );
  };

  const zoomIn = () => {
    setZoom((value) => Math.min(ZOOM_MAX, Number((value + ZOOM_STEP).toFixed(2))));
  };

  const zoomOut = () => {
    setZoom((value) => Math.max(ZOOM_MIN, Number((value - ZOOM_STEP).toFixed(2))));
  };

  const toggleFullscreen = async () => {
    const target = containerRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;
    if (!target) return;

    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const active = document.fullscreenElement || doc.webkitFullscreenElement;

    if (active) {
      if (document.exitFullscreen) await document.exitFullscreen();
      else await doc.webkitExitFullscreen?.();
      return;
    }

    if (target.requestFullscreen) await target.requestFullscreen();
    else await target.webkitRequestFullscreen?.();
  };

  const handleProgressPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX);
  };

  const handleProgressPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    seekFromClientX(event.clientX);
  };

  const handleProgressPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    if (pendingSeekRef.current !== null) seekTo(pendingSeekRef.current);
    pendingSeekRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-lg bg-black select-none ${
        isFullscreen ? "h-screen rounded-none" : ""
      } ${className}`}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        className={`flex items-center justify-center overflow-auto bg-black ${
          isFullscreen ? "h-full" : "max-h-[70vh]"
        }`}
      >
      <video
        ref={videoRef}
        key={preserveOnSourceChange ? "renewable-source" : src}
        src={sourceMode === "hls" ? undefined : src}
        preload="none"
        playsInline
        controls={false}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(event) => event.preventDefault()}
        onClick={togglePlay}
        onLoadedMetadata={() => {
          const video = videoRef.current;
          if (!video) return;
          setDuration(Number.isFinite(video.duration) ? video.duration : 0);
          if (preserveOnSourceChange) {
            video.currentTime = clampSeekTarget(resumeAt, video.duration);
            setCurrentTime(video.currentTime);
            if (resumePlaying) void video.play().catch(() => setPlaying(false));
          }
        }}
        onTimeUpdate={() => {
          if (scrubbingRef.current) return;
          const video = videoRef.current;
          if (!video) return;
          setCurrentTime(video.currentTime);
          onPlaybackState?.(video.currentTime, !video.paused);
          if (Number.isFinite(video.duration) && video.duration > 0) {
            setDuration(video.duration);
          }
        }}
        onPlay={() => { setPlaying(true); onPlaybackState?.(videoRef.current?.currentTime || 0, true); }}
        onPause={() => { setPlaying(false); onPlaybackState?.(videoRef.current?.currentTime || 0, false); }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
        onError={() => onError?.()}
        style={{
          width: `${zoom * 100}%`,
          minHeight: isFullscreen ? `${zoom * 100}%` : undefined,
        }}
        className={`block bg-black object-contain transition-[width] duration-200 ${
          isFullscreen ? "h-full max-h-none" : ""
        }`}
      />
      </div>

      {(watermarkLabel || tenantLabel) && (
        <div
          className={`pointer-events-none absolute z-20 max-w-[45%] rounded-md bg-black/25 px-2 py-1 text-[10px] leading-tight text-white/70 backdrop-blur-[1px] transition-all duration-700 ${WATERMARK_POSITIONS[watermarkIndex]}`}
        >
          {watermarkLabel && <div className="truncate">{watermarkLabel}</div>}
          {tenantLabel && (
            <div className="truncate text-[9px] text-white/50">{tenantLabel}</div>
          )}
        </div>
      )}

      <div
        className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-3 pb-3 pt-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={progressRef}
          className="group/progress relative mb-2 h-4 cursor-pointer touch-none"
          role="slider"
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={duration || 0}
          aria-valuenow={currentTime}
          tabIndex={0}
          onPointerDown={handleProgressPointerDown}
          onPointerMove={handleProgressPointerMove}
          onPointerUp={handleProgressPointerUp}
          onPointerCancel={() => {
            scrubbingRef.current = false;
            pendingSeekRef.current = null;
            setCurrentTime(videoRef.current?.currentTime || 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              seekBack();
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              seekForward();
            }
          }}
        >
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400 opacity-0 shadow transition-opacity group-hover/progress:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={seekBack}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-white/90 hover:bg-white/10"
            aria-label="Seek back 10 seconds"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">10s</span>
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            type="button"
            onClick={seekForward}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-white/90 hover:bg-white/10"
            aria-label="Seek forward 10 seconds"
          >
            <span className="hidden sm:inline">10s</span>
            <RotateCw size={14} />
          </button>

          <div className="ml-1 min-w-0 flex-1 truncate text-[11px] tabular-nums text-white/85 sm:text-xs">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </div>

          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom out"
          >
            <ZoomOut size={16} />
          </button>

          <span className="min-w-[2.5rem] text-center text-[11px] tabular-nums text-white/80">
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Zoom in"
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
            aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
