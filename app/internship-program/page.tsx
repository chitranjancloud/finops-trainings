"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  FiArrowRight,
  FiAward,
  FiBarChart,
  FiBriefcase,
  FiCheckCircle,
  FiCode,
  FiPenTool,
  FiUpload,
  FiUsers,
  FiX,
  FiZap,
} from "react-icons/fi";

const categories = ["All Programs", "Development", "Data Science", "Design", "Marketing", "Business"];

const internships = [
  {
    title: "Cloud FinOps Engineer",
    icon: <FiCode />,
    color: "from-purple-500 to-indigo-600",
    tag: "Popular",
    stipend: "",
  },
  {
    title: "FinOps Analyst",
    icon: <FiBarChart />,
    color: "from-emerald-400 to-blue-500",
    tag: "Trending",
    stipend: "",
  },
  {
    title: "Cloud Cost Optimization Consultant",
    icon: <FiPenTool />,
    color: "from-orange-400 to-rose-500",
    tag: "New",
    stipend: "",
  },
  {
    title: "FinOps Operations Manager",
    icon: <FiZap />,
    color: "from-blue-400 to-indigo-500",
    tag: "New",
    stipend: "",
  },
];

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  interestedPosition: "",
  currentEducation: "",
  skills: "",
  additionalMessage: "",
};

function authPayload() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    userId: user._id || "",
    sessionToken: localStorage.getItem("sessionToken") || "",
    deviceId: localStorage.getItem("deviceId") || "",
  };
}

