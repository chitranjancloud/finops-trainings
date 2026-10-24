"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminContentInventoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin-page/batches");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
      <div className="max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Content Moved
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Batch Content Inventory</h1>
        <p className="mt-3 text-sm text-slate-600">
          Learning content is now managed inside each batch under the Content tab.
        </p>
        <Link
          href="/admin-page/batches"
          className="mt-6 inline-flex rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to Batches
        </Link>
      </div>
    </main>
  );
}
