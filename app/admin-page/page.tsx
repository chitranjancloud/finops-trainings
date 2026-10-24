"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  BookOpen,
  Users,
  MessageCircle,
  Plus,
  LogOut,
  Briefcase,
  FileText,
  Mail,
  Send,
  ShieldCheck,
  Activity,
  Download,
  X,
  Bell,
  CreditCard,
  CalendarDays,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronDown,
  Loader2,
  RefreshCw,
  Trash2,
  Play,
  Upload,
  LayoutList,
  Film,
  Package,
  ExternalLink,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

const emptyLogoForm = {
  name: "",
  logo: "",
  description: "",
  role: "",
  website: "",
  displayOrder: "",
};

const emptyTestimonialForm = {
  name: "",
  role: "",
  content: "",
  rating: "5",
  displayOrder: "",
};

const emptyWebinarForm = {
  name: "",
  title: "",
  date: "",
  time: "",
  img: "",
  role: "",
  price: "",
  displayOrder: "",
};

const emptyBannerForm = {
  eyebrow: "",
  title: "",
  description: "",
  image: "",
  ctaLabel: "",
  ctaHref: "",
  badge: "",
  accent: "cyan",
  displayOrder: "",
  isActive: true,
};

const emptySessionForm = {
  title: "",
  subtitle: "",
  description: "",
  category: "Training",
  date: "",
  location: "",
  attendees: "",
  duration: "",
  images: [] as string[],
  coverImage: "",
  highlights: [] as string[],
  tags: [] as string[],
  instructor: "",
  isActive: true,
  isFeatured: false,
  displayOrder: "",
};

