"use client";

export default function artificialintelligencepage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Artificial Intelligence (AI)
</h1>

<p className="text-gray-400 max-w-2xl">
  Learn cutting-edge AI technologies including machine learning, deep learning,
  and generative AI to build intelligent systems and future-ready applications.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    🤖 428+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💻 30K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Machine Learning",
      "Deep Learning",
      "Natural Language Processing (NLP)",
      "Computer Vision",
      "Generative AI (ChatGPT, LLMs)",
      "AI Model Deployment",
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
      Machine Learning with Python
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Deep Learning Specialization
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Generative AI & ChatGPT Development
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose AI Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Real-world AI projects",
      "Hands-on model building",
      "Industry-relevant tools & frameworks",
      "High-demand career skills",
      "Expert-led training",
      "Future-proof technology domain",
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
      { role: "AI Engineer", salary: "₹12–30 LPA" },
      { role: "Data Scientist", salary: "₹10–28 LPA" },
      { role: "ML Engineer", salary: "₹12–32 LPA" },
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
      "Microsoft AI Engineer",
      "AWS AI/ML Certification",
      "Google ML Certification",
      "Deep Learning Specialization",
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
    Tools & Frameworks Covered
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[
      "Python",
      "TensorFlow",
      "PyTorch",
      "OpenAI API",
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
      "AI Fundamentals",
      "Machine Learning",
      "Deep Learning",
      "Generative AI & Deployment",
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
    Build Your Career in AI
  </h2>

  <p className="text-gray-400 mb-6">
    Learn AI from scratch and become industry-ready with real-world projects.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning AI
  </button>
</div>
 </div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}
  
