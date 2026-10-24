"use client";

export default function securityengineerpage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Security Engineer
</h1>

<p className="text-gray-400 max-w-2xl">
  Learn to design, implement, and manage secure systems, networks, and applications 
  to protect organizations from cyber threats and vulnerabilities.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    🔐 282+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💻 27K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Network Security",
      "Cloud Security (Azure/AWS)",
      "Identity & Access Management",
      "Threat Detection & Response",
      "Security Architecture Design",
      "Vulnerability Assessment",
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
      SC-200: Security Operations Analyst
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      SC-300: Identity and Access Administrator
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      AZ-500: Azure Security Engineer
    </div>
  </div>
</div>


<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Security Engineer Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "High-demand cybersecurity roles",
      "Hands-on labs & simulations",
      "Real-world security scenarios",
      "Industry-recognized certifications",
      "Enterprise-level security practices",
      "Advanced threat detection skills",
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
      { role: "Security Engineer", salary: "₹10–30 LPA" },
      { role: "Cloud Security Engineer", salary: "₹12–32 LPA" },
      { role: "Security Architect", salary: "₹18–40 LPA" },
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
      "AZ-500",
      "SC-200",
      "SC-300",
      "CISSP",
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
    Learning Path
  </h2>

  <div className="space-y-4">
    {[
      "Security Fundamentals",
      "Network & Cloud Security",
      "Threat Detection & Response",
      "Advanced Security Architecture",
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
    Become a Security Engineer
  </h2>

  <p className="text-gray-400 mb-6">
    Protect systems, prevent cyber attacks, and build a high-paying security career.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Start Learning Security Engineering
  </button>
</div>
</div>   {/* ← THIS WAS MISSING */}
    </section>
  );
}
