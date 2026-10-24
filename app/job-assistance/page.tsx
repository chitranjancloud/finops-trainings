"use client";

import { motion } from "framer-motion";
import { CheckCircle, Star } from "lucide-react";
import { useState, useEffect } from "react";

const features = [
  {
    title: "Resume Building",
    desc: "ATS-optimized resumes that get shortlisted fast.",
  },
  {
    title: "Mock Interviews",
    desc: "Real interview simulations with detailed feedback.",
  },
  {
    title: "Job Referrals",
    desc: "Direct referrals to top companies & hidden jobs.",
  },
  {
    title: "Career Mentorship",
    desc: "1:1 expert guidance to accelerate your career.",
  },
];

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Placed at Amazon",
    salary: "₹12 LPA",
    text: "Got placed within 21 days. The mentorship was game-changing!",
  },
  {
    name: "Sneha Patel",
    role: "Placed at TCS",
    salary: "₹8 LPA",
    text: "Mock interviews boosted my confidence massively.",
  },
  {
    name: "Arjun Verma",
    role: "Placed at Infosys",
    salary: "₹7 LPA",
    text: "Best investment for my career. Highly recommended!",
  },
];

const stats = [
  { number: "10,000+", label: "Students Placed" },
  { number: "92%", label: "Success Rate" },
  { number: "300+", label: "Hiring Partners" },
  { number: "4.8/5", label: "Student Rating" },
];

const companies = ["Google", "Amazon", "Microsoft", "TCS", "Infosys"];

export default function JobAssistance() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent((p) => (p + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-[#0f172a] text-white overflow-hidden relative">

      {/* BACKGROUND GLOW */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600 opacity-10 blur-[150px] animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600 opacity-10 blur-[150px] animate-pulse" />

      {/* HERO */}
      <section className="min-h-[80vh] flex flex-col justify-center items-center text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-bold"
        >
          Job Assistance Program
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mt-2">
            Get Hired Faster 🚀
          </span>
        </motion.h1>

        <p className="mt-6 text-gray-400 max-w-xl">
          Get placed in top companies within 30–60 days with structured guidance,
          real interview practice, and guaranteed referral support.
        </p>

        <p className="text-red-400 mt-4">
          Only 25 seats left this month ⚠️
        </p>

        <button className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full hover:scale-105 transition">
          Join Program
        </button>
      </section>

      {/* STATS */}
      <section className="py-20 bg-white/5">
        <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-8 max-w-6xl mx-auto">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 40 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-bold text-blue-400">{s.number}</h3>
              <p className="text-gray-400">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPANIES */}
      <section className="py-16 text-center">
        <p className="text-gray-400 mb-6">Students placed at</p>
        <div className="flex flex-wrap justify-center gap-8 opacity-70">
          {companies.map((c, i) => (
            <span key={i} className="text-xl font-semibold">{c}</span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">
          What You Get
        </h2>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 40 }}
              viewport={{ once: true }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-xl"
            >
              <CheckCircle className="text-blue-400 mb-3" />
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="text-gray-400 mt-2">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section className="px-6 py-20 bg-white/5">
        <h2 className="text-4xl font-bold text-center mb-12">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto text-center">
          {["Enroll", "Build Skills", "Get Placed"].map((step, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 40 }}
              viewport={{ once: true }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl"
            >
              <div className="text-3xl font-bold text-blue-400 mb-3">
                {i + 1}
              </div>
              <p>{step}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="px-6 py-20 text-center">
        <h2 className="text-4xl font-bold mb-12">
          Success Stories
        </h2>

        <motion.div
          key={current}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl"
        >
          <div className="flex justify-center mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="text-yellow-400" />
            ))}
          </div>

          <p className="text-gray-300">{testimonials[current].text}</p>

          <h4 className="mt-4 font-semibold">
            {testimonials[current].name}
          </h4>

          <p className="text-blue-400 text-sm">
            {testimonials[current].role} • {testimonials[current].salary}
          </p>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-r from-blue-600 to-indigo-600">
        <h2 className="text-3xl font-bold">
          Ready to Land Your Dream Job?
        </h2>

        <button className="mt-6 px-8 py-3 bg-black rounded-full hover:bg-gray-900">
          Apply Now
        </button>
      </section>

      {/* STICKY CTA */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
        <button className="px-8 py-3 bg-blue-600 rounded-full shadow-xl hover:scale-105 transition">
          Apply Now 🚀
        </button>
      </div>

      {/* FOOTER */}
      <footer className="text-center py-6 text-gray-400">
        © {new Date().getFullYear()} FinOps Trainings. All rights reserved.
      </footer>
    </div>
  );
}