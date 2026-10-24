"use client";

export default function azurepage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Microsoft Azure
</h1>

<p className="text-gray-400 max-w-2xl">
  Master cloud computing with Microsoft Azure, including infrastructure, DevOps, 
  security, and scalable cloud solutions for modern enterprises.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    ☁️ 113+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💻 35K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Azure Fundamentals",
      "Cloud Architecture",
      "Virtual Machines & Networking",
      "Azure DevOps",
      "Cloud Security",
      "Serverless Computing",
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
      AZ-900: Azure Fundamentals
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      AZ-104: Azure Administrator
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      AZ-305: Azure Solutions Architect
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Azure Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "High-demand cloud skills",
      "Hands-on labs & real projects",
      "Industry-recognized certifications",
      "Enterprise cloud use cases",
      "DevOps & automation focus",
      "Scalable architecture training",
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
      { role: "Cloud Engineer", salary: "₹10–28 LPA" },
      { role: "Azure Administrator", salary: "₹8–20 LPA" },
      { role: "Cloud Architect", salary: "₹15–35 LPA" },
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
      "AZ-900",
      "AZ-104",
      "AZ-305",
      "AZ-500",
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
      "Azure Portal",
      "Azure DevOps",
      "Kubernetes (AKS)",
      "Azure Functions",
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
      "Azure Fundamentals",
      "Cloud Administration",
      "DevOps & Automation",
      "Advanced Architecture",
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
    Become a Cloud Expert with Azure
  </h2>

  <p className="text-gray-400 mb-6">
    Learn cloud computing and build scalable applications with Azure.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning Azure
  </button>
</div>
</div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}