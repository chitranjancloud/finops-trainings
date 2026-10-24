"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  RefreshCw,
  XCircle,
} from "lucide-react";

const STATUS_CLASSES: Record<string, string> = {
  Submitted: "bg-blue-500/15 text-blue-300 border-blue-400/20",
  "Under Review": "bg-amber-500/15 text-amber-300 border-amber-400/20",
  "Changes Requested": "bg-orange-500/15 text-orange-300 border-orange-400/20",
  Approved: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  Rejected: "bg-red-500/15 text-red-300 border-red-400/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Submitted: <FileText size={16} />,
  "Under Review": <Clock size={16} />,
  "Changes Requested": <RefreshCw size={16} />,
  Approved: <CheckCircle2 size={16} />,
  Rejected: <XCircle size={16} />,
};

export default function StudentInternshipApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const auth = () => {
    const storedUser = localStorage.getItem("user");

    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    };
  };

  const loadApplications = async () => {
    const { user, sessionToken, deviceId } = auth();

    if (!user || !sessionToken || !deviceId) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const params = new URLSearchParams({
        userId: user._id || "",
        sessionToken,
        deviceId,
      });

      const res = await fetch(`/api/internship-applications?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to load internship applications.");
      }

      setApplications(data.applications || []);
    } catch (error: any) {
      setMessage(error.message || "Unable to load internship applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      review: applications.filter((item) => item.status === "Under Review").length,
      changes: applications.filter((item) => item.status === "Changes Requested").length,
      approved: applications.filter((item) => item.status === "Approved").length,
    };
  }, [applications]);

  return (
    <main className="dash-page px-6 pt-24 pb-16 text-white">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/student/report"
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to Student Panel
        </Link>

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-400)" }}>
              Internship Applications
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
              My Internship Applications
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
              Track your internship application status, resume review comments, and requested corrections.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/internship-program"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
            >
              Apply Now
            </Link>

            <button
              onClick={loadApplications}
              className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Stat title="Total" value={stats.total} />
          <Stat title="Under Review" value={stats.review} />
          <Stat title="Changes" value={stats.changes} />
          <Stat title="Approved" value={stats.approved} />
        </div>

        {message && (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-200">
            {message}
          </div>
        )}

        {loading ? (
          <Empty text="Loading applications..." />
        ) : applications.length === 0 ? (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-10 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-500/15 text-blue-300">
              <Briefcase size={24} />
            </div>
            <h2 className="text-2xl font-black text-white">No applications yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              You have not submitted an internship application yet. Enrolled students can apply from the internship program page.
            </p>
            <Link
              href="/internship-program"
              className="mt-6 inline-flex rounded-2xl bg-blue-600 px-6 py-3 font-black text-white hover:bg-blue-700"
            >
              Apply for Internship
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {applications.map((application) => (
              <ApplicationCard key={application._id} application={application} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ApplicationCard({ application }: { application: any }) {
  return (
    <article className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={application.status} />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              <CalendarDays size={13} />
              {formatDate(application.applicationDate || application.createdAt)}
            </span>
          </div>

          <h2 className="text-2xl font-black text-white">
            {application.interestedPosition}
          </h2>

          <div className="mt-4 grid gap-3 text-sm text-slate-400 md:grid-cols-2">
            <Info icon={<Mail size={15} />} label="Email" value={application.email} />
            <Info icon={<Briefcase size={15} />} label="Position" value={application.interestedPosition} />
            <Info icon={<FileText size={15} />} label="Education" value={application.currentEducation} />
            <Info icon={<MessageSquare size={15} />} label="Skills" value={application.skills} />
          </div>
        </div>

        {application.resumeUrl && (
          <a
            href={application.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700"
          >
            <Eye size={16} />
            View Resume
          </a>
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <FeedbackBox
          title="Admin Comments"
          text={application.adminComments}
          empty="No admin comments yet."
        />

        <FeedbackBox
          title="Suggested Improvements"
          text={application.suggestedImprovements}
          empty="No suggestions yet."
        />

        <FeedbackBox
          title="Correction Request"
          text={application.correctionRequest}
          empty="No correction request."
        />
      </div>

      {application.reviewedAt && (
        <p className="mt-4 text-xs font-semibold text-slate-500">
          Last reviewed on {formatDate(application.reviewedAt)}
        </p>
      )}
    </article>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-5">
      <p className="text-xs font-black uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const safeStatus = status || "Submitted";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${
        STATUS_CLASSES[safeStatus] || "border-white/10 bg-white/10 text-slate-300"
      }`}
    >
      {STATUS_ICONS[safeStatus] || <FileText size={16} />}
      {safeStatus}
    </span>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
        {icon}
        {label}
      </p>
      <p className="break-words text-sm text-slate-200">{value || "-"}</p>
    </div>
  );
}

function FeedbackBox({
  title,
  text,
  empty,
}: {
  title: string;
  text?: string;
  empty: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <p className={`text-sm leading-relaxed ${text ? "text-slate-200" : "text-slate-500"}`}>
        {text || empty}
      </p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/[0.12] p-12 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}