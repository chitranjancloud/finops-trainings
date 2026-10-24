"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CirclePlus } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";

import { defaultPartners } from "@/lib/defaultHomepageContent";

type Partner = {
  _id?: string;
  name: string;
  logo: string;
  description?: string;
  role?: string;
  website?: string;
};

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>(() => [
    ...defaultPartners,
  ]);

  useEffect(() => {
    let isMounted = true;

    const fetchPartners = async () => {
      try {
        const res = await fetch("/api/partners", { cache: "no-store" });
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.partners)) {
          setPartners(data.partners);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchPartners();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-white py-24 text-slate-950">
      <div className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 md:block">
        <div className="rounded-r-sm bg-white px-3 py-9 shadow-2xl shadow-slate-400/40">
          <p className="vertical-writing text-sm font-medium tracking-[0.35em]">
            <span className="text-blue-500">G</span>
            <span className="text-red-500">o</span>
            <span className="text-amber-500">o</span>
            <span className="text-blue-500">g</span>
            <span className="text-emerald-500">l</span>
            <span className="text-red-500">e</span>
            <span className="ml-2 text-black">Reviews!</span>
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20 text-center"
        >
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Learners Who Choose Growth. Stories That Inspire.
          </h2>
        </motion.div>

        {partners.length > 0 ? (
          <div className="scrollbar-hide -mx-6 flex snap-x gap-8 overflow-x-auto px-6 pb-4">
            {partners.map((partner, index) => (
              <motion.article
                key={partner._id || partner.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="relative mt-16 flex h-[430px] w-[385px] shrink-0 snap-start flex-col rounded-xl bg-white px-6 pb-8 pt-32 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/60"
              >
                <div className="absolute -top-12 left-6 h-36 w-36 overflow-hidden rounded-full bg-slate-100 shadow-md ring-8 ring-[#edf3f7]">
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                {partner.website ? (
                  <a
                    href={partner.website}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute right-6 top-14 flex h-9 w-9 items-center justify-center rounded bg-[#0277b5] text-white transition hover:scale-105"
                    aria-label={`${partner.name} LinkedIn profile`}
                  >
                    <FaLinkedinIn size={21} />
                  </a>
                ) : (
                  <div className="absolute right-6 top-14 flex h-9 w-9 items-center justify-center rounded bg-[#0277b5] text-white">
                    <FaLinkedinIn size={21} />
                  </div>
                )}

                <h3 className="text-2xl font-black leading-tight">
                  {partner.name}
                </h3>

                <p className="mt-5 min-h-12 text-lg font-semibold leading-7">
                  {partner.role || "Placed Learner / Professional Growth Story"}
                </p>

                <p className="mt-3 line-clamp-5 text-[17px] leading-8 text-slate-600">
                  {partner.description ||
                    "I thank the trainers and placement support team for helping me build confidence, upgrade my skills, and move closer to my career goals."}
                </p>

                <button className="mt-auto inline-flex items-center gap-1 self-start pt-5 text-base font-black text-black transition hover:text-[#0277b5]">
                  Read More <CirclePlus size={17} />
                </button>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Learner stories will appear here once added by admin.
          </div>
        )}
      </div>
    </section>
  );
}
