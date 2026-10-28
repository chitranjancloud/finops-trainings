"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, CreditCard, Globe, Users } from "lucide-react";

type OverviewProps = {
  userId?: string;
  unassigned?: number | null;
  batches?: number | null;
};

export default function AdminOverview({ userId, unassigned, batches }: OverviewProps) {
  const [pending, setPending] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      userId,
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
      view: "approvals",
    });
    fetch(`/api/admin/fees/dashboard?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success || typeof data.dashboard?.pendingApprovalCount !== "number") throw new Error("Unavailable");
        setPending(data.dashboard.pendingApprovalCount);
      })
      .catch(error => { if (error.name !== "AbortError") setFailed(true); });
    return () => controller.abort();
  }, [userId, retry]);

  const cards = [
    {
      label: "Payment approvals",
      value: failed ? null : pending === null ? undefined : pending,
      href: "/admin-page/fees",
      action: "Review fees",
      icon: CreditCard,
      attention: true,
      detail: pending === 0 ? "All payment approvals are up to date." : "Receipts waiting for your review.",
    },
    {
      label: "Awaiting batch assignment",
      value: unassigned,
      href: "/admin-page#enrolled-students",
      action: "Assign students",
      icon: Users,
      attention: true,
      detail: unassigned === 0 ? "No live enrollments are waiting for a batch." : "Help enrolled learners get started.",
    },
    {
      label: "Upcoming active batches",
      value: batches,
      href: "/admin-page/batches",
      action: "Manage batches",
      icon: CalendarDays,
      attention: false,
      detail: batches === 0 ? "No upcoming active batches are scheduled." : "Prepare your next training cohorts.",
    },
  ];

  return (
    <section aria-labelledby="admin-overview-title" className="mb-12">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-blue-700">Workspace overview</p>
          <h1 id="admin-overview-title" className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Keep learning operations moving.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">See what needs attention, support your learners, and prepare for the next class.</p>
        </div>
        <Link href="/admin-page#courses" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          <BookOpen size={17} /> Manage courses
        </Link>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {cards.map(({ label, value, href, action, icon: Icon, attention, detail }) => {
          const loading = !userId || value === undefined;
          const unavailable = !loading && value === null;
          const needsAttention = attention && typeof value === "number" && value > 0;
          return (
            <Link key={label} href={href} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:border-blue-200 hover:shadow-md">
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${needsAttention ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-600"}`}><Icon size={22} /></span>
                {!loading && !unavailable && attention && <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${needsAttention ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{!needsAttention && <CheckCircle2 size={13} />}{needsAttention ? "Needs attention" : "Up to date"}</span>}
              </div>
              <p className="text-sm font-medium text-slate-600">{label}</p>
              <p className={`mt-2 font-semibold tracking-tight text-slate-950 ${unavailable ? "text-xl" : "text-4xl"}`} aria-live="polite" aria-label={loading ? `${label}: loading` : undefined}>{loading ? "—" : unavailable ? "Unavailable" : value?.toLocaleString("en-IN")}</p>
              <p className="mb-6 mt-3 text-xs leading-6 text-slate-500">{loading ? "Loading the latest information…" : unavailable ? "Open this section to check the latest status." : detail}</p>
              <span className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">{action}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          );
        })}
      </div>

      {failed && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Payment approvals could not be refreshed. <button onClick={() => { setFailed(false); setPending(null); setRetry(value => value + 1); }} className="font-semibold underline underline-offset-4">Try again</button></p>}

      <div className="mb-4 mt-9 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold text-slate-900">Go straight to your next task</h2><p className="text-xs text-slate-500">Tools you use every day</p></div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { title: "Schedule & sessions", description: "Organize live classes and meetings.", href: "/admin-page/meetings", icon: CalendarDays },
          { title: "Review submissions", description: "Check assignments and student work.", href: "/admin-page/assignments", icon: ClipboardCheck },
          { title: "Website content", description: "Update banners, stories, and webinars.", href: "/admin-page/website", icon: Globe },
        ].map(({ title, description, href, icon: Icon }) => <Link key={href} href={href} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-5 transition-colors hover:border-blue-200 hover:bg-blue-50/40"><Icon size={20} className="mt-0.5 shrink-0 text-blue-600" /><span className="flex-1"><span className="block text-sm font-semibold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-6 text-slate-500">{description}</span></span><ArrowRight size={15} className="mt-1 shrink-0 text-slate-400 group-hover:text-blue-600" /></Link>)}
      </div>
    </section>
  );
}
