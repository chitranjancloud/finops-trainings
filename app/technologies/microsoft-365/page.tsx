"use client";

export default function Microsoft365Page() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-bold text-blue-400">
            Microsoft 365
          </h1>
          <p className="text-gray-400 mt-4 max-w-2xl">
            Master productivity, collaboration, and enterprise tools using Microsoft 365 ecosystem.
          </p>
        </div>

        {/* STATS */}
        <div className="flex gap-6 flex-wrap">
          <div className="bg-white/5 px-6 py-3 rounded-xl">
            📚 156+ Courses
          </div>
          <div className="bg-white/5 px-6 py-3 rounded-xl">
            👨‍🎓 10K+ Learners
          </div>
        </div>

        {/* SKILLS */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Skills Covered
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {["Teams", "SharePoint", "Exchange", "Office"].map((item, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-xl">
                ✔ {item}
              </div>
            ))}
          </div>
        </div>

        {/* COURSES */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">
            Popular Courses
          </h2>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-xl">
              MS-900: Microsoft 365 Fundamentals
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              MS-102: Microsoft 365 Administrator
            </div>
          </div>
        </div>

        <div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Microsoft 365 Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Industry-recognized certifications",
      "Hands-on real-world projects",
      "Expert-led live training",
      "Enterprise-level use cases",
      "Career-focused curriculum",
      "24/7 learning support",
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
      { role: "Microsoft 365 Admin", salary: "₹8–18 LPA" },
      { role: "Cloud Engineer", salary: "₹10–25 LPA" },
      { role: "IT Support Specialist", salary: "₹6–12 LPA" },
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
      "MS-900",
      "MS-102",
      "AZ-900",
      "SC-300",
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
      "Microsoft Teams",
      "SharePoint",
      "Exchange Online",
      "Power Platform",
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
      "Fundamentals (MS-900)",
      "Administration (MS-102)",
      "Security & Compliance",
      "Advanced Enterprise Setup",
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
    Start Your Microsoft 365 Journey Today
  </h2>

  <p className="text-gray-400 mb-6">
    Join thousands of learners and upgrade your career.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Enroll Now
  </button>
</div>

      </div>

    </section>
  );
}