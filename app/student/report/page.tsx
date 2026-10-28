"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StudentCredentialsPanel from "@/components/StudentCredentialsPanel";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

type CourseReport = {
  enrollmentId: string;
  courseId?: string;
  courseName: string;
  status: string;
  statusClass: "enrolled" | "reserved" | "other";
  completionStatus: string;
  batchName?: string;
  batchId?: string;
  enrolledAt?: string;
  price?: string;
  duration?: string;
  activeTime: string;
  sessions: number;
  completion: number;
  completedLessons: number;
  totalLessons: number;
  lastSeenAt?: string | null;
};

type ReportData = {
  user?: {
    name?: string;
    email?: string;
  };
  summary?: {
    enrolledCourses: number;
    reservedCourses: number;
    totalTime: string;
    activeTime: string;
    averageCompletion: number;
  };
  courses?: CourseReport[];
  recentActivity?: {
    courseName: string;
    activeTime: string;
    inactiveTime: string;
    loginAt?: string;
    logoutAt?: string;
    status?: string;
  }[];
};

export default function StudentReportPage() {
  const [report, setReport] = useState<ReportData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReport = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");

      if (!storedUser || !sessionToken || !deviceId) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(storedUser);
      const params = new URLSearchParams({
        userId: user._id,
        sessionToken,
        deviceId,
      });

      try {
        setLoading(true);
        const res = await fetch(`/api/user-report?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to load report");
        }

        setReport(data);
      } catch (err: any) {
        setError(err.message || "Unable to load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, []);

  const courses = report.courses || [];
  const topCourse = useMemo(
    () =>
      courses
        .slice()
        .sort((a, b) => Number(b.completion || 0) - Number(a.completion || 0))[0],
    [courses]
  );

  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <section className="relative overflow-hidden px-6 pt-24 pb-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_36%)]" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
            <div>
              <Link
                href="/student"
                className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-6"
              >
                <ArrowLeft size={18} />
                Back to Dashboard
              </Link>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-400">
                Student Performance
              </p>
              <h1 className="mt-4 text-5xl md:text-6xl font-black tracking-tight">
                User Report
              </h1>
              <p className="mt-4 text-slate-400 max-w-2xl">
                Course enrollment, learning time, batch status, completion
                progress, and recent activity in one premium dashboard.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 min-w-[280px] backdrop-blur-xl">
              <p className="text-sm text-slate-400">Logged in as</p>
              <h2 className="text-2xl font-bold mt-1">
                {report.user?.name || "Student"}
              </h2>
              <p className="text-sm text-slate-500 break-all mt-1">
                {report.user?.email}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-10 text-center text-slate-300">
              Loading your report...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-10 text-center text-red-200">
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
                <StatCard
                  icon={<BookOpen size={22} />}
                  title="Enrolled"
                  value={report.summary?.enrolledCourses || 0}
                />
                <StatCard
                  icon={<Award size={22} />}
                  title="Reserved"
                  value={report.summary?.reservedCourses || 0}
                />
                <StatCard
                  icon={<Clock size={22} />}
                  title="Total Time"
                  value={report.summary?.totalTime || "0h 0m"}
                />
                <StatCard
                  icon={<TrendingUp size={22} />}
                  title="Active Time"
                  value={report.summary?.activeTime || "0h 0m"}
                />
                <StatCard
                  icon={<Gauge size={22} />}
                  title="Avg Complete"
                  value={`${report.summary?.averageCompletion || 0}%`}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6 mt-8">
                <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-3xl font-bold">My Courses</h2>
                      <p className="text-slate-500 mt-1">
                        Enrollment and completion progress.
                      </p>
                    </div>
                    <Link
                      href="/student/chats"
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 font-semibold text-white hover:bg-[#2563eb] transition"
                    >
                      <MessageCircle size={18} />
                      Batch Chats
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {courses.length > 0 ? (
                      courses.map((course) => (
                        <div
                          key={course.enrollmentId}
                          className="rounded-3xl border border-white/10 bg-black/25 p-5"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                            <div className="min-w-0">
                              {/* Status badges */}
                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                                    course.statusClass === "enrolled"
                                      ? "bg-blue-500/10 text-blue-200 border-blue-400/20"
                                      : course.statusClass === "reserved"
                                      ? "bg-amber-500/10 text-amber-200 border-amber-400/20"
                                      : "bg-white/5 text-slate-400 border-white/10"
                                  }`}
                                >
                                  {course.status}
                                </span>
                                {course.batchName && (
                                  <span className="rounded-full bg-purple-400/10 text-purple-200 border border-purple-300/20 px-3 py-1 text-xs font-bold">
                                    {course.batchName}
                                  </span>
                                )}
                                {/* Completion status pill */}
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                    course.completionStatus === "Completed"
                                      ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
                                      : course.completionStatus === "In Progress"
                                      ? "bg-blue-500/10 text-blue-300 border-blue-400/15"
                                      : course.completionStatus === "Not Started"
                                      ? "bg-slate-500/10 text-slate-400 border-slate-400/15"
                                      : "bg-white/5 text-slate-500 border-white/10"
                                  }`}
                                >
                                  {course.completionStatus}
                                </span>
                              </div>

                              <h3 className="text-2xl font-bold leading-tight">
                                {course.courseName}
                              </h3>

                              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-400">
                                <span className="inline-flex items-center gap-2">
                                  <Clock size={15} /> {course.activeTime}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <CalendarDays size={15} />
                                  {formatDate(course.enrolledAt)}
                                </span>
                                <span className="inline-flex items-center gap-2">
                                  <CheckCircle2 size={15} /> {course.sessions} sessions
                                </span>
                                {course.lastSeenAt && (
                                  <span className="inline-flex items-center gap-2">
                                    <TrendingUp size={15} />
                                    Last seen {formatDate(course.lastSeenAt)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="w-full lg:w-[230px] shrink-0">
                              {/* Completion % */}
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-slate-400">Completion</span>
                                <span className="font-black text-white text-lg">
                                  {course.completion}%
                                </span>
                              </div>
                              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${
                                    course.completion === 100
                                      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                      : "bg-gradient-to-r from-blue-500 to-blue-400"
                                  }`}
                                  style={{ width: `${course.completion}%` }}
                                />
                              </div>

                              {/* Lesson count */}
                              {course.totalLessons > 0 ? (
                                <p className="mt-2 text-xs text-slate-500 text-right">
                                  {course.completedLessons} of {course.totalLessons} lessons completed
                                </p>
                              ) : (
                                <p className="mt-2 text-xs text-slate-600 text-right">
                                  No trackable lessons yet
                                </p>
                              )}

                              <Link
                                href={`/courses/${course.courseId || "pl-300"}`}
                                className="mt-4 inline-flex w-full justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 transition"
                              >
                                Open Course
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center text-slate-400">
                        No enrolled or reserved courses found.
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-6">
                  <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
                    <h2 className="text-2xl font-bold">Focus Course</h2>
                    <p className="text-slate-500 mt-1">
                      Highest current completion.
                    </p>

                    {topCourse ? (
                      <div className="mt-6 rounded-3xl bg-gradient-to-br from-blue-500/15 to-blue-400/10 border border-white/10 p-5">
                        <p className="text-xs uppercase tracking-widest text-blue-200 font-bold">
                          {topCourse.status}
                        </p>
                        <h3 className="text-xl font-bold mt-3">
                          {topCourse.courseName}
                        </h3>
                        <div className="mt-6 text-5xl font-black">
                          {topCourse.completion}%
                        </div>
                        {topCourse.totalLessons > 0 && (
                          <p className="mt-2 text-xs text-slate-400">
                            {topCourse.completedLessons} / {topCourse.totalLessons} lessons
                          </p>
                        )}
                        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              topCourse.completion === 100
                                ? "bg-emerald-400"
                                : "bg-blue-400"
                            }`}
                            style={{ width: `${topCourse.completion}%` }}
                          />
                        </div>
                        <span className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold ${
                          topCourse.completionStatus === "Completed"
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20"
                            : topCourse.completionStatus === "In Progress"
                            ? "bg-blue-500/10 text-blue-300 border-blue-400/15"
                            : "bg-slate-500/10 text-slate-400 border-slate-400/15"
                        }`}>
                          {topCourse.completionStatus}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-6 text-slate-400">No course data yet.</p>
                    )}
                  </section>

                  <section className="rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-2xl font-bold">Recent Activity</h2>
                      <Download size={18} className="text-slate-500" />
                    </div>

                    <div className="space-y-3">
                      {(report.recentActivity || []).length > 0 ? (
                        report.recentActivity?.map((item, index) => (
                          <div
                            key={`${item.courseName}-${index}`}
                            className="rounded-2xl border border-white/10 bg-black/20 p-4"
                          >
                            <p className="font-semibold">{item.courseName}</p>
                            <p className="text-sm text-slate-500 mt-1">
                              Active {item.activeTime} | Idle {item.inactiveTime}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400">No recent activity yet.</p>
                      )}
                    </div>
                  </section>
                </aside>
              </div>

              <StudentCredentialsPanel courses={courses} />
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
      <div className="h-12 w-12 rounded-2xl bg-[#2563eb]/10 text-blue-200 border border-blue-400/20 flex items-center justify-center">
        {icon}
      </div>
      <p className="mt-5 text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "Not saved";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
