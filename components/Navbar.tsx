"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const links = [["Courses", "/#top-courses"], ["Corporate training", "/learning/customized-training"], ["About", "/about"], ["Contact", "/contact"]];
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ role?: string } | null>(null);
  useEffect(() => {
    const update = () => { try { setUser(JSON.parse(localStorage.getItem("user") || "null")); } catch { setUser(null); } };
    update(); window.addEventListener("storage", update); window.addEventListener("focus", update);
    return () => { window.removeEventListener("storage", update); window.removeEventListener("focus", update); };
  }, [pathname]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if(event.key === "Escape") setOpen(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const accountHref = user ? user.role === "admin" ? "/admin-page" : "/student" : "/login";
  return <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 text-slate-900 backdrop-blur-lg">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
      <Link href="/" aria-label="FinOps Trainings home" onClick={() => setOpen(false)} className="inline-flex shrink-0 rounded-lg"><BrandLogo priority /></Link>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">{links.map(([label,href]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${pathname === href ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}>{label}</Link>)}</nav>
      <div className="flex items-center gap-3"><Link href={accountHref} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">{user ? "My workspace" : "Sign in"}<ArrowRight size={15} className="hidden sm:block" /></Link><button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Close navigation" : "Open navigation"} className="rounded-lg border border-slate-200 p-2.5 lg:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button></div>
    </div>
    {open && <nav id="public-navigation" aria-label="Mobile navigation" className="border-t border-slate-200 px-6 py-3 lg:hidden">{links.map(([label,href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">{label}</Link>)}</nav>}
  </header>;
}
