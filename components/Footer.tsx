"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter, FaYoutube } from "react-icons/fa";
import { ArrowRight, BadgeCheck, Mail, MapPin, Phone } from "lucide-react";

const groups = [
  { title: "Company", links: [["About", "/about"],["Contact", "/contact"],["Partners", "/partners"],["Testimonials", "/#testimonials"],["Awards", "/#awards"]] },
  { title: "Learning", links: [["Live Online", "/learning/live-online-training"],["Classroom Training", "/learning/classroom-training"],["1-on-1 Training", "/learning/one-on-one-training"],["Corporate Training", "/learning/customized-training"],["Upcoming Webinars", "/learning/upcoming-webinars"]] },
  { title: "Technologies", links: [["Microsoft Azure", "/technologies/azure"],["Security", "/technologies/security"],["Artificial Intelligence", "/technologies/artificial-intelligence"],["Microsoft 365", "/technologies/microsoft-365"],["Power Platform", "/technologies/power-platform"]] },
  { title: "Policies", links: [["Privacy Policy", "/privacy-policy"],["Terms & Conditions", "/terms-and-conditions"],["Refund Policy", "/refund-policy"],["Careers", "/careers"],["Case Studies", "/case-studies"]] },
];

const socialIcons = [
  { Icon: FaYoutube, hover: "hover:bg-[#ff0000]/20 hover:text-[#ff0000] hover:border-[#ff0000]/40" },
  { Icon: FaFacebookF, hover: "hover:bg-[#1877f2]/20 hover:text-[#1877f2] hover:border-[#1877f2]/40" },
  { Icon: FaInstagram, hover: "hover:bg-[#f09433]/20 hover:text-[#f09433] hover:border-[#f09433]/40" },
  { Icon: FaLinkedinIn, hover: "hover:bg-[#0077b5]/20 hover:text-[#0077b5] hover:border-[#0077b5]/40" },
  { Icon: FaTwitter, hover: "hover:bg-white/10 hover:text-white hover:border-white/20" },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin-page")) return null;

  return (
    <footer className="bg-[#05080f] text-white">
      {/* Electric top divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#2563eb]/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* TOP ROW */}
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] shadow-[0_4px_20px_rgba(37,99,235,0.4)]">
                <BadgeCheck size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">FinOps Trainings</h2>
                <p className="eyebrow">Premium Technology Learning</p>
              </div>
            </div>
            <p className="max-w-lg text-sm leading-7 text-slate-400">
              Instructor-led cloud, AI, security, Microsoft, AWS, Cisco, ISO, and corporate training programs built for measurable career and business outcomes.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-5">
            <p className="mb-3 text-sm font-bold text-white">Stay updated</p>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                type="email"
                placeholder="Your work email"
                className="min-w-0 flex-1 rounded-xl border border-white/[0.10] bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#4d8bff] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)] transition-all"
              />
              <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#7c3aed] px-5 py-3 text-sm font-bold text-white hover:shadow-[0_6px_24px_rgba(37,99,235,0.5)] transition-all whitespace-nowrap">
                Subscribe <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* LINK GROUPS */}
        <div className="grid gap-8 border-y border-white/[0.06] py-12 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-white">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-slate-500 hover:text-[#93b4ff] hover:translate-x-1 inline-block transition-all duration-150">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BOTTOM */}
        <div className="grid gap-8 pt-10 lg:grid-cols-[1fr_1fr_0.8fr]">
          <div className="space-y-3 text-sm text-slate-500">
            <p className="flex items-center gap-3">
              <MapPin size={16} className="text-[#4d8bff] flex-shrink-0" />
              Corporate training offices across India and global remote delivery
            </p>
            <p className="flex items-center gap-3">
              <Mail size={16} className="text-[#4d8bff] flex-shrink-0" />
              finops668@gmail.com
            </p>
            <p className="flex items-center gap-3">
              <Phone size={16} className="text-[#4d8bff] flex-shrink-0" />
              WhatsApp and consultation support available
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Microsoft Partner", "AWS Ready", "ISO Programs", "PECB", "Cisco", "LinkedIn Reviews"].map((item) => (
              <span key={item} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-400">
                {item}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-2.5 lg:justify-end">
            {socialIcons.map(({ Icon, hover }, i) => (
              <button
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500 transition-all hover:-translate-y-1 ${hover}`}
              >
                <Icon />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-white/[0.05] pt-6 mt-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <p>Copyright 1997–2026 FinOps Trainings. All rights reserved.</p>
          <p>Built for secure, scalable, and outcome-driven learning.</p>
        </div>
      </div>
    </footer>
  );
}
