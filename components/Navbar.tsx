"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Briefcase,
  ChevronDown,
  ClipboardList,
  FileText,
  LogOut,
  Menu,
  MessageCircle,
  Video,
  X,
} from "lucide-react";

const aboutItems = ["About Us", "Internship Programs"];

const learningItems = [
  "Live Online Training",
  "Classroom Training",
  "1-on-1 Training",
  "Upcoming Webinars",
  "Finops",
];

const adminNavItems = [
  { label: "Courses", href: "/admin-page#courses" },
  { label: "Batches", href: "/admin-page/batches" },
  { label: "Blogs", href: "/admin-page/blogs" },
  { label: "WhatsApp", href: "/admin-page/whatsapp" },
  { label: "Fees", href: "/admin-page/fees" },
  { label: "Students", href: "/admin-page#enrolled-students" },
  { label: "Internships", href: "/admin-page/internship-applications" },
  { label: "Meetings", href: "/admin-page/meetings" },
  { label: "Tests", href: "/admin-page/tests" },
  { label: "Partners", href: "/admin-page#partners" },
  { label: "Certs", href: "/admin-page/certificates" },
  { label: "People", href: "/admin-page/people" },
];

function getAboutHref(item: string) {
  return item === "Internship Programs" ? "/internship-program" : "/about";
}

function getLearningHref(item: string) {
  return `/learning/${item
    .toLowerCase()
    .replace(/ /g, "-")
    .replace("1-on-1", "one-on-one")}`;
}

