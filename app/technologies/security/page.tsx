"use client";

export default function SecurityPage() {
  return (
    <section className="bg-black text-white min-h-screen py-20 px-6">

      <div className="max-w-6xl mx-auto space-y-12">
      <h1 className="text-4xl font-bold text-blue-400 mb-4">
  Cyber Security
</h1>

<p className="text-gray-400 max-w-2xl">
  Protect systems, networks, and data from cyber threats with industry-leading
  security practices, tools, and certifications.
</p>

<div className="flex gap-4 mt-6">
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    🛡 393+ Courses
  </div>
  <div className="px-4 py-2 bg-white/5 rounded-lg border border-white/10">
    👨‍💻 25K+ Learners
  </div>
</div>

<div className="mt-12">
  <h2 className="text-xl font-semibold mb-4">Skills Covered</h2>

  <div className="grid md:grid-cols-2 gap-4">
    {[
      "Network Security",
      "Ethical Hacking",
      "Cloud Security",
      "Penetration Testing",
      "Identity & Access Management",
      "Security Operations (SOC)",
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
      CEH v12 – Certified Ethical Hacker
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      CompTIA Security+
    </div>
    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
      CISSP – Security Professional
    </div>
  </div>
</div>

<div className="mt-16">
  <h2 className="text-2xl font-semibold mb-6">
    Why Choose Security Training
  </h2>

  <div className="grid md:grid-cols-3 gap-6">
    {[
      "Hands-on hacking labs",
      "Real-world attack simulations",
      "Industry-recognized certifications",
      "Live threat analysis training",
      "Enterprise-level security use cases",
      "Career-focused curriculum",
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
      { role: "Cyber Security Analyst", salary: "₹8–20 LPA" },
      { role: "Penetration Tester", salary: "₹10–25 LPA" },
      { role: "SOC Analyst", salary: "₹6–15 LPA" },
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
      "CEH",
      "CISSP",
      "CompTIA Security+",
      "ISO 27001",
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
      "Kali Linux",
      "Wireshark",
      "Metasploit",
      "Nmap",
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
      "Security Fundamentals",
      "Ethical Hacking Basics",
      "Advanced Penetration Testing",
      "Security Operations & Monitoring",
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
    Become a Cyber Security Expert
  </h2>

  <p className="text-gray-400 mb-6">
    Learn ethical hacking, protect systems, and build a high-paying career.
  </p>

  <button className="px-8 py-3 bg-blue-500 rounded-full hover:scale-105 transition">
    Enroll Now
  </button>
</div>
      </div>
    </section>
  );
}