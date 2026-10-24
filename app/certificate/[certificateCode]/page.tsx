import Link from "next/link";
import CertificatePrintButton from "@/components/CertificatePrintButton";
import { connectDB } from "@/lib/mongodb";
import { validateCertificateIntegrity } from "@/lib/certificates";
import Certificate from "@/models/Certificate";

async function loadCertificate(code: string) {
  await connectDB();
  const certificate = await Certificate.findOne({
    certificateCode: String(code || "").toUpperCase(),
  }).lean();
  if (!certificate || !validateCertificateIntegrity(certificate)) return null;
  return certificate as any;
}

export default async function CertificatePage({ params }: any) {
  const certificate = await loadCertificate(params.certificateCode);
  if (!certificate || certificate.status !== "ACTIVE") {
    return <main className="p-10">Certificate unavailable.</main>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#05080f] via-[#0d1a3a] to-[#05080f] p-6 text-white print:bg-white">
      <div className="mx-auto mb-4 flex max-w-5xl justify-end gap-3 print:hidden">
        <Link href={`/credential/${certificate.certificateCode}`} className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-4 py-2 font-bold text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)]">
          Credential
        </Link>
        <CertificatePrintButton certificateCode={certificate.certificateCode} />
      </div>

      <section className="mx-auto max-w-5xl bg-gradient-to-br from-white/[0.07] to-white/[0.03] border border-[#fbbf24]/20 rounded-3xl p-10 shadow-[0_32px_80px_rgba(4,14,46,0.7)] backdrop-blur-sm relative overflow-hidden print:shadow-none">
        <div className="border-4 border-slate-900 p-10 text-center">
          <p className="eyebrow">FinOps Training</p>
          <h1 className="mt-8 text-5xl font-black uppercase tracking-wide">Certificate of Completion</h1>
          <p className="mt-8 text-xl text-slate-600">This certifies that</p>
          <h2 className="mt-4 text-6xl font-black bg-gradient-to-r from-[#4d8bff] to-[#a78bfa] bg-clip-text text-transparent">{certificate.studentName}</h2>
          <p className="mt-8 text-xl text-slate-600">has successfully completed</p>
          <h3 className="mt-4 text-4xl font-black">{certificate.courseName}</h3>
          <p className="mt-8 text-lg">
            Completed on {new Date(certificate.completionDate).toLocaleDateString("en-IN")}
          </p>

          <div className="mt-10 flex items-end justify-between gap-8 text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Certificate ID</p>
              <p className="mt-1 font-black">{certificate.certificateCode}</p>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Verification URL</p>
              <p className="mt-1 text-sm">{certificate.verificationUrl}</p>
            </div>
            <img
              src={`/api/certificates/${certificate.certificateCode}/qr`}
              alt="Verification QR"
              className="h-36 w-36 border border-slate-200 bg-white p-2"
            />
            <div className="text-center">
              <div className="mb-2 h-px w-48 bg-slate-900" />
              <p className="font-black">Authorized Signature</p>
              <p className="text-sm text-slate-500">FinOps Training</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
