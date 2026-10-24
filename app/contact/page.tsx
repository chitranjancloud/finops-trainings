"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, Mail, MapPin, MessageCircle, Phone, Plus, Trash2 } from "lucide-react";

const timeSlots = [
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];

export default function ContactPage() {
  const [activeForm, setActiveForm] = useState<"message" | "booking">("message");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "Course inquiry",
    message: "",
  });
  const [bookingData, setBookingData] = useState({
    name: "",
    email: "",
    phone: "",
    bookingDate: "",
    bookingTime: "",
  });
  const [guests, setGuests] = useState([{ name: "", email: "" }]);
  const [status, setStatus] = useState("");
  const [bookingStatus, setBookingStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const blanks = Array.from({ length: firstDay }, () => null);
    const days = Array.from({ length: totalDays }, (_, i) => i + 1);
    return [...blanks, ...days];
  }, []);

  const monthLabel = new Date().toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const selectDate = (day: number) => {
    const now = new Date();
    const selected = new Date(now.getFullYear(), now.getMonth(), day);
    const value = selected.toISOString().slice(0, 10);
    setBookingData({ ...bookingData, bookingDate: value, bookingTime: "" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("");

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Message failed");

      setFormData({
        name: "",
        email: "",
        phone: "",
        category: "Course inquiry",
        message: "",
      });
      setStatus("Message sent successfully. Our team will reply soon.");
    } catch (error: any) {
      setStatus(error.message || "Message failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBookingStatus("");

    if (!bookingData.bookingDate || !bookingData.bookingTime) {
      setBookingStatus("Please select date and time.");
      return;
    }

    try {
      setIsBooking(true);
      const res = await fetch("/api/consultancy-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bookingData,
          guests: guests.filter((guest) => guest.name.trim() && guest.email.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Booking failed");

      setBookingStatus("Consultancy booked. Meeting details sent by email.");
      setBookingData({
        name: "",
        email: "",
        phone: "",
        bookingDate: "",
        bookingTime: "",
      });
      setGuests([{ name: "", email: "" }]);
    } catch (error: any) {
      setBookingStatus(error.message || "Booking failed. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <section className="relative overflow-hidden py-28">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050212] via-[#0B0F1A] to-black" />
      <div className="absolute top-[-200px] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-purple-600/10 blur-[180px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="mb-24 grid gap-12 md:grid-cols-2 md:items-start">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-6 inline-block rounded-full border border-blue-500/15 bg-purple-500/10 px-4 py-1 text-sm text-blue-300">
              Contact Us
            </div>

            <h1 className="text-5xl font-bold leading-tight text-white">
              Let's Talk About{" "}
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                Your Growth
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-gray-400">
              Whether you want to enroll, partner, book consultancy, or scale
              your team, we're here to help you succeed.
            </p>

            <div className="mt-10 space-y-5">
              {[
                { icon: Mail, title: "Customer Support", value: "finops668@gmail.com" },
                { icon: Phone, title: "Business Hours", value: "Mon - Sat, 9:30 AM - 7:00 PM" },
                { icon: MessageCircle, title: "WhatsApp Support", value: "+91 00000 00000" },
                { icon: CalendarDays, title: "Book Consultation", value: "30 minute training plan and pricing guidance" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
                  >
                    <Icon className="h-5 w-5 text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_0_60px_rgba(124,58,237,0.2)] backdrop-blur-xl"
          >
            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-white/5 p-1">
              {[
                ["message", "Send a Message"],
                ["booking", "Book Consultancy"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveForm(key as any)}
                  className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                    activeForm === key
                      ? "bg-[#2563eb] text-slate-950"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeForm === "message" ? (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <Input placeholder="Your Name" value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} />
                <Input type="email" placeholder="Your Email" value={formData.email} onChange={(value) => setFormData({ ...formData, email: value })} />
                <Input placeholder="WhatsApp Number" value={formData.phone} onChange={(value) => setFormData({ ...formData, phone: value })} />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white outline-none focus:border-blue-400/40"
                >
                  {["Course inquiry", "Corporate training", "Webinar registration", "Payment support", "Career support"].map((item) => (
                    <option key={item} value={item} className="text-black">{item}</option>
                  ))}
                </select>
                <textarea
                  rows={4}
                  placeholder="Your Message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white outline-none focus:border-purple-500/40"
                />
                <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-gradient-to-r from-[#2563eb] to-[#2563eb] py-3 text-white transition hover:opacity-90 disabled:opacity-60">
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>
                {status && <p className="text-sm text-blue-200">{status}</p>}
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleBooking}>
                <Input placeholder="Booking User Name" value={bookingData.name} onChange={(value) => setBookingData({ ...bookingData, name: value })} />
                <Input type="email" placeholder="Booking User Email" value={bookingData.email} onChange={(value) => setBookingData({ ...bookingData, email: value })} />
                <Input placeholder="WhatsApp Number" value={bookingData.phone} onChange={(value) => setBookingData({ ...bookingData, phone: value })} required={false} />

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-bold text-white">{monthLabel}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                      30 minutes
                    </p>
                  </div>
                  <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) =>
                      day ? (
                        <button
                          key={`${day}-${index}`}
                          type="button"
                          onClick={() => selectDate(day)}
                          className={`rounded-xl py-2 text-sm font-bold transition ${
                            bookingData.bookingDate.endsWith(`-${String(day).padStart(2, "0")}`)
                              ? "bg-[#2563eb] text-slate-950"
                              : "bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          {day}
                        </button>
                      ) : (
                        <span key={`blank-${index}`} />
                      )
                    )}
                  </div>
                </div>

                {bookingData.bookingDate && (
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setBookingData({ ...bookingData, bookingTime: slot })}
                        className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                          bookingData.bookingTime === slot
                            ? "bg-[#2563eb] text-slate-950"
                            : "bg-white/5 text-white hover:bg-white/10"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}

                {bookingData.bookingDate && bookingData.bookingTime && (
                  <div className="rounded-2xl border border-blue-300/20 bg-blue-300/10 p-4 text-sm text-blue-100">
                    Booking: {bookingData.name || "User"} / {bookingData.email || "email"} / {bookingData.bookingDate} at {bookingData.bookingTime} / 30 minutes
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-bold text-white">Add Guests</p>
                    <button
                      type="button"
                      onClick={() => setGuests([...guests, { name: "", email: "" }])}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {guests.map((guest, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input
                          placeholder="Guest name"
                          value={guest.name}
                          onChange={(e) => {
                            const next = [...guests];
                            next[index].name = e.target.value;
                            setGuests(next);
                          }}
                          className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                        />
                        <input
                          type="email"
                          placeholder="Guest email"
                          value={guest.email}
                          onChange={(e) => {
                            const next = [...guests];
                            next[index].email = e.target.value;
                            setGuests(next);
                          }}
                          className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setGuests(guests.filter((_, i) => i !== index))}
                          className="rounded-xl bg-red-500/20 px-3 text-red-200"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={isBooking} className="w-full rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60">
                  {isBooking ? "Booking..." : "Confirm Consultancy Booking"}
                </button>
                {bookingStatus && <p className="text-sm text-blue-200">{bookingStatus}</p>}
              </form>
            )}
          </motion.div>
        </div>

        <div className="flex justify-center mb-12">
          <div className="flex gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-2">
            {["India", "Europe", "Asia", "USA"].map((tab, i) => (
              <button key={tab} className={`px-4 py-1 rounded-full text-sm ${i === 0 ? "bg-gradient-to-r from-[#2563eb] to-[#2563eb] text-white" : "text-gray-400 hover:text-white"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {["Gurugram", "New Delhi", "Bangalore", "Chennai"].map((city) => (
            <div key={city} className="rounded-xl border border-white/10 bg-white/5 p-6 transition hover:border-purple-500/40 hover:bg-white/10">
              <h3 className="mb-2 font-semibold text-white">{city}</h3>
              <p className="mb-4 text-sm text-gray-400">Office details and contact info here</p>
              <button className="border-b border-white/20 text-sm text-white hover:border-white">
                View Direction
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
          <iframe title="FinOps Trainings location map" src="https://www.google.com/maps?q=Gurugram%20India&output=embed" className="h-[360px] w-full border-0" loading="lazy" />
        </div>
      </div>
    </section>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  required = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-white outline-none focus:border-blue-400/40"
    />
  );
}
