import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function CorporateStaticPage({
  title,
  eyebrow,
  description,
  points,
}: {
  title: string;
  eyebrow: string;
  description: string;
  points: string[];
}) {
  return (
    <section className="min-h-screen bg-slate-50 px-6 py-28 text-slate-950">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-700">
          {eyebrow}
        </p>
        <h1 className="mt-5 text-5xl font-black tracking-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          {description}
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {points.map((point) => (
            <div
              key={point}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <CheckCircle2 className="mt-1 shrink-0 text-emerald-500" />
              <p className="text-sm leading-7 text-slate-700">{point}</p>
            </div>
          ))}
        </div>

        <Link
          href="/contact"
          className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-[#2563eb]"
        >
          Contact Team <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
