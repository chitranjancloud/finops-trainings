"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Search, Star } from "lucide-react";

export default function AdminAssessmentsPage({
  type,
  title,
}: {
  type: "test" | "assignment";
  title: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const authParams = () => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return new URLSearchParams({
      userId: user?._id || "",
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    });
  };

  const load = async () => {
    const params = authParams();
    const res = await fetch(`/api/batch-submissions?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setItems(data.submissions || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items
      .filter((item) => item.resourceType === type)
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => {
        if (!needle) return true;
        return [item.batchName, item.courseName, item.resourceTitle, item.name, item.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
  }, [items, search, status, type]);

  const review = async (item: any, marksAwarded: string, remarks: string) => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const res = await fetch(`/api/batch-submissions/${item._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
        marksAwarded,
        remarks,
      }),
    });
    const data = await res.json();
    if (data.success) load();
    else alert(data.message || "Unable to save");
  };

  const download = () => {
    const params = authParams();
    params.set("format", "excel");
    window.location.href = `/api/batch-submissions?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin-page/batches" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-950">
          <ArrowLeft size={18} />
          Back to Batches
        </Link>
        <div className="mt-8 rounded-[32px] bg-gray-950 p-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200">Assessment Review</p>
          <h1 className="mt-3 text-5xl font-black">{title}</h1>
          <p className="mt-3 text-slate-300">Sort, review, mark, comment, and export records.</p>
        </div>

        <div className="my-6 grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4">
            <Search size={18} className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch, course, student" className="w-full outline-none" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-5 py-4 outline-none">
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="checked">Checked</option>
          </select>
          <button onClick={download} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-black text-white">
            <Download size={18} />
            Excel
          </button>
        </div>

        <div className="grid gap-4">
          {filtered.length > 0 ? (
            filtered.map((item) => <AssessmentRow key={item._id} item={item} onReview={review} />)
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
              No records found.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function AssessmentRow({ item, onReview }: { item: any; onReview: (item: any, marks: string, remarks: string) => void }) {
  const [marks, setMarks] = useState(String(item.marksAwarded || ""));
  const [remarks, setRemarks] = useState(item.remarks || "");

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">{item.batchName}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-700">{item.status}</span>
            {item.autoSubmitted && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Auto submitted</span>}
          </div>
          <h2 className="mt-3 text-2xl font-black text-gray-950">{item.resourceTitle}</h2>
          <p className="mt-1 text-sm text-gray-500">{item.courseName || "Course"} • {item.name} • {item.email} • {new Date(item.createdAt).toLocaleString("en-IN")}</p>
          <p className="mt-4 whitespace-pre-wrap text-gray-700">{item.answerText || "No written answer"}</p>
          {item.fileUrl && <a href={item.fileUrl} target="_blank" className="mt-4 inline-flex font-bold text-blue-700">Open submitted file</a>}
        </div>
        <div className="rounded-2xl bg-gray-50 p-4">
          <label className="text-xs font-black uppercase tracking-widest text-gray-400">Marks</label>
          <input
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            type="number"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <label className="mt-4 block text-xs font-black uppercase tracking-widest text-gray-400">Comment / Correction</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={4}
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-950 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button onClick={() => onReview(item, marks, remarks)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 font-black text-white">
            <Star size={17} />
            Save Result
          </button>
        </div>
      </div>
    </section>
  );
}
