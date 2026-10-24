"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function LearnovaPage() {
  const [active, setActive] = useState("All");

  const categories = ["All", "Cloud", "AI", "Security", "DevOps"];

  const courses = [
    {
      title: "Azure Fundamentals",
      category: "Cloud",
      students: "12K+",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
    },
    {
      title: "AI & Machine Learning",
      category: "AI",
      students: "18K+",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995",
    },
    {
      title: "Cyber Security Pro",
      category: "Security",
      students: "9K+",
      image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b",
    },
    {
      title: "DevOps Mastery",
      category: "DevOps",
      students: "15K+",
      image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c",
    },
  ];

  const filtered =
    active === "All"
      ? courses
      : courses.filter((c) => c.category === active);

  return (
    <section className="bg-gradient-to-b from-black via-[#020617] to-black text-white min-h-screen py-24 px-6">

      <div className="max-w-7xl mx-auto space-y-24">

        {/* 🔥 HERO */}
        <div className="text-center space-y-6">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-blue-400 bg-clip-text text-transparent">
            Learnova
          </h1>

          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            A next-generation learning platform designed to help you master
            in-demand technologies with real-world skills.
          </p>
        </div>

        {/* 🎯 CATEGORY FILTER */}
        <div className="flex justify-center gap-4 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`px-6 py-2 rounded-full transition ${
                active === cat
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 🎬 FEATURED (NETFLIX STYLE ROW) */}
        <div>
          <h2 className="text-3xl mb-6">🔥 Featured Courses</h2>

          <div className="flex gap-6 overflow-x-auto pb-4">
            {courses.map((course, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="min-w-[300px] rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition cursor-pointer"
              >
                <img
                  src={course.image}
                  className="w-full h-40 object-cover"
                />

                <div className="p-4">
                  <h3 className="font-semibold">{course.title}</h3>
                  <p className="text-gray-400 text-sm mt-2">
                    👥 {course.students}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 🧠 GRID COURSES */}
        <div>
          <h2 className="text-3xl mb-10 text-center">
            Explore Courses
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {filtered.map((course, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10, scale: 1.03 }}
                className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 backdrop-blur hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] transition cursor-pointer"
              >
                <img
                  src={course.image}
                  className="w-full h-48 object-cover"
                />

                <div className="p-6">
                  <h3 className="text-lg font-semibold">
                    {course.title}
                  </h3>

                  <p className="text-gray-400 mt-2 text-sm">
                    Category: {course.category}
                  </p>

                  <p className="text-blue-400 mt-2 text-sm">
                    👥 {course.students} learners
                  </p>

                  <button className="mt-4 px-4 py-2 bg-blue-500 rounded-full hover:scale-105 transition">
                    View Course
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ⭐ STATS */}
        <div className="grid md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Courses", value: "5,000+" },
            { label: "Learners", value: "50K+" },
            { label: "Experts", value: "300+" },
            { label: "Success Rate", value: "97%" },
          ].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ scale: 1.05 }}
              className="p-6 bg-white/5 border border-white/10 rounded-xl"
            >
              <h3 className="text-2xl font-bold text-blue-400">
                {item.value}
              </h3>
              <p className="text-gray-400">{item.label}</p>
            </motion.div>
          ))}
        </div>

        {/* 🔥 CTA */}
        <div className="text-center">
          <h2 className="text-4xl font-bold mb-4">
            Start Your Learning Journey
          </h2>

          <p className="text-gray-400 mb-6">
            Unlock premium courses and upgrade your career.
          </p>

          <button className="px-10 py-4 bg-blue-500 rounded-full hover:scale-110 transition shadow-[0_0_25px_rgba(34,211,238,0.6)]">
            Explore Now
          </button>
        </div>

      </div>
    </section>
  );
}