export default function InternshipPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [selectedPosition, setSelectedPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const openForm = (position = "") => {
    setSelectedPosition(position);
    setForm((prev) => ({ ...prev, interestedPosition: position }));
    setMessage("");
    setFormOpen(true);
  };

  const updateForm = (key: keyof typeof emptyForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadResume = async () => {
    if (!resumeFile) throw new Error("Resume upload is required.");

    const formData = new FormData();
    formData.append("file", resumeFile);
    formData.append("folder", "finops/internship-resumes");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "Resume upload failed.");
    }

    return data.url as string;
  };

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");

    try {
      setSubmitting(true);
      const resumeUrl = await uploadResume();

      const res = await fetch("/api/internship-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          ...authPayload(),
          resumeUrl,
          resumeName: resumeFile?.name || "",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || "Application submission failed.");
      }

      setMessageType("success");
      setMessage("Application submitted successfully. Admin will review your resume and status.");
      setForm(emptyForm);
      setResumeFile(null);
      setSelectedPosition("");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error.message || "Application submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0f172a] text-white overflow-hidden font-sans">
      <section className="relative px-6 md:px-20 py-24 flex flex-col md:flex-row items-center gap-12 overflow-visible">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-600/15 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 z-10"
        >
          <span className="text-blue-400 font-semibold tracking-widest text-xs uppercase mb-4 block">
            Internship Programs
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
            Kickstart Your Career With <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-300">
              Real-World Experience
            </span>
          </h1>
          <p className="text-gray-400 mt-6 text-lg max-w-lg leading-relaxed">
            Industry-oriented internships that help you learn, build and grow with expert mentors and real projects.
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <button
              onClick={() => document.getElementById("internship-programs")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 transition-all rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
            >
              Explore Internships <FiArrowRight />
            </button>
            <button
              onClick={() => document.getElementById("internship-programs")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-bold transition-all backdrop-blur-sm"
            >
              How It Works
            </button>
          </div>

          <div className="flex flex-wrap gap-6 mt-12">
            {[
              { icon: <FiCheckCircle />, text: "Real Projects" },
              { icon: <FiUsers />, text: "Expert Mentors" },
              { icon: <FiAward />, text: "Certificate" },
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                <span className="text-blue-400">{feat.icon}</span> {feat.text}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex-1 z-10"
        >
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <Image src="/hero.jpg" alt="Students" width={600} height={500} className="object-cover" />
          </div>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-6 -right-6 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl hidden md:block"
          >
            <p className="text-xs text-gray-400">Students Trained</p>
            <p className="text-xl font-bold">5000+</p>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, delay: 1 }}
            className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl hidden md:block"
          >
            <p className="text-xs text-gray-400">Satisfaction Rate</p>
            <p className="text-xl font-bold">96% ⭐</p>
          </motion.div>
        </motion.div>
      </section>

      <section id="internship-programs" className="bg-white text-[#0b0f1a] py-24 px-6 md:px-20 rounded-t-[60px] -mt-10 relative z-20">
        <div className="text-center mb-12">
          <p className="text-blue-600 font-bold text-sm uppercase tracking-widest mb-2">Our Internships</p>
          <h2 className="text-4xl font-extrabold">Explore Top Internship Programs</h2>
          <p className="text-gray-500 mt-2">Choose from a wide range of internships across in-demand technologies.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-16">
          {categories.map((cat, i) => (
            <button
              key={i}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                i === 0 ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {internships.map((job, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -10 }}
              className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xl shadow-gray-100 hover:shadow-2xl transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${job.color} text-white text-2xl shadow-lg`}>
                  {job.icon}
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded-full tracking-tighter">
                  {job.tag}
                </span>
              </div>

              <h3 className="text-xl font-bold mb-4">{job.title} Internship</h3>

              <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-500 border-t border-gray-50 pt-4 mb-6">
                <div className="flex flex-col"><span className="text-[10px] uppercase font-semibold text-gray-400">Duration</span> 3 Months</div>
                <div className="flex flex-col"><span className="text-[10px] uppercase font-semibold text-gray-400">Mode</span> Remote</div>
                <div className="flex flex-col"><span className="text-[10px] uppercase font-semibold text-gray-400">Stipend</span> {job.stipend}</div>
              </div>

              <button
                onClick={() => openForm(`${job.title} Internship`)}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Apply Now <FiArrowRight />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-24 py-12 border-t border-gray-100">
          {[
            { label: "Students", val: "5000+", icon: <FiUsers className="text-blue-500" /> },
            { label: "Expert Mentors", val: "200+", icon: <FiAward className="text-emerald-500" /> },
            { label: "Hiring Partners", val: "1000+", icon: <FiBriefcase className="text-orange-500" /> },
            { label: "Placement Rate", val: "96%", icon: <FiZap className="text-blue-500" /> },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="text-3xl mb-1">{stat.icon}</div>
              <h4 className="text-3xl font-black">{stat.val}</h4>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-20 py-20 bg-white">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] p-12 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 right-0 p-12 opacity-20 transform translate-x-1/4 -translate-y-1/4">
            <FiZap size={200} />
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Ready to Launch Your Career?</h2>
          <p className="text-blue-100 mb-10 max-w-2xl mx-auto text-lg">Join thousands of learners who are building their future with our industry-led internships.</p>

          <button
            onClick={() => openForm(selectedPosition)}
            className="bg-white text-blue-600 px-12 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-3 mx-auto"
          >
            Apply Now <FiArrowRight />
          </button>
        </motion.div>
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm px-4 py-8 overflow-y-auto">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 p-6">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Internship Application</p>
                <h3 className="mt-1 text-2xl font-black">Apply for Internship Program</h3>
                <p className="mt-2 text-sm text-slate-500">
                  You must be enrolled in at least one course before applying.
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close application form"
              >
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={submitApplication} className="p-6">
              {message && (
                <div
                  className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    messageType === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name" value={form.fullName} onChange={(value) => updateForm("fullName", value)} required />
                <Field label="Email" type="email" value={form.email} onChange={(value) => updateForm("email", value)} required />
                <Field label="Phone Number" value={form.phone} onChange={(value) => updateForm("phone", value)} required />
                <Field label="Interested Position" value={form.interestedPosition} onChange={(value) => updateForm("interestedPosition", value)} required />
                <Field label="Current Education" value={form.currentEducation} onChange={(value) => updateForm("currentEducation", value)} required />
                <Field label="Skills" value={form.skills} onChange={(value) => updateForm("skills", value)} required />

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Resume Upload</span>
                  <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                      required
                      className="text-sm text-slate-600"
                    />
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <FiUpload /> Upload PDF, DOC, or DOCX resume.
                    </p>
                  </div>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-slate-700">Additional Message</span>
                  <textarea
                    value={form.additionalMessage}
                    onChange={(e) => updateForm("additionalMessage", e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Share anything else you want the team to know."
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
      />
    </label>
  );
}