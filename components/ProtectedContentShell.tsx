"use client";

import { useEffect, useState } from "react";

type ProtectedContentShellProps = {
  children: React.ReactNode;
  watermarkLabel?: string;
  tenantLabel?: string;
  className?: string;
  /** When true, shell security handlers apply but watermark is omitted (e.g. video player supplies its own). */
  suppressWatermark?: boolean;
};

const WATERMARK_POSITIONS = [
  "bottom-3 right-3 text-right",
  "bottom-3 left-3 text-left",
  "top-3 right-3 text-right",
  "top-3 left-3 text-left",
] as const;

/**
 * Best-effort browser deterrents for protected LMS content.
 * Server-side authorization remains the actual security boundary.
 */
export default function ProtectedContentShell({
  children,
  watermarkLabel = "",
  tenantLabel = "",
  className = "",
  suppressWatermark = false,
}: ProtectedContentShellProps) {
  const [watermarkIndex, setWatermarkIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked =
        (event.ctrlKey && ["s", "p", "u", "c", "a"].includes(key)) ||
        (event.metaKey && ["s", "p"].includes(key));

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        const videos = document.querySelectorAll("video");
        videos.forEach((video) => {
          if (!video.paused) video.pause();
        });
      }
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (suppressWatermark || (!watermarkLabel && !tenantLabel)) return undefined;

    const timer = window.setInterval(() => {
      setWatermarkIndex((index) => (index + 1) % WATERMARK_POSITIONS.length);
    }, 25000);

    return () => window.clearInterval(timer);
  }, [suppressWatermark, watermarkLabel, tenantLabel]);

  const showWatermark = !suppressWatermark && (watermarkLabel || tenantLabel);

  return (
    <div
      className={`relative select-none ${className}`}
      onDragStart={(event) => event.preventDefault()}
      onCopy={(event) => event.preventDefault()}
    >
      {showWatermark && (
        <div
          className={`pointer-events-none absolute z-20 max-w-[45%] rounded-md bg-black/20 px-2 py-1 text-[10px] leading-tight text-slate-700/80 transition-all duration-700 ${WATERMARK_POSITIONS[watermarkIndex]}`}
        >
          {watermarkLabel && <div className="truncate">{watermarkLabel}</div>}
          {tenantLabel && (
            <div className="truncate text-[9px] text-slate-600/70">{tenantLabel}</div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
