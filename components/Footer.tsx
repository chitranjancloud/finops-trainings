import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import { ArrowRight, Mail } from "lucide-react";

const groups = [
  { title: "Explore", links: [["Courses", "/#top-courses"], ["Corporate training", "/learning/customized-training"], ["Upcoming webinars", "/learning/upcoming-webinars"], ["Learning community", "/recognition"]] },
  { title: "Learning formats", links: [["Live online", "/learning/live-online-training"], ["Classroom training", "/learning/classroom-training"], ["One-to-one training", "/learning/one-on-one-training"], ["Internship programs", "/internship-program"]] },
  { title: "Company", links: [["About us", "/about"], ["Contact", "/contact"], ["Blog", "/blog"], ["Learner experiences", "/#testimonials"]] },
  { title: "Support", links: [["Student workspace", "/student"], ["Privacy policy", "/privacy-policy"], ["Terms & conditions", "/terms-and-conditions"], ["Refund policy", "/refund-policy"]] },
];
export default function Footer() {
  return <footer className="bg-slate-950 px-6 py-12 text-slate-300"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center"><div><Link href="/" aria-label="FinOps Trainings home" className="inline-flex rounded-xl"><BrandLogo variant="footer" /></Link><p className="mt-3 max-w-xl text-sm leading-7 text-slate-400">Practical technology learning for individuals and teams. Find your course, build your skills, and take your next step.</p></div><Link href="/contact" className="inline-flex w-fit shrink-0 items-center gap-3 rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900">Plan your learning <ArrowRight size={16} /></Link></div><div className="grid gap-8 py-9 sm:grid-cols-2 lg:grid-cols-4">{groups.map(group => <nav key={group.title} aria-label={group.title}><h2 className="mb-4 text-sm font-semibold text-white">{group.title}</h2><ul className="space-y-3">{group.links.map(([label,href]) => <li key={href}><Link href={href} className="text-sm text-slate-400 hover:text-white">{label}</Link></li>)}</ul></nav>)}</div><div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-400"><p>© FinOps Trainings. All rights reserved.</p><a href="mailto:finops668@gmail.com" className="inline-flex items-center gap-2 hover:text-white"><Mail size={15} />finops668@gmail.com</a></div></div></footer>;
}
