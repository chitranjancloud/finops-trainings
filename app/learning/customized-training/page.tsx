"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function CustomizedTrainingPage() {
  const [teamSize, setTeamSize] = useState(10);
  const [selected, setSelected] = useState("Cloud");

  return (
    <section className="bg-gradient-to-b from-black via-[#020617] to-black text-white min-h-screen py-24 px-6">

      <div className="max-w-7xl mx-auto space-y-32">

        {/* 🔥 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
            Customized Training
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Tailor-made training programs designed specifically for your team, business goals, and technology stack.
          </p>

          <div className="flex justify-center gap-4 mt-6">
            <button className="px-8 py-3 bg-purple-500 rounded-full hover:scale-110 transition shadow-[0_0_20px_rgba(168,85,247,0.5)]">
              Request Custom Plan
            </button>
            <button className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/10 transition">
              Talk to Expert
            </button>
          </div>
        </div>

        {/* 📊 STATS */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Enterprise Clients", value: "500+" },
            { label: "Courses Customized", value: "2,000+" },
            { label: "Industries Covered", value: "20+" },
            { label: "Success Rate", value: "98%" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur"
            >
              <h3 className="text-2xl font-bold text-purple-400">{item.value}</h3>
              <p className="text-gray-400">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 🧠 SOLUTION TYPES */}
        <div>
          <h2 className="text-3xl text-center mb-12">Training Solutions</h2>

          <div className="flex justify-center gap-6 flex-wrap">
            {["Cloud", "AI/ML", "Cyber Security", "DevOps", "Data Analytics"].map((item) => (
              <button
                key={item}
                onClick={() => setSelected(item)}
                className={`px-6 py-2 rounded-full transition ${
                  selected === item
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-10 text-center text-gray-400">
            Customized {selected} training designed for enterprise use cases and real-world implementation.
          </div>
        </div>

        {/* 🏢 INDUSTRY USE CASES */}
        <div>
          <h2 className="text-3xl text-center mb-12">Industry Use Cases</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              "IT & Software Development",
              "Banking & Finance",
              "Healthcare & Pharma",
              "E-commerce & Retail",
              "Manufacturing",
              "Telecommunications",
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -6, scale: 1.03 }}
                className="p-6 bg-gradient-to-br from-blue-500/8 to-transparent border border-blue-500/15 rounded-xl"
              >
                🏢 {item}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🎯 ROI CALCULATOR */}
        <div className="text-center">
          <h2 className="text-3xl mb-6">Estimate Your Training ROI</h2>

          <input
            type="range"
            min="1"
            max="200"
            value={teamSize}
            onChange={(e) => setTeamSize(Number(e.target.value))}
            className="w-full max-w-md"
          />

          <p className="mt-4 text-blue-400 text-xl">
            Team Size: {teamSize}
          </p>

          <p className="text-gray-400 mt-2">
            Estimated productivity increase:{" "}
            <span className="text-green-400">
              {teamSize * 12}%
            </span>
          </p>
        </div>

        {/* 📅 SCHEDULING */}
        <div className="bg-white/5 p-10 rounded-2xl border border-white/10">
          <h2 className="text-3xl text-center mb-6">Schedule a Consultation</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Company Name" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Email" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Team Size" />
            <input className="p-4 bg-black border border-white/10 rounded-lg" placeholder="Technology Focus" />
          </div>

          <button className="mt-6 w-full py-3 bg-purple-500 rounded-lg hover:scale-105 transition">
            Book Consultation
          </button>
        </div>

        {/* 🤝 CLIENT LOGOS */}
        <div>
          <h2 className="text-3xl text-center mb-10">Trusted By Enterprises</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 opacity-70 text-center">
            {["Microsoft", "AWS", "Cisco", "IBM", "Google"].map((brand, i) => (
              <div key={i} className="p-4 border border-white/10 rounded-lg">
                {brand}
              </div>
            ))}
          </div>
        </div>

        {/* 🔥 CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">
            Build Your Team’s Future Today
          </h2>

          <p className="text-gray-400 mb-6">
            Upskill your workforce with customized, outcome-driven training.
          </p>

          <button className="px-10 py-4 bg-purple-500 rounded-full hover:scale-110 transition shadow-[0_0_25px_rgba(168,85,247,0.6)]">
            Get Custom Proposal
          </button>
        </div>

      </div>
    </section>
  );
}