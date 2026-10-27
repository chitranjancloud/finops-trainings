"use client";

import { usePathname } from "next/navigation";
import { MessageCircle, PhoneCall, X } from "lucide-react";
import { useState } from "react";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "918484805777";

function getPageMessage(pathname: string) {
  if (pathname.startsWith("/courses/")) {
    return "Hi FinOps Trainings, I want to inquire about this course.";
  }
  if (pathname.startsWith("/learning/")) {
    return "Hi FinOps Trainings, I want to know more about your learning programs.";
  }
  return "Hi FinOps Trainings, I want to inquire about your courses and training programs.";
}

export default function WhatsAppButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/admin-page") || pathname === "/student/batches") return null;

  const message = getPageMessage(pathname);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  const logAndOpen = async (source: string) => {
    fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: pathname,
        message,
        source,
      }),
      keepalive: true,
    }).catch(() => {});

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="w-[310px] overflow-hidden rounded-3xl border border-emerald-200/60 bg-white shadow-2xl shadow-emerald-950/20">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">WhatsApp Support</p>
                  <h3 className="mt-1 text-xl font-black">Talk to FinOps</h3>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-xl bg-white/15 p-2 transition hover:bg-white/25" aria-label="Close WhatsApp panel">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                Ask about courses, fees, corporate training, batches, certificates, or one-on-one guidance.
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <PhoneCall size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Inquiry</p>
                  <p className="font-black text-slate-950">Chat with admin on WhatsApp</p>
                </div>
              </div>

              <button
                onClick={() => logAndOpen("panel_cta")}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
              >
                <MessageCircle size={18} /> Start WhatsApp Chat
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => {
            if (open) {
              logAndOpen("floating_button");
            } else {
              setOpen(true);
            }
          }}
          className="group flex h-16 items-center gap-3 rounded-full border border-white/30 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-white shadow-2xl shadow-emerald-600/30 transition hover:-translate-y-1 hover:shadow-emerald-600/40"
          aria-label="Open WhatsApp inquiry"
        >
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
            <MessageCircle size={23} />
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-emerald-500 bg-white" />
          </span>
          <span className="hidden pr-1 text-left sm:block">
            <span className="block text-xs font-bold leading-3 text-emerald-50">Need help?</span>
            <span className="block text-sm font-black">WhatsApp Us</span>
          </span>
        </button>
      </div>
    </>
  );
}
