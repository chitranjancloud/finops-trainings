import React from "react";
import { CheckCircle, ArrowRight, Star, Zap, Shield, Rocket, Globe, Users } from "lucide-react";

// Enhanced Data with Icons and Meta
const featureData: any = {
  "expert-instructors": {
    title: "Expert Instructors",
    subtitle: "Elite Industry Mentorship",
    desc: "Don't just learn; apprentice under the architects of modern technology. Our mentors come from FAANG and Fortune 500 companies.",
    icon: <Users className="w-6 h-6" />,
    themeColor: "from-blue-500 to-blue-400",
    points: [
      "Exclusive 1-on-1 Office Hours",
      "Live Architectural Reviews",
      "Real-world Production Workflows",
      "Direct Network Referrals",
      "Technical Interview Simulation",
      "Executive Presence Coaching"
    ],
    stats: [
      { label: "Active Mentors", value: "17+" },
      { label: "Avg. Experience", value: "15y" },
      { label: "Student Rating", value: "4.9/5" }
    ]
  },
  "hands-on-learning": {
    title: "Hands-on Learning",
    subtitle: "Practical Mastery",
    desc: "Escape tutorial hell. Build production-grade applications in a cloud-native environment that mimics real engineering teams.",
    icon: <Zap className="w-6 h-6" />,
    themeColor: "from-yellow-400 to-orange-500",
    points: [
      "Integrated Cloud Sandboxes",
      "Micro-service Architecture Tasks",
      "CI/CD Pipeline Integration",
      "Collaborative Git Workflows",
      "Automated Code Quality Checks",
      "Capston Portfolio Projects"
    ],
    stats: [
      { label: "Deployments", value: "25k+" },
      { label: "Code Reviews", value: "100k+" },
      { label: "Cloud Hours", value: "âˆž" }
    ]
  },
  "industry-recognized": {
    title: "Industry Recognized",
    subtitle: "Global Gold Standard",
    desc: "Our credentials are more than just digital paper. They are verified benchmarks trusted by the world's leading tech recruiters.",
    icon: <Shield className="w-6 h-6" />,
    themeColor: "from-purple-500 to-pink-500",
    points: [
      "Blockchain-Verified Certificates",
      "University Partnerships",
      "LinkedIn Verified Skill Badges",
      "Recruiter Portal Access",
      "Standardized Skill Assessment",
      "Global Alumni Network"
    ],
    stats: [
      { label: "Accredited", value: "Yes" },
      { label: "Hiring Partners", value: "120+" },
      { label: "Global Reach", value: "45 Countries" }
    ]
  },
  "career-support": {
    title: "Career Support",
    subtitle: "Your Success, Engineered",
    desc: "Our job doesn't end at graduation. We work with you until you're signed, sealed, and delivered to your dream role.",
    icon: <Rocket className="w-6 h-6" />,
    themeColor: "from-green-400 to-emerald-600",
    points: [
      "AI-Powered Resume Optimization",
      "Behavioral Interview Coaching",
      "Priority Job Board Access",
      "Salary Negotiation Support",
      "Personal Branding Workshops",
      "Lifetime Career Updates"
    ],
    stats: [
      { label: "Avg. Salary Hike", value: "65%" },
      { label: "Placement Rate", value: "92%" },
      { label: "Hiring Events", value: "Monthly" }
    ]
  },
  "flexible-learning": {
    title: "Flexible Learning",
    subtitle: "Learn on Your Terms",
    desc: "Life doesn't pause for learning â€” so we built a platform that fits your schedule, your pace, and your goals.",
    icon: <Globe className="w-6 h-6" />,
    themeColor: "from-cyan-400 to-blue-500",
    points: [
      "Self-Paced Video Modules",
      "Live Weekend Batches",
      "Recorded Session Replays",
      "Mobile-Friendly Platform",
      "Pause & Resume Anytime",
      "Lifetime Access to Content"
    ],
    stats: [
      { label: "Learning Modes", value: "3+" },
      { label: "Avg. Completion", value: "94%" },
      { label: "Mobile Users", value: "60%" }
    ]
  },
  "community-access": {
    title: "Community Access",
    subtitle: "Grow Together",
    desc: "Join a thriving network of 2000+ learners, alumni, and industry professionals who support and elevate each other.",
    icon: <Users className="w-6 h-6" />,
    themeColor: "from-violet-500 to-purple-600",
    points: [
      "Private Alumni Network",
      "Peer Study Groups",
      "Weekly Live Q&A Sessions",
      "Industry Expert AMAs",
      "Job Referral Network",
      "Community Events & Hackathons"
    ],
    stats: [
      { label: "Active Members", value: "2000+" },
      { label: "Weekly Events", value: "3+" },
      { label: "Countries", value: "15+" }
    ]
  }
};

