"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, RefreshCw, Search, Shield, Film, FileText, Package, ExternalLink } from "lucide-react";

const TYPE_ICON: Record<string, any> = {
  video: Film,
  pdf: FileText,
  material: Package,
  sharepoint: ExternalLink,
};

const ACTION_COLOR: Record<string, string> = {
  play: "bg-blue-100 text-blue-700",
  view: "bg-rose-100 text-rose-700",
  open: "bg-purple-100 text-purple-700",
};

export default function ContentLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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
    setLoading(true);
    try {
      const params = authParams();
      params.set("limit", "500");
      const res = await fetch(`/api/content-access-logs?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setLogs(data.logs || []);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href = "/login"; return; }
    const user = JSON.parse(stored);
    if (user.role !== "admin") { window.location.href = "/"; return; }
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = search.toLowerCase();
    return logs
      .filter((l) => typeFilter === "all" || l.materialType === typeFilter)
      .filter((l) =>
        !needle ||
        [l.name, l.email, l.batchName, l.materialName].join(" ").toLowerCase().includes(needle)
      );
  }, [logs, search, typeFilter]);

  const downloadExcel = () => {
    const params = authParams();
    params.set("format", "excel");
    window.location.href = `/api/content-access-logs?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin-page" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-950 mb-8">
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>

        <div className="rounded-[32px] bg-gray-950 p-8 text-white mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
              <Shield size={20} className="text-emerald-300" />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200">Content Security</p>
          </div>
          <h1 className="text-4xl font-black">Content Access Logs</h1>
          <p className="mt-2 text-slate-400 text-sm">Audit log of all content views by students. Auto-deleted after 90 days.</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="bg-white/10 rounded-xl px-4 py-2">Total Accesses: <strong>{logs.length}</strong></span>
            <span className="bg-white/10 rounded-xl px-4 py-2">
              Videos: <strong>{logs.filter((l) => l.materialType === "video").length}</strong>
            </span>
            <span className="bg-white/10 rounded-xl px-4 py-2">
              PDFs: <strong>{logs.filter((l) => l.materialType === "pdf").length}</strong>
            </span>
            <span className="bg-white/10 rounded-xl px-4 py-2">
              Materials: <strong>{logs.filter((l) => l.materialType === "material" || l.materialType === "sharepoint").length}</strong>
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 flex-1 min-w-0">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, email, batch, content..."
              className="w-full outline-none text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm outline-none"
          >
            <option value="all">All Types</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="material">Material</option>
            <option value="sharepoint">SharePoint</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-2xl bg-white border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            onClick={downloadExcel}
            className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white"
          >
            <Download size={15} /> Export Excel
          </button>
        </div>

        {/* Table */}
        <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading logs...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No access logs found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Student", "Batch", "Content", "Type", "Action", "IP", "Accessed At"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => {
                    const TypeIcon = TYPE_ICON[log.materialType] || Package;
                    return (
                      <tr key={log._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-900">{log.name}</p>
                          <p className="text-xs text-gray-400">{log.email}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{log.batchName}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <TypeIcon size={13} className="text-gray-400 shrink-0" />
                            <span className="text-gray-700 truncate max-w-[180px]">{log.materialName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="capitalize text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {log.materialType}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${ACTION_COLOR[log.action] || "bg-gray-100 text-gray-600"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400 font-mono">{log.ipAddress}</td>
                        <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {new Date(log.accessedAt).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Showing {filtered.length} of {logs.length} records · Logs auto-expire after 90 days
        </p>
      </div>
    </main>
  );
}
