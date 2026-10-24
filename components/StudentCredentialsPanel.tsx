"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, BadgeCheck, Download, ExternalLink, Share2, ShieldCheck } from "lucide-react";

export default function StudentCredentialsPanel({ courses }: { courses: any[] }) {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [studentBadges, setStudentBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!user || !sessionToken || !deviceId) return;
    const params = new URLSearchParams({ userId: user._id, sessionToken, deviceId });
    const res = await fetch(`/api/certificates?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setCertificates(data.certificates || []);
      setBadges(data.badges || []);
      setStudentBadges(data.studentBadges || []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const certificateByEnrollment = useMemo(() => {
    const map = new Map<string, any>();
    for (const cert of certificates) map.set(String(cert.courseId || ""), cert);
    return map;
  }, [certificates]);

  const generate = async (enrollmentId: string) => {
    const { user, sessionToken, deviceId } = auth();
    if (!user || !sessionToken || !deviceId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          sessionToken,
          deviceId,
          enrollmentId,
        }),
      });
      const data = await res.json();
      if (!data.success) alert(data.message || "Certificate requirements are not complete yet.");
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Certificates & Badges</h2>
          <p className="mt-1 text-slate-500">Verified credentials, printable certificates, and earned learning badges.</p>
        </div>
        <button onClick={load} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 font-bold">
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xl font-black"><ShieldCheck size={20} /> My Certificates</h3>
          {certificates.length > 0 ? certificates.map((cert) => {
            const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cert.credentialUrl || `/credential/${cert.certificateCode}`)}`;
            return (
              <div key={cert.certificateCode} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-400">{cert.certificateCode}</p>
                    <h4 className="mt-2 text-xl font-black">{cert.courseName}</h4>
                    <p className="mt-1 text-sm text-slate-400">Issued {new Date(cert.issuedAt).toLocaleDateString("en-IN")} · {cert.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/certificate/${cert.certificateCode}`} className="inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-bold">
                      <Download size={15} /> PDF
                    </Link>
                    <Link href={`/credential/${cert.certificateCode}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
                      <ExternalLink size={15} /> Credential
                    </Link>
                    <a href={linkedInUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold">
                      <Share2 size={15} /> Share
                    </a>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-3xl border border-dashed border-white/15 p-6 text-slate-400">No certificates issued yet.</div>
          )}

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <h4 className="mb-3 font-black">Generate Eligible Certificates</h4>
            <div className="space-y-2">
              {courses.map((course) => {
                const existing = certificateByEnrollment.get(String(course.courseId || ""));
                return (
                  <div key={course.enrollmentId} className="flex flex-col gap-2 rounded-2xl bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-bold">{course.courseName} · {course.completion}%</span>
                    {existing ? (
                      <Link href={`/credential/${existing.certificateCode}`} className="rounded-xl bg-emerald-500/20 px-3 py-2 text-sm font-bold text-emerald-300">Issued</Link>
                    ) : (
                      <button disabled={loading || Number(course.completion || 0) < 100} onClick={() => generate(course.enrollmentId)} className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-bold disabled:bg-slate-700 disabled:text-slate-400">
                        Generate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xl font-black"><Award size={20} /> My Badges</h3>
          {studentBadges.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {studentBadges.map((item) => {
                const badge = badges.find((b) => b.badgeId === item.badgeId);
                return (
                  <div key={`${item.badgeId}-${item.courseId}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
                    <BadgeCheck className="text-blue-400" />
                    <h4 className="mt-3 font-black">{badge?.name || item.badgeId}</h4>
                    <p className="mt-2 text-sm text-slate-400">{badge?.description || "Earned learning badge."}</p>
                    <p className="mt-3 text-xs text-slate-500">Earned {new Date(item.earnedAt).toLocaleDateString("en-IN")}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 p-6 text-slate-400">No badges earned yet.</div>
          )}
        </div>
      </div>
    </section>
  );
}