export default async function FeaturePage({ params }: any) {
  const { slug } = await params;
  const data = featureData[slug] || featureData["expert-instructors"];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/20">
      
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/8 blur-[120px]`} />
        <div className={`absolute bottom-[10%] -right-[10%] w-[30%] h-[30%] rounded-full bg-blue-600/10 blur-[120px]`} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24">
        
        {/* HERO SECTION */}
        <header className="max-w-3xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm font-medium text-purple-200 tracking-wide uppercase">Feature Spotlight</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 tracking-tight">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${data.themeColor}`}>
              {data.title}
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 leading-relaxed">
            {data.desc}
          </p>
        </header>

        {/* STATS BENTO GRID */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {data.stats.map((item: any, i: number) => (
            <div 
              key={i} 
              className="group relative p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden"
            >
              <div className="relative z-10">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-2">{item.label}</p>
                <h3 className="text-4xl font-bold text-white group-hover:scale-105 transition-transform duration-500">{item.value}</h3>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${data.themeColor} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />
            </div>
          ))}
        </div>

        {/* FEATURES GRID */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-32">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
              <span className={`p-3 rounded-2xl bg-gradient-to-br ${data.themeColor} text-white shadow-lg`}>
                {data.icon}
              </span>
              Everything you need to scale
            </h2>
            <div className="grid sm:grid-cols-1 gap-4">
              {data.points.map((p: string, i: number) => (
                <div 
                  key={i} 
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all"
                >
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-lg text-slate-300 group-hover:text-white transition-colors">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* VISUAL ELEMENT / CARD INTERACTIVE */}
          <div className="relative group">
             <div className={`absolute inset-0 bg-gradient-to-r ${data.themeColor} blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity`} />
             <div className="relative aspect-video rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl p-8 flex flex-col justify-center items-center text-center">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${data.themeColor} flex items-center justify-center mb-6 shadow-2xl`}>
                    <Star className="text-white w-10 h-10 fill-current" />
                </div>
                <h4 className="text-2xl font-bold mb-2">{data.subtitle}</h4>
                <p className="text-slate-400 max-w-xs">Experience the premium standard of modern education.</p>
             </div>
          </div>
        </div>

        {/* FINAL CTA */}
        <div className="relative rounded-[40px] overflow-hidden bg-white text-black p-12 text-center shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
          <div className="relative z-10">
            <h2 className="text-4xl font-black mb-6">Ready to transform your career?</h2>
            <p className="text-gray-600 mb-10 max-w-xl mx-auto text-lg font-medium">
              Join thousands of professionals who have already stepped into the future of tech.
            </p>
            {![
              "expert-instructors",
              "hands-on-learning",
              "industry-recognized",
              "career-support",
              "flexible-learning",
              "community-access",
            ].includes(slug) && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/courses"
                  className="px-10 py-5 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-105 transition-transform"
                >
                  Get Started Now <ArrowRight size={20} />
                </a>
                <button className="px-10 py-5 bg-transparent border-2 border-black/10 rounded-2xl font-bold hover:bg-black/5 transition-colors">
                  View Curriculum
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}