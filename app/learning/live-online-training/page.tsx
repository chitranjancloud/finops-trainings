"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, Users, Calendar, Award, Video, FileText, 
  ChevronLeft, ChevronRight, CheckCircle2, ArrowRight, Star
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Data for Dynamic Content ---
const features = [
  { title: "Live Interaction", desc: "Ask questions and get real-time answers.", icon: <Video className="w-6 h-6 text-purple-400" /> },
  { title: "Interactive Learning", desc: "Engage in live discussions and polls.", icon: <Users className="w-6 h-6 text-blue-400" /> },
  { title: "Flexible Schedule", desc: "Choose batch timings that fit you.", icon: <Calendar className="w-6 h-6 text-green-400" /> },
  { title: "Global Certificate", desc: "Earn certifications recognized worldwide.", icon: <Award className="w-6 h-6 text-orange-400" /> },
  { title: "Session Recordings", desc: "Access recordings for lifetime learning.", icon: <FileText className="w-6 h-6 text-pink-400" /> },
  { title: "Case Studies", desc: "Learn through real-world projects.", icon: <Star className="w-6 h-6 text-teal-400" /> },
];

const testimonials = [
  { name: "Ankit Verma", role: "DevOps Engineer", text: "The live sessions are incredibly interactive and helped me upskill from the comfort of my home. Highly recommended!", img: "https://i.pravatar.cc/150?u=1" },
  { name: "Sanya Iyer", role: "Cloud Architect", text: "Best decision for my career. The instructors are industry experts who actually care about your progress.", img: "https://i.pravatar.cc/150?u=2" },
];

export default function  LiveOnlineTrainingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const router = useRouter();

  // Auto-slide testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-[#0f172a] text-white min-h-screen font-sans selection:bg-blue-500/30">
      
      {/* ðŸš€ HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] -z-10" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> LIVE & INTERACTIVE
            </div>
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">
              Live Online <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                Training
              </span>
            </h1>
            <p className="text-gray-400 text-lg max-w-lg leading-relaxed">
              Join live instructor-led sessions with real-time interaction and practical learning from industry experts.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => router.push("/#top-courses")} className="px-8 py-4 bg-gradient-to-r from-[#2563eb] to-[#2563eb] rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all flex items-center gap-2">
                Explore Programs <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => router.push("/#top-courses")} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold hover:bg-white/10 transition">
                View All Courses
              </button>
            </div>
          </motion.div>

          {/* Hero Video Card */}
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-3xl blur opacity-15 group-hover:opacity-30 transition duration-1000"></div>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-black aspect-video">
               <iframe className="w-full h-full opacity-80" src="https://www.youtube.com/embed/SOTamWNgDKc?autoplay=0&mute=1" title="Demo" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-8 flex flex-col justify-end">
                  <p className="text-2xl font-bold">Rick Astley</p>
                  <p className="text-gray-400 text-sm">4K Ultra HD Quality â€¢ 12K+ Watching</p>
               </div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/20 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition">
                  <Play className="fill-white ml-1" />
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ðŸ§© FEATURES GRID */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            Why Choose <span className="text-blue-400">Live Online Training?</span>
          </h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                whileHover={{ y: -10 }}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all text-center"
              >
                <div className="mb-4 flex justify-center">{f.icon}</div>
                <h3 className="font-semibold text-sm mb-2">{f.title}</h3>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ðŸ›¤ï¸ HOW IT WORKS (The Stepper) */}
      <section className="py-24 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-20">How It Works</h2>
          <div className="relative flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
            
            {[
              { id: "01", title: "Enroll In Course", desc: "Choose your course and complete enrollment.", color: "text-blue-400" },
              { id: "02", title: "Attend Live Sessions", desc: "Join instructor-led live sessions.", color: "text-purple-400" },
              { id: "03", title: "Practice & Learn", desc: "Work on assignments and real projects.", color: "text-pink-400" },
              { id: "04", title: "Get Certified", desc: "Complete the course and earn certification.", color: "text-green-400" },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex-1 flex flex-col items-center">
                <div className={`w-24 h-24 rounded-full bg-black border-2 border-white/10 flex items-center justify-center mb-6 shadow-xl`}>
                  <span className={`text-2xl font-bold ${step.color}`}>{step.id}</span>
                </div>
                <h3 className="font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 max-w-[200px]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* âš–ï¸ COMPARISON MODES */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Compare Learning Modes</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Featured Mode */}
            <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-600/20 to-transparent border border-blue-500/50 relative">
               <div className="absolute -top-4 right-8 bg-blue-600 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Most Popular</div>
               <h3 className="text-2xl font-bold mb-4">Live Online</h3>
               <p className="text-gray-400 text-sm mb-8">Real-time interaction with experts from the comfort of your home.</p>
               <ul className="space-y-4 mb-8">
                  {["Live Instructor-led", "Real-time Q&A", "Flexible schedule", "Session recordings"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-blue-500" /> {item}</li>
                  ))}
               </ul>
               <button onClick={() => router.push("/courses")} className="w-full py-3 rounded-xl bg-blue-600 font-bold">Choose Live Learning</button>
            </div>
            
            {/* Other Modes */}
            {["Classroom", "Self-paced"].map((mode) => (
              <div key={mode} className="p-8 rounded-3xl bg-white/5 border border-white/10 opacity-70 hover:opacity-100 transition">
                 <h3 className="text-2xl font-bold mb-4">{mode}</h3>
                 <p className="text-gray-400 text-sm mb-8">Traditional or independent learning methods.</p>
                 <ul className="space-y-4 mb-8">
                    {["Standard Materials", "Limited Support", "Set Milestones", "Email Access"].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm"><CheckCircle2 className="w-4 h-4 text-gray-600" /> {item}</li>
                    ))}
                 </ul>
                 <button className="w-full py-3 rounded-xl border border-white/20 font-bold hover:bg-white/5">Select {mode}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ðŸ’¬ TESTIMONIAL CAROUSEL */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-blue-900/6">
        <div className="max-w-4xl mx-auto relative overflow-hidden">
          <h2 className="text-3xl font-bold text-center mb-16">What Our Learners Say</h2>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center space-y-8"
            >
              <p className="text-2xl italic text-gray-300">"{testimonials[activeTestimonial].text}"</p>
              <div className="flex flex-col items-center">
                <img src={testimonials[activeTestimonial].img} className="w-16 h-16 rounded-full mb-4 border-2 border-purple-500" alt="user" />
                <h4 className="font-bold">{testimonials[activeTestimonial].name}</h4>
                <p className="text-sm text-purple-400">{testimonials[activeTestimonial].role}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-4 mt-12">
             <button onClick={() => setActiveTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1))} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"><ChevronLeft /></button>
             <button onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)} className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10"><ChevronRight /></button>
          </div>
        </div>
      </section>

      {/* ðŸ FINAL CTA */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto rounded-[3rem] bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] p-12 md:p-20 text-center relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-3xl -rotate-45" />
           <h2 className="text-4xl md:text-5xl font-bold mb-6">Start Your Learning Journey Today</h2>
           <p className="text-blue-100 mb-10 max-w-xl mx-auto">Be a future-ready professional. Enroll now and transform your career with our industry-leading live classes.</p>
           <button onClick={() => router.push("/#top-courses")} className="px-12 py-4 bg-white text-blue-600 rounded-full font-bold text-lg hover:scale-105 transition shadow-2xl">
              Enroll Now &rarr;
           </button>
        </div>
      </section>
    </div>
  );
}