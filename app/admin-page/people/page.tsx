"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type Enrollment = {
  _id: string;
  userId?: string;
  courseId?: string;
  courseName?: string;
  coursePrice?: string;
  name?: string;
  email?: string;
  status?: string;
  batchName?: string;
  batchAssignedAt?: string;
  createdAt?: string;
};

export default function PeoplePage() {
  const [user, setUser] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batchAssignments, setBatchAssignments] = useState<Record<string, string>>({});
  const [statusAssignments, setStatusAssignments] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [savingId, setSavingId] = useState("");
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeAssignments, setBadgeAssignments] = useState<Record<string, string>>({});
  const [credentialActionId, setCredentialActionId] = useState("");

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
      fetchEnrollments();
      fetchBadges(parsedUser);
    };

    verifyAdminSession();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const res = await fetch("/api/enrollments", {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.enrollments)) {
        setEnrollments(data.enrollments);

        const batches: Record<string, string> = {};
        const statuses: Record<string, string> = {};

        data.enrollments.forEach((item: Enrollment) => {
          batches[item._id] = item.batchName || "";
          statuses[item._id] = item.status || "enrolled";
        });

        setBatchAssignments(batches);
        setStatusAssignments(statuses);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchBadges = async (adminUser = user) => {
    if (!adminUser) return;
    const params = new URLSearchParams({
      userId: adminUser._id,
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    });
    const res = await fetch(`/api/badges?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setBadges(data.badges || []);
    }
  };

  const generateManualCertificate = async (item: Enrollment) => {
    const storedUser = localStorage.getItem("user");
    const adminUser = storedUser ? JSON.parse(storedUser) : null;
    if (!adminUser) return;

    setCredentialActionId(item._id);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUser._id,
          sessionToken: localStorage.getItem("sessionToken") || "",
          deviceId: localStorage.getItem("deviceId") || "",
          enrollmentId: item._id,
          manual: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Certificate ready: ${data.certificate?.certificateCode || "created"}`);
      } else {
        alert(data.message || "Certificate generation failed");
      }
    } finally {
      setCredentialActionId("");
    }
  };

  const awardManualBadge = async (item: Enrollment) => {
    const badgeId = badgeAssignments[item._id] || badges[0]?.badgeId || "";
    if (!badgeId) {
      alert("No badge is available to award yet.");
      return;
    }
    const storedUser = localStorage.getItem("user");
    const adminUser = storedUser ? JSON.parse(storedUser) : null;
    if (!adminUser) return;

    setCredentialActionId(item._id);
    try {
      const res = await fetch("/api/badges/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUser._id,
          sessionToken: localStorage.getItem("sessionToken") || "",
          deviceId: localStorage.getItem("deviceId") || "",
          enrollmentId: item._id,
          badgeId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Badge awarded: ${data.badge?.name || badgeId}`);
      } else {
        alert(data.message || "Badge award failed");
      }
    } finally {
      setCredentialActionId("");
    }
  };

  const handleSavePerson = async (item: Enrollment) => {
    try {
      setSavingId(item._id);

      const res = await fetch(`/api/enrollments/${item._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchName: batchAssignments[item._id] || "",
          status: statusAssignments[item._id] || item.status || "enrolled",
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchEnrollments();
      } else {
        alert("Unable to update person record");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to update person record");
    } finally {
      setSavingId("");
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

  const filteredEnrollments = useMemo(() => {
    return enrollments
      .filter((item) => {
        const searchValue = search.trim().toLowerCase();
        const text = [
          item.name,
          item.email,
          item.courseName,
          item.courseId,
          item.coursePrice,
          item.status,
          item.batchName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch = !searchValue || text.includes(searchValue);
        const matchesStatus =
          statusFilter === "all" ||
          String(item.status || "enrolled").toLowerCase() === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        }

        if (sortBy === "name") {
          return String(a.name || "").localeCompare(String(b.name || ""));
        }

        if (sortBy === "course") {
          return String(a.courseName || "").localeCompare(
            String(b.courseName || "")
          );
        }

        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [enrollments, search, sortBy, statusFilter]);

  const stats = useMemo(() => {
    const enrolled = enrollments.filter(
      (item) => String(item.status || "enrolled").toLowerCase() === "enrolled"
    ).length;
    const reserved = enrollments.filter(
      (item) => String(item.status || "").toLowerCase() === "reserved"
    ).length;
    const assigned = enrollments.filter((item) => item.batchName).length;
    const uniqueCourses = new Set(
      enrollments.map((item) => item.courseName || item.courseId).filter(Boolean)
    ).size;

    return {
      total: enrollments.length,
      enrolled,
      reserved,
      assigned,
      uniqueCourses,
    };
  }, [enrollments]);

  const courseBreakdown = useMemo(() => {
    const totals = new Map<string, number>();

    enrollments.forEach((item) => {
      const course = item.courseName || item.courseId || "Unknown Course";
      totals.set(course, (totals.get(course) || 0) + 1);
    });

    return Array.from(totals.entries())
      .map(([course, count]) => ({ course, count }))
      .sort((a, b) => b.count - a.count);
  }, [enrollments]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">


      <div className="flex-1  p-10 overflow-y-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div className="flex items-center bg-white px-5 py-4 rounded-2xl border border-gray-200 w-full lg:w-[420px]">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search people, email, course, batch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-3 bg-transparent outline-none w-full text-black placeholder:text-gray-400"
            />
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-200">
              <div className="w-11 h-11 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{user?.name}</p>
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

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-5xl font-bold text-gray-800">People</h1>
            <p className="text-gray-500 mt-3 text-lg">
              Track enrolled and reserved students with course, batch, status, and time details.
            </p>
          </div>

          <button
            onClick={fetchEnrollments}
            className="bg-[#2563eb] hover:bg-blue-600 transition text-white px-7 py-4 rounded-2xl font-semibold w-fit"
          >
            Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
          <StatCard title="Total People" value={stats.total} icon={<Users size={22} />} />
          <StatCard title="Enrolled" value={stats.enrolled} icon={<UserCheck size={22} />} />
          <StatCard title="Reserved" value={stats.reserved} icon={<Clock size={22} />} />
          <StatCard title="Batch Assigned" value={stats.assigned} icon={<Briefcase size={22} />} />
          <StatCard title="Courses" value={stats.uniqueCourses} icon={<BookOpen size={22} />} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-8">
          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Student Records</h2>
                <p className="text-gray-500 mt-2">
                  Showing {filteredEnrollments.length} of {enrollments.length} records.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black"
                >
                  <option value="all">All Status</option>
                  <option value="enrolled">Enrolled</option>
                  <option value="reserved">Reserved</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="course">Course A-Z</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredEnrollments.length > 0 ? (
                filteredEnrollments.map((item) => (
                  <div key={item._id} className="rounded-2xl border border-gray-200 p-5">
                    <div className="grid grid-cols-1 2xl:grid-cols-[1.3fr_1.4fr_1fr_1.2fr_1.3fr_auto] gap-4 2xl:items-center">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">Student</p>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {item.name || "Unknown Student"}
                        </h3>
                        <p className="text-sm text-gray-500 break-all flex items-center gap-2 mt-1">
                          <Mail size={14} />
                          {item.email || "No email"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">Course</p>
                        <h3 className="text-base font-semibold text-gray-900">
                          {item.courseName || item.courseId || "Unknown Course"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.coursePrice || "No price saved"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">Time</p>
                        <h3 className="text-sm font-semibold text-gray-900 mt-1">
                          {formatDateTime(item.createdAt)}
                        </h3>
                        {item.batchAssignedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Batch: {formatDateTime(item.batchAssignedAt)}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-1 gap-3">
                        <select
                          value={statusAssignments[item._id] || item.status || "enrolled"}
                          onChange={(e) =>
                            setStatusAssignments({
                              ...statusAssignments,
                              [item._id]: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black"
                        >
                          <option value="enrolled">Enrolled</option>
                          <option value="reserved">Reserved</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Batch name"
                          value={batchAssignments[item._id] || ""}
                          onChange={(e) =>
                            setBatchAssignments({
                              ...batchAssignments,
                              [item._id]: e.target.value,
                            })
                          }
                          className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black placeholder:text-gray-400"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => generateManualCertificate(item)}
                          disabled={credentialActionId === item._id}
                          className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 transition text-white px-4 py-3 rounded-2xl font-semibold"
                        >
                          {credentialActionId === item._id ? "Working..." : "Generate Certificate"}
                        </button>
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <select
                            value={badgeAssignments[item._id] || badges[0]?.badgeId || ""}
                            onChange={(e) =>
                              setBadgeAssignments({
                                ...badgeAssignments,
                                [item._id]: e.target.value,
                              })
                            }
                            className="w-full border border-gray-300 rounded-2xl px-3 py-3 outline-none text-black"
                          >
                            {badges.map((badge) => (
                              <option key={badge.badgeId} value={badge.badgeId}>
                                {badge.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => awardManualBadge(item)}
                            disabled={credentialActionId === item._id}
                            className="bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 transition text-white px-4 py-3 rounded-2xl font-semibold"
                          >
                            Award
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSavePerson(item)}
                        disabled={savingId === item._id}
                        className="bg-[#2563eb] hover:bg-blue-600 disabled:bg-blue-300 transition text-white px-6 py-3 rounded-2xl font-semibold"
                      >
                        {savingId === item._id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                  No people records found.
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm h-fit">
            <h2 className="text-2xl font-bold text-gray-800">Course Enrollment</h2>
            <p className="text-gray-500 mt-2 mb-6">People count by course.</p>

            <div className="space-y-4">
              {courseBreakdown.length > 0 ? (
                courseBreakdown.map((item) => (
                  <div key={item.course} className="border border-gray-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-gray-900 leading-snug">
                        {item.course}
                      </h3>
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-sm font-semibold">
                        {item.count}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No course data yet.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
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
  icon: React.ReactNode;
  text: string;
  badge?: React.ReactNode;
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

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
          {icon}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
      <p className="text-sm text-gray-500 mt-5">{title}</p>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Time not saved";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
