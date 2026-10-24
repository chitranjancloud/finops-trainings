"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function FlyMeTrainerPage() {
  const [date, setDate] = useState<Date | null>(new Date());

  return (
    <section className="bg-gradient-to-b from-black via-[#020617] to-black text-white min-h-screen py-24 px-6">

      <div className="max-w-7xl mx-auto space-y-32">

        {/* 🔥 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
            Fly-Me-a-Trainer
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Enterprise-grade on-site training delivered by world-class experts.
          </p>
        </div>

        {/* 👨‍🏫 TRAINERS */}
        <div>
          <h2 className="text-3xl text-center mb-12">Meet Our Trainers</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Rahul Sharma",
                role: "Cloud Architect",
                rating: "4.9",
                img: "https://randomuser.me/api/portraits/men/32.jpg",
              },
              {
                name: "Ankit Verma",
                role: "AI Engineer",
                rating: "4.8",
                img: "https://randomuser.me/api/portraits/men/45.jpg",
              },
              {
                name: "Priya Mehta",
                role: "DevOps Expert",
                rating: "5.0",
                img: "https://randomuser.me/api/portraits/women/44.jpg",
              },
            ].map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:border-purple-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] transition"
              >
                <img
                  src={t.img}
                  className="w-20 h-20 rounded-full object-cover mb-4"
                />

                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="text-gray-400">{t.role}</p>

                <p className="text-yellow-400 mt-2">⭐ {t.rating}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 📅 CALENDAR (FIXED STYLE) */}
        <div className="text-center">
          <h2 className="text-3xl mb-10">Select Training Date</h2>

          <div className="flex justify-center">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur">

              <Calendar
              onChange={(value) => setDate(value as Date)}
                value={date}
                className="!bg-transparent !text-white border-none"
              />

              <p className="mt-4 text-blue-400 font-medium">
              Selected: {date ? date.toDateString() : "No date selected"}
              </p>
            </div>
          </div>
        </div>

        {/* 🧾 FORM (PREMIUM) */}
        <div className="bg-gradient-to-br from-blue-500/8 to-transparent p-10 rounded-2xl border border-blue-500/15 backdrop-blur">

          <h2 className="text-3xl text-center mb-8">
            Request a Trainer
          </h2>

          <div className="grid md:grid-cols-2 gap-6">

            {["Company", "Email", "Location", "Training Topic"].map((f, i) => (
              <input
                key={i}
                placeholder={f}
                className="p-4 bg-black/50 border border-white/10 rounded-lg focus:border-purple-500 outline-none"
              />
            ))}

          </div>

          <button className="mt-8 w-full py-4 bg-gradient-to-r from-[#2563eb] to-[#2563eb] rounded-xl font-semibold hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition">
            Submit Request
          </button>
        </div>

        {/* 🔥 CTA */}
        <div className="text-center space-y-6">
          <h2 className="text-4xl font-bold">
            Transform Your Team
          </h2>

          <button className="px-10 py-4 bg-blue-500 rounded-full hover:scale-110 hover:shadow-[0_0_25px_rgba(59,130,246,0.6)] transition">
            Contact Sales
          </button>
        </div>

      </div>
    </section>
  );
}