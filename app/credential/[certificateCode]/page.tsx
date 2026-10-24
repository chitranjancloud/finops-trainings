import Link from "next/link";
import { Award, CheckCircle2, Share2, ShieldCheck, Star } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { validateCertificateIntegrity } from "@/lib/certificates";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";

async function loadCredential(code: string) {
  await connectDB();
  const certificate = await Certificate.findOne({
    certificateCode: String(code || "").toUpperCase(),
  }).lean();
  if (!certificate || !validateCertificateIntegrity(certificate)) return null;
  const badges = await Badge.find({ badgeId: { $in: (certificate as any).badgeIds || [] } }).lean();
  return { certificate, badges };
}

export default async function CredentialPage({ params }: any) {
  const data = await loadCredential(params.certificateCode);
  if (!data || (data.certificate as any).status !== "ACTIVE") {
    return (
      <main className="min-h-screen bg-[#0f172a] px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/10 p-10 text-center">
          <h1 className="text-3xl font-black">Credential unavailable</h1>
          <p className="mt-3 text-red-100">This certificate is not active or could not be verified.</p>
        </div>
      </main>
    );
  }

  const certificate: any = data.certificate;
  const title = `${certificate.courseName} Certificate`;
  const shareUrl = certificate.credentialUrl || `/credential/${certificate.certificateCode}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;

  return (
    <main className="min-h-screen bg-[#0f172a] px-6 py-14 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-blue-500/12 via-white/[0.05] to-blue-400/8 p-8 shadow-2xl">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">Verified Credential</p>
              <h1 className="mt-4 text-5xl font-black leading-tight">{title}</h1>
              <p className="mt-4 text-xl text-slate-300">Awarded to {certificate.studentName}</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-sm font-black text-emerald-300">
                <CheckCircle2 size={18} /> VERIFIED CERTIFICATE
              </div>
            </div>
            <img
              src={`/api/certificates/${certificate.certificateCode}/qr`}
              alt="Certificate verification QR"
              className="h-40 w-40 rounded-2xl bg-white p-3"
            />
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            <Info label="Course" value={certificate.courseName} />
            <Info label="Completed" value={new Date(certificate.completionDate).toLocaleDateString("en-IN")} />
            <Info label="Certificate ID" value={certificate.certificateCode} />
            <Info label="Status" value={certificate.status} />
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-black">Earned Badges</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {(data.badges as any[]).map((badge) => (
                <div key={badge.badgeId} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <Award className="text-blue-300" />
                  <h3 className="mt-3 text-lg font-black">{badge.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">{badge.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-black">Skills Learned</h2>
            <div className="flex flex-wrap gap-2">
              {(certificate.skills || []).map((skill: string) => (
                <span key={skill} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold">
                  <Star size={14} /> {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/verify/${certificate.certificateCode}`} className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-black">
              <ShieldCheck size={18} /> Verify
            </Link>
            <Link href={`/certificate/${certificate.certificateCode}`} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black">
              View Certificate
            </Link>
            <a href={linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black">
              <Share2 size={18} /> Share Certificate
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 break-words font-black">{value || "-"}</p>
    </div>
  );
}
