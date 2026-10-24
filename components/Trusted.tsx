"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, MapPin } from "lucide-react";

import { defaultTrustedCompanies } from "@/lib/defaultHomepageContent";

type TrustedCompany = {
  _id?: string;
  name: string;
  logo: string;
  website?: string;
};

export default function TrustedGiants() {
  const [companies, setCompanies] = useState<TrustedCompany[]>(
    defaultTrustedCompanies
  );

  useEffect(() => {
    let isMounted = true;

    const fetchTrustedCompanies = async () => {
      try {
        const res = await fetch("/api/trusted-companies", {
          cache: "no-store",
        });
        const data = await res.json();

        if (isMounted && data.success && Array.isArray(data.trustedCompanies)) {
          setCompanies(data.trustedCompanies);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchTrustedCompanies();

    return () => {
      isMounted = false;
    };
  }, []);

  const movingCompanies = useMemo(
    () => (companies.length > 0 ? [...companies, ...companies, ...companies] : []),
    [companies]
  );

  const firstRow = movingCompanies.filter((_, index) => index % 2 === 0);
  const secondRow = movingCompanies.filter((_, index) => index % 2 === 1);

  return (
    <section className="relative overflow-hidden bg-white pb-24 pt-16 text-[#15191f]">
      <div className="absolute inset-x-0 top-0 h-0" />

      <div className="relative z-10 mx-auto max-w-[1620px] px-6">
        <div className="mx-auto mb-20 flex max-w-[1400px] flex-col gap-6 rounded-[26px] bg-gradient-to-br from-[#0d2460] to-[#040e2e] px-8 py-7 text-white shadow-2xl shadow-slate-700/30 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 border-white/20 md:border-r md:pr-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <MapPin size={26} />
            </div>
            <div>
              <p className="text-2xl font-black">Pune Hub</p>
              <p className="text-lg font-bold text-white/90">Our Office Centers</p>
            </div>
          </div>

          <ChevronRight className="hidden text-white md:block" />

          {["Hinjewadi", "Bhumkar Chowk", "ANP Landmark"].map((city) => (
            <div key={city} className="flex flex-1 items-center gap-6">
              <span className="h-4 w-4 rounded-full border-[5px] border-[#2f7fc8]" />
              <p className="text-2xl font-black md:text-3xl">{city}</p>
              <span className="hidden h-px flex-1 bg-[#2f7fc8] md:block" />
            </div>
          ))}

          <a
            href="/contact"
            className="rounded-full bg-white px-8 py-4 text-center text-xl font-black text-[#1765ad] transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            Visit Us
          </a>
        </div>

        <div className="text-center">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Our Alumni{" "}
            <span className="border-b-4 border-[#1d6fbd] text-[#1d6fbd]">
              Works Here
            </span>
          </h2>
          <p className="mx-auto mt-8 max-w-3xl text-xl leading-8">
            Join thousands of successful professionals who placed at top-tier
            product companies.
          </p>
        </div>

        {movingCompanies.length > 0 ? (
          <div className="mt-14 space-y-16 overflow-hidden">
            <MovingLogoRow companies={firstRow} duration={36} />
            <MovingLogoRow companies={secondRow} duration={42} reverse />
          </div>
        ) : (
          <div className="mt-14 rounded-3xl border border-dashed border-slate-400 bg-white p-10 text-center text-slate-500">
            Alumni company logos will appear here once added by admin.
          </div>
        )}
      </div>
    </section>
  );
}

function MovingLogoRow({
  companies,
  duration,
  reverse = false,
}: {
  companies: TrustedCompany[];
  duration: number;
  reverse?: boolean;
}) {
  return (
    <div className="logo-mask overflow-hidden">
      <motion.div
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration,
          ease: "linear",
        }}
        className="flex w-max items-center gap-20 px-8"
      >
        {[...companies, ...companies].map((company, index) => (
          <a
            key={`${company.name}-${index}`}
            href={company.website || "#"}
            target={company.website ? "_blank" : undefined}
            rel="noreferrer"
            className="group flex h-28 w-56 flex-none items-center justify-center"
            title={company.name}
          >
            <img
              src={company.logo}
              alt={company.name}
              className="max-h-20 max-w-full object-contain transition duration-300 group-hover:scale-110"
              loading="lazy"
            />
          </a>
        ))}
      </motion.div>
    </div>
  );
}
