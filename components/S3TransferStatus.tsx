import { CheckCircle2, LoaderCircle, AlertCircle, PauseCircle } from "lucide-react";
import type { UploadProgress } from "@/lib/storage/s3Client";
import type { VideoProgress } from "@/lib/video/progress";

const labels: Record<string, [string, string]> = {
  preparing: ["Preparing upload", "Checking the file and recovering saved progress."],
  uploading: ["Uploading", "Keep this tab open. Completed parts are saved."],
  retrying: ["Connection interrupted — retrying", "Saved progress is safe. Retrying automatically."],
  verifying: ["Verifying upload", "All parts received. Checking the file before publication."],
  paused: ["Upload paused", "Select the same file and lesson date, then choose Upload / resume."],
  restart: ["Start a new upload", "The previous session was cancelled, expired or failed. Select the file and choose Start new upload."],
  failed: ["Needs attention", "Check the message below. Resume upload or retry video processing."],
  initializing: ["Preparing upload", "Starting the upload session."],
  incomplete: ["Upload incomplete", "Select the original file and lesson date to resume in its upload browser."],
  queued: ["Waiting to prepare video", "Upload complete. Waiting for the video worker."],
  processing: ["Preparing video", "Creating playback segments. This updates automatically."],
  submitted: ["Waiting for AWS processing", "Upload complete. AWS has accepted the video job."],
  submitting: ["Submitting processing job", "Sending the stored recording to AWS for preparation."],
  probing: ["Checking source video", "AWS is reading the recording before conversion."],
  "configuration-needed": ["Processing setup required", "The recording is stored safely. An administrator must enable the processing service."],
  "submission-unknown": ["Checking job submission", "The submission needs review. Checking for an existing AWS job without creating a duplicate."],
  downloading: ["Downloading for processing", "The cloud worker is reading the original from private storage."],
  encoding: ["Converting video", "Preparing playback segments on the worker."],
  "uploading-segments": ["Saving video segments", "Uploading and verifying the prepared segments."],
  publishing: ["Publishing video", "Final checks before playback becomes available."],
  "waiting-worker": ["Waiting for worker", "Upload complete. Processing starts when a worker is available."],
  "retry-wait": ["Retry scheduled", "Your original upload is safe. Processing will retry automatically."],
  ready: ["Ready to watch", "Available to this batch."],
  cancelled: ["Upload cancelled", "Start a new upload to add this file."],
  replaced: ["Replaced", "A newer file is available."],
  deleted: ["Deleted", "Student access has been removed."],
};
export default function S3TransferStatus({ state, transfer, job, compact = false }: {
  state: string; transfer?: UploadProgress; job?: VideoProgress; compact?: boolean;
}) {
  if (!transfer && job && ["queued", "processing"].includes(state)) state = job.phase;
  const [label, detail] = job && state === "verifying" ? ["Checking playback", "Validating the prepared playlist and segments."] : labels[state] || [state, ""];
  const active = ["preparing", "uploading", "retrying", "verifying", "initializing", "queued", "processing", "downloading", "encoding", "uploading-segments", "publishing", "submitted", "submitting", "probing"].includes(state);
  const warning = ["failed", "retrying", "incomplete", "restart", "configuration-needed", "submission-unknown"].includes(state);
  const Icon = state === "ready" ? CheckCircle2 : state === "paused" ? PauseCircle : warning ? AlertCircle : active ? LoaderCircle : AlertCircle;
  const bytes = (value: number) => value >= 1073741824 ? `${(value / 1073741824).toFixed(2)} GiB` : `${(value / 1048576).toFixed(1)} MiB`;
  const percent = transfer?.percent ?? job?.percent;
  return <div className={compact ? "min-w-[190px] max-w-xs space-y-1.5" : "space-y-2 rounded-xl border border-blue-100 bg-white p-4"}>
    <div className={"flex items-center gap-2 text-xs font-semibold " + (state === "ready" ? "text-emerald-700" : warning ? "text-amber-700" : "text-blue-700")}>
      <Icon size={15} className={active && !warning ? "shrink-0 animate-spin" : "shrink-0"} /><span>{label}</span>
      {percent !== undefined && <span className="ml-auto tabular-nums">{percent}%{!transfer && job?.provider === "mediaconvert" ? " overall" : ""}</span>}
    </div>
    {transfer && <><progress aria-label="Confirmed upload progress" max={100} value={transfer.percent} className="block h-2 w-full accent-blue-600" /><p className="text-xs tabular-nums text-slate-500">{bytes(transfer.uploadedBytes)} of {bytes(transfer.totalBytes)} confirmed</p></>}
    {!transfer && percent !== undefined && <progress aria-label={`${label} progress`} max={100} value={percent} className="block h-2 w-full accent-blue-600" />}
    {!transfer && job && state === "downloading" && <p className="text-xs text-slate-500">{bytes(job.downloadedBytes)} of {bytes(job.sourceBytes)}</p>}
    {!transfer && job && ["uploading-segments", "verifying"].includes(state) && job.totalSegments > 0 && <p className="text-xs text-slate-500">{job.uploadedSegments} of {job.totalSegments} segments verified</p>}
    {job?.nextAttemptAt && state === "retry-wait" && <p className="text-xs text-slate-500">Retry after {new Date(job.nextAttemptAt).toLocaleTimeString()}</p>}
    <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
  </div>;
}
