"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { notify } from "@/components/Feedback";
import Link from "next/link";

export default function Webinars() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchWebinars = async () => {
      try {
        const res = await fetch("/api/webinars", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error("Unavailable");

        if (
          isMounted &&
          data.success &&
          Array.isArray(data.webinars) &&
          data.webinars.length > 0
        ) {
          setWebinars(data.webinars.filter((item: any) => { const date = Date.parse(item.date); return Number.isFinite(date) && date + 86400000 > Date.now(); }));
        }
      } catch (error) {
        if (isMounted) setFailed(true);
      } finally { if (isMounted) setLoading(false); }
    };

    fetchWebinars();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleReserve = async (item: any) => {
    const user = localStorage.getItem("user");

    if (!user) {
      notify("Please login first");
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(user);
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");
    const whatsapp = prompt("Enter your WhatsApp number for payment receipt");

    if (!sessionToken || !deviceId) {
      notify("Please login again");
      window.location.href = "/login";
      return;
    }

    if (!whatsapp || whatsapp.trim().length < 8) {
      notify("WhatsApp number is required");
      return;
    }

    try {
      const paymentRes = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parsedUser._id,
          itemType: "webinar",
          itemId: item._id || item.title,
          itemName: item.title,
          amount: item.price,
          whatsapp,
          sessionToken,
          deviceId,
        }),
      });

      const paymentData = await paymentRes.json();

      if (!paymentData.success) {
        notify(paymentData.message || "Payment could not start");
        return;
      }

      const confirmPayment = async (response: any = {}) => {
        const res = await fetch("/api/payment/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: parsedUser._id,
            paymentId: paymentData.paymentId,
            sessionToken,
            deviceId,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id:
              response.razorpay_order_id || paymentData.order?.id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        const data = await res.json();

        if (data.success) {
          notify("Payment successful. Webinar seat reserved.");
        } else {
          notify(data.message || "Payment verification failed");
        }
      };

      if ((window as any).Razorpay && paymentData.key && paymentData.order?.id) {
        const rzp = new (window as any).Razorpay({
          key: paymentData.key,
          amount: paymentData.order.amount,
          currency: paymentData.order.currency,
          name: "FinOps Training",
          description: item.title,
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
    } catch (err) {
      console.error(err);
      notify("Something went wrong");
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollTo({
      left:
        direction === "left"
          ? scrollRef.current.scrollLeft - 400
          : scrollRef.current.scrollLeft + 400,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-24 bg-[#0f172a] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold text-white mb-3">
              Upcoming Webinars
            </h2>
            <p className="text-gray-400 text-sm">
              Learn live with industry experts
            </p>
          </div>

          <div className="flex gap-3">
            <button aria-label="Previous webinars" onClick={() => scroll("left")} className="p-3 bg-white/10 rounded-xl">
              <ChevronLeft />
            </button>
            <button aria-label="Next webinars" onClick={() => scroll("right")} className="p-3 bg-white/10 rounded-xl">
              <ChevronRight />
            </button>
          </div>
        </div>

        {webinars.length === 0 && <div role="status" className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">{loading ? "Loading upcoming webinars…" : failed ? "The webinar schedule is temporarily unavailable." : "New webinar dates will be announced here."} {!loading && <Link href="/contact" className="ml-2 font-semibold text-blue-300 underline">Ask about upcoming sessions</Link>}</div>}
        <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-4">
          {webinars.map((item: any, i) => (
            <motion.div
              key={item._id || i}
              whileHover={{ y: -10 }}
              className="min-w-[min(320px,85vw)] p-8 rounded-3xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={item.img || `https://i.pravatar.cc/150?u=${item.name}`}
                  className="w-14 h-14 rounded-xl object-cover"
                  alt={item.name}
                />
                <div>
                  <h4 className="text-white font-bold">{item.name}</h4>
                  <p className="text-blue-400 text-xs">{item.role}</p>
                </div>
              </div>

              <h3 className="text-white text-xl font-bold mb-4">
                {item.title}
              </h3>

              <div className="text-gray-400 text-sm mb-6 space-y-2">
                <p className="flex items-center gap-2">
                  <Calendar size={16} /> {item.date}
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={16} /> {item.time}
                </p>
                <p className="flex items-center gap-2 text-white font-bold">
                  <CreditCard size={16} /> {item.price || "Free"}
                </p>
              </div>

              <button
                onClick={() => handleReserve(item)}
                className="w-full py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition"
              >
                Pay & Reserve Seat
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
