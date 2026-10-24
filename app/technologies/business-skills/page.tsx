"use client";

export default function BusinessSkillsPage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Business Skills
</h1>

<p className="text-gray-400 max-w-2xl">
  Build leadership, communication, and strategic thinking skills to excel in
  modern business environments and accelerate your career growth.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    📚 910+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💼 40K+ Learners
  </div>
</div>
      
      <div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Leadership & Management",
      "Communication Skills",
      "Strategic Thinking",
      "Decision Making",
      "Time Management",
      "Emotional Intelligence",
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
      Leadership Essentials for Managers
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Effective Communication Masterclass
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      Strategic Business Planning
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Business Skills Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Real-world business case studies",
      "Leadership & executive coaching",
      "Interactive workshops & simulations",
      "Career advancement focused",
      "Industry-relevant curriculum",
      "Soft skills + strategic thinking blend",
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
      { role: "Business Analyst", salary: "₹8–18 LPA" },
      { role: "Project Manager", salary: "₹10–25 LPA" },
      { role: "Operations Manager", salary: "₹9–20 LPA" },
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
      "PMP",
      "Six Sigma",
      "Business Analysis Certification",
      "Leadership Certification",
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
    Tools & Platforms Covered
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[
      "MS Excel",
      "PowerPoint",
      "JIRA",
      "Notion",
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
      "Business Fundamentals",
      "Communication & Leadership",
      "Strategic Thinking",
      "Advanced Management Skills",
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
    Become a Business Leader
  </h2>

  <p className="text-gray-400 mb-6">
    Upgrade your professional skills and grow into leadership roles.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Enroll Now
  </button>
  </div>   {/* ← THIS WAS MISSING */}
      </div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}
  