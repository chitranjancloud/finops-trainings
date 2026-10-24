"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, ShieldCheck, Video } from "lucide-react";

export default function JoinMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const meetingId = resolvedParams.id;
  const [meeting, setMeeting] = useState<any>(null);
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const openedRef = useRef(false);

  const getAuth = () => {
    const storedUser = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return { user, sessionToken, deviceId };
  };

  useEffect(() => {
    const loadMeeting = async () => {
      const { user, sessionToken, deviceId } = getAuth();

      if (!user || !sessionToken || !deviceId) {
        window.location.href = "/login";
        return;
      }

      const query = new URLSearchParams({
        userId: user._id,
        sessionToken,
        deviceId,
      });
      const res = await fetch(`/api/teams-meetings?${query.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      const found = data.meetings?.find((item: any) => item._id === meetingId);

      if (data.success && found) {
        setMeeting(found);
      } else {
        setError("This meeting is not available for your enrolled courses.");
      }
    };

    loadMeeting();
  }, [meetingId]);

  const sendAttendance = async (event: "start" | "heartbeat" | "leave") => {
    const { user, sessionToken, deviceId } = getAuth();
    if (!user || !sessionToken || !deviceId) return null;

    const res = await fetch("/api/teams-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId,
        userId: user._id,
        sessionToken,
        deviceId,
        event,
      }),
      keepalive: event === "leave",
    });

    return res.json();
  };

  const startMeeting = async () => {
    const data = await sendAttendance("start");

    if (!data?.success) {
      setError(data?.message || "Unable to join meeting");
      return;
    }

    setStarted(true);

    if (!openedRef.current) {
      openedRef.current = true;
      window.open(data.teamsUrl || meeting?.teamsUrl, "_blank", "noopener,noreferrer");
    }
  };

  const leaveMeeting = async () => {
    await sendAttendance("leave");
    setStarted(false);
    window.location.href = "/student/meetings";
  };

  useEffect(() => {
    if (!started) return;

    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    const heartbeat = window.setInterval(() => sendAttendance("heartbeat"), 30000);
    const handleBeforeUnload = () => sendAttendance("leave");

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.clearInterval(timer);
      window.clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [started]);

  return (
    <main className="min-h-screen bg-[#050712] text-white px-6 pt-24 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.14),transparent_36%)] pointer-events-none" />
      <div className="relative max-w-4xl mx-auto">
        <Link href="/student/meetings" className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-8">
          <ArrowLeft size={18} />
          Back to Meetings
        </Link>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="bg-gradient-to-br from-blue-500/15 via-blue-400/10 to-transparent p-8">
            <div className="w-16 h-16 rounded-3xl bg-[#2563eb]/15 text-blue-200 border border-blue-300/20 flex items-center justify-center mb-8">
              <Video size={32} />
            </div>
            <p className="text-xs uppercase tracking-[0.32em] text-blue-300 font-black">
              Teams Meeting
            </p>
            <h1 className="text-4xl md:text-5xl font-black mt-4 leading-tight">
              {meeting?.title || "Meeting"}
            </h1>
            <p className="text-slate-300 mt-4">{meeting?.courseName}</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <InfoCard icon={<ShieldCheck size={20} />} title="Access" value="Enrolled users only" />
              <InfoCard icon={<Clock size={20} />} title="Tracked Time" value={formatSeconds(seconds)} />
              <InfoCard icon={<CheckCircle2 size={20} />} title="Status" value={started ? "Joined" : "Ready"} />
            </div>

            <p className="text-slate-400 leading-relaxed mb-8">
              {meeting?.description || "Click join to open Microsoft Teams. Keep this tracker page open until you leave the session so your meeting time is recorded correctly."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={startMeeting}
                disabled={!meeting || started}
                className="flex-1 rounded-2xl bg-blue-500 hover:bg-[#2563eb] disabled:bg-[#0a2f52] disabled:text-slate-400 transition px-6 py-4 font-black text-white inline-flex items-center justify-center gap-2"
              >
                <ExternalLink size={19} />
                {started ? "Meeting Opened" : "Join in Microsoft Teams"}
              </button>
              <button
                onClick={leaveMeeting}
                disabled={!started}
                className="rounded-2xl border border-white/10 bg-white/10 hover:bg-white/15 disabled:opacity-50 transition px-6 py-4 font-bold"
              >
                I Left Meeting
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoCard({ icon, title, value }: { icon: React.ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="text-blue-200">{icon}</div>
      <p className="text-xs uppercase tracking-widest text-slate-500 mt-4">{title}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function formatSeconds(total: number) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}
