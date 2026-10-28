"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CreditCard,
  Download,
  FileText,
  LayoutList,
  MessageCircle,
  Save,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type InternshipApplication = {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  interestedPosition: string;
  currentEducation: string;
  skills: string;
  resumeUrl: string;
  resumeName?: string;
  additionalMessage?: string;
  status: string;
  adminFeedback?: string;
  applicationDate?: string;
  createdAt?: string;
};

const statuses = [
  "All",
  "Submitted",
  "Under Review",
  "Changes Requested",
  "Approved",
  "Rejected",
];

function SidebarLink({ href, icon, text, active = false, badge }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium transition ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function authPayload() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    userId: user._id || "",
    sessionToken: localStorage.getItem("sessionToken") || "",
    deviceId: localStorage.getItem("deviceId") || "",
  };
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function AdminInternshipApplicationsPage() {
  const [applications, setApplications] = useState<InternshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { status: string; adminFeedback: string }>>({});

  const loadApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...authPayload(),
        search,
        status,
      });
      const res = await fetch(`/api/internship-applications?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        const list = data.applications || [];
        setApplications(list);
        setDrafts(
          list.reduce((acc: Record<string, { status: string; adminFeedback: string }>, item: InternshipApplication) => {
            acc[item._id] = {
              status: item.status || "Submitted",
              adminFeedback: item.adminFeedback || "",
            };
            return acc;
          }, {})
        );
      } else {
        alert(data.message || "Failed to load internship applications");
      }
    } catch {
      alert("Failed to load internship applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const stats = useMemo(
    () => ({
      total: applications.length,
      review: applications.filter((item) => item.status === "Under Review").length,
      changes: applications.filter((item) => item.status === "Changes Requested").length,
      approved: applications.filter((item) => item.status === "Approved").length,
    }),
    [applications]
  );

  const updateDraft = (id: string, patch: Partial<{ status: string; adminFeedback: string }>) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        status: prev[id]?.status || "Submitted",
        adminFeedback: prev[id]?.adminFeedback || "",
        ...patch,
      },
    }));
  };

  const saveReview = async (application: InternshipApplication) => {
    const draft = drafts[application._id];
    if (!draft) return;

    setSavingId(application._id);
    try {
      const res = await fetch(`/api/internship-applications/${application._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...authPayload(),
          status: draft.status,
          adminFeedback: draft.adminFeedback,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setApplications((prev) =>
          prev.map((item) => (item._id === application._id ? data.application : item))
        );
        alert("Application review updated");
      } else {
        alert(data.message || "Failed to update application");
      }
    } catch {
      alert("Failed to update application");
    } finally {
      setSavingId("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">


      <main className=" min-h-screen flex-1 p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Admin Review</p>
            <h1 className="text-4xl font-black text-gray-950">Internship Applications</h1>
            <p className="mt-2 text-gray-500">View applicants, resumes, status, and review comments.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Total" value={stats.total} />
            <Stat label="Review" value={stats.review} />
            <Stat label="Changes" value={stats.changes} />
            <Stat label="Approved" value={stats.approved} />
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto]">
            <label className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, position, education, skills..."
                className="w-full rounded-2xl border border-gray-200 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            >
              {statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button
              onClick={loadApplications}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            Loading internship applications...
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            No internship applications found.
          </div>
        ) : (
          <div className="space-y-5">
            {applications.map((application) => {
              const draft = drafts[application._id] || {
                status: application.status || "Submitted",
                adminFeedback: application.adminFeedback || "",
              };

              return (
                <section key={application._id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-2xl font-black text-gray-950">{application.fullName}</h2>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          {application.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{application.interestedPosition}</p>

                      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <Info label="Email" value={application.email} />
                        <Info label="Phone Number" value={application.phone} />
                        <Info label="Application Date" value={formatDate(application.applicationDate || application.createdAt)} />
                        <Info label="Current Education" value={application.currentEducation} />
                        <Info label="Skills" value={application.skills} />
                        <Info label="Additional Message" value={application.additionalMessage || "-"} />
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <a
                          href={application.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          <FileText size={16} />
                          View Resume
                        </a>
                        <a
                          href={application.resumeUrl}
                          download
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
                        >
                          <Download size={16} />
                          Download Resume
                        </a>
                      </div>
                    </div>

                    <div className="w-full rounded-2xl border border-gray-100 bg-gray-50 p-4 xl:w-[360px]">
                      <label className="block">
                        <span className="mb-2 block text-sm font-bold text-gray-700">Current Status</span>
                        <select
                          value={draft.status}
                          onChange={(e) => updateDraft(application._id, { status: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                        >
                          {statuses.filter((item) => item !== "All").map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-bold text-gray-700">Admin Feedback / Comments</span>
                        <textarea
                          value={draft.adminFeedback}
                          onChange={(e) => updateDraft(application._id, { adminFeedback: e.target.value })}
                          rows={6}
                          placeholder="Add resume review comments, improvements, or correction request..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                        />
                      </label>

                      <button
                        onClick={() => saveReview(application)}
                        disabled={savingId === application._id}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Save size={16} />
                        {savingId === application._id ? "Saving..." : "Save Review"}
                      </button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="text-2xl font-black text-gray-950">{value}</div>
      <div className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
        <CalendarDays size={13} />
        {label}
      </p>
      <p className="break-words text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}