"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function WebinarServicePage() {
  const [attendees, setAttendees] = useState(100);

  return (
    <section className="bg-gradient-to-b from-black via-[#020617] to-black text-white min-h-screen py-24 px-6">

      <div className="max-w-7xl mx-auto space-y-32">

        {/* 🔥 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">
            Webinar as a Service
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Host high-impact webinars with end-to-end support — from planning and promotion to execution and analytics.
          </p>

          <div className="flex justify-center gap-4 mt-6">
            <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-110 transition shadow-[0_0_20px_rgba(59,130,246,0.6)]">
              Schedule Webinar
            </button>
            <button className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/10 transition">
              View Demo
            </button>
          </div>
        </div>

        {/* 📊 LIVE STATS */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Webinars Hosted", value: "10,000+" },
            { label: "Avg Attendance", value: "85%" },
            { label: "Enterprise Clients", value: "300+" },
            { label: "Satisfaction Rate", value: "97%" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur"
            >
              <h3 className="text-2xl font-bold text-blue-400">{item.value}</h3>
              <p className="text-gray-400">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 🎥 VIDEO PREVIEW */}
        <div className="text-center">
          <h2 className="text-3xl mb-8">Platform Preview</h2>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="rounded-2xl overflow-hidden border border-white/10"
          >
            <video
              src="/webinar-demo.mp4"
              controls
              className="w-full h-[400px] object-cover"
            />
          </motion.div>
        </div>

        {/* ⚙️ FEATURES */}
        <div>
          <h2 className="text-3xl text-center mb-12">What We Handle</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Landing Page Creation",
              "Email Campaigns & Promotions",
              "Live Hosting & Moderation",
              "Recording & Distribution",
              "Audience Analytics Dashboard",
              "Lead Capture & CRM Integration",
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -6, scale: 1.03 }}
                className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl"
              >
                ⚡ {feature}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 💰 PRICING */}
        <div>
          <h2 className="text-3xl text-center mb-12">Pricing Plans</h2>

          <div className="grid md:grid-cols-3 gap-8">

            {/* BASIC */}
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-xl mb-4">Starter</h3>
              <p className="text-3xl text-blue-400 mb-6">₹9,999</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Up to 100 attendees</li>
                <li>✔ Basic analytics</li>
                <li>✔ Recording</li>
              </ul>
            </div>

            {/* PRO */}
            <div className="p-8 bg-blue-500/10 border border-blue-500 rounded-2xl scale-105">
              <h3 className="text-xl mb-4">Professional</h3>
              <p className="text-3xl text-blue-400 mb-6">₹24,999</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Up to 500 attendees</li>
                <li>✔ Advanced analytics</li>
                <li>✔ Marketing support</li>
                <li>✔ Lead capture</li>
              </ul>
            </div>

            {/* ENTERPRISE */}
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-xl mb-4">Enterprise</h3>
              <p className="text-3xl text-blue-400 mb-6">Custom</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Unlimited attendees</li>
                <li>✔ Full automation</li>
                <li>✔ Dedicated manager</li>
              </ul>
            </div>

          </div>
        </div>

        {/* 📈 ROI CALCULATOR */}
        <div className="text-center">
          <h2 className="text-3xl mb-6">Estimate Webinar Impact</h2>

          <input
            type="range"
            min="50"
            max="1000"
            value={attendees}
            onChange={(e) => setAttendees(Number(e.target.value))}
            className="w-full max-w-md"
          />

          <p className="mt-4 text-blue-400 text-xl">
            Attendees: {attendees}
          </p>

          <p className="text-gray-400 mt-2">
            Estimated leads:{" "}
            <span className="text-green-400">
              {Math.floor(attendees * 0.6)}
            </span>
          </p>
        </div>

        {/* 📅 BOOKING FORM */}
        <div className="bg-white/5 p-10 rounded-2xl border border-white/10">
          <h2 className="text-3xl text-center mb-6">Book Your Webinar</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Company Name" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Email" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Topic" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Preferred Date" />
          </div>

          <button className="mt-6 w-full py-3 bg-blue-500 rounded-lg hover:scale-105 transition">
            Submit Request
          </button>
        </div>

        {/* 🔥 CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">
            Turn Webinars into Revenue
          </h2>

          <p className="text-gray-400 mb-6">
            Generate leads, build authority, and scale your brand with premium webinars.
          </p>

          <button className="px-10 py-4 bg-blue-500 rounded-full hover:scale-110 transition shadow-[0_0_25px_rgba(59,130,246,0.6)]">
            Get Started
          </button>
        </div>

      </div>
    </section>
  );
}