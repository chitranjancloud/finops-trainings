"use client";

export default function artificialintelligencepage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Computational Thinking (CT)
</h1>

<p className="text-gray-400 max-w-2xl">
  Develop problem-solving skills using computational logic, algorithms, and structured thinking 
  to tackle complex real-world challenges efficiently.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    🧠 476+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍🎓 20K+ Learners
  </div>
</div>


<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Problem Decomposition",
      "Algorithm Design",
      "Logical Thinking",
      "Pattern Recognition",
      "Abstraction Techniques",
      "Data Representation",
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
      Introduction to Computational Thinking
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Algorithms & Problem Solving
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Data Structures Basics
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Computational Thinking
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Strong problem-solving foundation",
      "Essential for programming & AI",
      "Improves analytical thinking",
      "Applicable across industries",
      "Enhances logical reasoning",
      "Builds structured mindset",
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
      { role: "Software Developer", salary: "₹8–20 LPA" },
      { role: "Data Analyst", salary: "₹6–15 LPA" },
      { role: "System Analyst", salary: "₹7–18 LPA" },
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
      "Programming Fundamentals",
      "Algorithm Certification",
      "Data Structures Certification",
      "Problem Solving Certification",
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
      "Scratch",
      "Flowcharts",
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
      "Problem Decomposition",
      "Algorithm Design",
      "Advanced Problem Solving",
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
    Start Thinking Like a Developer
  </h2>

  <p className="text-gray-400 mb-6">
    Build strong problem-solving skills and prepare for advanced technologies.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning
  </button>
</div>
</div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}