"use client";

export default function powerplatformpage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Microsoft Power Platform
</h1>

<p className="text-gray-400 max-w-2xl">
  Build powerful business applications, automate workflows, and analyze data 
  using Microsoft Power Platform tools like Power BI, Power Apps, and Power Automate.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    ⚡ 152+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💼 28K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Power BI Data Analytics",
      "Power Apps Development",
      "Workflow Automation",
      "Business Intelligence",
      "Low-Code Application Development",
      "Data Integration & Visualization",
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
      PL-300: Power BI Data Analyst
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      PL-900: Power Platform Fundamentals
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      PL-200: Power Platform Functional Consultant
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Power Platform Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Low-code / no-code development",
      "Rapid app deployment",
      "Automation of business processes",
      "Strong demand in enterprises",
      "Integration with Microsoft ecosystem",
      "Data-driven decision making",
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
      { role: "Power BI Developer", salary: "₹8–22 LPA" },
      { role: "Business Analyst", salary: "₹8–20 LPA" },
      { role: "Power Platform Developer", salary: "₹10–25 LPA" },
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
      "PL-900",
      "PL-300",
      "PL-200",
      "PL-400",
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
    Tools & Services Covered
  </h2>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[
      "Power BI",
      "Power Apps",
      "Power Automate",
      "Dataverse",
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
      "Power Platform Fundamentals",
      "App Development & Automation",
      "Data Analytics & Visualization",
      "Advanced Power Platform Solutions",
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
    Build Business Apps Without Coding
  </h2>

  <p className="text-gray-400 mb-6">
    Learn Power Platform and transform business processes with automation.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning Power Platform
  </button>
</div>
</div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}