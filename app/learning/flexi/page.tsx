"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function FlexiTrainingPage() {
  const [activePlan, setActivePlan] = useState("Pro");

  return (
    <section className="bg-gradient-to-b from-black via-[#020617] to-black text-white min-h-screen py-24 px-6">

      <div className="max-w-7xl mx-auto space-y-32">

        {/* 🔥 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
            Flexi Training
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Learn anytime, anywhere. Flexible schedules, self-paced modules, and expert-led sessions combined.
          </p>

          <div className="flex justify-center gap-4 mt-6">
            <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-110 transition shadow-[0_0_20px_rgba(59,130,246,0.5)]">
              Start Learning
            </button>
            <button className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/10 transition">
              View Plans
            </button>
          </div>
        </div>

        {/* 📊 STATS */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Courses", value: "5,000+" },
            { label: "Learners", value: "50K+" },
            { label: "Access", value: "24/7" },
            { label: "Flexibility", value: "100%" },
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

        {/* 🧠 FEATURES */}
        <div>
          <h2 className="text-3xl text-center mb-12">Why Flexi Training</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              "Self-paced + instructor-led hybrid",
              "Access recorded sessions anytime",
              "Flexible schedule for working professionals",
              "Multiple learning paths",
              "Pause & resume anytime",
              "Enterprise-ready training modules",
            ].map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -6, scale: 1.03 }}
                className="p-6 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition"
              >
                ⭐ {f}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🎥 VIDEO PREVIEW */}
        <div>
          <h2 className="text-3xl text-center mb-10">Experience Flexi Learning</h2>

          <div className="relative rounded-2xl overflow-hidden border border-white/10">
            <video
              src="https://www.w3schools.com/html/mov_bbb.mp4"
              controls
              className="w-full h-[400px] object-cover"
            />
          </div>
        </div>

        {/* 💳 PRICING PLANS */}
        <div>
          <h2 className="text-3xl text-center mb-12">Choose Your Plan</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Basic", price: "₹999/month" },
              { name: "Pro", price: "₹2,499/month", highlight: true },
              { name: "Enterprise", price: "Custom" },
            ].map((plan, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                onClick={() => setActivePlan(plan.name)}
                className={`p-8 rounded-2xl cursor-pointer border ${
                  activePlan === plan.name
                    ? "border-blue-500 bg-blue-500/10 shadow-[0_0_25px_rgba(59,130,246,0.4)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-2xl text-blue-400 mt-4">{plan.price}</p>

                <button className="mt-6 px-6 py-2 bg-blue-500 rounded-full hover:scale-105 transition">
                  Select Plan
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 📚 LEARNING PATH */}
        <div>
          <h2 className="text-3xl text-center mb-10">Flexible Learning Path</h2>

          <div className="space-y-4">
            {[
              "Step 1: Choose Course",
              "Step 2: Start Self-Paced Learning",
              "Step 3: Join Live Doubt Sessions",
              "Step 4: Certification & Placement",
            ].map((step, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.02 }}
                className="p-4 bg-white/5 border border-white/10 rounded-xl"
              >
                {step}
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🤖 AI RECOMMENDATION */}
        <div className="bg-gradient-to-br from-blue-500/10 to-transparent p-10 rounded-2xl border border-blue-500/20 text-center">
          <h2 className="text-3xl mb-4">AI Course Recommendation</h2>

          <p className="text-gray-400 mb-6">
            Get personalized course suggestions based on your interests.
          </p>

          <input
            placeholder="Enter your goal (e.g., Data Analyst)"
            className="p-4 w-full max-w-md bg-black border border-white/10 rounded-lg"
          />

          <button className="mt-6 px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
            Get Recommendation
          </button>
        </div>

        {/* 🔥 CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">
            Learn Without Limits
          </h2>

          <p className="text-gray-400 mb-6">
            Flexible learning designed for your lifestyle.
          </p>

          <button className="px-10 py-4 bg-blue-500 rounded-full hover:scale-110 transition shadow-[0_0_25px_rgba(34,211,238,0.6)]">
            Get Started
          </button>
        </div>

      </div>
    </section>
  );
}