"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bell,
  Briefcase,
  FileText,
  LogOut,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

const emptyForm = {
  name: "",
  email: "",
};

export default function AdminMembersPage() {
  const [user, setUser] = useState<any>(null);
  const [admins, setAdmins] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const verifyAdminSession = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");

      if (!storedUser || !sessionToken || !deviceId) {
        localStorage.removeItem("user");
        localStorage.removeItem("sessionToken");
        window.location.href = "/login";
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "admin") {
        window.location.href = "/";
        return;
      }

      const res = await fetch("/api/session/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parsedUser._id,
          sessionToken,
          deviceId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        localStorage.removeItem("user");
        localStorage.removeItem("sessionToken");
        window.location.href = "/login";
        return;
      }

      setUser(parsedUser);
      fetchAdmins(parsedUser._id, sessionToken, deviceId);
    };

    verifyAdminSession();
  }, []);

  const fetchAdmins = async (
    userId?: string,
    sessionToken?: string | null,
    deviceId?: string | null
  ) => {
    try {
      setLoading(true);

      const activeUserId = userId || user?._id;
      const activeSessionToken =
        sessionToken || localStorage.getItem("sessionToken");
      const activeDeviceId = deviceId || localStorage.getItem("deviceId");

      const params = new URLSearchParams({
        userId: activeUserId || "",
        sessionToken: activeSessionToken || "",
        deviceId: activeDeviceId || "",
      });

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.admins)) {
        setAdmins(data.admins);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (event: FormEvent) => {
    event.preventDefault();

    if (saving) return;

    try {
      setSaving(true);

      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          userId: parsedUser?._id,
          sessionToken: localStorage.getItem("sessionToken"),
          deviceId: localStorage.getItem("deviceId"),
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.emailSent) {
          alert("Admin invitation email sent successfully");
        } else {
          alert(
            `Admin was created, but email was not sent. Setup link: ${data.setupLink || "check email settings"}`
          );
        }
        setForm(emptyForm);
        fetchAdmins();
      } else {
        alert(data.message || "Unable to invite admin member");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to invite admin member");
    } finally {
      setSaving(false);
    }
  };

  const handleResendInvite = async (adminId: string) => {
    if (resendingId) return;

    try {
      setResendingId(adminId);

      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch("/api/admin/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetAdminId: adminId,
          userId: parsedUser?._id,
          sessionToken: localStorage.getItem("sessionToken"),
          deviceId: localStorage.getItem("deviceId"),
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.emailSent) {
          alert("Invitation resent successfully");
        } else {
          alert(`Invite token refreshed but email failed. Setup link: ${data.setupLink || "check email settings"}`);
        }
      } else {
        alert(data.message || "Unable to resend invitation");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to resend invitation");
    } finally {
      setResendingId(null);
    }
  };

  const handleLogout = async () => {
    const storedUser = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        await fetch("/api/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: parsedUser._id,
            sessionToken,
            deviceId,
          }),
        });
      } catch (error) {
        console.log(error);
      }
    }

    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">


      <main className="flex-1  p-10 overflow-y-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-5xl font-bold text-gray-800">
              Admin Members
            </h1>
            <p className="text-gray-500 mt-3 text-lg">
              Invite admin members by email so they can set their own password.
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200">
              <div className="w-11 h-11 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">Admin</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 transition text-white px-5 py-3 rounded-2xl flex items-center gap-2"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-8">
          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm h-fit">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <UserPlus size={28} />
            </div>

            <h2 className="text-3xl font-bold text-gray-800">
              Invite New Admin
            </h2>
            <p className="text-gray-500 mt-2 mb-6">
              Enter the new admin name and email. They will receive a password setup link.
            </p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) =>
                  setForm({
                    ...form,
                    email: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
                required
              />

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#2563eb] hover:bg-blue-600 disabled:bg-blue-300 transition text-white px-6 py-4 rounded-2xl font-semibold"
              >
                {saving ? "Sending Invite..." : "Send Password Setup Email"}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">
                  Existing Admins
                </h2>
                <p className="text-gray-500 mt-2">
                  {loading ? "Loading admin members..." : `${admins.length} admin member(s)`}
                </p>
              </div>

              <button
                onClick={() => fetchAdmins()}
                className="bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-5 py-3 rounded-2xl font-semibold"
              >
                Refresh
              </button>
            </div>

            <div className="space-y-4">
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <div
                    key={admin._id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-5"
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {admin.name}
                      </h3>
                      <p className="text-sm text-gray-500 break-all">
                        {admin.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 justify-between md:justify-end w-full md:w-auto">
                      <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                        admin.passwordSetupRequired 
                          ? "bg-amber-50 text-amber-700" 
                          : "bg-blue-50 text-blue-700"
                      }`}>
                        {admin.passwordSetupRequired ? "Invite Pending" : "Admin"}
                      </span>
                      {admin.passwordSetupRequired && (
                        <button
                          onClick={() => handleResendInvite(admin._id)}
                          disabled={resendingId === admin._id}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition"
                        >
                          {resendingId === admin._id ? "Sending..." : "Resend Invite"}
                        </button>
                      )}
                      <span className="text-xs text-gray-400">
                        {admin.createdAt
                          ? new Date(admin.createdAt).toLocaleDateString("en-IN")
                          : ""}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  No admin members found.
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  text,
  badge,
}: {
  href: string;
  icon: ReactNode;
  text: string;
  badge?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-full flex items-center justify-between gap-4 hover:bg-gray-100 text-gray-700 px-5 py-4 rounded-2xl transition"
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}
