import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, PlayCircle } from "lucide-react";

type BatchLibraryCardProps = {
  href: string;
  title: string;
  courseName?: string;
  code?: string;
  startDate?: string;
  recorded?: boolean;
  progress?: { completedCount: number; totalCount: number; pct: number };
  assignments?: number;
  tests?: number;
};

export default function BatchLibraryCard({ href, title, courseName, code, startDate, recorded = false, progress, assignments = 0, tests = 0 }: BatchLibraryCardProps) {
  const Icon = recorded ? PlayCircle : BookOpen;
  return (
    <Link href={href} className="group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:border-blue-300 hover:shadow-md">
      <div className="mb-6 flex items-center justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon size={24} /></span>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{recorded ? "Self-paced" : "Live batch"}</span>
      </div>
      {code && <p className="mb-2 break-all text-xs font-medium text-slate-500">{code}</p>}
      <h3 className="text-xl font-semibold leading-snug text-slate-950 group-hover:text-blue-700">{title}</h3>
      {courseName && <p className="mt-2 text-sm leading-6 text-slate-600">{courseName}</p>}
      {startDate && !Number.isNaN(Date.parse(startDate)) && <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} />{new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
      {(assignments > 0 || tests > 0) && <p className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">{assignments > 0 && <span>{assignments} {assignments === 1 ? "assignment" : "assignments"}</span>}{tests > 0 && <span>{tests} {tests === 1 ? "test" : "tests"}</span>}</p>}
      {progress && progress.totalCount > 0 && <div className="mt-5"><div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{progress.completedCount} of {progress.totalCount} completed</span><span className="font-semibold text-blue-700">{progress.pct}%</span></div><div role="progressbar" aria-label={`${title} progress`} aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${progress.pct}%` }} /></div></div>}
      <div className="mt-auto pt-6"><span className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">{recorded ? "Open course" : "Open classroom"}<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></span></div>
    </Link>
  );
}