// Same fallback sessions shown on the user-facing homepage gallery
const ADMIN_FALLBACK_SESSIONS = [
  {
    _id: "fallback-1",
    title: "AWS Solutions Architect Bootcamp",
    subtitle: "Hands-on cloud architecture for real-world deployments",
    description: "A 3-day intensive bootcamp covering AWS core services, VPC networking, IAM security, EC2/S3/RDS, and serverless architecture. Students built and deployed a fully working cloud application by the end of Day 3.",
    category: "AWS",
    date: "April 2024",
    location: "Mumbai, India",
    attendees: "52",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
      "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&q=80",
      "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    highlights: ["Live AWS Console Labs", "VPC & Security Groups", "Serverless with Lambda", "Mock Exam & Certification Path"],
    tags: ["AWS", "Cloud", "Architecture", "Certification"],
    instructor: "Arjun Sharma",
    isFeatured: true,
    isActive: true,
    displayOrder: 1,
  },
  {
    _id: "fallback-2",
    title: "FinOps Foundation Practitioner Workshop",
    subtitle: "Cloud cost optimisation for finance & engineering teams",
    description: "An executive-level workshop bringing together finance controllers and DevOps engineers to align on cloud cost governance. Covered tagging strategies, showback/chargeback models, and FinOps maturity frameworks used by Fortune 500 companies.",
    category: "FinOps",
    date: "February 2024",
    location: "Bengaluru, India",
    attendees: "38",
    duration: "2 Days",
    images: [
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&q=80",
    highlights: ["Cost Allocation Deep-dive", "Tagging & Chargeback Strategy", "FinOps Maturity Assessment", "Executive Dashboard Reporting"],
    tags: ["FinOps", "Cost Optimisation", "Cloud Finance"],
    instructor: "Priya Mehta",
    isFeatured: true,
    isActive: true,
    displayOrder: 2,
  },
  {
    _id: "fallback-3",
    title: "DevSecOps Immersion Program",
    subtitle: "Security-first CI/CD pipeline engineering",
    description: "A 3-day structured program combining DevOps culture, CI/CD pipeline automation with GitHub Actions, Docker containerisation, Kubernetes orchestration, and SAST/DAST security scanning integrated into every pipeline stage.",
    category: "DevOps",
    date: "November 2023",
    location: "Pune, India",
    attendees: "64",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
      "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
      "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80",
    highlights: ["Docker & Kubernetes Hands-on", "SAST / DAST Integration", "GitHub Actions Pipelines", "Threat Modelling Workshop"],
    tags: ["DevSecOps", "Kubernetes", "Docker", "CI/CD"],
    instructor: "Rahul Kulkarni",
    isFeatured: false,
    isActive: true,
    displayOrder: 3,
  },
  {
    _id: "fallback-4",
    title: "Azure Cloud Administrator Training",
    subtitle: "Enterprise Azure skills for the AZ-104 certification",
    description: "Comprehensive 4-day training covering Azure Active Directory, virtual machines, storage accounts, networking, and monitoring. Participants left with a structured study plan and practice lab environment.",
    category: "Azure",
    date: "January 2024",
    location: "Hyderabad, India",
    attendees: "45",
    duration: "4 Days",
    images: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80",
    highlights: ["Azure AD & RBAC", "VM & Storage Labs", "Virtual Networking", "AZ-104 Exam Strategy"],
    tags: ["Azure", "Microsoft", "Cloud", "AZ-104"],
    instructor: "Sneha Joshi",
    isFeatured: false,
    isActive: true,
    displayOrder: 4,
  },
  {
    _id: "fallback-5",
    title: "Corporate FinOps Transformation",
    subtitle: "On-site program for a 500-person engineering org",
    description: "A custom 2-day on-site program delivered for a leading BFSI company's cloud and finance leadership. Covered FinOps unit economics, reserved instance planning, and building an internal cloud centre of excellence.",
    category: "Corporate",
    date: "March 2024",
    location: "Chennai, India",
    attendees: "80",
    duration: "2 Days",
    images: [
      "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80",
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800&q=80",
    highlights: ["Unit Economics for Cloud", "RI & Savings Plans Strategy", "Cloud Centre of Excellence", "Executive Reporting Dashboards"],
    tags: ["Corporate", "BFSI", "FinOps", "Transformation"],
    instructor: "Vikram Nair",
    isFeatured: true,
    isActive: true,
    displayOrder: 5,
  },
  {
    _id: "fallback-6",
    title: "Google Cloud Professional Bootcamp",
    subtitle: "GCP core services and Professional Cloud Architect prep",
    description: "An intensive 3-day bootcamp on Google Cloud fundamentals, BigQuery, GKE, Cloud Run, and security best practices. Designed to prepare professionals for the GCP Professional Cloud Architect examination.",
    category: "GCP",
    date: "December 2023",
    location: "Delhi, India",
    attendees: "36",
    duration: "3 Days",
    images: [
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&q=80",
    ],
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&q=80",
    highlights: ["BigQuery & Data Analytics", "GKE & Cloud Run Labs", "IAM & Security Policies", "Architect Exam Mock Test"],
    tags: ["GCP", "Google Cloud", "BigQuery", "Certification"],
    instructor: "Ananya Kapoor",
    isFeatured: false,
    isActive: true,
    displayOrder: 6,
  },
];

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);

  // DYNAMIC COURSES
  const [courses, setCourses] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [trustedCompanies, setTrustedCompanies] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [heroBanners, setHeroBanners] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [consultancyBookings, setConsultancyBookings] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [studentActivities, setStudentActivities] = useState<any[]>([]);
  const [activityRange, setActivityRange] = useState("weekly");
  const [activityLoading, setActivityLoading] = useState(false);
  const [batchAssignments, setBatchAssignments] = useState<any>({});
  const [adminBatches, setAdminBatches] = useState<any[]>([]);
  const [nonEnrolledUsers, setNonEnrolledUsers] = useState<any[]>([]);
  const [reminderHistory, setReminderHistory] = useState<any[]>([]);
  const [scheduledReminders, setScheduledReminders] = useState<any[]>([]);
  const [nonEnrolledLoading, setNonEnrolledLoading] = useState(false);
  const [sessionShowcases, setSessionShowcases] = useState<any[]>([]);
  const [sessionShowcaseForm, setSessionShowcaseForm] = useState(emptySessionForm);
  const [editingSessionId, setEditingSessionId] = useState("");
  const [inquiryReplies, setInquiryReplies] = useState<any>({});
  const [consultancyReplies, setConsultancyReplies] = useState<any>({});
  const [consultancyLinks, setConsultancyLinks] = useState<any>({});
  const [courseSearch, setCourseSearch] = useState("");
  const [courseSort, setCourseSort] = useState("newest");
  const [courseFilter, setCourseFilter] = useState("all");
  const pendingTestimonials = testimonials.filter(
    (item) => item.status === "pending"
  );

  // CREATE MODAL
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [editingPartnerId, setEditingPartnerId] = useState("");
  const [editingTrustedCompanyId, setEditingTrustedCompanyId] = useState("");
  const [editingTestimonialId, setEditingTestimonialId] = useState("");
  const [editingWebinarId, setEditingWebinarId] = useState("");
  const [editingBannerId, setEditingBannerId] = useState("");
  const [partnerForm, setPartnerForm] = useState(emptyLogoForm);
  const [trustedCompanyForm, setTrustedCompanyForm] =
    useState(emptyLogoForm);
  const [testimonialForm, setTestimonialForm] =
    useState(emptyTestimonialForm);
  const [webinarForm, setWebinarForm] = useState(emptyWebinarForm);
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [legacyCourseContent, setLegacyCourseContent] = useState({
    videos: [] as { name?: string; url?: string; webUrl?: string }[],
    pdfs: [] as { name?: string; url?: string; webUrl?: string }[],
    materials: [] as { name?: string; url?: string; webUrl?: string }[],
  });

  // FORM DATA
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    duration: "",
    sessions: "",
    professionals: "",
    exam: "",
    price: "",
    recordedPrice: "",
    livePrice: "",
    rating: "",
    provider: "FinOps",
    enrolled: "",
    level: "Beginner",
    badge: "Published",
    image: "",
    videoUrl: "",
    pdfUrl: "",
    materialUrl: "",
    materialTitle: "",
    videos: [] as any[],
    pdfs: [] as any[],
    materials: [] as any[],
    learn: "",
    prerequisites: "",
    career: "",
    isPublished: true,
  });

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

      fetchCourses();
      fetchPartners();
      fetchTrustedCompanies();
      fetchTestimonials();
      fetchWebinars();
      fetchHeroBanners();
      fetchInquiries();
      fetchConsultancyBookings();
      fetchEnrollments();
      fetchAdminBatches(parsedUser);
      fetchNonEnrolledUsers(parsedUser);
      fetchSessionShowcases();
      fetchStudentActivities(parsedUser, activityRange);
    };

    verifyAdminSession();
  }, []);

  useEffect(() => {
    if (user?._id) {
      fetchStudentActivities(user, activityRange);
    }
  }, [activityRange, user?._id]);

  // FETCH COURSES
  const fetchCourses = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : {};
      const params = new URLSearchParams({
        includeProtected: "1",
        userId: parsedUser._id || "",
        sessionToken: localStorage.getItem("sessionToken") || "",
        deviceId: localStorage.getItem("deviceId") || "",
      });
      const res = await fetch(`/api/courses?${params.toString()}`);

      const data = await res.json();

      if (data.success) {
        setCourses(data.courses);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/partners");

      const data = await res.json();

      if (data.success) {
        setPartners(data.partners);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTrustedCompanies = async () => {
    try {
      const res = await fetch("/api/trusted-companies");

      const data = await res.json();

      if (data.success) {
        setTrustedCompanies(data.trustedCompanies);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchTestimonials = async () => {
    try {
      const res = await fetch("/api/testimonials?scope=admin");

      const data = await res.json();

      if (data.success) {
        setTestimonials(data.testimonials);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchWebinars = async () => {
    try {
      const res = await fetch("/api/webinars");

      const data = await res.json();

      if (data.success) {
        setWebinars(data.webinars);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchHeroBanners = async () => {
    try {
      const res = await fetch("/api/hero-banners", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setHeroBanners(data.banners);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await fetch("/api/inquiries");

      const data = await res.json();

      if (data.success) {
        setInquiries(data.inquiries);

        const replies: any = {};

        data.inquiries.forEach((item: any) => {
          replies[item._id] = item.adminReply || "";
        });

        setInquiryReplies(replies);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchConsultancyBookings = async () => {
    try {
      const res = await fetch("/api/consultancy-bookings", {
        cache: "no-store",
      });

      const data = await res.json();

      if (data.success) {
        setConsultancyBookings(data.bookings);

        const replies: any = {};
        const links: any = {};

        data.bookings.forEach((item: any) => {
          replies[item._id] = item.adminReply || "";
          links[item._id] = item.meetingLink || "";
        });

        setConsultancyReplies(replies);
        setConsultancyLinks(links);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await fetch("/api/enrollments");

      const data = await res.json();

      if (data.success) {
        setEnrollments(data.enrollments);

        const assignments: any = {};

        data.enrollments.forEach((item: any) => {
          assignments[item._id] = item.batchId || item.batchName || "";
        });

        setBatchAssignments(assignments);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAdminBatches = async (activeUser = user) => {
    try {
      const storedUser = localStorage.getItem("user");
      const parsedUser = activeUser || (storedUser ? JSON.parse(storedUser) : null);
      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";
      const params = new URLSearchParams({
        userId: parsedUser?._id || "",
        sessionToken,
        deviceId,
      });
      const res = await fetch(`/api/batches?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setAdminBatches(data.batches || []);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchNonEnrolledUsers = async (activeUser = user, afterDays = 0) => {
    try {
      const storedUser = localStorage.getItem("user");
      const parsedUser = activeUser || (storedUser ? JSON.parse(storedUser) : null);
      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";
      const params = new URLSearchParams({
        userId: parsedUser?._id || "",
        sessionToken,
        deviceId,
        afterDays: String(afterDays),
      });
      setNonEnrolledLoading(true);
      const res = await fetch(`/api/enrollment-reminders?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setNonEnrolledUsers(data.nonEnrolled || []);
        setReminderHistory(data.history || []);
        setScheduledReminders(data.scheduled || []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setNonEnrolledLoading(false);
    }
  };

  const fetchSessionShowcases = async () => {
    try {
      const res = await fetch("/api/session-showcase?all=true", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setSessionShowcases(data.sessions?.length ? data.sessions : ADMIN_FALLBACK_SESSIONS);
      }
    } catch (error) { console.log(error); }
  };

  const handleSaveSession = async () => {
    if (!sessionShowcaseForm.title?.trim()) { alert("Title is required"); return; }
    try {
      // Fallback sessions have ids like "fallback-1" — treat them as new (POST)
      const isFallback = editingSessionId.startsWith("fallback-");
      const url = (editingSessionId && !isFallback)
        ? `/api/session-showcase/${editingSessionId}`
        : "/api/session-showcase";
      const method = (editingSessionId && !isFallback) ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sessionShowcaseForm, displayOrder: Number(sessionShowcaseForm.displayOrder || 0) }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionShowcaseForm(emptySessionForm);
        setEditingSessionId("");
        fetchSessionShowcases();
      } else { alert(data.message || "Save failed"); }
    } catch (error) { console.log(error); alert("Save failed"); }
  };

  const handleEditSession = (item: any) => {
    setSessionShowcaseForm({
      title: item.title || "", subtitle: item.subtitle || "",
      description: item.description || "", category: item.category || "Training",
      date: item.date || "", location: item.location || "",
      attendees: item.attendees || "", duration: item.duration || "",
      images: item.images || [], coverImage: item.coverImage || "",
      highlights: item.highlights || [], tags: item.tags || [],
      instructor: item.instructor || "", isActive: item.isActive !== false,
      isFeatured: item.isFeatured === true, displayOrder: String(item.displayOrder || ""),
    });
    setEditingSessionId(item._id);
    document.getElementById("session-showcase-manager")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteSession = async (id: string) => {
    // Fallback sessions are not in DB yet — just remove from the admin view
    if (id.startsWith("fallback-")) {
      setSessionShowcases((prev) => prev.filter((s) => s._id !== id));
      return;
    }
    if (!confirm("Delete this session?")) return;
    await fetch(`/api/session-showcase/${id}`, { method: "DELETE" });
    fetchSessionShowcases();
  };

  const handleSeedAllDefaults = async () => {
    if (!confirm(`This will save all ${ADMIN_FALLBACK_SESSIONS.length} default sessions to your database. Continue?`)) return;
    try {
      for (const session of ADMIN_FALLBACK_SESSIONS) {
        const { _id, ...body } = session as any;
        await fetch("/api/session-showcase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      fetchSessionShowcases();
      alert("All default sessions saved to database successfully!");
    } catch (error) {
      alert("Something went wrong while seeding sessions.");
    }
  };

  const getActivityQuery = (
    range = activityRange,
    studentId = ""
  ) => {
    const storedUser = localStorage.getItem("user");
    const parsedUser = user || (storedUser ? JSON.parse(storedUser) : null);
    const sessionToken = localStorage.getItem("sessionToken") || "";
    const deviceId = localStorage.getItem("deviceId") || "";
    const params = new URLSearchParams({
      userId: parsedUser?._id || "",
      sessionToken,
      deviceId,
      range,
    });

    if (studentId) {
      params.set("studentId", studentId);
    }

    return params;
  };

  const fetchStudentActivities = async (
    adminUser = user,
    range = activityRange
  ) => {
    try {
      setActivityLoading(true);

      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";
      const params = new URLSearchParams({
        userId: adminUser?._id || "",
        sessionToken,
        deviceId,
        range,
      });

      const res = await fetch(`/api/student-activity?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setStudentActivities(data.records || []);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setActivityLoading(false);
    }
  };

  const downloadStudentActivity = (studentId = "") => {
    const params = getActivityQuery(activityRange, studentId);
    params.set("format", "excel");
    window.location.href = `/api/student-activity?${params.toString()}`;
  };

  const handleAssignBatch = async (enrollment: any) => {
    try {
      if ((enrollment.learningMode || "recorded") !== "live") {
        alert("Recorded students do not need a batch");
        return;
      }
      const batchIdOrName = batchAssignments[enrollment._id] || "";
      // could be an ID or a name (legacy text input)
      const matchedBatch = adminBatches.find(
        (b: any) => b._id === batchIdOrName || b.name === batchIdOrName
      );
      const batchId = matchedBatch?._id || "";
      const batchName = matchedBatch?.name || batchIdOrName;

      const res = await fetch(`/api/enrollments/${enrollment._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          batchName,
          batchId,
          status: enrollment.status || "enrolled",
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Batch assigned successfully");
        fetchEnrollments();
      } else {
        alert(data.message || "Batch assignment failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleReplyInquiry = async (inquiry: any) => {
    try {
      const adminReply = inquiryReplies[inquiry._id] || "";

      if (!adminReply.trim()) {
        alert("Please enter a reply message");
        return;
      }

      const res = await fetch(`/api/inquiries/${inquiry._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminReply,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Reply saved and sent to user");
        fetchInquiries();
      } else {
        alert(data.message || "Reply failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleReplyConsultancy = async (booking: any) => {
    try {
      const adminReply = consultancyReplies[booking._id] || "";
      const meetingLink = consultancyLinks[booking._id] || "";

      if (!meetingLink.trim()) {
        alert("Please enter meeting link");
        return;
      }

      const res = await fetch(`/api/consultancy-bookings/${booking._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminReply,
          meetingLink,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Booking updated and email sent");
        fetchConsultancyBookings();
      } else {
        alert(data.message || "Booking update failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSavePartner = async () => {
    try {
      const res = await fetch(
        editingPartnerId
          ? `/api/partners/${editingPartnerId}`
          : "/api/partners",
        {
          method: editingPartnerId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(partnerForm),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(
          editingPartnerId
            ? "Partner Updated"
            : "Partner Created"
        );
        setEditingPartnerId("");
        setPartnerForm(emptyLogoForm);
        fetchPartners();
      } else {
        alert(data.message || "Partner save failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditPartner = (partner: any) => {
    setEditingPartnerId(partner._id);
    setPartnerForm({
      name: partner.name || "",
      logo: partner.logo || "",
      description: partner.description || "",
      role: partner.role || "",
      website: partner.website || "",
      displayOrder:
        partner.displayOrder !== undefined
          ? String(partner.displayOrder)
          : "",
    });
  };

  const handleDeletePartner = async (id: string) => {
    const confirmDelete = confirm("Delete this partner?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Partner Deleted");
        setEditingPartnerId("");
        setPartnerForm(emptyLogoForm);
        fetchPartners();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveTrustedCompany = async () => {
    try {
      const res = await fetch(
        editingTrustedCompanyId
          ? `/api/trusted-companies/${editingTrustedCompanyId}`
          : "/api/trusted-companies",
        {
          method: editingTrustedCompanyId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(trustedCompanyForm),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(
          editingTrustedCompanyId
            ? "Trusted Company Updated"
            : "Trusted Company Created"
        );
        setEditingTrustedCompanyId("");
        setTrustedCompanyForm(emptyLogoForm);
        fetchTrustedCompanies();
      } else {
        alert(data.message || "Trusted company save failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditTrustedCompany = (company: any) => {
    setEditingTrustedCompanyId(company._id);
    setTrustedCompanyForm({
      name: company.name || "",
      logo: company.logo || "",
      description: company.description || "",
      role: company.role || "",
      website: company.website || "",
      displayOrder:
        company.displayOrder !== undefined
          ? String(company.displayOrder)
          : "",
    });
  };

  const handleDeleteTrustedCompany = async (id: string) => {
    const confirmDelete = confirm("Delete this trusted company?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/trusted-companies/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Trusted Company Deleted");
        setEditingTrustedCompanyId("");
        setTrustedCompanyForm(emptyLogoForm);
        fetchTrustedCompanies();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveTestimonial = async () => {
    try {
      const res = await fetch(
        editingTestimonialId
          ? `/api/testimonials/${editingTestimonialId}`
          : "/api/testimonials",
        {
          method: editingTestimonialId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testimonialForm),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(
          editingTestimonialId
            ? "Testimonial Updated"
            : "Testimonial Created"
        );
        setEditingTestimonialId("");
        setTestimonialForm(emptyTestimonialForm);
        fetchTestimonials();
      } else {
        alert(data.message || "Testimonial save failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditTestimonial = (testimonial: any) => {
    setEditingTestimonialId(testimonial._id);
    setTestimonialForm({
      name: testimonial.name || "",
      role: testimonial.role || "",
      content: testimonial.content || "",
      rating:
        testimonial.rating !== undefined
          ? String(testimonial.rating)
          : "5",
      displayOrder:
        testimonial.displayOrder !== undefined
          ? String(testimonial.displayOrder)
          : "",
    });
  };

  const handleDeleteTestimonial = async (id: string) => {
    const confirmDelete = confirm("Delete this testimonial?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Testimonial Deleted");
        setEditingTestimonialId("");
        setTestimonialForm(emptyTestimonialForm);
        fetchTestimonials();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleReviewTestimonial = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const res = await fetch(`/api/testimonials/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (data.success) {
        alert(status === "approved" ? "Testimonial accepted" : "Testimonial rejected");
        fetchTestimonials();
      } else {
        alert(data.message || "Review failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveWebinar = async () => {
    try {
      const res = await fetch(
        editingWebinarId
          ? `/api/webinars/${editingWebinarId}`
          : "/api/webinars",
        {
          method: editingWebinarId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webinarForm),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(
          editingWebinarId
            ? "Webinar Updated"
            : "Webinar Created"
        );
        setEditingWebinarId("");
        setWebinarForm(emptyWebinarForm);
        fetchWebinars();
      } else {
        alert(data.message || "Webinar save failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditWebinar = (webinar: any) => {
    setEditingWebinarId(webinar._id);
    setWebinarForm({
      name: webinar.name || "",
      title: webinar.title || "",
      date: webinar.date || "",
      time: webinar.time || "",
      img: webinar.img || "",
      role: webinar.role || "",
      price: webinar.price || "",
      displayOrder:
        webinar.displayOrder !== undefined
          ? String(webinar.displayOrder)
          : "",
    });
  };

  const handleDeleteWebinar = async (id: string) => {
    const confirmDelete = confirm("Delete this webinar?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/webinars/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Webinar Deleted");
        setEditingWebinarId("");
        setWebinarForm(emptyWebinarForm);
        fetchWebinars();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSaveBanner = async () => {
    try {
      const res = await fetch(
        editingBannerId
          ? `/api/hero-banners/${editingBannerId}`
          : "/api/hero-banners",
        {
          method: editingBannerId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bannerForm),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert(editingBannerId ? "Banner Updated" : "Banner Created");
        setEditingBannerId("");
        setBannerForm(emptyBannerForm);
        fetchHeroBanners();
      } else {
        alert(data.message || "Banner save failed");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleEditBanner = (banner: any) => {
    setEditingBannerId(banner._id);
    setBannerForm({
      eyebrow: banner.eyebrow || "",
      title: banner.title || "",
      description: banner.description || "",
      image: banner.image || "",
      ctaLabel: banner.ctaLabel || "",
      ctaHref: banner.ctaHref || "",
      badge: banner.badge || "",
      accent: banner.accent || "cyan",
      displayOrder:
        banner.displayOrder !== undefined ? String(banner.displayOrder) : "",
      isActive: banner.isActive !== false,
    });
  };

  const handleDeleteBanner = async (id: string) => {
    const confirmDelete = confirm("Delete this homepage banner?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/hero-banners/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        alert("Banner Deleted");
        setEditingBannerId("");
        setBannerForm(emptyBannerForm);
        fetchHeroBanners();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const buildCourseMetadataPayload = (data: typeof formData) => {
    const {
      videoUrl: _videoUrl,
      pdfUrl: _pdfUrl,
      materialUrl: _materialUrl,
      materialTitle: _materialTitle,
      videos: _videos,
      pdfs: _pdfs,
      materials: _materials,
      ...metadata
    } = data;

    return {
      ...metadata,
      learn: data.learn
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      prerequisites: data.prerequisites
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  };

  const buildLegacyCourseContent = (course: any) => ({
    videos:
      Array.isArray(course.videos) && course.videos.length
        ? course.videos
        : course.videoUrl
          ? [{ name: "Course Video", url: course.videoUrl, webUrl: course.videoUrl }]
          : [],
    pdfs:
      Array.isArray(course.pdfs) && course.pdfs.length
        ? course.pdfs
        : course.pdfUrl
          ? [{ name: "Course PDF", url: course.pdfUrl, webUrl: course.pdfUrl }]
          : [],
    materials:
      Array.isArray(course.materials) && course.materials.length
        ? course.materials
        : course.materialUrl
          ? [
              {
                name: course.materialTitle || "Course Material",
                url: course.materialUrl,
                webUrl: course.materialUrl,
              },
            ]
          : [],
  });

  // EDIT COURSE HANDLERS
  const handleEditClick = (course: any) => {
    setSelectedCourseId(course._id);
    setLegacyCourseContent(buildLegacyCourseContent(course));

    setFormData({
      slug: course.slug || "",
      title: course.title || "",
      description: course.description || "",
      duration: course.duration || "",
      sessions: course.sessions || "",
      professionals: course.professionals || "",
      exam: course.exam || "",
      price: course.price || "",
      recordedPrice: course.recordedPrice || "",
      livePrice: course.livePrice || "",
      rating: course.rating || "",
      provider: course.provider || "FinOps",
      enrolled: course.enrolled || "",
      level: course.level || "Beginner",
      badge: course.badge || "Published",
      image: course.image || "",
      videoUrl: "",
      pdfUrl: "",
      materialUrl: "",
      materialTitle: "",
      videos: [],
      pdfs: [],
      materials: [],
      learn: Array.isArray(course.learn)
        ? course.learn.join(", ")
        : "",
      prerequisites: Array.isArray(course.prerequisites)
        ? course.prerequisites.join(", ")
        : "",
      career: course.career || "",
      isPublished: course.isPublished !== false,
    });

    setShowEditModal(true);
  };

  const handleUpdateCourse = async () => {
    try {
      const payload = buildCourseMetadataPayload(formData);

      const res = await fetch(
        `/api/courses/${selectedCourseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert("Course Updated");
        setShowEditModal(false);
        fetchCourses();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteCourse = async () => {
    const confirmDelete = confirm("Delete this course?");

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `/api/courses/${selectedCourseId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (data.success) {
        alert("Course Deleted");
        setShowEditModal(false);
        fetchCourses();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // CREATE COURSE
  const handleCreateCourse = async () => {
    try {
      const payload = buildCourseMetadataPayload(formData);

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        alert("Course Created Successfully");
        setShowCreateModal(false);
        fetchCourses();
        setFormData({
          slug: "",
          title: "",
          description: "",
          duration: "",
          sessions: "",
          professionals: "",
          exam: "",
          price: "",
          recordedPrice: "",
          livePrice: "",
          rating: "",
          provider: "FinOps",
          enrolled: "",
          level: "Beginner",
          badge: "Published",
          image: "",
          videoUrl: "",
          pdfUrl: "",
          materialUrl: "",
          materialTitle: "",
          videos: [],
          pdfs: [],
          materials: [],
          learn: "",
          prerequisites: "",
          career: "",
          isPublished: true,
        });
      } else {
        alert("Failed To Create Course");
      }
    } catch (error) {
      console.log(error);
    }
  };

  // LOGOUT
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

  const parseCourseNumber = (value: any) => {
    const normalized = String(value || "").replace(/[^0-9.]/g, "");

    return Number(normalized) || 0;
  };

  const filteredCourses = courses
    .filter((course) => {
      const searchText = courseSearch.trim().toLowerCase();
      const searchableContent = [
        course.title,
        course.slug,
        course.provider,
        course.description,
        course.level,
        course.badge,
        course.tag,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchText || searchableContent.includes(searchText);

      if (!matchesSearch) return false;

      if (courseFilter === "all") return true;

      const filterValue = courseFilter.toLowerCase();

      if (filterValue === "premium") {
        return [course.badge, course.tag, course.level, course.provider]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes("premium");
      }

      return [course.badge, course.level, course.provider, course.tag]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(filterValue);
    })
    .sort((a, b) => {
      switch (courseSort) {
        case "oldest":
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        case "title":
          return String(a.title || "").localeCompare(String(b.title || ""));
        case "price-low":
          return parseCourseNumber(a.price) - parseCourseNumber(b.price);
        case "price-high":
          return parseCourseNumber(b.price) - parseCourseNumber(a.price);
        case "popular":
          return (
            parseCourseNumber(b.enrolled) - parseCourseNumber(a.enrolled)
          );
        case "newest":
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden">

      {/* SIDEBAR */}
      <div className="w-[250px] bg-white border-r border-slate-200 flex flex-col justify-between fixed h-screen overflow-y-auto shadow-sm">

        <div>

          {/* LOGO */}
          <div className="px-8 py-10">
            <h1 className="text-xl font-black text-[#4d8bff]">FinOps<span className="text-slate-800"> Trainings</span></h1>
          </div>

          {/* MENU */}
          <div className="px-4 space-y-2">

            <Link
              href="/admin-page"
              className="w-full flex items-center gap-4 bg-[#2563eb]/10 text-[#4d8bff] px-4 py-3 rounded-xl font-semibold text-sm"
            >
              <BookOpen size={22} />
              Courses
            </Link>

            <Link
              href="/admin-page/batches"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <Briefcase size={22} />
              Batches
            </Link>
            <Link
              href="/admin-page/fees"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <CreditCard size={22} />
              Fees
            </Link>
            <Link
              href="/admin-page/certificates"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <ShieldCheck size={22} />
              Certificates
            </Link>
            <Link
              href="/admin-page/blogs"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <LayoutList size={22} />
              Blogs
            </Link>
            <Link
              href="/admin-page/whatsapp"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <MessageCircle size={22} />
              WhatsApp
            </Link>

            <Link
              href="/admin-page/content"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <FileText size={22} />
              Content
            </Link>

              <Link
                href="/admin-page/chats"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <MessageCircle size={22} />
                Chats
              </Link>

              <Link
                href="/admin-page/meetings"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Activity size={22} />
                Teams Meetings
              </Link>

            <Link
              href="/admin-page/people"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <Users size={22} />
              People
            </Link>

            <Link
  href="/admin-page/internship-applications"
  className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
>
  <Briefcase size={22} />
  Internship Applications
</Link>

            <Link
              href="/admin-page#inquiries"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <Mail size={22} />
              Inquiries
            </Link>

            <Link
              href="/admin-page#consultancy-bookings"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <CalendarDays size={22} />
              Consultancy Bookings
            </Link>

            <Link
              href="/admin-page/notifications"
              className="w-full flex items-center justify-between gap-4 hover:bg-red-50 text-slate-700 hover:text-red-600 px-4 py-3 rounded-xl transition text-sm"
            >
              <span className="flex items-center gap-4">
                <Bell size={22} />
                Notifications
              </span>
              <AdminNotificationBadge />
            </Link>

            <Link
              href="/admin-page/admins"
              className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
            >
              <ShieldCheck size={22} />
              Admin Members
            </Link>

            <div className="pt-4 mt-4 border-t border-gray-100">
              <p className="px-5 pb-2 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                Homepage Managers
              </p>

              <Link
                href="/admin-page/tests"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <FileText size={20} />
                Tests
              </Link>

              <Link
                href="/admin-page/assignments"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <BookOpen size={20} />
                Assignments
              </Link>

              <Link
                href="/admin-page#session-showcase-manager"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Play size={20} />
                Sessions Gallery
              </Link>

              <Link
                href="/admin-page#hero-banners"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Activity size={20} />
                Hero Banners
              </Link>

              <Link
                href="/admin-page#enrolled-students"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Users size={20} />
                Enrolled Students
              </Link>

              <Link
                href="/admin-page#active-students"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Activity size={20} />
                Active Students
              </Link>

              <Link
                href="/admin-page#interested-students"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <UserX size={20} />
                Interested Students
              </Link>

              <Link
                href="/admin-page#partners"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <Briefcase size={20} />
                Learner Stories
              </Link>

              <Link
                href="/admin-page#trusted-companies"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <FileText size={20} />
                Alumni Companies
              </Link>

              <Link
                href="/admin-page#testimonials"
                className="w-full flex items-center justify-between gap-4 hover:bg-slate-100 text-slate-700 px-4 py-3 rounded-xl transition text-sm"
              >
                <span className="flex items-center gap-4">
                  <MessageCircle size={20} />
                  Testimonials
                </span>
                {pendingTestimonials.length > 0 && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white">
                    {pendingTestimonials.length}
                  </span>
                )}
              </Link>

              <Link
                href="/admin-page#webinars"
                className="w-full flex items-center gap-4 hover:bg-slate-100 text-slate-700 hover:text-slate-900 px-4 py-3 rounded-xl transition text-sm"
              >
                <BookOpen size={20} />
                Webinars
              </Link>
            </div>

          </div>

        </div>

        {/* SUPPORT */}
        <div className="p-5">

          <div className="bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] rounded-2xl p-5 text-white">

            <h2 className="text-xl font-semibold">
              Help & Support
            </h2>

            <p className="text-sm opacity-90 mt-2">
              Contact FinOps support team.
            </p>

            <button className="mt-4 bg-white text-[#4d8bff] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#2563eb]/10 transition">
              Contact
            </button>

          </div>

        </div>

      </div>

      {/* MAIN */}
      <div className="flex-1 ml-[250px] p-8 overflow-y-auto bg-[#f8fafc] min-h-screen">

        {/* TOPBAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-end gap-6 mb-10">

          {/* RIGHT */}
          <div className="flex items-center gap-5">

            {/* USER */}
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">

              <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0)}
              </div>

              <div>

                <p className="font-semibold">
                  {user?.name}
                </p>

                <p className="text-sm text-gray-500">
                  Admin
                </p>

              </div>

            </div>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className="bg-red-50 hover:bg-red-500 text-red-600 hover:text-white transition-all border border-red-200 hover:border-red-500 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold"
            >
              <LogOut size={18} />
              Logout
            </button>

          </div>

        </div>

        {/* TITLE */}
        <div
          id="courses"
          className="scroll-mt-32 flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-10"
        >

          <div>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Your Courses
            </h1>

            <p className="text-slate-500 mt-1.5 text-sm">
              Add/View courses of your brand
            </p>

          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] hover:bg-[#2563eb] transition text-white px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-bold w-fit shadow-sm"
          >
            <Plus size={22} />
            Create Course
          </button>

        </div>

        {/* FILTERS */}
       <div className="flex flex-wrap gap-5 mb-10">

  {/* SEARCH */}
  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 w-full md:w-[320px] shadow-sm">
    
    <input
      type="text"
      placeholder="Search by course name..."
      value={courseSearch}
      onChange={(e) => setCourseSearch(e.target.value)}
      className="w-full outline-none text-black placeholder:text-gray-400 bg-transparent"
    />

  </div>

  {/* SORT */}
  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 w-full md:w-[220px] shadow-sm">

    <select
      value={courseSort}
      onChange={(e) => setCourseSort(e.target.value)}
      className="w-full outline-none text-black bg-transparent"
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="title">Course Name A-Z</option>
      <option value="price-low">Price Low to High</option>
      <option value="price-high">Price High to Low</option>
      <option value="popular">Most Popular</option>
    </select>

  </div>

  {/* FILTER */}
  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 w-full md:w-[180px] shadow-sm">

    <select
      value={courseFilter}
      onChange={(e) => setCourseFilter(e.target.value)}
      className="w-full outline-none text-black bg-transparent"
    >
      <option value="all">All Courses</option>
      <option value="Published">Published</option>
      <option value="Draft">Draft</option>
      <option value="Beginner">Beginner</option>
      <option value="Intermediate">Intermediate</option>
      <option value="Advanced">Advanced</option>
      <option value="Premium">Premium</option>
    </select>

  </div>

</div>

        {/* COURSE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">

          {filteredCourses.map((course) => {
            const legacyContentCount =
              (Array.isArray(course.videos) ? course.videos.length : 0) ||
              (course.videoUrl ? 1 : 0) ||
              (Array.isArray(course.pdfs) ? course.pdfs.length : 0) ||
              (course.pdfUrl ? 1 : 0) ||
              (Array.isArray(course.materials) ? course.materials.length : 0) ||
              (course.materialUrl ? 1 : 0);

            return (

            <div
              key={course._id}
              className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
            >

              {/* IMAGE */}
              <div className="relative">

                <img
                  src={course.image}
                  alt={course.title}
                  className="w-full h-44 object-cover"
                />

                <div className="absolute top-4 left-4 flex gap-2">
                  <span
                    className={`px-4 py-1 rounded-full text-sm font-medium ${
                      course.badge === "Published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {course.badge}
                  </span>
                  {course.isPublished === false && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      Unpublished
                    </span>
                  )}
                </div>

              </div>

              {/* CONTENT */}
              <div className="p-5 flex flex-col">

                <h2 className="text-xl font-bold text-gray-800 leading-snug min-h-[60px]">
                  {course.title}
                </h2>

                <p className="text-gray-500 mt-3 text-sm leading-relaxed line-clamp-3 min-h-[70px]">
                  {course.description}
                </p>

                {/* EXTRA INFO */}
                <div className="space-y-2 mt-5">

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-gray-500">
                      Duration
                    </span>

                    <span className="font-semibold text-gray-800">
                      {course.duration}
                    </span>

                  </div>

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-gray-500">
                      Students
                    </span>

                    <span className="font-semibold text-gray-800">
                      {course.enrolled}
                    </span>

                  </div>

                  <div className="flex items-center justify-between text-sm">

                    <span className="text-gray-500">
                      Provider
                    </span>

                    <span className="font-semibold text-gray-800">
                      {course.provider}
                    </span>

                  </div>

                </div>

                {legacyContentCount > 0 ? (
                  <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-center border border-amber-200">
                    <p className="text-lg font-black text-amber-900">{legacyContentCount}</p>
                    <p className="text-[11px] font-bold uppercase text-amber-700">
                      Legacy Course Content
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-center">
                    <p className="text-sm font-semibold text-slate-500">
                      Content managed per batch
                    </p>
                  </div>
                )}

                {/* FOOTER */}
                <div className="mt-6 flex items-center justify-between">

                  <div>

                    <p className="text-2xl font-bold text-gray-900">
                      {course.price}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Premium Course
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      handleEditClick(course)
                    }
                    className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-5 py-2 rounded-xl font-medium"
                  >
                    Edit
                  </button>

                </div>

              </div>

            </div>

          );
          })}

        </div>

        {filteredCourses.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            No courses match your current search, sort, or filter.
          </div>
        )}

        <InquiryManager
          inquiries={inquiries}
          inquiryReplies={inquiryReplies}
          onReplyChange={setInquiryReplies}
          onReply={handleReplyInquiry}
        />

        <ConsultancyBookingManager
          bookings={consultancyBookings}
          replies={consultancyReplies}
          links={consultancyLinks}
          onReplyChange={setConsultancyReplies}
          onLinkChange={setConsultancyLinks}
          onReply={handleReplyConsultancy}
        />

        <EnrollmentManager
          enrollments={enrollments}
          batchAssignments={batchAssignments}
          onBatchChange={setBatchAssignments}
          onAssignBatch={handleAssignBatch}
          adminBatches={adminBatches}
        />

        <StudentActivityManager adminUser={user} />

        <NonEnrolledUsersManager
          users={nonEnrolledUsers}
          history={reminderHistory}
          scheduled={scheduledReminders}
          loading={nonEnrolledLoading}
          adminUser={user}
          onRefresh={(days: number) => fetchNonEnrolledUsers(user, days)}
          onCancelScheduled={async (id: string) => {
            const sessionToken = localStorage.getItem("sessionToken") || "";
            const deviceId = localStorage.getItem("deviceId") || "";
            const params = new URLSearchParams({ userId: user?._id || "", sessionToken, deviceId, id });
            await fetch(`/api/enrollment-reminders?${params.toString()}`, { method: "DELETE" });
            fetchNonEnrolledUsers(user);
          }}
        />

        <SessionShowcaseManager
          items={sessionShowcases}
          form={sessionShowcaseForm}
          editingId={editingSessionId}
          onFormChange={setSessionShowcaseForm}
          onSave={handleSaveSession}
          onEdit={handleEditSession}
          onDelete={handleDeleteSession}
          onCancel={() => { setSessionShowcaseForm(emptySessionForm); setEditingSessionId(""); }}
          onSeedDefaults={handleSeedAllDefaults}
        />

        <HeroBannerManager
          items={heroBanners}
          form={bannerForm}
          editingId={editingBannerId}
          onFormChange={setBannerForm}
          onSave={handleSaveBanner}
          onEdit={handleEditBanner}
          onDelete={handleDeleteBanner}
          onCancel={() => {
            setEditingBannerId("");
            setBannerForm(emptyBannerForm);
          }}
        />

        {/* LOGO MANAGEMENT */}
        <div className="mt-16 grid grid-cols-1 xl:grid-cols-2 gap-8">

          <LogoManager
            sectionId="partners"
            title="Learner Stories"
            description="Control the learner story cards shown on the user homepage."
            items={partners}
            form={partnerForm}
            editingId={editingPartnerId}
            emptyText="No partners added yet."
            onFormChange={setPartnerForm}
            onSave={handleSavePartner}
            onEdit={handleEditPartner}
            onDelete={handleDeletePartner}
            onCancel={() => {
              setEditingPartnerId("");
              setPartnerForm(emptyLogoForm);
            }}
          />

          <LogoManager
            sectionId="trusted-companies"
            title="Alumni Companies"
            description="Control the moving company logos shown in the Our Alumni Works Here section."
            items={trustedCompanies}
            form={trustedCompanyForm}
            editingId={editingTrustedCompanyId}
            emptyText="No trusted companies added yet."
            onFormChange={setTrustedCompanyForm}
            onSave={handleSaveTrustedCompany}
            onEdit={handleEditTrustedCompany}
            onDelete={handleDeleteTrustedCompany}
            onCancel={() => {
              setEditingTrustedCompanyId("");
              setTrustedCompanyForm(emptyLogoForm);
            }}
          />

        </div>

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-8">

          <TestimonialManager
            sectionId="testimonials"
            items={testimonials}
            form={testimonialForm}
            editingId={editingTestimonialId}
            pendingCount={pendingTestimonials.length}
            onFormChange={setTestimonialForm}
            onSave={handleSaveTestimonial}
            onEdit={handleEditTestimonial}
            onDelete={handleDeleteTestimonial}
            onReview={handleReviewTestimonial}
            onCancel={() => {
              setEditingTestimonialId("");
              setTestimonialForm(emptyTestimonialForm);
            }}
          />

          <WebinarManager
            sectionId="webinars"
            items={webinars}
            form={webinarForm}
            editingId={editingWebinarId}
            onFormChange={setWebinarForm}
            onSave={handleSaveWebinar}
            onEdit={handleEditWebinar}
            onDelete={handleDeleteWebinar}
            onCancel={() => {
              setEditingWebinarId("");
              setWebinarForm(emptyWebinarForm);
            }}
          />

        </div>

      </div>

      {/* CREATE COURSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">

          <div className="bg-white w-full max-w-5xl rounded-2xl p-8 relative max-h-[95vh] overflow-y-auto">

            {/* CLOSE */}
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-black"
            >
              <X size={28} />
            </button>

            {/* TITLE */}
            <h2 className="text-4xl font-bold text-gray-800 mb-10">
              Create New Course
            </h2>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <input
                type="text"
                placeholder="Course Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Duration"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Sessions"
                value={formData.sessions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sessions: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Professionals"
                value={formData.professionals}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    professionals: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Exam"
                value={formData.exam}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exam: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Price"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Recorded Price"
                value={formData.recordedPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recordedPrice: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Live Training Price"
                value={formData.livePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    livePrice: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Rating"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rating: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            {/* COURSE STATUS */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Course Status
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublished: true })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 border-2 font-semibold transition-all ${
                    formData.isPublished
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${formData.isPublished ? "bg-green-500" : "bg-gray-300"}`} />
                  Published
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublished: false })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 border-2 font-semibold transition-all ${
                    !formData.isPublished
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${!formData.isPublished ? "bg-amber-500" : "bg-gray-300"}`} />
                  Unpublished
                </button>
              </div>
              {!formData.isPublished && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  ⚠️ Unpublished courses are visible to users but enrollment will be disabled.
                </p>
              )}
            </div>

            <CourseImageUpload
              image={formData.image}
              onImageChange={(image) => setFormData({ ...formData, image })}
            />

            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Learning content is managed per batch under Batches → Content.
            </p>

            {/* DESCRIPTION */}
            <div className="mt-6">
              <textarea
                rows={4}
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
            </div>

            {/* LEARN */}
            <div className="mt-6">
              <textarea
                rows={4}
                placeholder="What Students Will Learn (comma separated)"
                value={formData.learn}
                onChange={(e) => setFormData({ ...formData, learn: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
            </div>

            {/* PREREQUISITES */}
            <div className="mt-6">
              <textarea
                rows={4}
                placeholder="Prerequisites (comma separated)"
                value={formData.prerequisites}
                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
            </div>

            {/* CAREER */}
            <div className="mt-6">
              <textarea
                rows={4}
                placeholder="Career Opportunities"
                value={formData.career}
                onChange={(e) => setFormData({ ...formData, career: e.target.value })}
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />
            </div>

            {/* BUTTON */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleCreateCourse}
                className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-8 py-4 rounded-2xl font-semibold text-lg"
              >
                Create Course
              </button>
            </div>

          </div>

        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 overflow-y-auto">

          <div className="bg-white w-full max-w-5xl rounded-2xl p-8 relative max-h-[95vh] overflow-y-auto">

            {/* CLOSE */}
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-black"
            >
              <X size={28} />
            </button>

            {/* TITLE */}
            <h2 className="text-4xl font-bold text-gray-800 mb-10">
              Edit Course
            </h2>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <input
                type="text"
                placeholder="Course Title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Duration"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Sessions"
                value={formData.sessions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sessions: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Professionals"
                value={formData.professionals}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    professionals: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Exam"
                value={formData.exam}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exam: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Price"
                value={formData.price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Recorded Price"
                value={formData.recordedPrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recordedPrice: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Live Training Price"
                value={formData.livePrice}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    livePrice: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

              <input
                type="text"
                placeholder="Rating"
                value={formData.rating}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rating: e.target.value,
                  })
                }
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            <CourseImageUpload
              image={formData.image}
              onImageChange={(image) => setFormData({ ...formData, image })}
            />

            <LegacyCourseContentReadOnly content={legacyCourseContent} />

            <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              New learning content is managed per batch under Batches → Content.
            </p>

            {/* COURSE STATUS */}
            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Course Status
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublished: true })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 border-2 font-semibold transition-all ${
                    formData.isPublished
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${formData.isPublished ? "bg-green-500" : "bg-gray-300"}`} />
                  Published
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isPublished: false })}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-5 py-4 border-2 font-semibold transition-all ${
                    !formData.isPublished
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${!formData.isPublished ? "bg-amber-500" : "bg-gray-300"}`} />
                  Unpublished
                </button>
              </div>
              {!formData.isPublished && (
                <p className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                  ⚠️ Unpublished: course is visible but enrollment is disabled for users.
                </p>
              )}
            </div>

            {/* DESCRIPTION */}
            <div className="mt-6">

              <textarea
                rows={4}
                placeholder="Description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            {/* LEARN */}
            <div className="mt-6">

              <textarea
                rows={4}
                placeholder="What Students Will Learn (comma separated)"
                value={formData.learn}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    learn: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            {/* PREREQUISITES */}
            <div className="mt-6">

              <textarea
                rows={4}
                placeholder="Prerequisites (comma separated)"
                value={formData.prerequisites}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    prerequisites: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            {/* CAREER */}
            <div className="mt-6">

              <textarea
                rows={4}
                placeholder="Career Opportunities"
                value={formData.career}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    career: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
              />

            </div>

            {/* BUTTON */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={handleDeleteCourse}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg"
              >
                Delete Course
              </button>

              <button
                onClick={handleUpdateCourse}
                className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-8 py-4 rounded-2xl font-semibold text-lg"
              >
                Save Changes
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

function InquiryManager({
  inquiries,
  inquiryReplies,
  onReplyChange,
  onReply,
}: any) {
  return (
    <section
      id="inquiries"
      className="scroll-mt-32 mt-16 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Contact Inquiries
          </h2>
          <p className="text-gray-500 mt-2">
            View contact messages, sender details, and reply by email.
          </p>
        </div>

        <div className="bg-[#2563eb]/10 text-[#4d8bff] px-5 py-3 rounded-2xl font-semibold">
          {inquiries.length} Inquiries
        </div>
      </div>

      <div className="space-y-4">
        {inquiries.length > 0 ? (
          inquiries.map((item: any) => (
            <div
              key={item._id}
              className="rounded-2xl border border-gray-200 p-5"
            >
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr_1.3fr] gap-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Sender
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.name || "Unknown"}
                  </h3>
                  <p className="text-sm text-gray-500 break-all">
                    {item.email || "No email"}
                  </p>
                  <span
                    className={`inline-flex mt-3 px-3 py-1 rounded-full text-sm font-semibold ${
                      item.status === "replied"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status || "new"}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString()
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Message
                  </p>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {item.message}
                  </p>
                  {item.emailSentToAdmin && (
                    <p className="text-xs text-[#4d8bff] mt-3">
                      Email sent to admin
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Reply
                  </p>
                  <textarea
                    rows={5}
                    placeholder="Write reply to user"
                    value={inquiryReplies[item._id] || ""}
                    onChange={(e) =>
                      onReplyChange({
                        ...inquiryReplies,
                        [item._id]: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black placeholder:text-gray-400"
                  />
                  {item.repliedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Replied: {new Date(item.repliedAt).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => onReply(item)}
                    className="mt-3 bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
                  >
                    <Send size={18} />
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
            No contact inquiries yet.
          </div>
        )}
      </div>
    </section>
  );
}

function ConsultancyBookingManager({
  bookings,
  replies,
  links,
  onReplyChange,
  onLinkChange,
  onReply,
}: any) {
  return (
    <section
      id="consultancy-bookings"
      className="scroll-mt-32 mt-16 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Consultancy Bookings
          </h2>
          <p className="text-gray-500 mt-2">
            View consultancy calendar bookings, meeting links, guests, and reply by email.
          </p>
        </div>

        <div className="bg-[#2563eb]/10 text-[#4d8bff] px-5 py-3 rounded-2xl font-semibold">
          {bookings.length} Bookings
        </div>
      </div>

      <div className="space-y-4">
        {bookings.length > 0 ? (
          bookings.map((item: any) => (
            <div key={item._id} className="rounded-2xl border border-gray-200 p-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr_1.4fr] gap-5">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Booking User
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.name || "Unknown"}
                  </h3>
                  <p className="text-sm text-gray-500 break-all">
                    {item.email || "No email"}
                  </p>
                  {item.phone && (
                    <p className="text-sm text-gray-500">
                      WhatsApp: {item.phone}
                    </p>
                  )}
                  <span
                    className={`inline-flex mt-3 px-3 py-1 rounded-full text-sm font-semibold ${
                      item.status === "replied"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status || "booked"}
                  </span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Booking Details
                  </p>
                  <p className="text-gray-900 font-semibold">
                    {item.bookingDate} at {item.bookingTime}
                  </p>
                  <p className="text-sm text-gray-500">
                    Duration: {item.durationMinutes || 30} minutes
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Booked: {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </p>
                  {item.guests?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">
                        Guests
                      </p>
                      <div className="space-y-1">
                        {item.guests.map((guest: any, index: number) => (
                          <p key={index} className="text-sm text-gray-600 break-all">
                            {guest.name} - {guest.email}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Meeting Link
                  </p>
                  <input
                    type="text"
                    placeholder="Meeting link"
                    value={links[item._id] || ""}
                    onChange={(e) =>
                      onLinkChange({
                        ...links,
                        [item._id]: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black placeholder:text-gray-400 mb-3"
                  />
                  <textarea
                    rows={4}
                    placeholder="Write reply/update to user and guests"
                    value={replies[item._id] || ""}
                    onChange={(e) =>
                      onReplyChange({
                        ...replies,
                        [item._id]: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black placeholder:text-gray-400"
                  />
                  {item.repliedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Updated: {new Date(item.repliedAt).toLocaleString()}
                    </p>
                  )}
                  <button
                    onClick={() => onReply(item)}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
                  >
                    <Send size={18} />
                    Send Update
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
            No consultancy bookings yet.
          </div>
        )}
      </div>
    </section>
  );
}

function LegacyCourseContentReadOnly({
  content,
}: {
  content: {
    videos: { name?: string; url?: string; webUrl?: string }[];
    pdfs: { name?: string; url?: string; webUrl?: string }[];
    materials: { name?: string; url?: string; webUrl?: string }[];
  };
}) {
  const groups = [
    { key: "videos", label: "Videos", items: content.videos || [] },
    { key: "pdfs", label: "PDFs", items: content.pdfs || [] },
    { key: "materials", label: "Study Materials", items: content.materials || [] },
  ];
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  if (!total) return null;

  return (
    <div className="mt-6 rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Legacy Course Content</p>
        <h3 className="text-xl font-black text-slate-950 mt-1">Read Only</h3>
        <p className="text-sm text-slate-600 mt-1">
          These items remain available to recorded students. New content is managed per batch.
        </p>
      </div>
      <div className="space-y-4">
        {groups.map((group) => {
          if (!group.items.length) return null;
          return (
            <div key={group.key}>
              <h4 className="font-semibold text-slate-900 mb-2">
                {group.label} ({group.items.length})
              </h4>
              <div className="space-y-2">
                {group.items.map((item: any, index: number) => (
                  <div key={`${group.key}-${index}`} className="rounded-2xl border border-amber-100 bg-white p-3">
                    <p className="text-sm font-medium text-slate-900">{item.name || "Untitled"}</p>
                    {item.webUrl || item.url ? (
                      <a
                        href={item.webUrl || item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
                      >
                        <ExternalLink size={12} />
                        Preview
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnrollmentManager({
  enrollments,
  batchAssignments,
  onBatchChange,
  onAssignBatch,
  adminBatches = [],
}: any) {
  const [filter, setFilter] = useState("all");
  const filteredEnrollments = enrollments.filter((item: any) => {
    const mode = item.learningMode || "recorded";
    if (filter === "recorded") return mode === "recorded";
    if (filter === "live") return mode === "live";
    if (filter === "pending") return mode === "live" && !item.batchId && !item.batchName;
    return true;
  });
  const filters = [
    { key: "all", label: "All Enrollments" },
    { key: "recorded", label: "Recorded Students" },
    { key: "live", label: "Live Students" },
    { key: "pending", label: "Pending Batch Assignment" },
  ];

  return (
    <section
      id="enrolled-students"
      className="scroll-mt-32 mt-16 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">
            Enrolled Students
          </h2>
          <p className="text-gray-500 mt-2">
            View student enrollments and assign each student to the right batch.
          </p>
        </div>

        <div className="bg-[#2563eb]/10 text-[#4d8bff] px-5 py-3 rounded-2xl font-semibold">
          {filteredEnrollments.length} Records
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition ${
              filter === item.key
                ? "bg-gray-900 border-gray-900 text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredEnrollments.length > 0 ? (
          filteredEnrollments.map((item: any) => {
            const mode = item.learningMode || "recorded";
            const amount = item.amountPaid || item.paidAmount || item.coursePrice || item.price || "";
            return (
            <div
              key={item._id}
              className="rounded-2xl border border-gray-200 p-5"
            >
              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.3fr_1fr_1fr_1.2fr_auto] gap-4 xl:items-center">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Student
                  </p>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.name || "Unknown Student"}
                  </h3>
                  <p className="text-sm text-gray-500 break-all">
                    {item.email || "No email"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Course
                  </p>
                  <h3 className="text-base font-semibold text-gray-900">
                    {item.courseName || item.courseId || "Unknown Course"}
                  </h3>
                  {item.coursePrice && (
                    <p className="text-sm text-gray-500">
                      {item.coursePrice}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Mode / Status
                  </p>
                  <span className={`inline-flex mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                    mode === "live" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                  }`}>
                    {mode === "live" ? "Live Training" : "Recorded"}
                  </span>
                  <span
                    className={`inline-flex mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      item.status === "enrolled"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.status || "enrolled"}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">
                    Amount / Batch
                  </p>
                  <p className="mt-1 font-bold text-gray-900">{amount || "N/A"}</p>
                  <p className="text-sm text-gray-500">{item.batchName || "Not Assigned"}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                    Assign Batch
                  </p>
                  {mode !== "live" ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                      Recorded access does not need a batch.
                    </div>
                  ) : adminBatches.length > 0 ? (
                    <select
                      value={batchAssignments[item._id] || ""}
                      onChange={(e) =>
                        onBatchChange({
                          ...batchAssignments,
                          [item._id]: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black bg-white"
                    >
                      <option value="">-- No Batch --</option>
                      {adminBatches.map((b: any) => (
                        <option key={b._id} value={b._id}>
                          {b.name}{b.courseName ? ` (${b.courseName})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Batch 10 AWS"
                      value={batchAssignments[item._id] || ""}
                      onChange={(e) =>
                        onBatchChange({
                          ...batchAssignments,
                          [item._id]: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-2xl px-5 py-3 outline-none text-black placeholder:text-gray-400"
                    />
                  )}
                  {item.batchName && (
                    <p className="text-xs text-gray-500 mt-2">
                      Current: {item.batchName}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onAssignBatch(item)}
                  disabled={mode !== "live"}
                  className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-6 py-3 rounded-2xl font-semibold disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  Save Batch
                </button>
              </div>
            </div>
          );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
            No enrollments or reserved seats yet.
          </div>
        )}
      </div>
    </section>
  );
}

function StudentActivityManager({ adminUser }: { adminUser: any }) {
  const [students, setStudents]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("");
  const [dateFrom, setDateFrom]         = useState("");
  const [dateTo, setDateTo]             = useState("");

  const PAGE_SIZE = 20;

  const authParams = () => {
    const sessionToken = localStorage.getItem("sessionToken") || "";
    const deviceId     = localStorage.getItem("deviceId")     || "";
    return new URLSearchParams({
      userId:       adminUser?._id || "",
      sessionToken,
      deviceId,
    });
  };

  const fetchStudents = async (pg = page) => {
    if (!adminUser?._id) return;
    try {
      setLoading(true);
      const p = authParams();
      p.set("status",   statusFilter);
      p.set("course",   courseFilter);
      p.set("dateFrom", dateFrom);
      p.set("dateTo",   dateTo);
      p.set("page",     String(pg));
      p.set("pageSize", String(PAGE_SIZE));
      const res  = await fetch(`/api/admin/student-monitoring?${p}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setStudents(data.students || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 s for live status
  useEffect(() => {
    fetchStudents(1);
    const id = setInterval(() => fetchStudents(1), 30_000);
    return () => clearInterval(id);
  }, [adminUser?._id, statusFilter, courseFilter, dateFrom, dateTo]);

  const applyFilters = () => { setPage(1); fetchStudents(1); };

  const exportExcel = () => {
    if (!adminUser?._id) return;
    const p = authParams();
    p.set("status",   statusFilter);
    p.set("course",   courseFilter);
    p.set("dateFrom", dateFrom);
    p.set("dateTo",   dateTo);
    p.set("format",   "excel");
    window.location.href = `/api/admin/student-monitoring?${p}`;
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <section id="active-students" className="scroll-mt-32 mt-16 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">

      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Active Students Monitoring</h2>
          <p className="text-gray-500 mt-1">
            Unique student list · Real-time login status · Activity history · Excel export
          </p>
          <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 30 seconds · {total} student{total !== 1 ? "s" : ""} found</p>
        </div>
        <button
          onClick={exportExcel}
          className="shrink-0 bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-2xl font-semibold flex items-center gap-2"
        >
          <Download size={16} /> Export Student Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-black"
        >
          <option value="all">All Students</option>
          <option value="active">Active Now</option>
          <option value="inactive">Inactive</option>
        </select>
        <input
          type="text"
          placeholder="Filter by course name…"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-black w-52"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-black" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-black" />
        <button onClick={applyFilters}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-black transition">
          Apply
        </button>
        <button onClick={() => { setStatusFilter("all"); setCourseFilter(""); setDateFrom(""); setDateTo(""); }}
          className="border border-gray-300 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-100 transition">
          Reset
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-widest">
              <tr>
                <th className="text-left px-4 py-4 w-6"></th>
                <th className="text-left px-4 py-4">Student</th>
                <th className="text-left px-4 py-4">Courses</th>
                <th className="text-left px-4 py-4">Logins</th>
                <th className="text-left px-4 py-4">Last Login</th>
                <th className="text-left px-4 py-4">Last Logout</th>
                <th className="text-left px-4 py-4">Learning Time</th>
                <th className="text-left px-4 py-4">Completion</th>
                <th className="text-left px-4 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                    Loading students…
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center text-gray-400">
                    No students found with the current filters.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <>
                    {/* Summary row */}
                    <tr
                      key={s.userId}
                      className="align-top hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === s.userId ? null : s.userId)}
                    >
                      <td className="px-4 py-4 text-gray-400 text-xs">
                        {expandedId === s.userId ? "▲" : "▼"}
                      </td>
                      <td className="px-4 py-4 min-w-[210px]">
                        <p className="font-semibold text-gray-900">{s.name}</p>
                        <p className="text-gray-500 text-xs break-all">{s.email}</p>
                      </td>
                      <td className="px-4 py-4 text-gray-700 text-center font-semibold">
                        {s.enrolledCourses}
                      </td>
                      <td className="px-4 py-4 text-gray-700 text-center font-semibold">
                        {s.totalLoginCount}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-xs min-w-[150px]">
                        {s.lastLogin || "—"}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-xs min-w-[150px]">
                        {s.lastLogout || "—"}
                      </td>
                      <td className="px-4 py-4 text-green-700 font-semibold whitespace-nowrap">
                        {s.totalLearningTime}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${s.avgCompletion}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700">{s.avgCompletion}%</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{s.completedCourses} cert{s.completedCourses !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          s.currentStatus === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.currentStatus === "Active" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                          {s.currentStatus}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded detail */}
                    {expandedId === s.userId && (
                      <tr key={`${s.userId}-detail`}>
                        <td colSpan={9} className="px-4 pb-6 bg-gray-50 border-b border-gray-200">
                          <div className="grid md:grid-cols-2 gap-6 pt-4">

                            {/* Student summary cards */}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Activity Summary</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {[
                                  ["Videos Watched",     s.videosWatched],
                                  ["Materials Accessed", s.materialsAccessed],
                                  ["Assignments Done",   s.assignmentsSubmitted],
                                  ["Tests Attempted",    s.testsAttempted],
                                  ["Certificates",       s.completedCourses],
                                  ["Last Seen",          s.lastSeenAt || "—"],
                                ].map(([label, val]) => (
                                  <div key={label} className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                                    <p className="text-gray-400">{label}</p>
                                    <p className="font-bold text-gray-800 mt-0.5">{val}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Course history */}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Course History</p>
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {s.courseHistory?.length > 0 ? (
                                  s.courseHistory.map((ch: any, i: number) => (
                                    <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                                      <div className="flex items-center justify-between">
                                        <p className="font-semibold text-gray-800 truncate max-w-[60%]">{ch.courseName || "—"}</p>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                          ch.certificateIssued === "Yes"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-gray-100 text-gray-500"
                                        }`}>
                                          {ch.progressPct}%
                                        </span>
                                      </div>
                                      <div className="h-1 rounded-full bg-gray-100 mt-1.5">
                                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${ch.progressPct}%` }} />
                                      </div>
                                      <p className="text-gray-400 mt-1">
                                        {ch.batchName} · Enrolled {ch.enrollmentDate} · {ch.videosWatched}v {ch.materialsAccessed}m {ch.testsAttempted}t · Cert: {ch.certificateIssued}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-gray-400 text-xs">No course data yet.</p>
                                )}
                              </div>
                            </div>

                            {/* Recent events */}
                            {s.recentEvents?.length > 0 && (
                              <div className="md:col-span-2">
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Recent Activity Events</p>
                                <div className="flex flex-wrap gap-2">
                                  {s.recentEvents.slice(0, 10).map((ev: any, i: number) => (
                                    <span key={i} className="bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
                                      {ev.eventType.replace(/_/g, " ")}
                                      {ev.resourceName ? ` · ${ev.resourceName}` : ""}
                                      <span className="text-blue-400 ml-1">{ev.occurredAt}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <p>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => { setPage(page - 1); fetchStudents(page - 1); }}
              className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              ← Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); fetchStudents(page + 1); }}
              className="px-4 py-2 border border-gray-200 rounded-xl disabled:opacity-40 hover:bg-gray-50">
              Next →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function HeroBannerManager({
  items,
  form,
  editingId,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}: any) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleBannerImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadAdminImage(file, "finops/hero-banners");

      onFormChange({
        ...form,
        image: url,
      });
    } catch (error: any) {
      alert(error.message || "Banner image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <section id="hero-banners" className="scroll-mt-32 mt-16">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Hero Banners
            </h2>
            <p className="text-gray-500 mt-2">
              Control the interactive offers and homepage banner box shown to users.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1">
            <input
              type="text"
              placeholder="Eyebrow"
              value={form.eyebrow}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  eyebrow: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <input
              type="text"
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  title: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <input
              type="text"
              placeholder="Badge / Offer"
              value={form.badge}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  badge: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <select
              value={form.accent}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  accent: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black"
            >
              <option value="cyan">Cyan</option>
              <option value="purple">Purple</option>
              <option value="emerald">Emerald</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>

            <input
              type="text"
              placeholder="CTA Label"
              value={form.ctaLabel}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  ctaLabel: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <input
              type="text"
              placeholder="CTA Link"
              value={form.ctaHref}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  ctaHref: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <input
              type="number"
              placeholder="Order"
              value={form.displayOrder}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  displayOrder: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <label className="flex items-center gap-3 border border-gray-300 rounded-2xl px-4 py-3 text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    isActive: e.target.checked,
                  })
                }
              />
              Active
            </label>

            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  description: e.target.value,
                })
              }
              className="md:col-span-2 xl:col-span-4 border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <input
              type="text"
              placeholder="Image URL"
              value={form.image}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  image: e.target.value,
                })
              }
              className="md:col-span-2 xl:col-span-3 border border-gray-300 rounded-2xl px-4 py-3 outline-none text-black placeholder:text-gray-400"
            />

            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-4 py-3 rounded-2xl text-center font-semibold">
              {uploadingImage ? "Uploading..." : "Upload Image"}
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>

            <div className="md:col-span-2 xl:col-span-4 flex flex-wrap gap-3">
              <button
                onClick={onSave}
                className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-6 py-3 rounded-2xl font-semibold"
              >
                {editingId ? "Update Banner" : "Add Banner"}
              </button>
              {editingId && (
                <button
                  onClick={onCancel}
                  className="bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-6 py-3 rounded-2xl font-semibold"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {items.length > 0 ? (
            items.map((item: any) => (
              <div
                key={item._id}
                className="rounded-3xl border border-gray-200 overflow-hidden bg-gray-50"
              >
                <div className="relative h-44 bg-gray-900">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <span className="absolute top-4 left-4 bg-white/90 text-gray-900 rounded-full px-3 py-1 text-xs font-bold">
                    {item.isActive === false ? "Hidden" : item.badge || "Live"}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-[#4d8bff] font-bold">
                    {item.eyebrow || "Banner"}
                  </p>
                  <h3 className="text-xl font-bold text-gray-900 mt-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between gap-3 mt-5">
                    <button
                      onClick={() => onEdit(item)}
                      className="bg-gray-900 hover:bg-black transition text-white px-4 py-2 rounded-xl font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item._id)}
                      className="bg-red-50 hover:bg-red-100 transition text-red-600 px-4 py-2 rounded-xl font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="lg:col-span-3 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
              No homepage banners added yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LogoManager({
  sectionId,
  title,
  description,
  items,
  form,
  editingId,
  emptyText,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}: any) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const isPartnerManager = sectionId === "partners";

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingLogo(true);

      const url = await uploadAdminImage(
        file,
          isPartnerManager
          ? "finops/partners"
          : "finops/trusted-companies"
      );

      onFormChange({
        ...form,
        logo: url,
      });
    } catch (error: any) {
      alert(error.message || "Image upload failed");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e40af] p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-blue-200">
          Homepage controls
        </p>
        <h2 className="mt-3 text-3xl font-black">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {description}
        </p>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={isPartnerManager ? "Learner name" : "Company name"}
              value={form.name}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  name: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <input
              type="text"
              placeholder={isPartnerManager ? "Learner photo URL or /public-file.png" : "Logo URL or /public-file.png"}
              value={form.logo}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  logo: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            {isPartnerManager && (
              <>
                <input
                  type="text"
                  placeholder="Role / company line, e.g. Data Analyst at Atrina Technologies"
                  value={form.role}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      role: e.target.value,
                    })
                  }
                  className="md:col-span-2 border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />

                <textarea
                  placeholder="Write learner story / placement review"
                  value={form.description}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                  className="md:col-span-2 resize-none border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </>
            )}

            <input
              type="text"
              placeholder={isPartnerManager ? "LinkedIn URL (optional)" : "Website URL (optional)"}
              value={form.website}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  website: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            <input
              type="number"
              placeholder="Display order"
              value={form.displayOrder}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  displayOrder: e.target.value,
                })
              }
              className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-3xl border border-dashed border-blue-300 bg-[#2563eb]/10 p-4">
            <div className={`h-28 border border-white bg-white flex items-center justify-center overflow-hidden ${isPartnerManager ? "mx-auto w-28 rounded-full" : "rounded-2xl"}`}>
              {form.logo ? (
                <img src={form.logo} alt={form.name || "Logo preview"} className={isPartnerManager ? "h-full w-full object-cover" : "max-h-20 max-w-[180px] object-contain"} />
              ) : (
                <span className="text-sm font-semibold text-gray-400">
                  {isPartnerManager ? "Photo preview" : "Logo preview"}
                </span>
              )}
            </div>
            <label className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-blue-500 px-4 py-3 text-center text-sm font-black text-white cursor-pointer hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition">
              {uploadingLogo ? "Uploading..." : isPartnerManager ? "Upload photo" : "Upload logo"}
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSave}
            className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-6 py-3 rounded-2xl font-semibold"
          >
            {editingId ? "Save Changes" : isPartnerManager ? "Add Learner Story" : `Add ${title}`}
          </button>

          {editingId && (
            <button
              onClick={onCancel}
              className="bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-6 py-3 rounded-2xl font-semibold"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item: any) => (
            <div
              key={item._id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-gradient-to-r from-white to-gray-50 p-4 shadow-sm"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`${isPartnerManager ? "h-20 w-20 rounded-full" : "w-24 h-16 rounded-2xl"} bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-inner`}>
                  {item.logo ? (
                    <img
                      src={item.logo}
                      alt={item.name}
                      className={isPartnerManager ? "h-full w-full object-cover" : "max-w-full max-h-full object-contain"}
                    />
                  ) : (
                    <span className="text-xs text-gray-400">
                      Logo
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {item.name}
                  </h3>
                  {isPartnerManager && item.role && (
                    <p className="text-sm font-semibold text-gray-800 line-clamp-1">
                      {item.role}
                    </p>
                  )}
                  {isPartnerManager && item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 truncate">
                    {item.logo}
                  </p>
                  {item.website && (
                    <p className="text-sm text-[#4d8bff] truncate">
                      {item.website}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-xl">
                  Order {item.displayOrder || 0}
                </span>

                <button
                  onClick={() => onEdit(item)}
                  className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-4 py-2 rounded-xl font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() => onDelete(item._id)}
                  className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-xl font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            {emptyText}
          </div>
        )}
      </div>
    </section>
  );
}

function TestimonialManager({
  sectionId,
  items,
  form,
  editingId,
  pendingCount,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onReview,
  onCancel,
}: any) {
  const pendingItems = items.filter((item: any) => item.status === "pending");
  const approvedItems = items.filter(
    (item: any) => item.status === "approved" || !item.status
  );

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 overflow-hidden bg-white rounded-3xl border border-gray-200 shadow-sm"
    >
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#1e40af] p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black">
              Testimonials
            </h2>
            <p className="text-slate-300 mt-2">
              Review learner feedback before it appears on the homepage.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-black">
            <Bell size={18} className="text-amber-300" />
            {pendingCount || 0} New
          </div>
        </div>
      </div>

      {pendingItems.length > 0 && (
        <div className="m-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-xl font-black text-amber-900">
              Pending student feedback
            </h3>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
              Review Required
            </span>
          </div>
          <div className="space-y-4">
            {pendingItems.map((item: any) => (
              <div key={item._id} className="rounded-2xl border border-amber-200 bg-white p-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div>
                    <h4 className="font-black text-gray-950">{item.name}</h4>
                    <p className="text-sm text-gray-500">{item.role || item.userEmail}</p>
                    <p className="mt-3 text-sm leading-6 text-gray-700">{item.content}</p>
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Rating {item.rating || 5}/5
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => onReview(item._id, "approved")}
                      className="rounded-xl bg-emerald-500 px-4 py-2 font-bold text-white transition hover:bg-emerald-600"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onReview(item._id, "rejected")}
                      className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white transition hover:bg-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pt-6">
        <input
          type="text"
          placeholder="Learner Name"
          value={form.name}
          onChange={(e) =>
            onFormChange({
              ...form,
              name: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Role / Company"
          value={form.role}
          onChange={(e) =>
            onFormChange({
              ...form,
              role: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="number"
          min="1"
          max="5"
          placeholder="Rating 1-5"
          value={form.rating}
          onChange={(e) =>
            onFormChange({
              ...form,
              rating: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Webinar Price, e.g. ₹999"
          value={form.price}
          onChange={(e) =>
            onFormChange({
              ...form,
              price: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="number"
          placeholder="Display Order"
          value={form.displayOrder}
          onChange={(e) =>
            onFormChange({
              ...form,
              displayOrder: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />
      </div>

      <textarea
        rows={4}
        placeholder="Testimonial content"
        value={form.content}
        onChange={(e) =>
          onFormChange({
            ...form,
            content: e.target.value,
          })
        }
        className="mx-6 mt-4 w-[calc(100%-3rem)] border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
      />

      <div className="flex flex-wrap gap-3 mt-4 mb-6 px-6">
        <button
          onClick={onSave}
          className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-6 py-3 rounded-2xl font-semibold"
        >
          {editingId ? "Save Changes" : "Add Testimonial"}
        </button>

        {editingId && (
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-6 py-3 rounded-2xl font-semibold"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="space-y-4 px-6 pb-6">
        {approvedItems.length > 0 ? (
          approvedItems.map((item: any) => (
            <div
              key={item._id}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.role}
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    {item.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Rating {item.rating || 5} / Order {item.displayOrder || 0}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onEdit(item)}
                    className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-4 py-2 rounded-xl font-medium"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onDelete(item._id)}
                    className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-xl font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No testimonials added yet.
          </div>
        )}
      </div>
    </section>
  );
}

function WebinarManager({
  sectionId,
  items,
  form,
  editingId,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
}: any) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleWebinarImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);

      const url = await uploadAdminImage(file, "finops/webinars");

      onFormChange({
        ...form,
        img: url,
      });
    } catch (error: any) {
      alert(error.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">
          Webinars
        </h2>
        <p className="text-gray-500 mt-2">
          Control upcoming webinar cards shown on the user homepage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Speaker Name"
          value={form.name}
          onChange={(e) =>
            onFormChange({
              ...form,
              name: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Speaker Role"
          value={form.role}
          onChange={(e) =>
            onFormChange({
              ...form,
              role: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Webinar Title"
          value={form.title}
          onChange={(e) =>
            onFormChange({
              ...form,
              title: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400 md:col-span-2"
        />

        <input
          type="text"
          placeholder="Date, e.g. 21 Apr 2026"
          value={form.date}
          onChange={(e) =>
            onFormChange({
              ...form,
              date: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Time, e.g. 02:00 PM IST"
          value={form.time}
          onChange={(e) =>
            onFormChange({
              ...form,
              time: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <input
          type="text"
          placeholder="Speaker Image URL"
          value={form.img}
          onChange={(e) =>
            onFormChange({
              ...form,
              img: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />

        <label className="border border-dashed border-blue-300 bg-[#2563eb]/10 rounded-2xl px-5 py-4 text-[#4d8bff] font-semibold cursor-pointer hover:bg-blue-100 transition">
          {uploadingImage ? "Uploading image..." : "Upload Image From PC"}
          <input
            type="file"
            accept="image/*"
            onChange={handleWebinarImageUpload}
            disabled={uploadingImage}
            className="hidden"
          />
        </label>

        <input
          type="number"
          placeholder="Display Order"
          value={form.displayOrder}
          onChange={(e) =>
            onFormChange({
              ...form,
              displayOrder: e.target.value,
            })
          }
          className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black placeholder:text-gray-400"
        />
      </div>

      <div className="flex flex-wrap gap-3 mt-4 mb-6">
        <button
          onClick={onSave}
          className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-6 py-3 rounded-2xl font-semibold"
        >
          {editingId ? "Save Changes" : "Add Webinar"}
        </button>

        {editingId && (
          <button
            onClick={onCancel}
            className="bg-gray-100 hover:bg-gray-200 transition text-gray-700 px-6 py-3 rounded-2xl font-semibold"
          >
            Cancel Edit
          </button>
        )}
      </div>

      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item: any) => (
            <div
              key={item._id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-gray-400">
                      Image
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {item.name} - {item.role}
                  </p>
                  <p className="text-sm text-[#4d8bff] truncate">
                    {item.date} | {item.time}
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {item.price || "Free"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-xl">
                  Order {item.displayOrder || 0}
                </span>

                <button
                  onClick={() => onEdit(item)}
                  className="bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] transition text-white px-4 py-2 rounded-xl font-medium"
                >
                  Edit
                </button>

                <button
                  onClick={() => onDelete(item._id)}
                  className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-xl font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">
            No webinars added yet.
          </div>
        )}
      </div>
    </section>
  );
}

const COURSE_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const COURSE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function CourseImageUpload({
  image,
  onImageChange,
}: {
  image: string;
  onImageChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const processFile = async (file: File) => {
    setError("");

    if (!COURSE_IMAGE_ALLOWED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Please use JPG, PNG, or WEBP.");
      return;
    }

    if (file.size > COURSE_IMAGE_MAX_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploading(true);
      const url = await uploadAdminImage(file, "finops/course-images");
      onImageChange(url);
    } catch (err: any) {
      setError(err.message || "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  return (
    <div className="mt-6">
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        Course Image
      </label>

      {image ? (
        <div className="relative mb-4 inline-block">
          <img
            src={image}
            alt="Course preview"
            className="h-44 w-full max-w-sm rounded-2xl border border-gray-200 object-cover shadow-sm"
          />
        </div>
      ) : (
        <div className="mb-4 flex h-44 w-full max-w-sm items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400">
          No image selected
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-semibold transition ${
            uploading
              ? "border-blue-300 bg-blue-50 text-blue-400"
              : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <Upload size={15} /> {image ? "Replace Image" : "Choose Image"}
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        {image && !uploading && (
          <button
            type="button"
            onClick={() => {
              onImageChange("");
              setError("");
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            <Trash2 size={15} /> Remove Image
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>
      )}
      <p className="mt-1.5 text-xs text-gray-400">
        Supported formats: JPG, PNG, WEBP. Maximum size: 5 MB.
      </p>
    </div>
  );
}

async function uploadAdminImage(file: File, folder: string) {
  return uploadAdminFile(file, folder);
}

async function uploadAdminFile(file: File, folder: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Image upload failed");
  }

  return data.url;
}

// =====================================================
// NON-ENROLLED USERS MANAGER COMPONENT
// =====================================================
function NonEnrolledUsersManager({
  users,
  history,
  scheduled,
  loading,
  adminUser,
  onRefresh,
  onCancelScheduled,
}: {
  users: any[];
  history: any[];
  scheduled: any[];
  loading: boolean;
  adminUser: any;
  onRefresh: (days: number) => void;
  onCancelScheduled: (id: string) => void;
}) {
  const [tab, setTab] = useState<"users" | "compose" | "history" | "scheduled">("users");
  const [selected, setSelected] = useState<string[]>([]);
  const [subject, setSubject] = useState("We noticed you haven't joined a course yet");
  const [message, setMessage] = useState("");
  const [scheduleAfterDays, setScheduleAfterDays] = useState("0");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [filterDays, setFilterDays] = useState("0");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const toggleSelect = (id: string) =>
    setSelected((prev: string[]) => prev.includes(id) ? prev.filter((i: string) => i !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((u) => u._id));

  const selectedUsers = users.filter((u) => selected.includes(u._id));

  const sendEmails = async () => {
    if (!selected.length) { showToast("Select at least one user"); return; }
    if (!subject.trim()) { showToast("Subject is required"); return; }
    if (!message.trim()) { showToast("Message is required"); return; }
    setSending(true);
    setResult(null);
    try {
      const sessionToken = localStorage.getItem("sessionToken") || "";
      const deviceId = localStorage.getItem("deviceId") || "";
      const res = await fetch("/api/enrollment-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: adminUser?._id,
          sessionToken,
          deviceId,
          targets: selectedUsers.map((u) => ({ userId: u._id, userName: u.name, userEmail: u.email })),
          subject,
          message,
          scheduleAfterDays: parseInt(scheduleAfterDays, 10) > 0 ? scheduleAfterDays : undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.success) {
        showToast(data.message || "Done!");
        setSelected([]);
        onRefresh(parseInt(filterDays, 10));
        setTab("history");
      } else {
        showToast(data.message || "Failed");
      }
    } catch (e) {
      showToast("Network error");
    } finally {
      setSending(false);
    }
  };

  const sentToday = history.filter((h) => {
    if (!h.sentAt && !h.createdAt) return false;
    const d = new Date(h.sentAt || h.createdAt);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;

  return (
    <section id="interested-students" className="scroll-mt-32 mt-16 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-medium text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="text-blue-400 flex-none" size={16} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-950 to-gray-900 px-8 py-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#2563eb]/10 border border-blue-400/20 flex items-center justify-center">
                <UserX size={20} className="text-blue-300" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Interested Students</h2>
                <p className="text-gray-400 text-sm mt-0.5">Students who signed up but haven't enrolled in any course yet</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Stats */}
            <div className="flex gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
                <p className="text-2xl font-black text-white">{users.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Users</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
                <p className="text-2xl font-black text-blue-300">{sentToday}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sent Today</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-center min-w-[70px]">
                <p className="text-2xl font-black text-amber-300">{scheduled.length}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Scheduled</p>
              </div>
            </div>
            {/* Filter by days */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5">
              <Clock size={15} className="text-gray-400" />
              <select
                value={filterDays}
                onChange={(e) => { setFilterDays(e.target.value); onRefresh(parseInt(e.target.value, 10)); }}
                className="bg-transparent text-white text-sm outline-none cursor-pointer"
              >
                <option value="0" style={{background:"#1e293b"}}>All time</option>
                <option value="1" style={{background:"#1e293b"}}>Joined 1+ days ago</option>
                <option value="3" style={{background:"#1e293b"}}>Joined 3+ days ago</option>
                <option value="7" style={{background:"#1e293b"}}>Joined 7+ days ago</option>
                <option value="14" style={{background:"#1e293b"}}>Joined 14+ days ago</option>
                <option value="30" style={{background:"#1e293b"}}>Joined 30+ days ago</option>
              </select>
            </div>
            <button
              onClick={() => onRefresh(parseInt(filterDays, 10))}
              disabled={loading}
              className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-2 hover:bg-white/10 transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-6 overflow-x-auto">
          {[
            { key: "users", label: "Users", count: users.length },
            { key: "compose", label: "Compose Email", count: selected.length > 0 ? selected.length : null },
            { key: "history", label: "Email History", count: history.length },
            { key: "scheduled", label: "Scheduled", count: scheduled.length },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
                tab === t.key
                  ? "bg-blue-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
              {t.count !== null && t.count !== undefined && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t.key ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* ---- USERS TAB ---- */}
        {tab === "users" && (
          <div>
            {/* Search + actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex-1 max-w-md">
                <Search size={16} className="text-gray-400 flex-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="bg-transparent outline-none text-black placeholder:text-gray-400 text-sm w-full"
                />
              </div>
              <div className="flex items-center gap-3">
                {selected.length > 0 && (
                  <button
                    onClick={() => setTab("compose")}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-5 py-3 rounded-2xl font-bold text-sm transition"
                  >
                    <Mail size={16} />
                    Email {selected.length} Selected
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded"
                  />
                  Select All
                </label>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 size={24} className="animate-spin mr-3" /> Loading users...
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((u) => {
                  const isSelected = selected.includes(u._id);
                  const emailsSent = history.filter((h) => h.userEmail === u.email).length;
                  const lastSent = history.find((h) => h.userEmail === u.email);
                  const daysSince = u.createdAt
                    ? Math.floor((Date.now() - new Date(u.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleSelect(u._id)}
                      className={`rounded-2xl border-2 p-5 cursor-pointer transition ${
                        isSelected
                          ? "border-blue-500 bg-[#2563eb]/10"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm flex-none ${
                              isSelected ? "bg-blue-500" : "bg-gray-900"
                            }`}>
                              {(u.name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[160px]">{u.name || "Unknown"}</h3>
                              <p className="text-xs text-gray-500 truncate max-w-[160px]">{u.email}</p>
                            </div>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex-none flex items-center justify-center transition ${
                          isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {daysSince !== null && (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                            daysSince >= 30 ? "bg-red-50 text-red-700" :
                            daysSince >= 7 ? "bg-amber-50 text-amber-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {daysSince}d since join
                          </span>
                        )}
                        {u.lastLoginAt && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                            Last login: {new Date(u.lastLoginAt).toLocaleDateString("en-IN")}
                          </span>
                        )}
                        {emailsSent > 0 && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#2563eb]/10 text-[#4d8bff]">
                            {emailsSent} email{emailsSent > 1 ? "s" : ""} sent
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <UserX size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="font-medium">No interested students found.</p>
                <p className="text-sm mt-1">All registered students are enrolled in at least one course.</p>
              </div>
            )}
          </div>
        )}

        {/* ---- COMPOSE TAB ---- */}
        {tab === "compose" && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-[#2563eb]/10 border border-[#2563eb]/30 flex items-center justify-center">
                <Mail size={20} className="text-[#4d8bff]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Compose Enrollment Reminder</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selected.length > 0 ? `${selected.length} recipient(s) selected` : "No recipients selected — go to Users tab to select"}
                </p>
              </div>
            </div>

            {/* Recipients preview */}
            {selected.length > 0 && (
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 mb-6">
                <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-3">Recipients</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <span key={u._id} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm">
                      <span className="w-5 h-5 rounded-lg bg-gray-900 text-white text-[10px] font-black flex items-center justify-center">{(u.name || "?")[0].toUpperCase()}</span>
                      {u.name || u.email}
                      <button onClick={() => toggleSelect(u._id)} className="text-gray-400 hover:text-red-500 transition">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-5">
              {/* Schedule */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Send After (days)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="90"
                    value={scheduleAfterDays}
                    onChange={(e) => setScheduleAfterDays(e.target.value)}
                    className="w-24 border border-gray-200 rounded-xl px-4 py-3 outline-none text-black text-sm font-bold"
                  />
                  <p className="text-sm text-gray-500">
                    {parseInt(scheduleAfterDays, 10) === 0
                      ? "Send immediately"
                      : `Will be delivered in ${scheduleAfterDays} day(s) from now`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {[["0","Now"],["1","1 day"],["3","3 days"],["7","1 week"],["14","2 weeks"],["30","1 month"]].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setScheduleAfterDays(val)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        scheduleAfterDays === val
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Email Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 outline-none text-black text-sm focus:border-blue-400 transition"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Your Message (Why they should join)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder={`Hi [Name],\n\nWe noticed you haven't joined a course yet. Our courses are designed to help you...\n\nFeel free to reply to this email with any questions!`}
                  className="w-full border border-gray-200 rounded-2xl px-5 py-4 outline-none text-black text-sm resize-none focus:border-blue-400 transition"
                />
                <p className="text-xs text-gray-400 mt-1">Write naturally — the recipient's name will be added as a greeting automatically.</p>
              </div>

              {/* Email Preview */}
              {message.trim() && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <span className="text-xs text-gray-500 ml-2">Email Preview</span>
                  </div>
                  <div className="p-5 bg-white">
                    <div className="text-center mb-4">
                      <div className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-xl font-black text-lg">FinOps</div>
                    </div>
                    <p className="text-gray-800 font-bold">Hello, {selectedUsers[0]?.name || "Student"} 👋</p>
                    <div className="border-l-4 border-blue-400 bg-gray-50 rounded-r-xl pl-4 pr-3 py-3 mt-3">
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{message}</p>
                    </div>
                    <div className="text-center mt-4">
                      <span className="inline-block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold">Explore Courses →</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className={`rounded-2xl border p-4 ${result.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2">
                    {result.success ? <CheckCircle size={18} className="text-emerald-600" /> : <AlertCircle size={18} className="text-red-600" />}
                    <p className={`font-semibold text-sm ${result.success ? "text-emerald-800" : "text-red-800"}`}>{result.message}</p>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={sendEmails}
                disabled={sending || !selected.length || !subject.trim() || !message.trim()}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition"
              >
                {sending ? (
                  <><Loader2 size={18} className="animate-spin" /> Sending...</>
                ) : parseInt(scheduleAfterDays, 10) > 0 ? (
                  <><Clock size={18} /> Schedule {selected.length} Email{selected.length !== 1 ? "s" : ""}</>
                ) : (
                  <><Send size={18} /> Send {selected.length} Email{selected.length !== 1 ? "s" : ""} Now</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---- HISTORY TAB ---- */}
        {tab === "history" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Email History ({history.length})</h3>
            </div>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h._id} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white flex-none ${
                          h.status === "sent" ? "bg-emerald-500" : "bg-red-500"
                        }`}>
                          {h.status === "sent" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{h.userName || h.userEmail}</p>
                          <p className="text-sm text-gray-500">{h.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                        <span className={`font-semibold px-3 py-1 rounded-full text-xs ${
                          h.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}>
                          {h.status}
                        </span>
                        {h.provider && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">{h.provider}</span>}
                        <span className="text-gray-400 text-xs">
                          {h.sentAt ? new Date(h.sentAt).toLocaleString("en-IN") : new Date(h.createdAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-gray-200 pt-3">
                      <p className="text-sm font-semibold text-gray-700">Subject: {h.subject}</p>
                      {h.message && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{h.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Mail size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="font-medium">No emails sent yet.</p>
                <p className="text-sm mt-1">Go to Users tab, select recipients, and compose an email.</p>
              </div>
            )}
          </div>
        )}

        {/* ---- SCHEDULED TAB ---- */}
        {tab === "scheduled" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Scheduled Emails ({scheduled.length})</h3>
            </div>
            {scheduled.length > 0 ? (
              <div className="space-y-3">
                {scheduled.map((s) => (
                  <div key={s._id} className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-none">
                          <Clock size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{s.userName || s.userEmail}</p>
                          <p className="text-sm text-gray-600">{s.userEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Scheduled for</p>
                          <p className="text-sm font-bold text-amber-700">
                            {new Date(s.scheduledFor).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <button
                          onClick={() => { if (confirm("Cancel this scheduled email?")) onCancelScheduled(s._id); }}
                          className="bg-white border border-red-200 text-red-600 p-2 rounded-xl hover:bg-red-50 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-amber-200 pt-3">
                      <p className="text-sm font-semibold text-gray-700">Subject: {s.subject}</p>
                      {s.message && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{s.message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <Clock size={40} className="mx-auto text-gray-300 mb-4" />
                <p className="font-medium">No scheduled emails.</p>
                <p className="text-sm mt-1">Set "Send after N days" when composing to schedule future emails.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// =====================================================
// SESSION SHOWCASE MANAGER COMPONENT
// =====================================================
function SessionShowcaseManager({
  items,
  form,
  editingId,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onCancel,
  onSeedDefaults,
}: any) {
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [newHighlight, setNewHighlight] = useState("");
  const [newTag, setNewTag] = useState("");

  const uploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingCover(true);
      const url = await uploadAdminImage(file, "finops/sessions");
      onFormChange({ ...form, coverImage: url });
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const uploadGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      setUploadingGallery(true);
      const urls: string[] = [];
      for (const file of files) {
        const url = await uploadAdminImage(file, "finops/sessions/gallery");
        urls.push(url);
      }
      onFormChange({ ...form, images: [...(form.images || []), ...urls] });
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    const imgs = [...(form.images || [])];
    imgs.splice(idx, 1);
    onFormChange({ ...form, images: imgs });
  };

  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    onFormChange({ ...form, highlights: [...(form.highlights || []), newHighlight.trim()] });
    setNewHighlight("");
  };

  const removeHighlight = (idx: number) => {
    const hs = [...(form.highlights || [])];
    hs.splice(idx, 1);
    onFormChange({ ...form, highlights: hs });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    onFormChange({ ...form, tags: [...(form.tags || []), newTag.trim()] });
    setNewTag("");
  };

  const removeTag = (idx: number) => {
    const ts = [...(form.tags || [])];
    ts.splice(idx, 1);
    onFormChange({ ...form, tags: ts });
  };

  const CATEGORIES = ["Training", "Workshop", "Bootcamp", "Cloud", "FinOps", "DevOps", "AWS", "Azure", "GCP", "Security", "Corporate", "Other"];

  return (
    <section
      id="session-showcase-manager"
      className="scroll-mt-32 mt-16 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-950 to-gray-900 px-8 py-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#2563eb]/10 border border-blue-400/20 flex items-center justify-center">
              <Play size={22} className="text-blue-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sessions Gallery</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Showcase training sessions, workshops and bootcamps on the homepage. {items.length} session{items.length !== 1 ? "s" : ""} published.
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
              <p className="text-2xl font-black text-white">{items.length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Total</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
              <p className="text-2xl font-black text-blue-300">{items.filter((i: any) => i.isFeatured).length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Featured</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
              <p className="text-2xl font-black text-emerald-300">{items.filter((i: any) => i.isActive).length}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Fallback notice — shown when no DB sessions exist yet */}
        {items.length > 0 && items[0]?._id?.startsWith("fallback-") && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-amber-800 text-sm">These are the default sessions shown on your homepage</p>
              <p className="text-amber-700 text-xs mt-1">They are not saved to your database yet. Click <strong>Edit</strong> on any card to customise and save it, or use the button to save all defaults at once.</p>
            </div>
            <button
              onClick={onSeedDefaults}
              className="flex-none bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap"
            >
              Save all defaults to DB
            </button>
          </div>
        )}

        {/* Form */}
        <div className="bg-gray-50 rounded-3xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-5">
            {editingId ? (editingId.startsWith("fallback-") ? "Save Default Session to DB" : "Edit Session") : "Add New Session"}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Title */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Session Title *</label>
              <input
                value={form.title}
                onChange={(e) => onFormChange({ ...form, title: e.target.value })}
                placeholder="e.g. AWS Cloud Practitioner Bootcamp"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Subtitle */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Subtitle</label>
              <input
                value={form.subtitle}
                onChange={(e) => onFormChange({ ...form, subtitle: e.target.value })}
                placeholder="Short tagline for the session"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Description */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                placeholder="Brief description of the session, what was covered, outcomes..."
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm resize-none focus:border-blue-400 transition"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => onFormChange({ ...form, category: e.target.value })}
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition bg-white"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Instructor */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Instructor Name</label>
              <input
                value={form.instructor}
                onChange={(e) => onFormChange({ ...form, instructor: e.target.value })}
                placeholder="e.g. Arjun Sharma"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Date</label>
              <input
                value={form.date}
                onChange={(e) => onFormChange({ ...form, date: e.target.value })}
                placeholder="e.g. March 2024"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Location</label>
              <input
                value={form.location}
                onChange={(e) => onFormChange({ ...form, location: e.target.value })}
                placeholder="e.g. Mumbai, India / Online"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Attendees</label>
              <input
                value={form.attendees}
                onChange={(e) => onFormChange({ ...form, attendees: e.target.value })}
                placeholder="e.g. 48"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Duration</label>
              <input
                value={form.duration}
                onChange={(e) => onFormChange({ ...form, duration: e.target.value })}
                placeholder="e.g. 2 Days / 8 Hours"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Display Order</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => onFormChange({ ...form, displayOrder: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-2xl px-5 py-3.5 outline-none text-black text-sm focus:border-blue-400 transition"
              />
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-6 lg:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => onFormChange({ ...form, isActive: !form.isActive })}
                  className={`w-12 h-6 rounded-full transition relative ${form.isActive ? "bg-blue-500" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isActive ? "left-6" : "left-0.5"}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Active (visible on site)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => onFormChange({ ...form, isFeatured: !form.isFeatured })}
                  className={`w-12 h-6 rounded-full transition relative ${form.isFeatured ? "bg-amber-400" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.isFeatured ? "left-6" : "left-0.5"}`} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Featured (show star badge)</span>
              </label>
            </div>

            {/* Cover Image */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Cover Image</label>
              <div className="flex items-center gap-4">
                {form.coverImage && (
                  <div className="w-24 h-16 rounded-xl overflow-hidden border border-gray-200 flex-none">
                    <img src={form.coverImage} alt="cover" className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-5 py-3 cursor-pointer hover:border-blue-400 transition text-sm font-semibold text-gray-700">
                  {uploadingCover ? (
                    <><Loader2 size={16} className="animate-spin text-blue-500" /> Uploading...</>
                  ) : (
                    <><Upload size={16} /> Upload Cover Image</>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={uploadCover} disabled={uploadingCover} />
                </label>
                {form.coverImage && (
                  <button onClick={() => onFormChange({ ...form, coverImage: "" })} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                )}
              </div>
            </div>

            {/* Gallery Images */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Gallery Images (Multiple)</label>
              <label className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-5 py-3 cursor-pointer hover:border-blue-400 transition text-sm font-semibold text-gray-700 mb-3">
                {uploadingGallery ? (
                  <><Loader2 size={16} className="animate-spin text-blue-500" /> Uploading...</>
                ) : (
                  <><Upload size={16} /> Upload Session Photos</>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={uploadGallery} disabled={uploadingGallery} />
              </label>
              {(form.images || []).length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {(form.images || []).map((img: string, idx: number) => (
                    <div key={idx} className="relative w-20 h-16 rounded-xl overflow-hidden border border-gray-200 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Highlights */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Session Highlights</label>
              <div className="flex gap-2 mb-3">
                <input
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHighlight()}
                  placeholder="e.g. Live AWS Console Labs"
                  className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 outline-none text-black text-sm focus:border-blue-400 transition"
                />
                <button onClick={addHighlight} className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-gray-700 transition">Add</button>
              </div>
              {(form.highlights || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(form.highlights || []).map((h: string, idx: number) => (
                    <span key={idx} className="flex items-center gap-2 bg-[#2563eb]/10 border border-[#2563eb]/30 text-blue-800 px-3 py-1.5 rounded-xl text-sm font-medium">
                      {h}
                      <button onClick={() => removeHighlight(idx)} className="text-blue-400 hover:text-red-500 transition"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tags</label>
              <div className="flex gap-2 mb-3">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  placeholder="e.g. AWS, Cloud, Certification"
                  className="flex-1 border border-gray-200 rounded-2xl px-5 py-3 outline-none text-black text-sm focus:border-blue-400 transition"
                />
                <button onClick={addTag} className="bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-bold hover:bg-gray-700 transition">Add</button>
              </div>
              {(form.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(form.tags || []).map((t: string, idx: number) => (
                    <span key={idx} className="flex items-center gap-2 bg-gray-100 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-medium">
                      #{t}
                      <button onClick={() => removeTag(idx)} className="text-gray-400 hover:text-red-500 transition"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={onSave}
              className="bg-gray-900 hover:bg-gray-700 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition flex items-center gap-2"
            >
              <Send size={15} />
              {editingId ? "Update Session" : "Publish Session"}
            </button>
            {editingId && (
              <button
                onClick={onCancel}
                className="border border-gray-200 text-gray-600 px-6 py-3.5 rounded-2xl font-semibold text-sm hover:bg-[#2563eb]/10/50 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {items.map((item: any) => (
              <div key={item._id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition group">
                {/* Thumbnail */}
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  {item.coverImage || item.images?.[0] ? (
                    <img src={item.coverImage || item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Play size={28} className="text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${
                      item.isActive ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      {item.isActive ? "Active" : "Hidden"}
                    </span>
                    {item.isFeatured && (
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold border bg-amber-50 border-amber-200 text-amber-700">★ Featured</span>
                    )}
                  </div>
                  {(item.images || []).length > 0 && (
                    <div className="absolute top-3 right-3 bg-black/50 text-white text-[11px] font-bold px-2 py-1 rounded-lg">
                      {item.images.length} photos
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-[#4d8bff] bg-[#2563eb]/10 border border-blue-100 px-2 py-0.5 rounded-lg">{item.category}</span>
                    <span className="text-[11px] text-gray-400">{item.date}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{item.title}</h3>
                  {item.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.subtitle}</p>}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                    {item.location && <span>📍 {item.location}</span>}
                    {item.attendees && <span>👥 {item.attendees}</span>}
                    {item.duration && <span>⏱ {item.duration}</span>}
                  </div>
                  {(item.highlights || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {item.highlights.slice(0, 3).map((h: string, i: number) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg">{h}</span>
                      ))}
                      {item.highlights.length > 3 && <span className="text-[10px] text-gray-400">+{item.highlights.length - 3}</span>}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-gray-700 transition"
                  >
                    {item._id?.startsWith("fallback-") ? "Edit & Save to DB" : "Edit"}
                  </button>
                  <button
                    onClick={() => onDelete(item._id)}
                    className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 transition"
                    title={item._id?.startsWith("fallback-") ? "Remove from view" : "Delete"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-3xl">
            <Play size={40} className="mx-auto text-gray-300 mb-4" />
            <p className="font-bold text-gray-900">No sessions published yet</p>
            <p className="text-sm text-gray-500 mt-1">Add your first session above to showcase it on the homepage.</p>
          </div>
        )}
      </div>
    </section>
  );
}
