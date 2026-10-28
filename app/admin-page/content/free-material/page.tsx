import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";

export default function FreeMaterialPage() {
  return <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900"><div className="mx-auto max-w-4xl"><FileText size={28} className="text-blue-600" /><h1 className="mt-4 text-3xl font-bold">Manage learning materials</h1><p className="mt-4 max-w-2xl leading-7 text-slate-600">Use the content inventory to review your files, or open a batch to add and organize the materials your students can access.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/admin-page/content-inventory" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white">View content inventory <ArrowRight size={17} /></Link><Link href="/admin-page/batches" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold">Manage batch materials</Link></div></div></main>;
}
