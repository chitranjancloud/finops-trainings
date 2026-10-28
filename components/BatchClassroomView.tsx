"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarDays, ChevronDown, FileText, GraduationCap, Megaphone, MessageCircle, Users } from "lucide-react";

export type ClassroomTab = "materials" | "assignments" | "tests" | "notices" | "faculty";

type ClassroomViewProps = {
  title: string;
  courseName?: string;
  code?: string;
  startDate?: string;
  description?: string;
  activeTab?: ClassroomTab;
  counts?: Partial<Record<ClassroomTab, number>>;
  onTabChange?: (tab: ClassroomTab) => void;
  recorded?: boolean;
  children: React.ReactNode;
};

const tabs = [
  { key: "materials", label: "Learning library", icon: BookOpen },
  { key: "assignments", label: "Assignments", icon: FileText },
  { key: "tests", label: "Tests", icon: GraduationCap },
  { key: "notices", label: "Notices", icon: Megaphone },
  { key: "faculty", label: "Faculty", icon: Users },
] as const;

export default function BatchClassroomView({ title, courseName, code, startDate, description, activeTab = "materials", counts = {}, onTabChange, recorded = false, children }: ClassroomViewProps) {
  const validStartDate = startDate && !Number.isNaN(Date.parse(startDate));
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/student/batches" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-slate-300 transition-colors hover:text-white"><ArrowLeft size={17} />All my batches</Link>
        <Link href="/student/chats" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.07]"><MessageCircle size={16} />Ask your trainer</Link>
      </div>

      <header className="pb-7">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-md border border-blue-400/20 bg-blue-400/10 px-2.5 py-1 text-blue-200">{recorded ? "Self-paced course" : "Your classroom"}</span>
          {code && <span className="break-all text-slate-400">{code}</span>}
        </div>
        <h1 className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-white">{title}</h1>
        {(courseName || validStartDate) && <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          {courseName && <span className="inline-flex items-center gap-2"><BookOpen size={16} className="shrink-0 text-blue-300" />{courseName}</span>}
          {validStartDate && <span className="inline-flex items-center gap-2"><CalendarDays size={16} className="shrink-0" />Batch start · {new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
        </div>}
        {description && <details className="group mt-5 max-w-3xl rounded-xl border border-white/[0.07] bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm text-slate-300">About this {recorded ? "course" : "batch"}<ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" /></summary>
          <p className="whitespace-pre-wrap border-t border-white/[0.06] px-4 py-4 text-sm leading-7 text-slate-400">{description}</p>
        </details>}
      </header>

      {!recorded && <div className="sticky top-[72px] z-30 border-b border-white/10 bg-[#0f172a]/95 backdrop-blur-lg">
        <div role="tablist" aria-label="Classroom sections" className="flex gap-1 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }, index) => <button
            key={key}
            id={`classroom-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            aria-controls="classroom-content"
            tabIndex={activeTab === key ? 0 : -1}
            onClick={() => onTabChange?.(key)}
            onKeyDown={event => {
              let next = index;
              if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
              else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = tabs.length - 1;
              else return;
              event.preventDefault();
              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
              onTabChange?.(tabs[next].key);
            }}
            className={`inline-flex min-h-14 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors ${activeTab === key ? "border-blue-400 text-blue-200" : "border-transparent text-slate-400 hover:text-white"}`}
          ><Icon size={17} />{label}{Boolean(counts[key]) && <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-xs tabular-nums">{counts[key]}</span>}</button>)}
        </div>
      </div>}

      <section id="classroom-content" role={recorded ? undefined : "tabpanel"} aria-labelledby={recorded ? undefined : `classroom-tab-${activeTab}`} tabIndex={0} className="mt-6 min-w-0 rounded-2xl border border-white/[0.08] bg-[#111c2e] p-4 outline-none sm:p-6">
        {children}
      </section>
    </div>
  );
}
