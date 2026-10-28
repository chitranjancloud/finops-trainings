"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function notify(message: string) {
  window.dispatchEvent(new CustomEvent("finops-feedback", { detail: message }));
}

export default function Feedback() {
  const [messages, setMessages] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    let id = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const receive = (event: Event) => {
      const text = String((event as CustomEvent).detail || "");
      const messageId = ++id;
      setMessages(current => [...current.slice(-2), { id: messageId, text }]);
      const timer = setTimeout(() => { setMessages(current => current.filter(message => message.id !== messageId)); timers.delete(timer); }, 9000);
      timers.add(timer);
    };
    window.addEventListener("finops-feedback", receive);
    return () => { window.removeEventListener("finops-feedback", receive); timers.forEach(clearTimeout); };
  }, []);
  return <div className="fixed bottom-5 left-1/2 z-[10000] flex w-[min(92vw,460px)] -translate-x-1/2 flex-col gap-2" aria-live="polite" aria-atomic="false">{messages.map(message => <div key={message.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-900 shadow-lg"><span>{message.text}</span><button aria-label="Dismiss message" onClick={() => setMessages(current => current.filter(item => item.id !== message.id))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><X size={16} /></button></div>)}</div>;
}
