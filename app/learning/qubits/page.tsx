"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function QubitsPage() {
  const [qubits, setQubits] = useState(8);

  return (
    <section className="bg-black text-white min-h-screen py-24 px-6 overflow-hidden">

      {/* 🔥 GLOW BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/15 via-blue-800/10 to-transparent blur-3xl"></div>

      <div className="max-w-7xl mx-auto space-y-32 relative z-10">

        {/* 🚀 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
            Qubits
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Explore the future of computing with quantum technologies, AI research,
            and next-generation innovation platforms.
          </p>

          <div className="flex justify-center gap-4 mt-6">
            <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full hover:scale-110 transition shadow-[0_0_25px_rgba(59,130,246,0.6)]">
              Start Exploring
            </button>
            <button className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/10 transition">
              View Labs
            </button>
          </div>
        </div>

        {/* 🧠 LIVE SIMULATOR */}
        <div className="text-center">
          <h2 className="text-3xl mb-6">Quantum Simulator</h2>

          <input
            type="range"
            min="1"
            max="50"
            value={qubits}
            onChange={(e) => setQubits(Number(e.target.value))}
            className="w-full max-w-md"
          />

          <p className="mt-4 text-blue-400 text-xl">
            Qubits: {qubits}
          </p>

          <p className="text-gray-400 mt-2">
            Computational Power:{" "}
            <span className="text-purple-400">
              {Math.pow(2, qubits).toLocaleString()}
            </span>
          </p>
        </div>

        {/* ⚙️ FEATURES */}
        <div>
          <h2 className="text-3xl text-center mb-12">What You’ll Explore</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Quantum Computing Fundamentals",
              "Qubit Simulation & Algorithms",
              "AI + Quantum Integration",
              "Quantum Cryptography",
              "Advanced Research Labs",
              "Real-world Applications",
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8, scale: 1.05 }}
                className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl backdrop-blur"
              >
                ⚡ {feature}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🧪 LABS */}
        <div>
          <h2 className="text-3xl text-center mb-12">Interactive Labs</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Quantum Circuit Design",
              "Entanglement Simulation",
              "Quantum Machine Learning",
            ].map((lab, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center"
              >
                🧪 {lab}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 📊 STATS */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Quantum Labs", value: "50+" },
            { label: "Research Projects", value: "200+" },
            { label: "Global Learners", value: "25K+" },
            { label: "Success Rate", value: "96%" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl"
            >
              <h3 className="text-2xl font-bold text-blue-400">{item.value}</h3>
              <p className="text-gray-400">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 🎥 VIDEO PREVIEW */}
        <div className="text-center">
          <h2 className="text-3xl mb-8">Quantum Demo</h2>

          <motion.div
            whileHover={{ scale: 1.03 }}
            className="rounded-2xl overflow-hidden border border-white/10"
          >
            <video
              src="/quantum-demo.mp4"
              controls
              className="w-full h-[400px] object-cover"
            />
          </motion.div>
        </div>

        {/* 💰 PRICING */}
        <div>
          <h2 className="text-3xl text-center mb-12">Access Plans</h2>

          <div className="grid md:grid-cols-3 gap-8">

            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-xl mb-4">Explorer</h3>
              <p className="text-3xl text-blue-400 mb-6">₹4,999</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Basic labs</li>
                <li>✔ Simulator access</li>
              </ul>
            </div>

            <div className="p-8 bg-blue-500/10 border border-blue-500 rounded-2xl scale-105">
              <h3 className="text-xl mb-4">Research</h3>
              <p className="text-3xl text-blue-400 mb-6">₹14,999</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Advanced labs</li>
                <li>✔ AI integration</li>
                <li>✔ Projects</li>
              </ul>
            </div>

            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-xl mb-4">Enterprise</h3>
              <p className="text-3xl text-blue-400 mb-6">Custom</p>
              <ul className="space-y-2 text-gray-400">
                <li>✔ Full access</li>
                <li>✔ Dedicated research team</li>
              </ul>
            </div>

          </div>
        </div>

        {/* 🔥 CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">
            Enter the Quantum Era
          </h2>

          <p className="text-gray-400 mb-6">
            Build the future with next-generation computing technologies.
          </p>

          <button className="px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-400 rounded-full hover:scale-110 transition shadow-[0_0_30px_rgba(59,130,246,0.6)]">
            Join Now
          </button>
        </div>

      </div>
    </section>
  );
}