"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

export default function AboutPage() {
  const router = useRouter(); // ✅ ADD THIS LINE
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">

      {/* 🔥 BACKGROUND GLOW */}
      <div className="absolute w-[600px] h-[600px] bg-blue-500/20 blur-[160px] rounded-full -top-40 -left-40"></div>
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[140px] rounded-full top-1/2 right-0"></div>

      {/* 🔥 HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">

        <div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            About <span className="text-blue-400">FinOps Trainings</span>
          </h1>

          <p className="text-gray-400 mb-6 text-lg">
           Welcome to Finops-training– your passport to the world of IT excellence! We're excited to have you join our vibrant community of learners, innovators, and tech enthusiasts.

At CloudEdufy, our journey began in 2023 with a clear mission in mind: to bridge the gap between theoretical knowledge and real-world skills. We're not just another IT training company; we're your partners in embracing the possibilities of technology and carving out a successful path in the digital landscape.
          </p>

          <p className="mb-8 text-white/80">
            We empower professionals to achieve{" "}
            <span className="text-blue-400 font-semibold">Money</span>,{" "}
            <span className="text-blue-400 font-semibold">Respect</span>,{" "}
            <span className="text-blue-400 font-semibold">Peace of Mind</span>.
          </p>

          <button className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-500 hover:scale-105 transition shadow-lg shadow-blue-500/20">
            Download Company Profile
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
          {/* Educational video placeholder — swap ABOUT_VIDEO_URL with a real YouTube embed URL when ready */}
          {(() => {
            const ABOUT_VIDEO_URL = ""; // ← Paste YouTube embed URL here when ready
            return ABOUT_VIDEO_URL ? (
              <iframe
                src={ABOUT_VIDEO_URL}
                title="About FinOps Trainings"
                className="w-full aspect-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-900/40 to-slate-900">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-sm">FinOps Trainings — About Us</p>
                  <p className="text-gray-500 text-xs mt-1">Educational overview video coming soon</p>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* 🔥 NAV TABS */}
    

<div className="max-w-5xl mx-auto px-6 mb-16">
  <div className="flex flex-wrap justify-center gap-3 bg-white/5 p-2 rounded-full border border-white/10 backdrop-blur-xl">

    {[
      "Overview",
      "Our Story",
      "Leadership",
      "Our Clientele",
      "Partners",
      "Feedback",
    ].map((item) => (
      <button
        key={item}
       onClick={() => {
  if (item === "Partners") {
    router.push("/partners");
  } 
  else if (item === "Feedback") {
    router.push("/feedback"); // 🔥 ADD THIS
  } 
  else {
    setActiveTab(item);
  }
}}
        className={`px-5 py-2 rounded-full text-sm transition ${
          activeTab === item
            ? "bg-blue-500 text-white"
            : "text-gray-300 hover:bg-blue-500/20 hover:text-white"
        }`}
      >
        {item}
      </button>
    ))}

  </div>
</div>

      {/* 🔥 MAIN CONTENT (ONLY ONE CONTROLLED SECTION) */}
      <section className="max-w-7xl mx-auto px-6 pb-24">

        {/* ✅ OVERVIEW */}
        {activeTab === "Overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur-xl overflow-hidden">
              {/* Global Learning World Map Visual */}
              <div className="relative w-full aspect-[16/9] flex flex-col items-center justify-center bg-gradient-to-br from-[#0d1b3e] to-[#0a1628] rounded-xl overflow-hidden">
                {/* Grid dots background */}
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: "radial-gradient(circle, #4d8bff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
                {/* Glowing continents SVG */}
                <svg viewBox="0 0 800 420" className="w-full h-full absolute inset-0 opacity-60" xmlns="http://www.w3.org/2000/svg">
                  {/* Americas */}
                  <ellipse cx="195" cy="160" rx="70" ry="90" fill="#1e40af" opacity="0.5" />
                  <ellipse cx="220" cy="280" rx="50" ry="70" fill="#1e40af" opacity="0.4" />
                  {/* Europe */}
                  <ellipse cx="400" cy="130" rx="55" ry="55" fill="#2563eb" opacity="0.55" />
                  {/* Africa */}
                  <ellipse cx="420" cy="260" rx="55" ry="80" fill="#1d4ed8" opacity="0.45" />
                  {/* Asia */}
                  <ellipse cx="580" cy="140" rx="110" ry="80" fill="#3b82f6" opacity="0.5" />
                  {/* Australia */}
                  <ellipse cx="640" cy="300" rx="55" ry="45" fill="#2563eb" opacity="0.4" />
                  {/* Connection lines */}
                  <line x1="195" y1="160" x2="400" y2="130" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  <line x1="400" y1="130" x2="580" y2="140" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  <line x1="580" y1="140" x2="640" y2="300" stroke="#60a5fa" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
                  {/* Ping dots */}
                  <circle cx="195" cy="160" r="5" fill="#60a5fa"><animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/></circle>
                  <circle cx="400" cy="130" r="5" fill="#a78bfa"><animate attributeName="r" values="5;9;5" dur="2.3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="2.3s" repeatCount="indefinite"/></circle>
                  <circle cx="580" cy="140" r="5" fill="#34d399"><animate attributeName="r" values="5;9;5" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="1.8s" repeatCount="indefinite"/></circle>
                  <circle cx="640" cy="300" r="5" fill="#60a5fa"><animate attributeName="r" values="5;9;5" dur="2.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite"/></circle>
                  <circle cx="420" cy="260" r="5" fill="#fbbf24"><animate attributeName="r" values="5;9;5" dur="2.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.3;1" dur="2.1s" repeatCount="indefinite"/></circle>
                </svg>
                <div className="relative z-10 text-center">
                  <p className="text-blue-300 font-bold text-sm tracking-widest uppercase">Global Learning Network</p>
                  <p className="text-gray-500 text-xs mt-1">Learners across 20+ countries</p>
                </div>
              </div>
            </div>

            <div className="text-gray-400 space-y-6 text-lg">
              <p>
               In the year 2018, a passionate individual named Ganesh had a vision. He aimed to empower
               aspiring IT professionals to chase their dreams. With determination burning in his heart,
                Ganesh started a small job alert group. It was a cozy space where like-minded folksgathered,
                 all with the same goal.
              </p>
              <p>
                Initially, it was a simple initiative – helping job seekers find their footing in the IT world. Little did Ganesh know that this tiny seed would grow into something extraordinary?
              </p>
              <p>
                Through sheer dedication and unwavering resolve, the job alert group gained momentum. It turned into a hub for both IT job seekers and recruiters. Ganesh's sincerity in offering real opportunities and personal support earned him the community's trust.
              </p>
            </div>

          </motion.div>
        )}

{/* 🔥 our story */}
    {activeTab === "Our Story" && (
  <motion.div
    key="story"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-16"
  >
    {/* HEADER */}
    <div className="text-center space-y-4">
      <h2 className="text-5xl font-bold tracking-tight">
        Our <span className="text-blue-500">Story</span>
      </h2>
      <p className="text-gray-400 max-w-2xl mx-auto text-lg">
        The journey behind FinOps Trainings — built on passion, expertise, and a commitment to transforming careers.
      </p>
    </div>

    {/* STORY CONTENT */}
    <div className="space-y-8 max-w-4xl mx-auto">

      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl">
        <h3 className="text-blue-400 font-bold text-xl mb-4">The Beginning</h3>
        <p className="text-gray-300 leading-relaxed text-lg">
          FinOps Trainings was founded with a singular vision: to bridge the gap between theoretical knowledge and real-world industry demands. What began as a small initiative to help IT professionals upskill quickly grew into a full-fledged training institute trusted by learners across India and beyond.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-xl">
        <h3 className="text-blue-400 font-bold text-xl mb-4">Our Mission</h3>
        <p className="text-gray-300 leading-relaxed text-lg">
          At FinOps Trainings, our mission is to empower professionals with the skills, certifications, and confidence to thrive in the modern technology landscape. We are committed to delivering premium, outcome-driven training that translates into real career growth — not just certificates.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-blue-400 font-bold text-lg mb-3">Practical, Industry-First Training</h3>
          <p className="text-gray-400 leading-relaxed">
            Every program at FinOps Trainings is designed in close collaboration with industry practitioners. We don't teach from textbooks alone — we bring live use cases, real-world labs, and hands-on projects that prepare you for the job from day one.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-blue-400 font-bold text-lg mb-3">Career-Focused Outcomes</h3>
          <p className="text-gray-400 leading-relaxed">
            We measure our success by yours. With dedicated placement support, resume guidance, mock interviews, and direct connections to hiring companies, we stand behind every learner until they achieve their career goal.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-blue-400 font-bold text-lg mb-3">Expert-Led Learning</h3>
          <p className="text-gray-400 leading-relaxed">
            Our trainers are not just educators — they are working professionals with deep domain expertise. With an average of 15+ years of industry experience, they bring current, relevant, and actionable knowledge to every session.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
          <h3 className="text-blue-400 font-bold text-lg mb-3">A Community of Growth</h3>
          <p className="text-gray-400 leading-relaxed">
            Beyond training, FinOps Trainings has built a community of over 2000 learners, alumni, mentors, and hiring partners. Together, we grow, share, and create opportunities for each other.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600/15 to-purple-600/10 border border-blue-500/20 p-8 rounded-2xl backdrop-blur-xl">
        <h3 className="text-white font-bold text-xl mb-4">Where We Are Today</h3>
        <p className="text-gray-300 leading-relaxed text-lg">
          Today, FinOps Trainings operates from Pune with a growing network of 100+ corporate clients, 20+ expert trainers, and 5000+ hiring company connections. We offer live online, classroom, and 1-on-1 training formats — all designed around one goal: your success in the digital economy.
        </p>
      </div>
    </div>

  </motion.div>
)}

{/* 🔥 LEADERSHIP (PREMIUM) */}
{activeTab === "Leadership" && (
  <motion.div
    key="leadership"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-16"
  >
    {/* HEADER */}
    <div className="text-center">
      <h2 className="text-4xl font-bold mb-4">
        Meet Our <span className="text-blue-500">Leadership</span>
      </h2>
      <p className="text-gray-400 max-w-2xl mx-auto">
        Visionary leaders driving excellence, innovation, and career transformation at FinOps Trainings.
      </p>
    </div>

    {/* CARDS GRID */}
    <div className="grid sm:grid-cols-2 gap-8 max-w-2xl mx-auto">

      {[
        { name: "Vinod Sir", role: "CEO, FinOps Training" },
        { name: "Ganesh G", role: "Executive Director, FinOps Training" },
      ].map((person, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl hover:scale-[1.03] transition"
        >
          {/* IMAGE PLACEHOLDER */}
          <div className="h-[220px] bg-gradient-to-br from-blue-600/20 to-blue-500/10 flex flex-col items-center justify-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/40 to-purple-500/30 border border-white/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium">Photo Coming Soon</p>
          </div>

          {/* INFO */}
          <div className="p-5 text-center">
            <h3 className="font-semibold text-white text-lg group-hover:text-blue-400 transition">
              {person.name}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {person.role}
            </p>
          </div>

          {/* HOVER GLOW */}
          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition rounded-2xl"></div>
        </motion.div>
      ))}

    </div>

  </motion.div>
)}

{/* 🔥 CLIENTELE */}
        {activeTab === "Our Clientele" && (
          <motion.div
            key="clientele"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >

            <h2 className="text-3xl font-bold text-center mb-12">
              Our Valuable Clients
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">

              {[
                "Chevron","TCS","HCLTech","Microsoft","Capgemini","NTT Data",
                "PwC","Dell","United Nations","HSBC","NHS","AB InBev",
                "Aramco","Shell","Cognizant","Infosys","Wipro","Adobe","Google","EY",
              ].map((client, i) => (
                <div
                  key={i}
                  className="group relative bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-center text-center
                  transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]
                  hover:border-blue-500/30 hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)]"
                >
                  <div className="absolute inset-0 rounded-xl bg-blue-500/0 group-hover:bg-blue-500/10 blur-xl transition"></div>

                  <span className="relative text-sm font-medium text-gray-300 group-hover:text-white">
                    {client}
                  </span>
                </div>
              ))}

            </div>

          </motion.div>
        )}

        {/* 🔹 OTHER TABS */}
        {activeTab !== "Overview" && activeTab !== "Our Clientele" && (
          <motion.div
            key="other"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 text-lg"
          >
            {activeTab} content coming soon...
          </motion.div>
        )}

      </section>

      {/* 🔥 STATS */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-6 mb-28">

        {[
          "30+ Years",
          "30,000+ Students",
          "99.1% Success",
          "300+ Trainers",
          "5,000+ Courses",
        ].map((item, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center shadow-lg hover:shadow-blue-500/20 transition"
          >
            <p className="text-blue-400 font-semibold text-lg">{item}</p>
          </motion.div>
        ))}

      </section>


      

    </div>
  );
}