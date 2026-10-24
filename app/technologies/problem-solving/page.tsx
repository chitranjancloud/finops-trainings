"use client";

export default function problemsolvingpage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Problem Solving
</h1>

<p className="text-gray-400 max-w-2xl">
  Learn structured problem-solving techniques, analytical thinking, and logical reasoning 
  to tackle complex challenges across technology, business, and real-world scenarios.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    🧩 476+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍🎓 22K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Logical Reasoning",
      "Critical Thinking",
      "Analytical Thinking",
      "Decision Making",
      "Structured Problem Solving",
      "Creative Thinking",
    ].map((skill, i) => (
      <div
        key={i}
        className="p-4 bg-white/5 rounded-lg border border-white/10"
      >
        ✔ {skill}
      </div>
    ))}
  </div>
</div>


<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Popular Courses</h2>

  <div className="space-y-3">
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Problem Solving & Logical Thinking
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Data Structures & Algorithms Basics
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Advanced Problem Solving Techniques
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Problem Solving Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Improves decision-making skills",
      "Enhances logical and analytical thinking",
      "Essential for coding & tech interviews",
      "Applicable across all industries",
      "Boosts creativity and innovation",
      "Builds strong mental models",
    ].map((item, i) => (
      <div
        key={i}
        className="p-5 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl"
      >
        ⭐ {item}
      </div>
    ))}
  </div>
</div>


<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Career Opportunities
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      { role: "Software Engineer", salary: "₹8–25 LPA" },
      { role: "Data Analyst", salary: "₹6–18 LPA" },
      { role: "Business Analyst", salary: "₹8–20 LPA" },
    ].map((job, i) => (
      <div
        key={i}
        className="p-5 bg-white/5 rounded-xl border border-white/10"
      >
        <h3 className="font-semibold">{job.role}</h3>
        <p className="text-blue-400 mt-2">{job.salary}</p>
      </div>
    ))}
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Certifications You Can Earn
  </h2>

  <div className="flex flex-wrap gap-4">
    {[
      "Problem Solving Certification",
      "Algorithm Design Certification",
      "Data Structures Certification",
      "Logical Reasoning Certification",
    ].map((cert, i) => (
      <div
        key={i}
        className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20"
      >
        🎓 {cert}
      </div>
    ))}
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Tools & Technologies Covered
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[
      "Python",
      "C++",
      "LeetCode",
      "HackerRank",
    ].map((tool, i) => (
      <div
        key={i}
        className="p-4 bg-white/5 rounded-lg text-center border border-white/10"
      >
        {tool}
      </div>
    ))}
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Learning Path
  </h2>

  <div className="space-y-4">
    {[
      "Basic Logical Thinking",
      "Intermediate Problem Solving",
      "Algorithms & Data Structures",
      "Advanced Competitive Coding",
    ].map((step, i) => (
      <div
        key={i}
        className="p-4 bg-white/5 rounded-xl border border-white/10"
      >
        Step {i + 1}: {step}
      </div>
    ))}
  </div>
</div>

<div className="mt-20 text-center">
  <h2 className="text-3xl font-bold mb-4">
    Master Problem Solving Skills
  </h2>

  <p className="text-gray-400 mb-6">
    Strengthen your analytical thinking and unlock new career opportunities.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning
  </button>
</div>
</div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}