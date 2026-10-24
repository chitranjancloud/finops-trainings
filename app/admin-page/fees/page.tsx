"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  CreditCard,
  FileText,
  MessageCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type TabKey = "students" | "pending";

function money(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function authParams() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    userId: user._id || "",
    sessionToken: localStorage.getItem("sessionToken") || "",
    deviceId: localStorage.getItem("deviceId") || "",
    name: user.name || "",
  };
}

function authQuery() {
  const a = authParams();
  return new URLSearchParams({
    userId: a.userId,
    sessionToken: a.sessionToken,
    deviceId: a.deviceId,
  });
}

function authBody(extra: Record<string, unknown> = {}) {
  const a = authParams();
  return {
    userId: a.userId,
    sessionToken: a.sessionToken,
    deviceId: a.deviceId,
    ...extra,
  };
}

function statusLabel(status: string) {
  return String(status || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status: string) {
  switch (status) {
    case "FULLY_PAID":
    case "APPROVED":
    case "SENT":
      return "bg-emerald-100 text-emerald-700";
    case "PARTIALLY_PAID":
    case "PENDING_APPROVAL":
      return "bg-amber-100 text-amber-700";
    case "CANCELLED":
    case "REJECTED":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function apiErrorMessage(status: number, data: any) {
  if (status === 401) return "You are not authorized. Please log in again.";
  if (status === 403) return "You are not authorized.";
  if (status === 404) return data?.message || "Student/enrollment not found.";
  if (status === 409) return data?.message || "Payment is already processed.";
  if (status === 400) {
    return (
      data?.message ||
      "Payment could not be recorded. Check the amount and remaining balance."
    );
  }
  return data?.message || "Something went wrong. Please try again.";
}

function SidebarLink({ href, icon, text, active = false, badge }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium transition ${
        active
          ? "bg-blue-100 text-blue-700"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function buildPaidAtIso(date: string, time: string) {
  if (!date) return undefined;
  const t = time || "00:00:00";
  const withSeconds = t.length === 5 ? `${t}:00` : t;
  const d = new Date(`${date}T${withSeconds}`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

const METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export default function FeesPage() {
  const [tab, setTab] = useState<TabKey>("students");
  const [dashboard, setDashboard] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loadingDash, setLoadingDash] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const [showPay, setShowPay] = useState(false);
  const [payEnrollmentId, setPayEnrollmentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payTime, setPayTime] = useState("");
  const [payMethod, setPayMethod] = useState("upi");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const [reasonModal, setReasonModal] = useState<{
    id: string;
    type: "cancel" | "reject";
  } | null>(null);
  const [reasonText, setReasonText] = useState("");

  const [receiptHtml, setReceiptHtml] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  const [showOverride, setShowOverride] = useState(false);
  const [overrideFee, setOverrideFee] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    const verify = async () => {
      const storedUser = localStorage.getItem("user");
      const sessionToken = localStorage.getItem("sessionToken");
      const deviceId = localStorage.getItem("deviceId");
      if (!storedUser || !sessionToken || !deviceId) {
        window.location.href = "/login";
        return;
      }
      const parsed = JSON.parse(storedUser);
      if (parsed.role !== "admin") {
        window.location.href = "/";
        return;
      }
      const res = await fetch("/api/session/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parsed._id,
          sessionToken,
          deviceId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        localStorage.clear();
        window.location.href = "/login";
      }
    };
    verify().catch(() => {
      window.location.href = "/login";
    });
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoadingDash(true);
    try {
      const res = await fetch(
        `/api/admin/fees/dashboard?${authQuery().toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setDashboard(data.dashboard || null);
    } finally {
      setLoadingDash(false);
    }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoadingStudents(true);
    try {
      const params = authQuery();
      if (search) params.set("search", search);
      params.set("limit", "100");
      const res = await fetch(`/api/admin/fees/students?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setStudents(data.students || []);
    } finally {
      setLoadingStudents(false);
    }
  }, [search]);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const params = authQuery();
      params.set("limit", "100");
      const res = await fetch(
        `/api/admin/fees/payments/pending?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setPending(data.pending || []);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadDashboard(), loadStudents(), loadPending()]);
  }, [loadDashboard, loadStudents, loadPending]);

  useEffect(() => {
    refreshAll().catch(() => undefined);
  }, [refreshAll]);

  const openProfile = async (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    setProfileLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/fees/students/${enrollmentId}?${authQuery().toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        setProfile(null);
        return;
      }
      setProfile(data.profile);
      setOverrideFee(String(data.profile?.fee?.totalFee || ""));
    } finally {
      setProfileLoading(false);
    }
  };

  const selectedStudent = useMemo(
    () => students.find((s) => s.enrollmentId === payEnrollmentId),
    [students, payEnrollmentId]
  );

  const previewRemaining = useMemo(() => {
    if (!selectedStudent) return null;
    const amount = Number(payAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return {
      totalFee: selectedStudent.totalFee,
      alreadyPaid: selectedStudent.totalPaid,
      thisPayment: amount,
      remaining: Math.max(
        Number(selectedStudent.totalFee || 0) -
          Number(selectedStudent.totalPaid || 0) -
          amount,
        0
      ),
      exceeds:
        Number(selectedStudent.totalPaid || 0) + amount >
        Number(selectedStudent.totalFee || 0),
    };
  }, [selectedStudent, payAmount]);

  const submitPayment = async () => {
    if (!payEnrollmentId) {
      setError("Select a student/enrollment.");
      return;
    }
    setActionLoading("pay");
    setError("");
    setSuccess("");
    try {
      const method = payMethod === "cheque" ? "other" : payMethod;
      const paidAt = buildPaidAtIso(payDate, payTime);
      const res = await fetch("/api/admin/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authBody({
            enrollmentId: payEnrollmentId,
            amount: Number(payAmount),
            paymentMethod: method,
            transactionReference: payRef,
            notes: payNotes,
            ...(paidAt ? { paidAt } : {}),
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setSuccess(
        "Payment recorded. Receipt is pending approval. Email and WhatsApp were not sent."
      );
      setShowPay(false);
      setPayAmount("");
      setPayRef("");
      setPayNotes("");
      await refreshAll();
      if (selectedEnrollmentId === payEnrollmentId) {
        await openProfile(payEnrollmentId);
      }
    } finally {
      setActionLoading("");
    }
  };

  const approvePayment = async (id: string) => {
    setActionLoading(`approve-${id}`);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fees/payments/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody()),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      const emailFailed = data.delivery?.email?.status === "FAILED";
      const whatsappFailed = data.delivery?.whatsapp?.status === "FAILED";
      if (emailFailed || whatsappFailed) {
        setSuccess(
          data.message ||
            "Payment approved, but receipt delivery failed."
        );
      } else {
        setSuccess(
          data.message ||
            "Payment approved successfully. Receipt delivery completed."
        );
      }
      await refreshAll();
      if (selectedEnrollmentId) await openProfile(selectedEnrollmentId);
    } finally {
      setActionLoading("");
    }
  };

  const retryDelivery = async (id: string, channel: "email" | "whatsapp") => {
    setActionLoading(`deliver-${channel}-${id}`);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fees/payments/${id}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody({ channel })),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setSuccess(data.message || "Delivery retry completed.");
      await refreshAll();
      if (selectedEnrollmentId) await openProfile(selectedEnrollmentId);
    } finally {
      setActionLoading("");
    }
  };

  const deliveryBadge = (status?: string, sentAt?: string) => {
    if (status === "SENT") {
      return (
        <span className="text-emerald-700 font-semibold">
          ✓ Sent{sentAt ? ` · ${sentAt}` : ""}
        </span>
      );
    }
    if (status === "FAILED") {
      return <span className="text-rose-700 font-semibold">✕ Failed</span>;
    }
    return <span className="text-gray-500">Not sent</span>;
  };

  const submitReasonAction = async () => {
    if (!reasonModal) return;
    if (!reasonText.trim()) {
      setError("A reason is required.");
      return;
    }
    const { id, type } = reasonModal;
    setActionLoading(`${type}-${id}`);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fees/payments/${id}/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authBody(
            type === "cancel"
              ? { cancelReason: reasonText.trim() }
              : { reason: reasonText.trim() }
          )
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setSuccess(
        type === "cancel" ? "Payment cancelled." : "Payment rejected."
      );
      setReasonModal(null);
      setReasonText("");
      await refreshAll();
      if (selectedEnrollmentId) await openProfile(selectedEnrollmentId);
    } finally {
      setActionLoading("");
    }
  };

  const viewReceipt = async (id: string) => {
    setActionLoading(`receipt-${id}`);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/fees/payments/${id}/receipt?${authQuery().toString()}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(apiErrorMessage(res.status, data));
        return;
      }
      const html = await res.text();
      setReceiptHtml(html);
      setShowReceipt(true);
    } finally {
      setActionLoading("");
    }
  };

  const submitOverride = async () => {
    const feeAccountId = profile?.fee?.feeAccountId;
    if (!feeAccountId) return;
    if (!overrideReason.trim()) {
      setError("Override reason is required.");
      return;
    }
    setActionLoading("override");
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/fees/accounts/${feeAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          authBody({
            totalFee: Number(overrideFee),
            feeOverrideReason: overrideReason.trim(),
          })
        ),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(apiErrorMessage(res.status, data));
        return;
      }
      setSuccess("Total fee updated.");
      setShowOverride(false);
      setOverrideReason("");
      await refreshAll();
      if (selectedEnrollmentId) await openProfile(selectedEnrollmentId);
    } finally {
      setActionLoading("");
    }
  };

  const cards = [
    {
      label: "Total Students",
      value: dashboard?.totalStudents ?? "—",
    },
    {
      label: "Total Fees",
      value: dashboard ? money(dashboard.totalFeeAmount) : "—",
    },
    {
      label: "Total Paid",
      value: dashboard ? money(dashboard.totalPaidAmount) : "—",
    },
    {
      label: "Total Outstanding",
      value: dashboard ? money(dashboard.totalOutstandingAmount) : "—",
    },
    {
      label: "Pending Approvals",
      value: dashboard?.pendingApprovalCount ?? "—",
    },
    {
      label: "Fully Paid Students",
      value: dashboard?.fullyPaidStudents ?? "—",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">
      <aside className="fixed h-screen w-[250px] overflow-y-auto border-r border-gray-200 bg-white z-20">
        <div className="px-8 py-10">
          <h1 className="text-4xl font-bold text-blue-500">FinOps</h1>
        </div>
        <div className="px-4 space-y-2">
          <SidebarLink href="/admin-page" icon={<BookOpen size={22} />} text="Courses" />
          <SidebarLink href="/admin-page/batches" icon={<Briefcase size={22} />} text="Batches" />
          <SidebarLink href="/admin-page/fees" icon={<CreditCard size={22} />} text="Fees" active />
          <SidebarLink
            href="/admin-page/notifications"
            icon={<Bell size={22} />}
            text="Notifications"
            badge={<AdminNotificationBadge />}
          />
          <SidebarLink href="/admin-page/tests" icon={<FileText size={22} />} text="Tests" />
          <SidebarLink href="/admin-page/assignments" icon={<FileText size={22} />} text="Assignments" />
          <SidebarLink href="/admin-page/chats" icon={<MessageCircle size={22} />} text="Chats" />
          <SidebarLink href="/admin-page/people" icon={<Users size={22} />} text="People" />
        </div>
      </aside>

      <main className="ml-[250px] min-h-screen flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">
              Fee Management
            </p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950">Fees</h1>
            <p className="mt-2 text-gray-500">
              Student fee accounts, installments, and receipt approvals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPayEnrollmentId(selectedEnrollmentId || "");
                setShowPay(true);
              }}
              className="rounded-xl bg-[#2563eb] px-5 py-3 text-sm font-bold text-white hover:bg-blue-600"
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => refreshAll()}
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
              error
                ? "bg-rose-50 text-rose-700 border border-rose-100"
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            {error || success}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => {
                setError("");
                setSuccess("");
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                {card.label}
              </p>
              <p className="mt-2 text-xl font-black text-gray-950">
                {loadingDash ? "…" : card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("students")}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              tab === "students"
                ? "bg-[#2563eb] text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Students
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${
              tab === "pending"
                ? "bg-[#2563eb] text-white"
                : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Pending Approvals
            {dashboard?.pendingApprovalCount
              ? ` (${dashboard.pendingApprovalCount})`
              : ""}
          </button>
        </div>

        {tab === "students" && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
            <form
              className="mb-4 flex flex-col gap-2 md:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(searchInput.trim());
              }}
            >
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search name, email, WhatsApp…"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400"
                />
              </div>
              <button
                type="submit"
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
              >
                Search
              </button>
            </form>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="py-3">Student</th>
                    <th className="py-3">WhatsApp</th>
                    <th className="py-3">Course / Batch</th>
                    <th className="py-3">Total</th>
                    <th className="py-3">Paid</th>
                    <th className="py-3">Remaining</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStudents ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        Loading students…
                      </td>
                    </tr>
                  ) : students.length ? (
                    students.map((row) => (
                      <tr
                        key={row.enrollmentId}
                        className="border-b border-gray-100 text-gray-800"
                      >
                        <td className="py-4">
                          <p className="font-bold text-gray-950">
                            {row.student?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.student?.email}
                          </p>
                        </td>
                        <td className="py-4">{row.student?.whatsapp || "—"}</td>
                        <td className="py-4">
                          <p className="font-semibold">
                            {row.course?.courseName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.batch?.batchName || "To be assigned"}
                          </p>
                        </td>
                        <td className="py-4">{money(row.totalFee, row.currency)}</td>
                        <td className="py-4 font-bold text-emerald-600">
                          {money(row.totalPaid, row.currency)}
                        </td>
                        <td className="py-4 font-bold text-amber-600">
                          {money(row.remainingAmount, row.currency)}
                        </td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              row.paymentStatus
                            )}`}
                          >
                            {statusLabel(row.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-4">
                          <button
                            type="button"
                            onClick={() => openProfile(row.enrollmentId)}
                            className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-500">
                        No students found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {loadingStudents ? (
                <p className="py-8 text-center text-gray-500">Loading…</p>
              ) : students.length ? (
                students.map((row) => (
                  <div
                    key={row.enrollmentId}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <p className="font-bold text-gray-950">{row.student?.name}</p>
                    <p className="text-xs text-gray-500">{row.student?.email}</p>
                    <p className="mt-2 text-sm">{row.course?.courseName}</p>
                    <p className="text-xs text-gray-500">
                      {row.batch?.batchName || "To be assigned"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm">
                      <span>Paid {money(row.totalPaid)}</span>
                      <span className="text-amber-700">
                        Due {money(row.remainingAmount)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProfile(row.enrollmentId)}
                      className="mt-3 rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white"
                    >
                      View details
                    </button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-gray-500">No students found.</p>
              )}
            </div>
          </div>
        )}

        {tab === "pending" && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
            {loadingPending ? (
              <p className="py-10 text-center text-gray-500">
                Loading pending approvals…
              </p>
            ) : pending.length ? (
              <div className="space-y-3">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-amber-100 bg-amber-50/40 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-bold text-gray-950">
                          {item.student?.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {item.course?.courseName} ·{" "}
                          {item.batch?.batchName || "Unassigned"}
                        </p>
                        <p className="mt-2 text-lg font-black text-gray-950">
                          {money(item.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Receipt {item.receiptNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          Paid:{" "}
                          {item.paidAtFormatted ||
                            item.paidAt ||
                            "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Recorded by {item.recordedByName || "—"} ·{" "}
                          {item.recordedAtFormatted || "—"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => viewReceipt(item.id)}
                          className="rounded-xl bg-white border border-gray-200 px-3 py-2 text-xs font-bold"
                        >
                          View Receipt
                        </button>
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => approvePayment(item.id)}
                          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                        >
                          {actionLoading === `approve-${item.id}`
                            ? "…"
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => {
                            setReasonModal({ id: item.id, type: "reject" });
                            setReasonText("");
                          }}
                          className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={!!actionLoading}
                          onClick={() => {
                            setReasonModal({ id: item.id, type: "cancel" });
                            setReasonText("");
                          }}
                          className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-gray-500">
                No pending approvals.
              </p>
            )}
          </div>
        )}
      </main>

      {/* Student detail drawer */}
      {(selectedEnrollmentId || profileLoading) && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-950">
                Student Fee Profile
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedEnrollmentId("");
                  setProfile(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {profileLoading || !profile ? (
              <p className="py-10 text-center text-gray-500">Loading profile…</p>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-lg font-bold">{profile.student?.name}</p>
                  <p className="text-sm text-gray-600">{profile.student?.email}</p>
                  <p className="text-sm text-gray-600">
                    WhatsApp: {profile.student?.whatsapp || "—"}
                  </p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">Course:</span>{" "}
                    {profile.enrollment?.courseName}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Batch:</span>{" "}
                    {profile.enrollment?.batchName || "To be assigned"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Mode:</span>{" "}
                    {profile.enrollment?.learningMode}
                  </p>
                  <p className="text-sm text-gray-500">
                    Enrolled:{" "}
                    {profile.enrollment?.enrolledAt
                      ? new Date(
                          profile.enrollment.enrolledAt
                        ).toLocaleString("en-IN", {
                          timeZone: profile.timeZone || "Asia/Kolkata",
                        })
                      : "—"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border p-3">
                    <p className="text-xs text-gray-500">Total Fee</p>
                    <p className="font-black">
                      {money(profile.fee?.totalFee, profile.fee?.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="font-black text-emerald-600">
                      {money(profile.fee?.totalPaid, profile.fee?.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="font-black text-amber-600">
                      {money(
                        profile.fee?.remainingAmount,
                        profile.fee?.currency
                      )}
                    </p>
                  </div>
                  <div className="rounded-2xl border p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p
                      className={`mt-1 inline-block rounded-full px-2 py-1 text-xs font-bold ${statusClass(
                        profile.fee?.paymentStatus
                      )}`}
                    >
                      {statusLabel(profile.fee?.paymentStatus)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayEnrollmentId(selectedEnrollmentId);
                      setShowPay(true);
                    }}
                    className="rounded-xl bg-[#2563eb] px-4 py-2 text-xs font-bold text-white"
                  >
                    Record Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOverride(true)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold"
                  >
                    Edit Total Fee
                  </button>
                </div>

                <div>
                  <h3 className="mb-3 font-black text-gray-950">
                    Payment History
                  </h3>
                  <div className="space-y-3">
                    {(profile.paymentHistory || []).length ? (
                      profile.paymentHistory.map((p: any) => (
                        <div
                          key={p.id}
                          className="rounded-2xl border border-gray-100 p-4 text-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-bold">{p.receiptNumber}</p>
                              <p className="text-lg font-black">
                                {money(p.amount, profile.fee?.currency)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass(
                                p.receiptStatus
                              )}`}
                            >
                              {statusLabel(p.receiptStatus)}
                            </span>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-gray-600">
                            <p>
                              Paid: {p.paidAtFormatted || "—"}
                            </p>
                            <p>
                              Method: {statusLabel(p.paymentMethod || "")}
                              {p.transactionReference
                                ? ` · Ref ${p.transactionReference}`
                                : ""}
                            </p>
                            <p>
                              Previous {money(p.previousPaidAmount)} → Total{" "}
                              {money(p.totalPaidAfterPayment)} · Remaining{" "}
                              {money(p.remainingBalanceAfterPayment)}
                            </p>
                            <p>
                              Recorded by {p.recordedByName || "—"} ·{" "}
                              {p.recordedAtFormatted || "—"}
                            </p>
                            {p.approvedAtFormatted && (
                              <p>
                                Approved by {p.approvedByName || "—"} ·{" "}
                                {p.approvedAtFormatted}
                              </p>
                            )}
                            {(p.receiptStatus === "APPROVED" ||
                              p.receiptStatus === "SENT") && (
                              <div className="mt-2 space-y-1 rounded-xl bg-slate-50 p-2">
                                <p>
                                  Email:{" "}
                                  {deliveryBadge(
                                    p.emailStatus,
                                    p.emailSentAtFormatted
                                  )}
                                </p>
                                {p.emailStatus === "FAILED" && p.emailError && (
                                  <p className="text-rose-600">{p.emailError}</p>
                                )}
                                <p>
                                  WhatsApp:{" "}
                                  {deliveryBadge(
                                    p.whatsappStatus,
                                    p.whatsappSentAtFormatted
                                  )}
                                </p>
                                {p.whatsappStatus === "FAILED" &&
                                  p.whatsappError && (
                                    <p className="text-rose-600">
                                      {p.whatsappError}
                                    </p>
                                  )}
                              </div>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => viewReceipt(p.id)}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                            >
                              View Receipt
                            </button>
                            {p.receiptStatus === "PENDING_APPROVAL" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => approvePayment(p.id)}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReasonModal({
                                      id: p.id,
                                      type: "reject",
                                    })
                                  }
                                  className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReasonModal({
                                      id: p.id,
                                      type: "cancel",
                                    })
                                  }
                                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {(p.receiptStatus === "APPROVED" ||
                              p.receiptStatus === "SENT") &&
                              p.emailStatus === "FAILED" && (
                                <button
                                  type="button"
                                  disabled={!!actionLoading}
                                  onClick={() => retryDelivery(p.id, "email")}
                                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  {actionLoading === `deliver-email-${p.id}`
                                    ? "…"
                                    : "Retry Email"}
                                </button>
                              )}
                            {(p.receiptStatus === "APPROVED" ||
                              p.receiptStatus === "SENT") &&
                              p.whatsappStatus === "FAILED" && (
                                <button
                                  type="button"
                                  disabled={!!actionLoading}
                                  onClick={() =>
                                    retryDelivery(p.id, "whatsapp")
                                  }
                                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                                >
                                  {actionLoading === `deliver-whatsapp-${p.id}`
                                    ? "…"
                                    : "Retry WhatsApp"}
                                </button>
                              )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No payments yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-black">Record Payment</h3>
              <button type="button" onClick={() => setShowPay(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500">
                Student / Enrollment
                <select
                  value={payEnrollmentId}
                  onChange={(e) => setPayEnrollmentId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {students.map((s) => (
                    <option key={s.enrollmentId} value={s.enrollmentId}>
                      {s.student?.name} — {s.course?.courseName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-gray-500">
                Amount
                <input
                  type="number"
                  min={1}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-gray-500">
                  Payment Date
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-bold text-gray-500">
                  Payment Time
                  <input
                    type="time"
                    step={1}
                    value={payTime}
                    onChange={(e) => setPayTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-gray-500">
                Payment Method
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m.label} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-gray-500">
                Transaction Reference
                <input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-gray-500">
                Notes
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  rows={2}
                />
              </label>

              {previewRemaining && (
                <div
                  className={`rounded-2xl border p-3 text-sm ${
                    previewRemaining.exceeds
                      ? "border-rose-200 bg-rose-50 text-rose-800"
                      : "border-blue-100 bg-blue-50 text-blue-900"
                  }`}
                >
                  <p>Total Fee: {money(previewRemaining.totalFee)}</p>
                  <p>Already Paid: {money(previewRemaining.alreadyPaid)}</p>
                  <p>This Payment: {money(previewRemaining.thisPayment)}</p>
                  <p className="font-bold">
                    Remaining: {money(previewRemaining.remaining)}
                  </p>
                  {previewRemaining.exceeds && (
                    <p className="mt-1 font-bold">
                      This payment exceeds remaining balance.
                    </p>
                  )}
                  <p className="mt-1 text-xs opacity-70">
                    Preview only — server remains authoritative.
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={!!actionLoading || previewRemaining?.exceeds}
                onClick={submitPayment}
                className="w-full rounded-2xl bg-[#2563eb] py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {actionLoading === "pay" ? "Saving…" : "Confirm Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reason modal */}
      {reasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6">
            <h3 className="text-lg font-black capitalize">
              {reasonModal.type} payment
            </h3>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Reason (required)"
              className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              rows={3}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReasonModal(null)}
                className="flex-1 rounded-xl border py-2 text-sm font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={submitReasonAction}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-bold text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee override */}
      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6">
            <h3 className="text-lg font-black">Edit Total Fee</h3>
            <label className="mt-3 block text-xs font-bold text-gray-500">
              New Total Fee
              <input
                type="number"
                min={1}
                value={overrideFee}
                onChange={(e) => setOverrideFee(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-gray-500">
              Override Reason
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                rows={3}
              />
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowOverride(false)}
                className="flex-1 rounded-xl border py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitOverride}
                className="flex-1 rounded-xl bg-[#2563eb] py-2 text-sm font-bold text-white"
              >
                {actionLoading === "override" ? "…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt preview */}
      {showReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-black">Receipt</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const w = window.open("", "_blank");
                    if (w) {
                      w.document.write(receiptHtml);
                      w.document.close();
                      w.focus();
                      w.print();
                    }
                  }}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                >
                  Print
                </button>
                <button type="button" onClick={() => setShowReceipt(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe
              title="Fee receipt"
              srcDoc={receiptHtml}
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
