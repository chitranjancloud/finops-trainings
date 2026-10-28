// Upload control requests are short. Only each file part travels directly to S3.
export async function uploadRequest(url: string, init: RequestInit, signal?: AbortSignal,
  timeoutMs = 30_000, retryDelayMs = 1000, onRetry?: () => void): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (![408, 429, 500, 502, 503, 504].includes(response.status) || attempt === 3) return response;
      await response.body?.cancel();
    } catch (error) {
      signal?.throwIfAborted();
      if (attempt === 3) {
        if (controller.signal.aborted) throw new Error("Upload request timed out. Your completed parts are saved; use Upload / resume with the same file.");
        throw error;
      }
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    onRetry?.();
    await new Promise<void>((resolve, reject) => {
      const done = () => { signal?.removeEventListener("abort", cancelled); resolve(); };
      const timer = setTimeout(done, retryDelayMs * (attempt + 1));
      const cancelled = () => { clearTimeout(timer); signal?.removeEventListener("abort", cancelled); reject(new DOMException("Upload paused", "AbortError")); };
      signal?.addEventListener("abort", cancelled, { once: true });
      if (signal?.aborted) cancelled();
    });
  }
}
