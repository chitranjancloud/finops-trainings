"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Download,
  FileText,
  Link2,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

const emptyForm = {
  title: "",
  courseId: "",
  courseName: "",
  teamsUrl: "",
  description: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export default function AdminMeetingsPage() {
  const [user, setUser] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");

    if (!storedUser || !sessionToken || !deviceId) {
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "admin") {
      window.location.href = "/";
      return;
    }

    setUser(parsedUser);
    loadAll(parsedUser);
  }, []);

  const authParams = (activeUser = user) =>
    new URLSearchParams({
      userId: activeUser?._id || "",
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    });

  const loadAll = async (activeUser = user) => {
    try {
      setLoading(true);
      const params = authParams(activeUser);
      const courseParams = authParams(activeUser);
      courseParams.set("includeProtected", "1");
      const [courseRes, meetingRes, attendanceRes] = await Promise.all([
        fetch(`/api/courses?${courseParams.toString()}`, { cache: "no-store" }),
        fetch(`/api/teams-meetings?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/teams-attendance?${params.toString()}`, { cache: "no-store" }),
      ]);
      const courseData = await courseRes.json();
      const meetingData = await meetingRes.json();
      const attendanceData = await attendanceRes.json();

      if (courseData.success) setCourses(courseData.courses || []);
      if (meetingData.success) setMeetings(meetingData.meetings || []);
      if (attendanceData.success) setAttendance(attendanceData.records || []);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const saveMeeting = async () => {
    try {
      const body = {
        ...form,
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
      };
      const res = await fetch(
        editingId ? `/api/teams-meetings/${editingId}` : "/api/teams-meetings",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();

      if (data.success) {
        setForm(emptyForm);
        setEditingId("");
        loadAll();
      } else {
        alert(data.message || "Unable to save meeting");
      }
    } catch (error) {
      console.log(error);
      alert("Unable to save meeting");
    }
  };

  const editMeeting = (meeting: any) => {
    setEditingId(meeting._id);
    setForm({
      title: meeting.title || "",
      courseId: meeting.courseId || "",
      courseName: meeting.courseName || "",
      teamsUrl: meeting.teamsUrl || "",
      description: meeting.description || "",
      startsAt: toInputDate(meeting.startsAt),
      endsAt: toInputDate(meeting.endsAt),
      isActive: meeting.isActive !== false,
    });
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm("Delete this Teams meeting link?")) return;

    const params = authParams();
    const res = await fetch(`/api/teams-meetings/${id}?${params.toString()}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (data.success) loadAll();
  };

  const downloadExcel = (meetingId = "") => {
    const params = authParams();
    params.set("format", "excel");
    if (meetingId) params.set("meetingId", meetingId);
    window.location.href = `/api/teams-attendance?${params.toString()}`;
  };

  const filteredAttendance = useMemo(() => {
    if (!selectedMeeting) return attendance;
    const meeting = meetings.find((item) => item._id === selectedMeeting);
    return attendance.filter((row) => row.meetingTitle === meeting?.title);
  }, [attendance, meetings, selectedMeeting]);

  const handleLogout = async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("sessionToken");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">


      <main className="flex-1  p-10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-600">
              Meeting Control
            </p>
            <h1 className="text-5xl font-bold text-gray-900 mt-3">Teams Meetings</h1>
            <p className="text-gray-500 mt-3 text-lg">
              Send course-only Teams links and track join, leave, and total meeting time.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadAll()}
              className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            <button
              onClick={() => downloadExcel(selectedMeeting)}
              className="bg-gray-900 text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
            >
              <Download size={18} />
              Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[430px_1fr] gap-8">
          <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm h-fit">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
              <Plus size={28} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {editingId ? "Edit Meeting" : "Create Meeting Link"}
            </h2>
            <p className="text-gray-500 mt-2 mb-6">
              Only students enrolled in the selected course can see this link.
            </p>

            <div className="space-y-4">
              <input
                placeholder="Meeting title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
              <select
                value={form.courseId}
                onChange={(e) => {
                  const course = courses.find((item) => item._id === e.target.value);
                  setForm({
                    ...form,
                    courseId: course?._id || "",
                    courseName: course?.title || "",
                  });
                }}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black"
              >
                <option value="">Select enrolled course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <input
                placeholder="Course name"
                value={form.courseName}
                onChange={(e) => setForm({ ...form, courseName: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
              <input
                placeholder="Microsoft Teams join link"
                value={form.teamsUrl}
                onChange={(e) => setForm({ ...form, teamsUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
              <textarea
                rows={3}
                placeholder="Notes for students"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black"
                />
                <input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                  className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black"
                />
              </div>
              <label className="flex items-center gap-3 text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Visible to enrolled students
              </label>
              <div className="flex gap-3">
                <button
                  onClick={saveMeeting}
                  className="flex-1 bg-[#2563eb] hover:bg-blue-600 text-white px-5 py-4 rounded-2xl font-semibold"
                >
                  {editingId ? "Update Meeting" : "Send Link"}
                </button>
                {editingId && (
                  <button
                    onClick={() => {
                      setEditingId("");
                      setForm(emptyForm);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-4 rounded-2xl font-semibold"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-8">
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900">Live Links</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
                {meetings.length > 0 ? (
                  meetings.map((meeting) => (
                    <div key={meeting._id} className="rounded-3xl border border-gray-200 p-5 bg-gray-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            meeting.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                          }`}>
                            {meeting.isActive ? "Visible" : "Hidden"}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900 mt-3">{meeting.title}</h3>
                          <p className="text-sm text-gray-500 mt-1">{meeting.courseName}</p>
                          <p className="text-sm text-gray-500 mt-3">{meeting.description}</p>
                          <p className="text-xs text-gray-400 mt-3">{formatDate(meeting.startsAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-5">
                        <button onClick={() => editMeeting(meeting)} className="bg-gray-900 text-white px-4 py-2 rounded-xl font-semibold">
                          Edit
                        </button>
                        <button onClick={() => deleteMeeting(meeting._id)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2">
                          <Trash2 size={16} />
                          Delete
                        </button>
                        <button onClick={() => downloadExcel(meeting._id)} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-semibold">
                          Excel
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lg:col-span-2 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                    {loading ? "Loading meetings..." : "No Teams links created yet."}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Attendance Report</h2>
                  <p className="text-gray-500 mt-1">Join time, leave time, and total time spent.</p>
                </div>
                <select
                  value={selectedMeeting}
                  onChange={(e) => setSelectedMeeting(e.target.value)}
                  className="border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black"
                >
                  <option value="">All meetings</option>
                  {meetings.map((meeting) => (
                    <option key={meeting._id} value={meeting._id}>
                      {meeting.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Meeting</th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Left</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttendance.length > 0 ? (
                      filteredAttendance.map((row, index) => (
                        <tr key={`${row.email}-${index}`} className="border-t border-gray-100 text-gray-800">
                          <td className="px-4 py-4 font-semibold">{row.meetingTitle}</td>
                          <td className="px-4 py-4">
                            <div className="font-semibold">{row.name}</div>
                            <div className="text-gray-500">{row.email}</div>
                          </td>
                          <td className="px-4 py-4">{row.courseName}</td>
                          <td className="px-4 py-4">{row.joinedAt}</td>
                          <td className="px-4 py-4">{row.leftAt || "-"}</td>
                          <td className="px-4 py-4 font-semibold">{row.totalTime}</td>
                          <td className="px-4 py-4 capitalize">{row.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No attendance records yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, text, badge = null }: { href: string; icon: React.ReactNode; text: string; badge?: React.ReactNode }) {
  return (
    <Link href={href} className="w-full flex items-center justify-between gap-4 hover:bg-gray-100 text-gray-700 px-5 py-4 rounded-2xl transition">
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function toInputDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function formatDate(value?: string) {
  if (!value) return "No schedule saved";
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
