"use client";

import { motion } from "framer-motion";
import { Laptop, Users, Building2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

const options = [
  {
    title: "Live Online Training",
    desc: "Interactive live sessions with industry experts and real-time Q&A.",
    image: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?auto=format&fit=crop&q=80&w=800",
    icon: <Laptop className="h-6 w-6" />,
    link: "/learning/live-online-training",
  },
  {
    title: "1-on-1 Training",
    desc: "Personalized mentorship and tailored curriculum for accelerated growth.",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800",
    icon: <Users className="h-6 w-6" />,
    link: "/learning/one-on-one-training",
  },
  {
    title: "Classroom Training",
    desc: "Immersive in-person learning experience at our office and training centers.",
    image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
    icon: <Building2 className="h-6 w-6" />,
    link: "/learning/classroom-training",
  },
];

export default function LearningOptions() {
  const router = useRouter();

  return (
    <section className="relative bg-white px-6 py-24 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#2563eb]">
              Learning options
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              Learn your way, without compromising outcomes.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              Flexible formats for students, working professionals, and
              corporate teams.
            </p>
          </div>

          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-[#4d8bff] transition hover:bg-gradient-to-r hover:from-[#2563eb] hover:to-[#7c3aed] hover:text-white hover:border-transparent">
            View All Options <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {options.map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -8 }}
              onClick={() => router.push(item.link)}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-[0_12px_48px_rgba(37,99,235,0.15)] hover:border-[#2563eb]/30"
            >
              <div className="relative h-56 w-full overflow-hidden rounded-t-3xl">
                <div
                  className="absolute inset-0 h-full w-full bg-cover bg-center transition duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${item.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#123f63]/80 to-transparent" />
              </div>

              <div className="p-7">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl -mt-8 bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white shadow-[0_8px_24px_rgba(37,99,235,0.5)]">
                  {item.icon}
                </div>
                <h3 className="text-2xl font-black">{item.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {item.desc}
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-black text-[#2563eb]">
                  Explore Mode <ArrowRight size={16} />
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
