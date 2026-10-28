"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock, MessageCircle } from "lucide-react";

type Course = { courseName: string; batchId?: string; completion: number; completedLessons: number; totalLessons: number; lastSeenAt?: string; statusClass: string };
type Meeting = { _id: string; title: string; startsAt?: string; courseName?: string };
type Resource = { _id: string; title: string; dueDate?: string; scheduledAt?: string; isActive?: boolean };
type Batch = { _id: string; name: string; tests?: Resource[]; assignments?: Resource[] };
type Submission = { batchId: string; resourceId: string; resourceType: string };
type Report = { user?: { name?: string }; summary?: { enrolledCourses?: number; averageCompletion?: number; activeTime?: string }; courses?: Course[] };
const dateLabel = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function StudentDashboard() {
  const [report, setReport] = useState<Report>({});
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(["learning progress", "class schedule", "assessments", "submissions"]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setErrors([]); setPending(["learning progress", "class schedule", "assessments", "submissions"]);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        const sessionToken = localStorage.getItem("sessionToken"), deviceId = localStorage.getItem("deviceId");
        if (!user || !sessionToken || !deviceId) { window.location.href = "/login"; return; }
        if (user.role === "admin") { window.location.href = "/admin-page"; return; }
        const params = new URLSearchParams({ userId: user._id, sessionToken, deviceId });
        setNow(Date.now());
        setLoading(false);
        const requests = [
          { endpoint: "user-report", label: "learning progress", apply: (data: Report) => setReport(data) },
          { endpoint: "teams-meetings", label: "class schedule", apply: (data: { meetings?: Meeting[] }) => setMeetings(data.meetings || []) },
          { endpoint: "batches", label: "assessments", apply: (data: { batches?: Batch[] }) => setBatches(data.batches || []) },
          { endpoint: "batch-submissions", label: "submissions", apply: (data: { submissions?: Submission[] }) => setSubmissions(data.submissions || []) },
        ];
        await Promise.allSettled(requests.map(async ({ endpoint, label, apply }) => {
          try {
            const response = await fetch(`/api/${endpoint}?${params}&view=dashboard${endpoint === "batches" ? "&scope=student" : ""}`, { signal: controller.signal, cache: "no-store" });
            if (response.status === 401) { window.location.href = "/login"; throw new Error("Your session has expired."); }
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error("Unavailable");
            if (!controller.signal.aborted) apply(data);
          } catch {
            if (!controller.signal.aborted) setErrors(current => [...current, label]);
          } finally {
            if (!controller.signal.aborted) setPending(current => current.filter(item => item !== label));
          }
        }));
      } catch { if (!controller.signal.aborted) setErrors(["dashboard"]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return () => controller.abort();
  }, [retry]);
  const nextMeeting = meetings.filter(meeting => meeting.startsAt && Date.parse(meeting.startsAt) >= now).sort((a,b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!))[0];
  const continueCourse = (report.courses || []).filter(course => course.statusClass === "enrolled" && course.completion < 100).sort((a,b) => (Date.parse(b.lastSeenAt || "") || 0) - (Date.parse(a.lastSeenAt || "") || 0))[0];
  const learningHref = continueCourse?.batchId ? `/student/batches?batch=${encodeURIComponent(continueCourse.batchId)}` : "/student/batches";
  const tasks = batches.flatMap(batch => (["assignments", "tests"] as const).flatMap(kind => (batch[kind] || []).filter(item => item.isActive !== false).filter(item => !submissions.some(submission => submission.batchId === batch._id && submission.resourceId === item._id && submission.resourceType === (kind === "tests" ? "test" : "assignment"))).map(item => ({ ...item, kind, batchName: batch.name, batchId: batch._id, date: item.dueDate || item.scheduledAt })))).sort((a,b) => (Date.parse(a.date || "") || Infinity) - (Date.parse(b.date || "") || Infinity));
  const workLoading = pending.includes("assessments") || pending.includes("submissions");
  const progressLoading = pending.includes("learning progress");
  const assessmentsUnavailable = errors.includes("assessments") || errors.includes("submissions") || errors.includes("dashboard");
  return <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <p className="text-sm font-medium text-blue-700">Your learning, one step at a time</p><h1 className="mt-2 text-3xl font-bold">Welcome{report.user?.name ? `, ${report.user.name.split(" ")[0]}` : " back"}.</h1><p className="mt-3 text-slate-600">Pick up your course, prepare for class, or work on your next assignment.</p>
      {loading ? <div className="mt-8 grid gap-5 md:grid-cols-3" role="status" aria-label="Loading dashboard">{[1,2,3].map(id => <div key={id} className="h-40 animate-pulse rounded-2xl bg-slate-200" />)}<span className="sr-only">Loading your learning workspace</span></div> : <>
        {errors.length > 0 && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span>Unable to refresh {errors.join(", ")}. Some information may be unavailable.</span><button onClick={() => setRetry(value => value + 1)} className="font-semibold underline underline-offset-4">Try again</button></div>}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl bg-blue-700 p-7 text-white"><BookOpen size={26} /><p className="mt-5 text-sm text-blue-100">Your next step</p><h2 className="mt-2 text-2xl font-semibold">{progressLoading ? "Loading your learning progress…" : continueCourse?.courseName || "Explore your learning library"}</h2><p className="mt-3 text-sm leading-6 text-blue-100">{continueCourse ? `${continueCourse.completedLessons} of ${continueCourse.totalLessons} lessons completed. Keep building your skills.` : "Open your courses to find lessons, resources, and updates from your trainer."}</p>{continueCourse && <div className="mt-5"><div className="mb-2 text-sm">{continueCourse.completion}% complete</div><progress value={continueCourse.completion} max={100} aria-label="Course progress" className="h-2 w-full accent-white" /></div>}<Link href={learningHref} className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-700">{continueCourse ? "Continue learning" : "Open my learning"} <ArrowRight size={17} /></Link></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-7"><CalendarDays className="text-blue-600" size={26} /><p className="mt-5 text-sm text-slate-500">Next live class</p><h2 className="mt-2 text-xl font-semibold">{pending.includes("class schedule") ? "Loading your next class…" : errors.includes("class schedule") ? "Schedule unavailable" : nextMeeting?.title || "You’re up to date"}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{nextMeeting?.startsAt ? `${dateLabel(nextMeeting.startsAt)} · your local time` : "Your assigned sessions appear here when a trainer schedules them."}</p><Link href={nextMeeting ? `/student/meetings/${nextMeeting._id}` : "/student/meetings"} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">{nextMeeting ? "View class" : "View schedule"} <ArrowRight size={16} /></Link></section>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">{[{ label: "Enrolled courses", value: report.summary?.enrolledCourses, icon: BookOpen }, { label: "Average completion", value: report.summary?.averageCompletion === undefined ? undefined : `${report.summary.averageCompletion}%`, icon: CheckCircle2 }, { label: "Active learning time", value: report.summary?.activeTime, icon: Clock }].map(({label,value,icon: Icon}) => <div key={label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5"><Icon size={21} className="text-blue-600" /><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{progressLoading ? "…" : value ?? "—"}</p></div></div>)}</div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Upcoming work</h2><Link href="/student/batches" className="text-sm font-medium text-blue-700">View all</Link></div>{workLoading ? <p role="status" className="mt-5 text-sm text-slate-500">Loading upcoming work…</p> : assessmentsUnavailable ? <p className="mt-5 text-sm text-slate-600">Your assessments could not be refreshed. Use My learning or try again.</p> : tasks.length ? <ul className="mt-4 divide-y divide-slate-100">{tasks.slice(0,4).map(task => <li key={`${task.batchId}-${task._id}`}><Link href={`/student/batches?batch=${encodeURIComponent(task.batchId)}&tab=${task.kind}`} className="flex items-center justify-between gap-4 py-4"><span><span className="block text-sm font-semibold">{task.title}</span><span className="mt-1 block text-xs text-slate-500">{task.batchName} · {task.kind === "tests" ? "Test" : "Assignment"}</span><span className={`mt-2 block text-xs ${task.date && Date.parse(task.date) < now ? "text-amber-700" : "text-slate-500"}`}>{task.date && Number.isFinite(Date.parse(task.date)) ? `${task.dueDate ? "Due" : "Scheduled"} ${dateLabel(task.date)}` : "No deadline set"}</span></span><ArrowRight size={17} className="shrink-0 text-blue-600" /></Link></li>)}</ul> : <div className="mt-5 rounded-xl bg-slate-50 p-5"><CheckCircle2 className="text-blue-600" /><p className="mt-3 text-sm text-slate-600">No outstanding work right now. Continue a lesson or check your batch notices.</p></div>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6"><MessageCircle className="text-blue-600" size={24} /><h2 className="mt-4 text-xl font-semibold">Keep moving with support</h2><p className="mt-3 text-sm leading-7 text-slate-600">Ask a question in your batch chat, review trainer feedback, or check the credentials you’ve earned.</p><div className="mt-5 space-y-3"><Link href="/student/chats" className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-medium">Message your batch <ArrowRight size={16} /></Link><Link href="/student/report" className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm font-medium">Progress & certificates <ArrowRight size={16} /></Link></div></section>
        </div>
      </>}
    </div>
  </main>;
}
