"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MessageCircle, Video } from "lucide-react";

export default function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMeetings = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");

      if (!storedUser || !sessionToken || !deviceId) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(storedUser);
      markNotificationsRead(user._id, ["meeting"]);
      const params = new URLSearchParams({
        userId: user._id,
        sessionToken,
        deviceId,
      });

      try {
        setLoading(true);
        const res = await fetch(`/api/teams-meetings?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success) setMeetings(data.meetings || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    loadMeetings();
  }, []);

  const markNotificationsRead = async (userId: string, types: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionToken: localStorage.getItem("sessionToken"),
          deviceId: localStorage.getItem("deviceId"),
          types,
        }),
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white px-6 pt-24 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_36%)] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto">
        <Link href="/student" className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-8">
          <ArrowLeft size={18} />
          Back to Dashboard
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-400">
              Course Meetings
            </p>
            <h1 className="mt-4 text-5xl md:text-6xl font-black tracking-tight">
              Teams Sessions
            </h1>
            <p className="mt-4 text-slate-400 max-w-2xl">
              Join live sessions assigned to your enrolled courses. Attendance time is recorded for your learning report.
            </p>
          </div>
          <Link href="/student/chats" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 border border-white/10 px-5 py-3 font-semibold hover:bg-white/15 transition">
            <MessageCircle size={18} />
            Batch Chat
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-10 text-center text-slate-300">
            Loading meetings...
          </div>
        ) : meetings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {meetings.map((meeting) => (
              <section key={meeting._id} className="group rounded-[28px] border border-white/10 bg-white/[0.055] overflow-hidden backdrop-blur-xl hover:border-blue-400/30 transition">
                <div className="h-44 bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent p-6 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-[#2563eb]/15 text-blue-200 border border-blue-400/20 flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <span className="w-fit rounded-full bg-black/30 border border-white/10 px-3 py-1 text-xs font-bold text-blue-100">
                    Enrolled Course
                  </span>
                </div>
                <div className="p-6">
                  <p className="text-xs uppercase tracking-widest text-blue-400 font-bold">
                    {meeting.courseName}
                  </p>
                  <h2 className="text-2xl font-bold mt-3 leading-tight">{meeting.title}</h2>
                  <p className="text-slate-400 mt-3 text-sm leading-relaxed min-h-[44px]">
                    {meeting.description || "Your instructor has shared a live Teams session for this course."}
                  </p>
                  <div className="mt-5 space-y-2 text-sm text-slate-400">
                    <p className="flex items-center gap-2">
                      <CalendarDays size={16} />
                      {formatDate(meeting.startsAt)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} />
                      Attendance tracking enabled
                    </p>
                  </div>
                  <Link
                    href={`/student/meetings/${meeting._id}`}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] hover:bg-[#2563eb] transition px-5 py-4 font-black text-white"
                  >
                    Join Meeting
                    <ExternalLink size={18} />
                  </Link>
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.035] p-12 text-center text-slate-400">
            No Teams meetings are assigned to your enrolled courses yet.
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value?: string) {
  if (!value) return "Schedule will be shared";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
