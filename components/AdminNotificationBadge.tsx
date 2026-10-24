"use client";

import { useEffect, useState } from "react";

export default function AdminNotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";

      if (!storedUser || !sessionToken || !deviceId) {
        setCount(0);
        return;
      }

      try {
        const user = JSON.parse(storedUser);
        const params = new URLSearchParams({
          userId: user._id,
          sessionToken,
          deviceId,
        });
        const res = await fetch(`/api/nav-badges?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success) {
          setCount(Number(data.counts?.notifications || 0));
        }
      } catch (error) {
        console.log(error);
      }
    };

    load();
    const interval = window.setInterval(load, 15000);
    window.addEventListener("focus", load);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", load);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white shadow-lg shadow-red-500/25">
      {count > 99 ? "99+" : count}
    </span>
  );
}
