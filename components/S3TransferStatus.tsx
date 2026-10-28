import { CheckCircle2, LoaderCircle, AlertCircle, PauseCircle } from "lucide-react";
import type { UploadProgress } from "@/lib/storage/s3Client";

const labels: Record<string, [string, string]> = {
  preparing: ["Preparing upload", "Checking the file and recovering saved progress."],
  uploading: ["Uploading", "Keep this tab open. Completed parts are saved."],
  retrying: ["Connection interrupted — retrying", "Saved progress is safe. Retrying automatically."],
  verifying: ["Verifying upload", "All parts received. Checking the file before publication."],
  paused: ["Upload paused", "Select the same file and lesson date, then choose Upload / resume."],
  failed: ["Needs attention", "Check the message below. Resume upload or retry video processing."],
  initializing: ["Preparing upload", "Starting the upload session."],
  incomplete: ["Upload incomplete", "Select the original file and lesson date to resume in its upload browser."],
  queued: ["Waiting to prepare video", "Upload complete. Waiting for the video worker."],
  processing: ["Preparing video", "Creating playback segments. This updates automatically."],
  ready: ["Ready to watch", "Available to this batch."],
  cancelled: ["Upload cancelled", "Start a new upload to add this file."],
  replaced: ["Replaced", "A newer file is available."],
  deleted: ["Deleted", "Student access has been removed."],
};
export default function S3TransferStatus({ state, transfer, compact = false }: {
  state: string; transfer?: UploadProgress; compact?: boolean;
}) {
  const [label, detail] = labels[state] || [state, ""];
  const active = ["preparing", "uploading", "retrying", "verifying", "initializing", "queued", "processing"].includes(state);
  const warning = ["failed", "retrying", "incomplete"].includes(state);
  const Icon = state === "ready" ? CheckCircle2 : state === "paused" ? PauseCircle : warning ? AlertCircle : active ? LoaderCircle : AlertCircle;
  const bytes = (value: number) => value >= 1073741824 ? `${(value / 1073741824).toFixed(2)} GiB` : `${(value / 1048576).toFixed(1)} MiB`;
  return <div className={compact ? "min-w-[190px] max-w-xs space-y-1.5" : "space-y-2 rounded-xl border border-blue-100 bg-white p-4"}>
    <div className={"flex items-center gap-2 text-xs font-semibold " + (state === "ready" ? "text-emerald-700" : warning ? "text-amber-700" : "text-blue-700")}>
      <Icon size={15} className={active && !warning ? "shrink-0 animate-spin" : "shrink-0"} /><span>{label}</span>
      {transfer && <span className="ml-auto tabular-nums">{transfer.percent}%</span>}
    </div>
    {transfer && <><progress aria-label="Confirmed upload progress" max={100} value={transfer.percent} className="block h-2 w-full accent-blue-600" /><p className="text-xs tabular-nums text-slate-500">{bytes(transfer.uploadedBytes)} of {bytes(transfer.totalBytes)} confirmed</p></>}
    <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
  </div>;
}
