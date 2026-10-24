"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Award, CheckCircle2, Download, ExternalLink, RefreshCw, Search, ShieldCheck, Trash2, XCircle } from "lucide-react";

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [studentBadges, setStudentBadges] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const auth = () => {
    const storedUser = localStorage.getItem("user");
    return {
      user: storedUser ? JSON.parse(storedUser) : null,
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    };
  };

  const load = async () => {
    const { user, sessionToken, deviceId } = auth();
    if (!user || !sessionToken || !deviceId) {
      window.location.href = "/login";
      return;
    }

    const params = new URLSearchParams({
      scope: "admin",
      userId: user._id,
      sessionToken,
      deviceId,
      search,
      status,
    });

    try {
      setLoading(true);
      const res = await fetch(`/api/certificates?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Unable to load certificates");
      setCertificates(data.certificates || []);
      setStudentBadges(data.studentBadges || []);
      const badgeRes = await fetch(`/api/badges?${new URLSearchParams({
        userId: user._id,
        sessionToken,
        deviceId,
      }).toString()}`, { cache: "no-store" });
      const badgeData = await badgeRes.json();
      setBadges(badgeData.success ? badgeData.badges || [] : data.badges || []);
      setError("");
    } catch (err: any) {
      setError(err.message || "Unable to load certificates");
    } finally {
      setLoading(false);
    }
  };

  const deleteCertificate = async (certificateCode: string) => {
    if (!confirm(`Delete certificate ${certificateCode} permanently?\n\nThis removes the certificate record, verification history, QR access, credential access, and related awarded badges.`)) return;
    const { user, sessionToken, deviceId } = auth();
    const res = await fetch(`/api/certificates/${certificateCode}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id || "",
        sessionToken,
        deviceId,
      }),
    });
    const data = await res.json();
    if (!data.success) alert(data.message || "Certificate deletion failed");
    await load();
  };

  const removeStudentBadge = async (studentBadgeId: string) => {
    if (!confirm("Remove this awarded badge from the student?")) return;
    const { user, sessionToken, deviceId } = auth();
    const res = await fetch("/api/badges/award", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id || "",
        sessionToken,
        deviceId,
        studentBadgeId,
      }),
    });
    const data = await res.json();
    if (!data.success) alert(data.message || "Badge removal failed");
    await load();
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (certificateCode: string, nextStatus: "ACTIVE" | "REVOKED") => {
    const reason = nextStatus === "REVOKED" ? prompt("Reason for revocation?") || "" : "";
    const { user, sessionToken, deviceId } = auth();
    const res = await fetch(`/api/certificates/${certificateCode}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id || "",
        sessionToken,
        deviceId,
        status: nextStatus,
        reason,
      }),
    });
    const data = await res.json();
    if (!data.success) alert(data.message || "Status update failed");
    await load();
  };

  const totalActive = certificates.filter((item) => item.status === "ACTIVE").length;
  const totalRevoked = certificates.filter((item) => item.status === "REVOKED").length;

  return (
    <main className="min-h-screen bg-[#050712] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin-page" className="mb-8 inline-flex items-center gap-2 text-slate-300 hover:text-white">
          <ArrowLeft size={18} /> Back to Admin
        </Link>

        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-blue-300">Admin Dashboard</p>
            <h1 className="mt-3 text-5xl font-black">Certificate Management</h1>
            <p className="mt-3 max-w-2xl text-slate-400">Manage issued certificates, badge awards, verification status, and certificate history.</p>
          </div>
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-[#2563eb] px-5 py-3 font-black">
            <RefreshCw size={18} /> Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Stat title="Total Certificates" value={certificates.length} icon={<ShieldCheck />} />
          <Stat title="Active" value={totalActive} icon={<CheckCircle2 />} />
          <Stat title="Revoked" value={totalRevoked} icon={<XCircle />} />
          <Stat title="Badge Awards" value={studentBadges.length} icon={<Award />} />
        </div>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search certificate, student, email, or course"
                className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 outline-none focus:border-blue-300"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REVOKED">REVOKED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
            <button onClick={load} className="rounded-2xl bg-white px-5 py-3 font-black text-slate-950">Apply</button>
          </div>
        </section>

        {loading ? (
          <Empty text="Loading certificates..." />
        ) : error ? (
          <Empty text={error} danger />
        ) : (
          <div className="space-y-4">
            {certificates.map((cert) => (
              <article key={cert.certificateCode} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#2563eb]/15 px-3 py-1 text-xs font-black text-blue-300">{cert.certificateCode}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${cert.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>{cert.status}</span>
                    </div>
                    <h2 className="text-2xl font-black">{cert.studentName}</h2>
                    <p className="mt-1 text-slate-400">{cert.studentEmail}</p>
                    <p className="mt-3 text-lg font-bold">{cert.courseName}</p>
                    <p className="text-sm text-slate-500">Issued {new Date(cert.issuedAt).toLocaleString("en-IN")} · Completed {new Date(cert.completionDate).toLocaleDateString("en-IN")}</p>
                    {cert.history?.length > 0 && (
                      <details className="mt-3 text-sm text-slate-400">
                        <summary className="cursor-pointer font-bold text-slate-300">View certificate history</summary>
                        <div className="mt-2 space-y-1">
                          {cert.history.map((item: any, index: number) => (
                            <p key={index}>{item.action} · {new Date(item.createdAt).toLocaleString("en-IN")} {item.reason ? `· ${item.reason}` : ""}</p>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/certificate/${cert.certificateCode}`} className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-bold">
                      <Download size={15} /> Download
                    </Link>
                    <Link href={`/credential/${cert.certificateCode}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
                      <ExternalLink size={15} /> Credential
                    </Link>
                    <Link href={`/verify/${cert.certificateCode}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
                      <ShieldCheck size={15} /> Verify
                    </Link>
                    {cert.status === "ACTIVE" ? (
                      <button onClick={() => updateStatus(cert.certificateCode, "REVOKED")} className="rounded-xl bg-red-500 px-3 py-2 text-sm font-bold">
                        Revoke
                      </button>
                    ) : (
                      <button onClick={() => updateStatus(cert.certificateCode, "ACTIVE")} className="rounded-xl bg-emerald-500 px-3 py-2 text-sm font-bold">
                        Reactivate
                      </button>
                    )}
                    <button onClick={() => deleteCertificate(cert.certificateCode)} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold">
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {certificates.length === 0 && <Empty text="No certificates found." />}
          </div>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-5">
          <h2 className="mb-4 text-2xl font-black">Badge Management</h2>
          <div className="mb-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <h3 className="mb-3 font-black">Awarded Student Badges</h3>
            <div className="space-y-2">
              {studentBadges.map((studentBadge) => {
                const badge = badges.find((item) => item.badgeId === studentBadge.badgeId);
                return (
                  <div key={studentBadge._id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-bold">{badge?.name || studentBadge.badgeId}</p>
                      <p className="text-xs text-slate-400">
                        Student: {studentBadge.studentId} · Course: {studentBadge.courseId || "N/A"} · Earned {new Date(studentBadge.earnedAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <button onClick={() => removeStudentBadge(studentBadge._id)} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold">
                      <Trash2 size={15} /> Remove Badge
                    </button>
                  </div>
                );
              })}
              {studentBadges.length === 0 && <p className="text-sm text-slate-400">No awarded badges yet.</p>}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {badges.map((badge) => (
              <div key={`${badge.badgeId}-${badge.courseId}`} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <Award className="text-blue-300" />
                <h3 className="mt-3 font-black">{badge.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{badge.criteria || badge.description}</p>
              </div>
            ))}
            {badges.length === 0 && <p className="text-slate-400">Badges will appear after certificate generation.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, icon }: { title: string; value: any; icon: any }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
      <div className="text-blue-300">{icon}</div>
      <p className="mt-4 text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function Empty({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border p-10 text-center ${danger ? "border-red-400/20 bg-red-500/10 text-red-200" : "border-white/10 bg-white/[0.045] text-slate-300"}`}>
      {text}
    </div>
  );
}
