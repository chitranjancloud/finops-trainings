"use client";

import { motion } from "framer-motion";
import { 
  ArrowRight, CheckCircle, Clock, BarChart3, Users, 
  Download, Calendar, ChevronRight, FileText, Monitor, 
  BookOpen, ShieldCheck, Trophy, Search, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function FinopsPage() {
  const router = useRouter();
  return (
    <main className="bg-[#0f172a] text-white font-sans selection:bg-blue-500/20">
      
      {/* ================= BREADCRUMB ================= */}
      <nav className="max-w-7xl mx-auto px-6 pt-8 flex gap-2 text-xs text-gray-500 uppercase tracking-wider">
        <span className="hover:text-white cursor-pointer">Home</span>
        <span>/</span>
        <span className="hover:text-white cursor-pointer">Training</span>
        <span>/</span>
        <span className="text-gray-300">FinOps Foundation Training</span>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <section className="relative py-12 px-6 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 items-start">
        
        {/* LEFT CONTENT */}
        <div className="lg:col-span-7">
          <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-widest border border-blue-400/20">
            Popular
          </span>

          <h1 className="text-5xl md:text-6xl font-bold mt-6 leading-tight">
            FinOps Foundation <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
              Training
            </span>
          </h1>

          <p className="text-gray-400 mt-6 text-lg max-w-xl leading-relaxed">
            Master the core principles of FinOps and drive cloud financial accountability in your organization with our expert-led certification program.
          </p>

          {/* Key Quick Stats */}
          <div className="flex flex-wrap gap-8 mt-10 text-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg"><Clock size={20} className="text-blue-400" /></div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Duration</p>
                <p>2 Days Instructor-Led</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg"><BarChart3 size={20} className="text-purple-400" /></div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Level</p>
                <p>Beginner Level</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg"><Trophy size={20} className="text-pink-400" /></div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Certification</p>
                <p>Official FinOps Certificate</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mt-10">
            <button onClick={() => router.push("/contact")} className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#2563eb] font-bold hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2">
              Enquire Now <ArrowRight size={18} />
            </button>
            <button className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition flex items-center gap-2">
              Download Brochure <Download size={18} />
            </button>
          </div>

          {/* Upcoming Batches - New Component */}
          <div className="mt-12">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Upcoming Batches</h4>
            <div className="flex flex-wrap gap-3">
              {['May 20 - 21, 2025', 'Jun 17 - 18, 2025', 'Jul 15 - 16, 2025'].map((date) => (
                <div key={date} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium">
                  {date}
                </div>
              ))}
              <button className="text-purple-400 text-xs font-bold flex items-center gap-1 ml-2">View All Dates <ChevronRight size={14} /></button>
            </div>
          </div>
        </div>

        {/* RIGHT FLOATING CARD */}
        <div className="lg:col-span-5 sticky top-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#2563eb] to-[#2563eb] rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-[#1e293b] p-8 rounded-[2rem] border border-white/10 shadow-2xl">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-purple-600 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter">
                Offering Live Virtual Classes
              </div>

              <h3 className="text-xl font-bold mb-6">Training Includes</h3>

              <div className="space-y-5">
                {[
                  { icon: BookOpen, text: "Official FinOps Courseware" },
                  { icon: FileText, text: "Exam Voucher Included" },
                  { icon: Users, text: "2 Days Live Instructor-Led Training" },
                  { icon: Monitor, text: "Hands-on Labs & Real-world Scenarios" },
                  { icon: Clock, text: "Post-Training Support" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 text-sm text-gray-300">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <item.icon size={16} className="text-blue-400" />
                    </div>
                    {item.text}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <button onClick={() => router.push("/contact")} className="w-full py-4 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#2563eb] font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                  Talk to Advisor <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST BADGES ================= */}
      <section className="mt-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 divide-x divide-white/5">
          {[
            { label: "95% Learner Satisfaction", sub: "Based on 12,000+ reviews", icon: "⭐" },
            { label: "Expert Instructors", sub: "20+ years of industry experience", icon: "👨‍🏫" },
            { label: "Hands-on Learning", sub: "Real-world labs & case studies", icon: "💻" },
            { label: "Globally Recognized", sub: "FinOps Foundation Certified", icon: "🌍" },
          ].map((stat, i) => (
            <div key={i} className="p-8 text-center md:text-left">
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <p className="font-bold text-sm">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= TAB NAVIGATION ================= */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-8 px-6 text-sm font-bold text-gray-400 uppercase tracking-widest h-16 items-center whitespace-nowrap">
          {['Overview', 'Course Curriculum', 'Who Should Attend', 'Prerequisites', 'Reviews'].map((tab, i) => (
            <button key={tab} className={`hover:text-white transition-colors ${i === 0 ? "text-purple-500 border-b-2 border-purple-500 h-full" : ""}`}>
              {tab}
            </button>
          ))}
        </div>
      </nav>

      {/* ================= COURSE OVERVIEW ================= */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold">Course Overview</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-400 mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            { t: "Understand FinOps Principles", c: "Learn core principles and practices of cloud financial management.", color: "text-blue-400", bg: "bg-blue-500/5", icon: BookOpen },
            { t: "Optimize Cloud Spend", c: "Drive cost optimization and maximize cloud value across teams.", color: "text-green-400", bg: "bg-green-500/5", icon: BarChart3 },
            { t: "Cross-functional Collaboration", c: "Enable effective collaboration across engineering, finance, and business.", color: "text-orange-400", bg: "bg-orange-500/5", icon: Users },
            { t: "Make Data-driven Decisions", c: "Leverage data and insights to make informed cloud financial decisions.", color: "text-purple-400", bg: "bg-purple-500/5", icon: ShieldCheck },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8 }}
              className={`p-8 rounded-[2rem] ${item.bg} border border-white/5 hover:border-white/20 transition-all flex flex-col h-full`}
            >
              <h3 className={`font-bold mb-4 text-lg leading-tight ${item.color}`}>{item.t}</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-grow">
                {item.c}
              </p>
              <div className={`mt-8 p-3 rounded-xl bg-white/5 w-fit ${item.color}`}>
                <item.icon size={24} />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= CURRICULUM ================= */}
      <section className="px-6 max-w-7xl mx-auto pb-32">
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Sidebar Modules */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold mb-6">Course Curriculum</h3>
            {[
              "FinOps Overview",
              "The FinOps Framework",
              "FinOps Principles",
              "FinOps Domains",
              "Implementing FinOps",
              "Case Studies & Best Practices"
            ].map((module, i) => (
              <button 
                key={i}
                className={`w-full p-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                  i === 0 
                  ? "bg-purple-500/10 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.1)]" 
                  : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="text-sm">
                  <span className="block text-[10px] font-bold uppercase text-purple-400">Module {i + 1}</span>
                  <span className="font-semibold">{module}</span>
                </div>
                <ChevronRight size={16} className={i === 0 ? "text-purple-500" : "text-gray-600"} />
              </button>
            ))}
            
            <button className="w-full mt-4 p-4 rounded-xl border border-blue-500/30 text-blue-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-500/10 transition">
              <FileText size={18} /> View Detailed Curriculum
            </button>
          </div>

          {/* Module Detail */}
          <div className="lg:col-span-2 bg-[#1e293b] p-10 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-blue-400">Module 1: FinOps Overview</h3>
              <span className="bg-white/5 px-4 py-1 rounded-full text-xs text-gray-400 font-medium">6 Topics</span>
            </div>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed border-b border-white/5 pb-8">
              Introduction to FinOps, its evolution, and the business value it brings to organizations.
            </p>

            <div className="space-y-4">
              {[
                { title: "What is FinOps?", time: "30 mins" },
                { title: "The Evolution of FinOps", time: "45 mins" },
                { title: "FinOps Key Concepts", time: "30 mins" },
                { title: "Benefits of FinOps", time: "30 mins" },
                { title: "FinOps and Cloud Value", time: "45 mins" },
                { title: "FinOps Roles and Responsibilities", time: "30 mins" }
              ].map((topic, idx) => (
                <div key={idx} className="group p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between hover:bg-white/10 transition cursor-pointer">
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">1.{idx + 1}</span>
                    <span className="text-sm font-semibold text-gray-200">{topic.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={14} /> {topic.time}</span>
                    <ChevronDown size={16} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-r from-[#6b21a8] via-[#db2777] to-[#f97316] p-12 rounded-[3rem] group">
          {/* Animated Background Element */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8 text-center md:text-left">
              <div className="hidden md:flex w-20 h-20 bg-white/10 rounded-full items-center justify-center backdrop-blur-xl border border-white/20">
                <Users size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Need help choosing the right training?</h2>
                <p className="text-white/80 mt-2 font-medium">Our expert advisors are here to help you find the perfect path.</p>
              </div>
            </div>

            <button onClick={() => router.push("/contact")} className="whitespace-nowrap px-10 py-5 bg-white text-pink-600 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all flex items-center gap-3">
              Talk to an Advisor <ArrowRight size={20} />
            </button>
          </div>
        </div>
        
        {/* Footer Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 text-[10px] uppercase tracking-widest font-bold text-gray-500">
          <div className="flex items-center gap-2 justify-center border-r border-white/5"><Monitor size={16} className="text-purple-400"/> Flexible Learning Options</div>
          <div className="flex items-center gap-2 justify-center border-r border-white/5"><Users size={16} className="text-blue-400"/> Group Discounts Available</div>
          <div className="flex items-center gap-2 justify-center border-r border-white/5"><CheckCircle size={16} className="text-green-400"/> Corporate Training</div>
          <div className="flex items-center gap-2 justify-center"><Clock size={16} className="text-orange-400"/> 24/7 Learning Support</div>
        </div>
      </section>

    </main>
  );
}