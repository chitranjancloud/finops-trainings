"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, CheckCircle2 } from "lucide-react";

export default function NotificationsPage({
  backHref,
  title,
}: {
  backHref: string;
  title: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);

  const params = () => {
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    return {
      user,
      search: new URLSearchParams({
        userId: user?._id || "",
        sessionToken: localStorage.getItem("sessionToken") || "",
        deviceId: localStorage.getItem("deviceId") || "",
      }),
    };
  };

  const load = async () => {
    const { search } = params();
    const res = await fetch(`/api/notifications?${search.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setItems(data.notifications || []);
      setUnread(data.unread || 0);
    }
  };

  const markAll = async () => {
    const { user } = params();
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
      }),
    });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] p-8">
      <div className="mx-auto max-w-6xl">
        <Link href={backHref} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-950">
          <ArrowLeft size={18} />
          Back
        </Link>
        <div className="mt-8 rounded-[32px] bg-gray-950 p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200">Live activity</p>
              <h1 className="mt-3 text-5xl font-black">{title}</h1>
            </div>
            <button onClick={markAll} className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-black text-white">
              <CheckCircle2 size={18} />
              Mark all read ({unread})
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {items.length > 0 ? (
            items.map((item) => (
              <Link
                href={item.link || backHref}
                key={item._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Bell size={20} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-gray-950">{item.title}</h2>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black uppercase tracking-widest text-gray-500">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-gray-600">{item.message}</p>
                    <p className="mt-3 text-xs font-semibold text-gray-400">
                      {new Date(item.createdAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
              No notifications yet.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
