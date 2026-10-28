"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X, LogOut } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const adminGroups = [
  { title: "Workspace", links: [["Overview", "/admin-page"], ["Notifications", "/admin-page/notifications"]] },
  { title: "Learning", links: [["Courses", "/admin-page#courses"], ["Batches", "/admin-page/batches"], ["Tests", "/admin-page/tests"], ["Assignments", "/admin-page/assignments"], ["Meetings", "/admin-page/meetings"]] },
  { title: "Students & finance", links: [["Students", "/admin-page#enrolled-students"], ["Fees & approvals", "/admin-page/fees"], ["Certificates", "/admin-page/certificates"], ["Internships", "/admin-page/internship-applications"], ["Chats", "/admin-page/chats"], ["Inquiries", "/admin-page#inquiries"], ["Consultations", "/admin-page#consultancy-bookings"]] },
  { title: "Content", links: [["Website content", "/admin-page/website"], ["Learning library", "/admin-page/content"], ["Inventory", "/admin-page/content-inventory"], ["Content logs", "/admin-page/content-logs"], ["Blogs", "/admin-page/blogs"], ["WhatsApp", "/admin-page/whatsapp"]] },
  { title: "Team", links: [["People", "/admin-page/people"], ["Admin members", "/admin-page/admins"]] },
];
const studentGroups = [
  { title: "Your learning", links: [["Dashboard", "/student"], ["My learning", "/student/batches"], ["Schedule", "/student/meetings"], ["Progress & certificates", "/student/report"]] },
  { title: "Stay connected", links: [["Messages", "/student/chats"], ["Notifications", "/student/notifications"], ["Internship applications", "/student/internship-applications"]] },
];

function subscribeHash(update: () => void) { window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }
function subscribeUser(update: () => void) { window.addEventListener("storage", update); window.addEventListener("focus", update); return () => { window.removeEventListener("storage", update); window.removeEventListener("focus", update); }; }

export default function PortalShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  const storedUser = useSyncExternalStore(subscribeUser, () => localStorage.getItem("user") || "", () => "");
  let name = "";
  try { name = JSON.parse(storedUser || "{}").name || ""; } catch { /* Login handles invalid sessions. */ }
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLElement>("button, a")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
      if (event.key === "Tab") {
        const controls = sidebar.current?.querySelectorAll<HTMLElement>("a[href], button");
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", keydown); };
  }, [open]);
  const groups = admin ? adminGroups : studentGroups;
  const current = groups.flatMap(group => group.links).find(([, href]) => href === pathname + hash)?.[0]
    || groups.flatMap(group => group.links).find(([, href]) => href === pathname)?.[0] || (admin ? "Administration" : "Learning workspace");
  const close = () => { setOpen(false); menuButton.current?.focus(); };
  async function logout() {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user._id, sessionToken: localStorage.getItem("sessionToken"), deviceId: localStorage.getItem("deviceId") }) });
    } finally { localStorage.removeItem("user"); localStorage.removeItem("sessionToken"); window.location.href = "/login"; }
  }
  return (
    <div className={`portal-shell ${admin ? "portal-admin" : "portal-student"}`}>
      {open && <button tabIndex={-1} className="fixed inset-0 z-[70] bg-slate-950/50 lg:hidden" aria-label="Close navigation" onClick={close} />}
      <aside ref={sidebar} id="portal-navigation" className={`portal-sidebar ${open ? "is-open" : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label={admin ? "Admin navigation" : "Student navigation"}>
        <div className="flex items-center justify-between px-5 py-6">
          <Link href={admin ? "/admin-page" : "/student"} aria-label={admin ? "FinOps Trainings admin overview" : "FinOps Trainings student dashboard"} onClick={close} className="inline-flex flex-col items-center rounded-lg text-slate-950"><BrandLogo variant="sidebar" priority /><span className="mt-2 text-xs font-medium text-slate-500">{admin ? "Administration" : "Student workspace"}</span></Link>
          <button className="p-2 lg:hidden" onClick={close} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Workspace">
          {groups.map(group => <div key={group.title}><p className="mb-2 px-3 text-xs font-semibold text-slate-500">{group.title}</p><div className="space-y-1">{group.links.map(([label, href]) => {
            const active = href.includes("#") ? pathname + hash === href : pathname === href && !hash;
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} onClick={() => { close(); }} className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>{label}</Link>;
          })}</div></div>)}
        </nav>
        <div className="space-y-2 border-t border-slate-200 p-4">
          <Link href="/" className="flex items-center justify-between rounded-lg p-2 text-sm text-slate-600">Visit website <ArrowUpRight size={16} /></Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg p-2 text-sm text-slate-600 hover:bg-slate-100"><LogOut size={16} /> Sign out</button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-header">
          <div className="flex min-w-0 items-center gap-3"><button ref={menuButton} onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="portal-navigation" className="rounded-lg border border-slate-200 p-2 lg:hidden"><Menu size={20} /></button><span className="truncate text-sm font-semibold">{current}</span></div>
          <span className="truncate text-sm text-slate-500">{name || (admin ? "Admin workspace" : "Your learning workspace")}</span>
        </header>
        <div id="main-content" tabIndex={-1} className="portal-content">{children}</div>
      </div>
    </div>
  );
}
