"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Globe,
  GraduationCap,
  Shield,
  Zap,
} from "lucide-react";

export default function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;

  const [dynamicCourse, setDynamicCourse] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showEnrollPopup, setShowEnrollPopup] = useState(false);
  const [showUnpublishedPopup, setShowUnpublishedPopup] = useState(false);
  const [batchAssigned, setBatchAssigned] = useState(false);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [accessMessage, setAccessMessage] = useState(
    "Please login to view enrollment status."
  );
  const [selectedLearningMode, setSelectedLearningMode] = useState<
    "recorded" | "live"
  >("recorded");

  const course = dynamicCourse;

  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  useEffect(() => {
    const fetchDynamicCourse = async () => {
      try {
        const res = await fetch("/api/courses");
        const data = await res.json();

        if (data.success) {
          const matchedCourse = data.courses?.find(
            (item: any) => item.slug === slug
          );

          if (matchedCourse) {
            setDynamicCourse(matchedCourse);
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchDynamicCourse();
  }, [slug]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    setIsLoggedIn(Boolean(storedUser));
  }, []);

  useEffect(() => {
    const checkEnrollmentAccess = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");

      setBatchAssigned(false);
      setEnrollment(null);

      if (!storedUser || !sessionToken || !deviceId) {
        setAccessMessage("Please login to view enrollment status.");
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);
        const query = new URLSearchParams({
          userId: parsedUser._id,
          sessionToken,
          deviceId,
        });

        const res = await fetch(`/api/course-access/${slug}?${query.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (data.success) {
          setEnrollment(data.enrolled ? data.enrollment || {} : null);
          setBatchAssigned(Boolean(data.batch));
          setAccessMessage(data.message || "");
        }
      } catch (error) {
        console.log(error);
      }
    };

    checkEnrollmentAccess();
  }, [slug]);

  const handleEnroll = async () => {
    if (course?.isPublished === false) {
      setShowUnpublishedPopup(true);
      return;
    }

    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      alert("Please login first");
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");
    const whatsapp = prompt("Enter your WhatsApp number for payment receipt");

    if (!sessionToken || !deviceId) {
      alert("Please login again");
      window.location.href = "/login";
      return;
    }

    if (!whatsapp || whatsapp.trim().length < 8) {
      alert("WhatsApp number is required");
      return;
    }

    const paymentRes = await fetch("/api/payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: parsedUser._id,
        itemType: "course",
        itemId: course?.slug || slug,
        itemName: course?.title,
        amount: course?.price,
        whatsapp,
        sessionToken,
        deviceId,
        learningMode: selectedLearningMode,
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentData.success) {
      alert(paymentData.message || "Payment could not start");

      if (paymentRes.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("sessionToken");
        window.location.href = "/login";
      }

      return;
    }

    const confirmPayment = async (response: any = {}) => {
      const confirmRes = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parsedUser._id,
          paymentId: paymentData.paymentId,
          sessionToken,
          deviceId,
          learningMode: selectedLearningMode,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id:
            response.razorpay_order_id || paymentData.order?.id,
          razorpay_signature: response.razorpay_signature,
        }),
      });

      const confirmData = await confirmRes.json();

      if (confirmData.success) {
        setShowEnrollPopup(true);
        setEnrollment(confirmData.enrollment || {});
        setBatchAssigned(false);
        setAccessMessage(
          selectedLearningMode === "recorded"
            ? "You are enrolled. Open Batch Content to access your learning materials."
            : "You are enrolled. Course content will be available after admin assigns you a batch."
        );
      } else {
        alert(confirmData.message || "Payment verification failed");
      }
    };

    if ((window as any).Razorpay && paymentData.key && paymentData.order?.id) {
      const rzp = new (window as any).Razorpay({
        key: paymentData.key,
        amount: paymentData.order.amount,
        currency: paymentData.order.currency,
        name: "FinOps Training",
        description: course?.title,
        order_id: paymentData.order.id,
        prefill: {
          name: parsedUser.name,
          email: parsedUser.email,
          contact: whatsapp,
        },
        handler: confirmPayment,
      });

      rzp.open();
      return;
    }

    await confirmPayment();
  };

  const learnItems: string[] = Array.isArray(course?.learn)
    ? course.learn
    : String(course?.learn || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const prerequisiteItems: string[] = Array.isArray(course?.prerequisites)
    ? course.prerequisites
    : String(course?.prerequisites || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const recordedPrice = course?.recordedPrice || course?.price || "Contact us";
  const livePrice = course?.livePrice || course?.price || "Contact us";
  const selectedPrice =
    selectedLearningMode === "live" ? livePrice : recordedPrice;

  if (!course) {
    return (
      <div className="min-h-screen bg-[#0f172a] p-10 text-white">
        Course Not Found
      </div>
    );
  }

  if (typeof window !== "undefined" && !isLoggedIn) {
    return (
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-6 text-slate-100">
        <div className="text-center">
          <h1 className="mb-4 text-3xl font-bold">Please Login to View Course</h1>
          <p className="mb-8 text-slate-400">
            You need to login to view enrollment details.
          </p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            className="rounded-xl bg-[#2563eb] px-8 py-4 font-bold shadow-xl shadow-blue-900/20 transition hover:scale-105"
          >
            Go to Login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="relative min-h-screen overflow-hidden bg-[#0f172a] font-sans text-slate-100"
    >
      {showUnpublishedPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-[#1e293b] p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/30 bg-amber-500/10">
              <span className="text-3xl text-amber-300">!</span>
            </div>
            <h3 className="mb-3 text-xl font-black text-white">
              Enrollment Unavailable
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-slate-400">
              This course is currently unpublished. Enrollment is temporarily
              disabled. Please check back later or contact us for more
              information.
            </p>
            <button
              onClick={() => setShowUnpublishedPopup(false)}
              className="w-full rounded-2xl border border-amber-400/30 bg-amber-500/20 py-3 font-bold text-amber-300 transition hover:bg-amber-500/30"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <motion.div style={{ y }} className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500/15 via-blue-400/10 to-blue-500/15 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-pink-500/10 blur-[100px]" />
      </motion.div>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-24">
        {course?.isPublished === false && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400" />
            <p className="text-sm font-semibold text-amber-300">
              This course is currently unpublished. You can browse the details,
              but enrollment is temporarily disabled.
            </p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-16 grid items-center gap-12 lg:grid-cols-12"
        >
          <div className="lg:col-span-7">
            <h1 className="mb-6 bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-5xl font-black leading-[1.05] tracking-tight text-transparent md:text-6xl">
              {course.title}
            </h1>

            <p className="mb-8 max-w-lg text-lg leading-relaxed text-slate-400">
              {course.description}
            </p>

            {!enrollment && (
              <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
                <p className="mb-3 text-sm font-black uppercase tracking-[0.2em] text-blue-200">
                  Select Learning Mode
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    {
                      key: "recorded",
                      title: "Self-Paced Learning",
                      desc: "Recorded videos, PDFs, and materials through your Batch Content area.",
                      price: recordedPrice,
                    },
                    {
                      key: "live",
                      title: "Live Training",
                      desc: "Batch-based live classes, meetings, notices, tests, and assignments.",
                      price: livePrice,
                    },
                  ].map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() =>
                        setSelectedLearningMode(mode.key as "recorded" | "live")
                      }
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedLearningMode === mode.key
                          ? "border-blue-300 bg-blue-500/15"
                          : "border-white/10 bg-black/20 hover:border-white/25"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-1 h-4 w-4 rounded-full border ${
                            selectedLearningMode === mode.key
                              ? "border-blue-200 bg-blue-400"
                              : "border-slate-500"
                          }`}
                        />
                        <div>
                          <h3 className="font-black">{mode.title}</h3>
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {mode.desc}
                          </p>
                          <p className="mt-3 text-sm font-black text-blue-200">
                            {mode.price}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {!enrollment ? (
                <button
                  onClick={handleEnroll}
                  className={`rounded-xl px-8 py-4 font-bold shadow-xl transition ${
                    course?.isPublished === false
                      ? "cursor-not-allowed border border-amber-400/30 bg-amber-500/20 text-amber-300"
                      : "bg-[#2563eb] shadow-blue-900/20 hover:scale-105"
                  }`}
                >
                  {course?.isPublished === false
                    ? "Enrollment Disabled"
                    : "Enroll Now"}
                </button>
              ) : (
                <Link
                  href="/student/batches"
                  className="rounded-xl bg-[#2563eb] px-8 py-4 font-bold shadow-xl shadow-blue-900/20 transition hover:scale-105"
                >
                  Open Batch Content
                </Link>
              )}

              <button className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 backdrop-blur-md">
                Brochure
              </button>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <img
                    key={i}
                    src={`https://randomuser.me/api/portraits/men/${i}.jpg`}
                    className="h-10 w-10 rounded-full border-2 border-black"
                    alt=""
                  />
                ))}
              </div>
              <p className="text-sm text-gray-400">
                Trusted by{" "}
                <span className="font-bold text-white">15,000+ learners</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-5">
            {[
              { icon: Zap, label: "Sessions", val: course.sessions },
              { icon: Globe, label: "Learners", val: course.professionals },
              { icon: GraduationCap, label: "Duration", val: course.duration },
              {
                icon: Shield,
                label: "Exam",
                val: String(course.exam || "Included").split(" ")[0],
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -8, scale: 1.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]"
              >
                <stat.icon className="mb-3 text-blue-400" />
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-xl font-bold">{stat.val}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
        >
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-2xl font-bold">Learning Access</h2>
              <p className="mt-2 text-sm text-slate-400">
                {enrollment
                  ? accessMessage ||
                    "You are enrolled. Learning materials are available from the Batch Content area."
                  : "Enroll in this course to begin your learning path."}
              </p>
            </div>

            {enrollment ? (
              <Link
                href="/student/batches"
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 font-bold text-white transition hover:bg-blue-600"
              >
                <BookOpen size={18} />
                Open Batch Content
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                className={`w-fit rounded-xl px-6 py-3 font-bold ${
                  course?.isPublished === false
                    ? "cursor-not-allowed border border-amber-400/30 bg-amber-500/20 text-amber-300"
                    : "bg-[#2563eb] hover:bg-blue-600"
                }`}
              >
                {course?.isPublished === false
                  ? "Enrollment Disabled"
                  : "Enroll To Start"}
              </button>
            )}
          </div>

          {enrollment && (
            <div className="mt-6 rounded-2xl border border-blue-500/25 bg-blue-500/10 p-5">
              <h3 className="mb-2 text-lg font-bold text-blue-200">
                Single Learning Path
              </h3>
              <p className="text-sm leading-6 text-slate-300">
                Course details, enrollment records, reports, certificates, and
                badges remain available. Learning materials are accessed only
                through your Batch Content page to keep your learning path
                organized.
              </p>
              {batchAssigned && (
                <p className="mt-3 text-sm font-semibold text-emerald-300">
                  Your assigned batch is active.
                </p>
              )}
            </div>
          )}
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-white/5 p-10 backdrop-blur-xl"
            >
              <h2 className="mb-8 text-2xl font-bold">What You Will Master</h2>

              <div className="grid gap-6 md:grid-cols-2">
                {learnItems.map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.03 }}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-blue-400/5 p-8 backdrop-blur-xl">
                <h3 className="mb-3 text-sm">Price</h3>
                <p className="text-4xl font-bold">{selectedPrice}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  {selectedLearningMode === "live"
                    ? "Live Training"
                    : "Self-Paced Learning"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-4 text-sm">Prerequisites</h3>
                {prerequisiteItems.length > 0 ? (
                  prerequisiteItems.map((item, i) => (
                    <p key={i} className="text-sm text-gray-400">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">
                    No prerequisites listed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEnrollPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 p-8 shadow-2xl"
          >
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                  <CheckCircle2 size={32} className="text-blue-400" />
                </div>
              </div>
              <h2 className="mb-3 text-2xl font-bold">Enrollment Successful</h2>
              <p className="mb-6 text-slate-400">
                Thank you for enrolling. Your learning materials will be
                available from the Batch Content area.
              </p>
              <div className="grid gap-3">
                <Link
                  href="/student/batches"
                  className="w-full rounded-xl bg-[#2563eb] px-6 py-3 text-center font-bold transition hover:bg-blue-600"
                >
                  Open Batch Content
                </Link>
                <button
                  onClick={() => setShowEnrollPopup(false)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold transition hover:bg-white/10"
                >
                  Stay on Course Page
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}