"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Trophy, Award, Star, ArrowUpRight } from "lucide-react";

const awards = [
  {
    title: "EC-Council ATC of the Year",
    year: "2024", category: "Featured",
    image: "/EC-Council ATC of the Year.jpeg",
    gradient: "from-[#7c3aed]/20 to-[#2563eb]/10",
    border: "hover:border-[#7c3aed]/40",
    shadow: "hover:shadow-[0_8px_40px_rgba(124,58,237,0.2)]",
  },
  {
    title: "PECB Titanium Partner Award",
    year: "2024", category: "Titanium",
    image: "/PECB Titanium Partner Award.jpg",
    gradient: "from-[#fbbf24]/15 to-[#f59e0b]/10",
    border: "hover:border-[#fbbf24]/40",
    shadow: "hover:shadow-[0_8px_40px_rgba(251,191,36,0.2)]",
  },
  {
    title: "Great Place to Work Certified",
    year: "2026", category: "Global",
    image: "/Great Place to Work.jpg",
    gradient: "from-[#10b981]/15 to-[#059669]/10",
    border: "hover:border-[#10b981]/40",
    shadow: "hover:shadow-[0_8px_40px_rgba(16,185,129,0.2)]",
  },
  {
    title: "Excellence in Training",
    year: "2025", category: "Excellence",
    image: "/Training Excellence.jpg",
    gradient: "from-[#f43f5e]/15 to-[#e11d48]/10",
    border: "hover:border-[#f43f5e]/40",
    shadow: "hover:shadow-[0_8px_40px_rgba(244,63,94,0.2)]",
  },
];

export default function Awards() {
  return (
    <section className="relative py-24 bg-[#05080f] overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-[radial-gradient(ellipse,rgba(251,191,36,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse,rgba(139,92,246,0.07),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#fbbf24]/20 to-[#f59e0b]/10 rounded-xl flex items-center justify-center border border-[#fbbf24]/30 shadow-[0_0_24px_rgba(251,191,36,0.2)]">
                <Trophy size={20} className="text-[#fbbf24]" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Awards & Accolades</h2>
            </div>
            <p className="text-slate-500 text-sm">
              Recognitions for driving innovation and excellence in professional education.
            </p>
          </div>
          <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#a78bfa] hover:text-white transition-all group">
            View All Recognitions <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {awards.map((award, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className={`group relative p-8 rounded-[32px] bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl transition-all duration-500 overflow-hidden cursor-pointer ${award.border} ${award.shadow}`}
            >
              {/* Hover glow */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${award.gradient}`} />

              <div className="relative z-10">
                <div className="flex justify-between items-center mb-10">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.10] flex items-center justify-center shadow-xl group-hover:border-[#fbbf24]/40 transition-colors">
                    <Award className="w-5 h-5 text-[#a78bfa]" />
                  </div>
                  <span className="rounded-full bg-gradient-to-r from-[#fbbf24]/20 to-[#f59e0b]/10 border border-[#fbbf24]/30 text-[#fbbf24] text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1">
                    {award.category}
                  </span>
                </div>

                <div className="relative w-full h-32 mb-8 flex items-center justify-center">
                  <Image
                    src={award.image} alt={award.title} fill
                    className="object-contain filter grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-110"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-white font-bold text-lg leading-snug group-hover:text-[#93b4ff] transition-colors">
                    {award.title}
                  </h3>
                  <div className="flex items-center justify-between pt-4 border-t border-white/[0.07]">
                    <div className="flex items-center gap-1.5 text-[#fbbf24] text-[10px] font-black uppercase tracking-widest">
                      <Star size={12} fill="currentColor" /> Premier Partner
                    </div>
                    <span className="bg-white/[0.07] border border-white/[0.10] text-slate-300 text-[10px] font-medium px-2.5 py-1 rounded-full">
                      {award.year}
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={14} className="text-[#a78bfa]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