export default function Navbar() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [learningOpen, setLearningOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileLearningOpen, setMobileLearningOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [badgeCounts, setBadgeCounts] = useState({
    notifications: 0,
    chat: 0,
    meetings: 0,
    batches: 0,
  });

  const pathname = usePathname();
  const aboutRef = useRef<HTMLDivElement>(null);
  const learningRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    checkUser();
    window.addEventListener("storage", checkUser);
    window.addEventListener("focus", checkUser);

    return () => {
      window.removeEventListener("storage", checkUser);
      window.removeEventListener("focus", checkUser);
    };
  }, [pathname]);

  useEffect(() => {
    const loadBadges = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";

      if (!storedUser || !sessionToken || !deviceId) {
        setBadgeCounts({ notifications: 0, chat: 0, meetings: 0, batches: 0 });
        return;
      }

      try {
        const parsed = JSON.parse(storedUser);
        const params = new URLSearchParams({
          userId: parsed._id,
          sessionToken,
          deviceId,
        });

        const res = await fetch(`/api/nav-badges?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (data.success) {
          setBadgeCounts(
            data.counts || { notifications: 0, chat: 0, meetings: 0, batches: 0 }
          );
        }
      } catch {}
    };

    loadBadges();

    const interval = window.setInterval(loadBadges, 15000);
    window.addEventListener("focus", loadBadges);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", loadBadges);
    };
  }, [pathname, user?._id]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (aboutRef.current && !aboutRef.current.contains(event.target as Node)) {
        setAboutOpen(false);
      }

      if (learningRef.current && !learningRef.current.contains(event.target as Node)) {
        setLearningOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 16);

    window.addEventListener("scroll", handler, { passive: true });

    return () => window.removeEventListener("scroll", handler);
  }, []);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileAboutOpen(false);
    setMobileLearningOpen(false);
  };

  const handleLogout = async () => {
    const storedUser = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);

        await fetch("/api/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: parsed._id,
            sessionToken,
            deviceId,
          }),
        });
      } catch {}
    }

    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
    setUser(null);
    window.location.reload();
  };

  if (pathname.startsWith("/admin-page")) return null;

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#05080f]/90 shadow-[0_4px_32px_rgba(4,14,46,0.5)] py-2.5 border-b border-white/[0.07]"
          : "bg-[#05080f]/70 py-4 border-b border-white/[0.04]"
      } backdrop-blur-2xl`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <Link
          href={user?.role === "admin" ? "/admin-page" : "/"}
          className="text-xl font-black tracking-tight flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          <span className="bg-gradient-to-r from-[#4d8bff] to-[#a78bfa] bg-clip-text text-transparent">
            FinOps
          </span>
          <span className="text-white"> Trainings</span>
        </Link>

        {user?.role === "admin" && (
          <div className="hidden md:flex items-center gap-1 text-sm font-semibold overflow-x-auto scrollbar-hide">
            {adminNavItems.map((item) => {
              const base = item.href.split("#")[0];
              const active =
                pathname === base ||
                (base !== "/admin-page" && pathname.startsWith(base));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 whitespace-nowrap transition-all duration-150 ${
                    active
                      ? "bg-[#2563eb]/20 text-[#93b4ff] font-bold border border-[#2563eb]/25"
                      : "text-slate-400 hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {user?.role !== "admin" && (
          <div className="hidden lg:flex items-center gap-1 text-sm font-semibold">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              Home
            </Link>

            <Link
              href="/#top-courses"
              className="rounded-lg px-3 py-2 text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
            >
              Courses
            </Link>

            <div
              className="relative"
              ref={aboutRef}
              onMouseEnter={() => {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setAboutOpen(true);
              }}
              onMouseLeave={() => {
                timeoutRef.current = setTimeout(() => setAboutOpen(false), 200);
              }}
            >
              <button
                className={`flex items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                  aboutOpen
                    ? "bg-white/[0.07] text-white"
                    : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                About
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${
                    aboutOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {aboutOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 rounded-2xl border border-white/[0.08] bg-[#080c17]/95 backdrop-blur-2xl p-2 shadow-[0_16px_64px_rgba(4,14,46,0.6)] animate-scaleIn">
                  {aboutItems.map((item) => (
                    <Link
                      key={item}
                      href={getAboutHref(item)}
                      className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-[#2563eb]/15 hover:text-[#93b4ff] transition-colors text-sm"
                      onClick={() => setAboutOpen(false)}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={learningRef}>
              <button
                onClick={() => setLearningOpen(!learningOpen)}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                  learningOpen
                    ? "bg-white/[0.07] text-white"
                    : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                Learning
                <ChevronDown
                  size={15}
                  className={`transition-transform duration-200 ${
                    learningOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {learningOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl border border-white/[0.08] bg-[#080c17]/95 backdrop-blur-2xl p-2 shadow-[0_16px_64px_rgba(4,14,46,0.6)] animate-scaleIn max-h-80 overflow-y-auto scrollbar-hide">
                  {learningItems.map((item) => (
                    <Link
                      key={item}
                      href={getLearningHref(item)}
                      className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-[#2563eb]/15 hover:text-[#93b4ff] transition-colors text-sm"
                      onClick={() => setLearningOpen(false)}
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/contact"
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname === "/contact"
                  ? "bg-[#2563eb]/15 text-[#93b4ff] font-bold border border-[#2563eb]/25"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Contact
            </Link>

            <Link
              href="/blog"
              className={`rounded-lg px-3 py-2 transition-colors ${
                pathname === "/blog"
                  ? "bg-[#2563eb]/15 text-[#93b4ff] font-bold border border-[#2563eb]/25"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              Blog
            </Link>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {!user && (
            <Link
              href="/contact"
              className="hidden xl:inline-flex btn btn-ghost btn-sm border-white/20 text-slate-300 hover:border-[#4d8bff] hover:text-[#4d8bff] hover:bg-[#2563eb]/10"
            >
              Book Consultation
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-1.5">
              <NavIconBtn
                href={user.role === "admin" ? "/admin-page/chats" : "/student/chats"}
                title="Chat"
                badge={badgeCounts.chat}
                color="blue"
              >
                <MessageCircle size={19} />
              </NavIconBtn>

              {user.role !== "admin" && (
                <>
                  <NavIconBtn
                    href="/student/notifications"
                    title="Notifications"
                    badge={badgeCounts.notifications}
                    color="amber"
                  >
                    <Bell size={19} />
                  </NavIconBtn>

                  <NavIconBtn href="/student/report" title="Report" color="purple">
                    <ClipboardList size={19} />
                  </NavIconBtn>

                  <NavIconBtn
                    href="/student/internship-applications"
                    title="Internship Applications"
                    color="green"
                  >
                    <FileText size={19} />
                  </NavIconBtn>

                  <NavIconBtn
                    href="/student/meetings"
                    title="Meetings"
                    badge={badgeCounts.meetings}
                    color="green"
                  >
                    <Video size={19} />
                  </NavIconBtn>

                  <NavIconBtn
                    href="/student/batches"
                    title="Batches"
                    badge={badgeCounts.batches}
                    color="blue"
                  >
                    <Briefcase size={19} />
                  </NavIconBtn>
                </>
              )}

              <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-slate-300 text-sm font-semibold">
                <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                {user.name || user.email.split("@")[0]}
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-rose-400 hover:bg-rose-500/20 hover:border-rose-400 transition-all text-sm font-bold"
              >
                <LogOut size={15} />
                <span className="hidden xl:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white text-sm font-bold px-5 py-2.5 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_6px_30px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 transition-all"
            >
              Login
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 rounded-xl hover:bg-white/[0.08] transition-colors text-slate-300"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#05080f]/98 backdrop-blur-2xl">
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto px-6 py-5 space-y-1">
            {user?.role === "admin" ? (
              adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:bg-[#2563eb]/15 hover:text-[#93b4ff] font-semibold transition-colors"
                  onClick={closeMobile}
                >
                  {item.label}
                </Link>
              ))
            ) : (
              <>
                <Link
                  href="/"
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                  onClick={closeMobile}
                >
                  Home
                </Link>

                <Link
                  href="/#top-courses"
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                  onClick={closeMobile}
                >
                  Courses
                </Link>

                <button
                  type="button"
                  onClick={() => setMobileAboutOpen(!mobileAboutOpen)}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                >
                  About
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${mobileAboutOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {mobileAboutOpen && (
                  <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
                    {aboutItems.map((item) => (
                      <Link
                        key={item}
                        href={getAboutHref(item)}
                        className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-[#2563eb]/15 hover:text-[#93b4ff]"
                        onClick={closeMobile}
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setMobileLearningOpen(!mobileLearningOpen)}
                  className="flex w-full items-center justify-between px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                >
                  Learning
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${mobileLearningOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {mobileLearningOpen && (
                  <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
                    {learningItems.map((item) => (
                      <Link
                        key={item}
                        href={getLearningHref(item)}
                        className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:bg-[#2563eb]/15 hover:text-[#93b4ff]"
                        onClick={closeMobile}
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href="/contact"
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                  onClick={closeMobile}
                >
                  Contact
                </Link>

                <Link
                  href="/blog"
                  className="block px-4 py-3 rounded-xl text-slate-300 hover:bg-white/[0.07] font-semibold transition-colors"
                  onClick={closeMobile}
                >
                  Blog
                </Link>
              </>
            )}

            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              {user ? (
                <>
                  <MobileNavLink
                    href={user.role === "admin" ? "/admin-page/chats" : "/student/chats"}
                    badge={badgeCounts.chat}
                    onClick={closeMobile}
                  >
                    Chat Groups
                  </MobileNavLink>

                  {user.role !== "admin" && (
                    <>
                      <MobileNavLink
                        href="/student/notifications"
                        badge={badgeCounts.notifications}
                        onClick={closeMobile}
                      >
                        Notifications
                      </MobileNavLink>

                      <MobileNavLink href="/student/report" onClick={closeMobile}>
                        User Report
                      </MobileNavLink>

                      <MobileNavLink
                        href="/student/internship-applications"
                        onClick={closeMobile}
                      >
                        Internship Applications
                      </MobileNavLink>

                      <MobileNavLink
                        href="/student/meetings"
                        badge={badgeCounts.meetings}
                        onClick={closeMobile}
                      >
                        Team Meetings
                      </MobileNavLink>

                      <MobileNavLink
                        href="/student/batches"
                        badge={badgeCounts.batches}
                        onClick={closeMobile}
                      >
                        Batch Content
                      </MobileNavLink>
                    </>
                  )}

                  <div className="px-4 py-3 text-slate-400 font-medium text-sm">
                    {user.name || user.email}
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full py-3 border border-rose-500/40 bg-rose-500/10 text-rose-400 rounded-xl font-bold text-sm hover:bg-rose-500/20 transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block w-full py-3 bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white text-center rounded-xl font-bold hover:shadow-[0_6px_24px_rgba(37,99,235,0.5)] transition-all"
                  onClick={closeMobile}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavIconBtn({
  href,
  title,
  badge,
  color = "blue",
  children,
}: {
  href: string;
  title: string;
  badge?: number;
  color?: string;
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-[#4d8bff] hover:border-[#4d8bff]/50",
    amber: "text-amber-400 hover:border-amber-400/50",
    purple: "text-violet-400 hover:border-violet-400/50",
    green: "text-emerald-400 hover:border-emerald-400/50",
  };

  return (
    <Link href={href}>
      <button
        title={title}
        className={`relative h-9 w-9 rounded-xl bg-white/[0.06] border border-white/[0.1] transition-all hover:bg-white/[0.10] hover:shadow-md flex items-center justify-center ${
          colorMap[color] || colorMap.blue
        }`}
      >
        {children}

        {!!badge && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 px-1 text-center text-[10px] font-black leading-[18px] text-white shadow-sm">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </button>
    </Link>
  );
}

function MobileNavLink({
  href,
  badge,
  onClick,
  children,
}: {
  href: string;
  badge?: number;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between w-full px-4 py-3 bg-white/[0.05] border border-white/[0.07] rounded-xl text-slate-300 font-semibold text-sm hover:bg-[#2563eb]/15 hover:text-[#93b4ff] transition-colors"
      onClick={onClick}
    >
      {children}

      {!!badge && (
        <span className="min-w-[20px] h-5 rounded-full bg-red-500 px-1.5 text-center text-[10px] font-black leading-5 text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}