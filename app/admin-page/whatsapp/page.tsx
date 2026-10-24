"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  CreditCard,
  FileText,
  MessageCircle,
  PhoneCall,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type WhatsAppItem = {
  _id: string;
  page: string;
  message: string;
  source: string;
  status: "new" | "contacted" | "converted" | "closed";
  createdAt: string;
  userAgent?: string;
  ip?: string;
};

const statuses = ["new", "contacted", "converted", "closed"] as const;
const whatsAppUrl = `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918484805777"}`;

function SidebarLink({ href, icon, text, active = false, badge }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium transition ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function authPayload() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    userId: user._id || "",
    sessionToken: localStorage.getItem("sessionToken") || "",
    deviceId: localStorage.getItem("deviceId") || "",
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminWhatsAppPage() {
  const [items, setItems] = useState<WhatsAppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadItems = async () => {
    const params = new URLSearchParams(authPayload());
    const res = await fetch(`/api/whatsapp?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setItems(data.interactions || []);
    setLoading(false);
  };

  useEffect(() => {
    loadItems().catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((item) => item.status === filter)),
    [items, filter]
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      new: items.filter((item) => item.status === "new").length,
      converted: items.filter((item) => item.status === "converted").length,
    }),
    [items]
  );

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch("/api/whatsapp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, ...authPayload() }),
    });
    const data = await res.json();
    if (data.success) loadItems();
    else alert(data.message || "Status update failed");
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">
      <aside className="fixed h-screen w-[250px] overflow-y-auto border-r border-gray-200 bg-white">
        <div className="px-8 py-10">
          <h1 className="text-4xl font-bold text-blue-500">FinOps</h1>
        </div>

        <div className="px-4 space-y-2">
          <SidebarLink href="/admin-page" icon={<BookOpen size={22} />} text="Courses" />
          <SidebarLink href="/admin-page/batches" icon={<Briefcase size={22} />} text="Batches" />
          <SidebarLink href="/admin-page/blogs" icon={<FileText size={22} />} text="Blogs" />
          <SidebarLink href="/admin-page/whatsapp" icon={<MessageCircle size={22} />} text="WhatsApp" active />
          <SidebarLink href="/admin-page/fees" icon={<CreditCard size={22} />} text="Fees" />
          <SidebarLink href="/admin-page/notifications" icon={<Bell size={22} />} text="Notifications" badge={<AdminNotificationBadge />} />
          <SidebarLink href="/admin-page/tests" icon={<FileText size={22} />} text="Tests" />
          <SidebarLink href="/admin-page/assignments" icon={<FileText size={22} />} text="Assignments" />
          <SidebarLink href="/admin-page/chats" icon={<MessageCircle size={22} />} text="Chats" />
          <SidebarLink href="/admin-page/people" icon={<Users size={22} />} text="People" />
        </div>
      </aside>

      <main className="ml-[250px] min-h-screen flex-1 p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">Customer Messaging</p>
            <h1 className="text-4xl font-black text-gray-950">WhatsApp Inquiries</h1>
            <p className="mt-2 text-gray-500">
              Track WhatsApp clicks, source pages, inquiry intent, and follow-up status.
            </p>
          </div>
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600"
          >
            <PhoneCall size={17} /> Open Business WhatsApp
          </a>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Stat label="Total Clicks" value={stats.total} />
          <Stat label="New Leads" value={stats.new} />
          <Stat label="Converted" value={stats.converted} />
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto">
          {["all", ...statuses].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${
                filter === status ? "bg-gray-950 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="py-12 text-center text-gray-500">Loading WhatsApp inquiries...</p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="py-3">Time</th>
                    <th className="py-3">Page</th>
                    <th className="py-3">Intent</th>
                    <th className="py-3">Source</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item._id} className="border-b border-gray-100 text-gray-800">
                      <td className="py-4 font-semibold">{formatDate(item.createdAt)}</td>
                      <td className="py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{item.page || "/"}</span>
                      </td>
                      <td className="max-w-[340px] py-4 text-gray-600">{item.message || "General inquiry"}</td>
                      <td className="py-4 text-gray-500">{item.source}</td>
                      <td className="py-4">
                        <select
                          value={item.status}
                          onChange={(e) => updateStatus(item._id, e.target.value)}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold capitalize outline-none"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4">
                        <a
                          href={`${whatsAppUrl}?text=${encodeURIComponent("Hi FinOps, following up on a website WhatsApp inquiry.")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                        >
                          <MessageCircle size={14} /> Reply
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-16 text-center">
              <MessageCircle size={42} className="mx-auto mb-4 text-gray-300" />
              <p className="font-black text-gray-950">No WhatsApp inquiries yet</p>
              <p className="mt-1 text-sm text-gray-500">Website clicks will appear here automatically.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-3xl font-black text-gray-950">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  );
}
