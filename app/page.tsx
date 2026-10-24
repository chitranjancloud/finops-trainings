"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Hero from "@/components/Hero";
import Courses from "@/components/Courses";
import Partners from "@/components/Partners";
import SessionShowcase from "@/components/SessionShowcase";
import LearningOptions from "@/components/LearningOptions";
import Trusted from "@/components/Trusted";
import Testimonials from "@/components/Testimonials";
import Awards from "@/components/Awards";
import Webinars from "@/components/Webinars";
import PremiumCompanySections from "@/components/PremiumCompanySections";

export default function Home() {

  const router = useRouter();

  useEffect(() => {

    const storedUser = localStorage.getItem("user");

    if (storedUser) {

      const parsedUser = JSON.parse(storedUser);

      // ✅ IF ADMIN
     if (parsedUser.role === "admin") {
  router.replace("/admin-page");
}
    }

  }, [router]);

  return (
    <main className="bg-white text-slate-950">

      <Hero />

      <PremiumCompanySections />

      <Courses />

      <Partners />

      <SessionShowcase />

      <LearningOptions />

      <Trusted />

      <Testimonials />

      <Awards />

      <Webinars />

    </main>
  );
}
