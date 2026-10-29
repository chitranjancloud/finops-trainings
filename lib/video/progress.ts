export type VideoProgress = {
  phase: string; percent?: number; downloadedBytes: number; sourceBytes: number;
  uploadedSegments: number; totalSegments: number; uploadedBytes: number;
  workerAvailable: boolean; nextAttemptAt?: string; lastProgressAt?: string;
  provider?: string;
};
type ProgressJob = {
  state?: string; phase?: string; downloadedBytes?: number; sourceBytes?: number;
  encodedSeconds?: number; sourceDurationSeconds?: number; uploadedSegments?: number;
  totalSegments?: number; uploadedBytes?: number; nextAttemptAt?: Date; lastProgressAt?: Date;
  provider?: string; providerPercent?: number;
};
export function publicJobProgress<T extends ProgressJob>(job: T, workerAvailable: boolean): VideoProgress {
  const number = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
  const phase = job.state === "queued" && job.phase !== "retry-wait" && !workerAvailable && job.provider !== "mediaconvert" ? "waiting-worker" : job.phase || job.state || "queued";
  const numerator = phase === "downloading" ? job.downloadedBytes : phase === "encoding" ? job.encodedSeconds : phase === "uploading-segments" ? job.uploadedSegments : undefined;
  const denominator = phase === "downloading" ? job.sourceBytes : phase === "encoding" ? job.sourceDurationSeconds : phase === "uploading-segments" ? job.totalSegments : undefined;
  const percent = job.provider === "mediaconvert" && job.providerPercent !== undefined && ["submitted", "probing", "encoding", "uploading-segments"].includes(phase)
    ? { percent: Math.min(99, Math.floor(number(job.providerPercent))) } : number(denominator) > 0 ? { percent: Math.min(99, Math.floor(number(numerator) / number(denominator) * 100)) } : {};
  return { phase, provider: job.provider || "ffmpeg", ...percent,
    downloadedBytes: number(job.downloadedBytes), sourceBytes: number(job.sourceBytes), uploadedSegments: number(job.uploadedSegments),
    totalSegments: number(job.totalSegments), uploadedBytes: number(job.uploadedBytes), workerAvailable,
    ...(phase === "retry-wait" && job.nextAttemptAt ? { nextAttemptAt: new Date(job.nextAttemptAt).toISOString() } : {}),
    ...(job.lastProgressAt ? { lastProgressAt: new Date(job.lastProgressAt).toISOString() } : {}) };
}

// Order results by input index. After failure, stop scheduling and settle all
// in-flight work before cleanup or a retry can begin.
export async function mapBounded<T, R>(items: readonly T[], concurrency: number,
  task: (item: T, index: number) => Promise<R>, signal?: AbortSignal): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0, failed = false;
  let failure: unknown;
  const worker = async () => {
    while (!failed && next < items.length) {
      try {
        signal?.throwIfAborted();
        const index = next++;
        results[index] = await task(items[index], index);
      } catch (error) { failed = true; failure ??= error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(items.length, Math.max(1, Math.min(8, Math.floor(concurrency) || 1))) }, worker));
  if (failed) throw failure;
  return results;
}
