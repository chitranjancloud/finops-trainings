import Link from "next/link";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { connectDB } from "@/lib/mongodb";
import { validateCertificateIntegrity } from "@/lib/certificates";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";

async function loadCertificate(code: string) {
  await connectDB();
  const certificate = await Certificate.findOne({
    certificateCode: String(code || "").toUpperCase(),
  }).lean();
  if (!certificate) return { status: "NOT_FOUND", certificate: null, badges: [] };
  if ((certificate as any).status === "REVOKED") return { status: "REVOKED", certificate, badges: [] };
  if ((certificate as any).status === "EXPIRED") return { status: "EXPIRED", certificate, badges: [] };
  if (!validateCertificateIntegrity(certificate)) return { status: "INVALID", certificate: null, badges: [] };
  const badges = await Badge.find({ badgeId: { $in: (certificate as any).badgeIds || [] } }).lean();
  return { status: "VALID", certificate, badges };
}

export default async function VerifyCertificatePage({ params }: any) {
  const { status, certificate, badges } = await loadCertificate(params.certificateCode);
  const valid = status === "VALID";

  return (
    <main className="min-h-screen bg-[#0f172a] px-6 py-16 text-white">
      <section className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.055] p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${valid ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
            {valid ? <CheckCircle2 size={30} /> : <XCircle size={30} />}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-300">Certificate Verification</p>
            <h1 className="mt-2 text-3xl font-black">
              {valid ? "VERIFIED CERTIFICATE" : status === "REVOKED" ? "REVOKED CERTIFICATE" : status === "INVALID" ? "INVALID CERTIFICATE" : "CERTIFICATE NOT FOUND"}
            </h1>
          </div>
        </div>

        {valid && certificate ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="Student Name" value={(certificate as any).studentName} />
              <Info label="Course Name" value={(certificate as any).courseName} />
              <Info label="Completion Date" value={new Date((certificate as any).completionDate).toLocaleDateString("en-IN")} />
              <Info label="Certificate ID" value={(certificate as any).certificateCode} />
              <Info label="Badge Earned" value={(badges as any[]).map((b) => b.name).join(", ") || "Course Completion"} />
              <Info label="Verification Status" value="ACTIVE AND VERIFIED" />
              <Info label="Institution Name" value={(certificate as any).institutionName} />
              <Info label="Credential URL" value={(certificate as any).credentialUrl || `/credential/${(certificate as any).certificateCode}`} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={`/credential/${(certificate as any).certificateCode}`} className="rounded-2xl bg-blue-500 px-5 py-3 font-black text-white">
                View Credential
              </Link>
              <Link href={`/certificate/${(certificate as any).certificateCode}`} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-black">
                View Certificate
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-red-100">
            This credential could not be verified. Please check the certificate ID or contact the institution.
          </div>
        )}

        <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck size={16} />
          Verification is performed server-side with certificate integrity validation.
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-bold text-white">{value || "-"}</p>
    </div>
  );
}
