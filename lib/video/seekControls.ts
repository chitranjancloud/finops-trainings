export const VIDEO_SEEK_SECONDS = 10;

export function clampVideoSeekPosition(
  currentTime: number,
  delta: number,
  duration: number
) {
  const next = currentTime + delta;
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  return Math.max(0, Math.min(next, max));
}

/** Clamp an absolute seek target to [0, duration]. */
export function clampSeekTarget(target: number, duration: number) {
  if (!Number.isFinite(target) || target < 0) return 0;
  const max = Number.isFinite(duration) && duration > 0 ? duration : 0;
  if (max <= 0) return 0;
  return Math.min(target, max);
}

/** Format seconds as m:ss or h:mm:ss for video progress display. */
export function formatVideoTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
