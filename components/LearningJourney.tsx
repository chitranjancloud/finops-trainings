import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Users } from "lucide-react";

export default function LearningJourney() {
  return <>
    <section className="bg-slate-50 px-6 py-16 md:py-20" aria-labelledby="journey-title">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold text-blue-700">A clear path forward</p>
        <h2 id="journey-title" className="mt-3 text-3xl font-bold text-slate-950 md:text-4xl">From choosing a course to applying your skills.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { icon: Users, title: "Find your starting point", text: "Discuss your goals and experience with our team. Choose a course and learning format that fit your schedule." },
            { icon: BookOpen, title: "Learn through practice", text: "Work through guided lessons, practical exercises, and assignments with support from your trainer." },
            { icon: CheckCircle2, title: "Build your next step", text: "Review your progress, complete assessments, and use your projects and credentials to show what you can do." },
          ].map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-7"><div className="mb-6 flex items-center justify-between"><Icon className="text-blue-600" size={24} /><span className="text-sm font-medium text-slate-400">0{index + 1}</span></div><h3 className="text-xl font-semibold text-slate-950">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></article>)}
        </div>
      </div>
    </section>
    <section className="bg-blue-700 px-6 py-16 text-white" aria-labelledby="consultation-title">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-center"><div><p className="text-sm font-medium text-blue-100">Let’s plan your learning</p><h2 id="consultation-title" className="mt-3 text-3xl font-bold">Unsure which course is right for you?</h2><p className="mt-3 max-w-xl text-blue-100">Tell us where you are today and where you want to go. We’ll help you choose your next step.</p></div><Link href="/contact" className="inline-flex shrink-0 items-center gap-3 rounded-xl bg-white px-6 py-3.5 font-semibold text-blue-700 hover:bg-blue-50">Talk to our team <ArrowRight size={18} /></Link></div>
    </section>
  </>;
}
