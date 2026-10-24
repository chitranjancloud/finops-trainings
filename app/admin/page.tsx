"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/admin/webinars")
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-10 text-white">
      <h1 className="text-3xl mb-6">Webinar Bookings</h1>

      <div className="space-y-4">
        {data.map((item: any, i) => (
          <div key={i} className="p-4 bg-white/5 rounded-xl">
            <p><b>Name:</b> {item.name}</p>
            <p><b>Email:</b> {item.email}</p>
            <p><b>Webinar:</b> {item.webinarTitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}