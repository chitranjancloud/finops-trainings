"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Film,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  Save,
  Search,
  Settings,
  Share2,
  Trash2,
  Trophy,
  Unlock,
  Upload,
  UserCog,
  UserPlus,
  Users,
  Bell,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import S3UploadPanel from "@/components/S3UploadPanel";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";
import { buildStructuredSharePointFolderPath } from "@/lib/sharepoint";

type Enrollment = {
  _id: string;
  name?: string;
  email?: string;
  courseName?: string;
  courseId?: string;
  status?: string;
  batchName?: string;
  batchId?: string;
  learningMode?: "recorded" | "live";
  batchBlocked?: boolean;
  batchAssignedAt?: string;
  createdAt?: string;
};

type BatchStudent = Enrollment & {
  activityStatus?: string;
  lastSeenAt?: string;
  blocked?: string;
};

type McqQuestion = {
  _id?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  marks: number;
};

type Resource = {
  _id?: string;
  title: string;
  description: string;
  fileUrl: string;
  answerSheetUrl: string;
  link: string;
  dueDate: string;
  scheduledAt: string;
  durationMinutes: number;
  totalMarks: number;
  allowRetake: boolean;
  isActive: boolean;
  isMcq: boolean;
  questions: McqQuestion[];
};

type Notice = {
  title: string;
  message: string;
  priority: "normal" | "important" | "urgent";
  publishAt: string;
  isActive: boolean;
};

type Faculty = {
  name: string;
  email: string;
  phone: string;
  role: string;
  bio: string;
};

type BatchMaterial = {
  _id?: string;
  type: "video" | "pdf" | "material" | "sharepoint";
  name: string;
  url: string;
  webUrl: string;
  sourceType: string;
  isActive: boolean;
};

type Batch = {
  _id?: string;
  name: string;
  code: string;
  courseId: string;
  courseName: string;
  startDate: string;
  description: string;
  isActive: boolean;
  inactiveAfterDays: number;
  tests: Resource[];
  assignments: Resource[];
  notices: Notice[];
  faculty: Faculty[];
  materials: BatchMaterial[];
};

type Course = {
  _id: string;
  title: string;
  slug: string;
  videos?: { name: string; url: string; webUrl?: string }[];
  pdfs?: { name: string; url: string; webUrl?: string }[];
  materials?: { name: string; url: string; webUrl?: string }[];
};

const emptyMcqQuestion: McqQuestion = {
  question: "", optionA: "", optionB: "", optionC: "", optionD: "",
  correctAnswer: "A", marks: 1,
};

const emptyResource: Resource = {
  title: "", description: "", fileUrl: "", answerSheetUrl: "", link: "",
  dueDate: "", scheduledAt: "", durationMinutes: 0, totalMarks: 0,
  allowRetake: false, isActive: true, isMcq: false, questions: [],
};

const emptyNotice: Notice = { title: "", message: "", priority: "normal", publishAt: "", isActive: true };
const emptyFaculty: Faculty = { name: "", email: "", phone: "", role: "Faculty", bio: "" };

const emptyBatch: Batch = {
  name: "", code: "", courseId: "", courseName: "", startDate: "",
  description: "", isActive: true, inactiveAfterDays: 5,
  tests: [], assignments: [], notices: [], faculty: [], materials: [],
};

type ContentCategory = "video" | "pdf" | "study-material" | "assignment";

type InventoryItem = {
  _id: string;
  courseId: string;
  courseName: string;
  batchId: string;
  batchName: string;
  fileType: ContentCategory;
  fileName: string;
  folderPath: string;
  sharePointItemId?: string;
  url?: string;
  webUrl?: string;
  uploadedAt?: string;
  createdAt?: string;
};

type UploadDuplicateState = {
  file: File;
  category: ContentCategory;
  items: InventoryItem[];
};

type PickerDuplicateState = {
  file: any;
  category: ContentCategory;
  items: InventoryItem[];
};

const contentCategories: Array<{
  key: ContentCategory;
  label: string;
  folder: string;
  icon: LucideIcon;
  accept: string;
  pickerType: "video" | "pdf" | "all";
}> = [
  {
    key: "video",
    label: "Videos",
    folder: "Videos",
    icon: Video,
    accept: "video/*",
    pickerType: "video",
  },
  {
    key: "pdf",
    label: "PDFs",
    folder: "PDFs",
    icon: FileText,
    accept: "application/pdf",
    pickerType: "pdf",
  },
  {
    key: "study-material",
    label: "Study Materials",
    folder: "Study Materials",
    icon: BookOpen,
    accept:
      ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pickerType: "all",
  },
  {
    key: "assignment",
    label: "Assignment Files",
    folder: "Assignments",
    icon: FolderOpen,
    accept:
      ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pickerType: "all",
  },
];

export default function BatchesPage() {
  const [user, setUser] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState<Batch>(emptyBatch);
  const [selectedId, setSelectedId] = useState("");
  const batchListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = batchListRef.current;
    const selected = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (list && selected) {
      const offset = selected.getBoundingClientRect().top - list.getBoundingClientRect().top;
      if (offset < 0 || offset + selected.offsetHeight > list.clientHeight) list.scrollTo({ top: list.scrollTop + offset, behavior: "smooth" });
    }
  }, [selectedId]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batchStudents, setBatchStudents] = useState<{
    activeStudents: BatchStudent[];
    inactiveStudents: BatchStudent[];
  }>({ activeStudents: [], inactiveStudents: [] });
  const [studentSearch, setStudentSearch] = useState("");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showNewBatchModal, setShowNewBatchModal] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchCourseId, setNewBatchCourseId] = useState("");
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [legacyMaterials, setLegacyMaterials] = useState<BatchMaterial[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<ContentCategory | "">("");
  const [contentMessage, setContentMessage] = useState("");
  const [contentError, setContentError] = useState("");
  const [uploadDuplicate, setUploadDuplicate] = useState<UploadDuplicateState | null>(null);
  const [pickerDuplicate, setPickerDuplicate] = useState<PickerDuplicateState | null>(null);
  const [sharePointPicker, setSharePointPicker] = useState<{
    category: ContentCategory;
    title: string;
    folder: string;
    pickerType: "video" | "pdf" | "all";
  } | null>(null);
  const [sharePointFiles, setSharePointFiles] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "tests" | "assignments" | "notices" | "faculty" | "students" | "settings">("content");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const sessionToken = localStorage.getItem("sessionToken");
    const deviceId = localStorage.getItem("deviceId");
    if (!storedUser || !sessionToken || !deviceId) { window.location.href = "/login"; return; }
    const parsed = JSON.parse(storedUser);
    if (parsed.role !== "admin") { window.location.href = "/"; return; }
    setUser(parsed);
    loadAll(parsed);
    loadCourses(parsed);
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
      const [enrollmentRes, batchRes] = await Promise.all([
        fetch("/api/enrollments", { cache: "no-store" }),
        fetch(`/api/batches?${params.toString()}`, { cache: "no-store" }),
      ]);
      const enrollmentData = await enrollmentRes.json();
      const batchData = await batchRes.json();
      if (enrollmentData.success) setEnrollments(enrollmentData.enrollments || []);
      if (batchData.success) setBatches((batchData.batches || []).map(normalizeBatch));
    } catch (error) { console.log(error); }
    finally { setLoading(false); }
  };

  const loadCourses = async (activeUser = user) => {
    try {
      const params = authParams(activeUser);
      params.set("includeProtected", "1");
      const res = await fetch(`/api/courses?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setCourses(data.courses || []);
    } catch (error) { console.log(error); }
  };

  // Group batches by course
  const groupedByCourse = useMemo(() => {
    const groups = new Map<string, { courseId: string; courseName: string; batches: Batch[] }>();
    batches.forEach((batch) => {
      const key = batch.courseId || "__no_course__";
      if (!groups.has(key)) {
        groups.set(key, { courseId: batch.courseId, courseName: batch.courseName || "No Course", batches: [] });
      }
      groups.get(key)!.batches.push(batch);
    });
    return Array.from(groups.values()).sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [batches]);

  const filteredBatches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return batches
      .filter((b) => {
        if (courseFilter && b.courseId !== courseFilter) return false;
        if (!needle) return true;
        return [b.name, b.code, b.courseName]
          .filter(Boolean).join(" ").toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [batches, search, courseFilter]);

  const selectedBatch = useMemo(() => batches.find((b) => b._id === selectedId), [batches, selectedId]);

  const availableStudents = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    // Students not assigned to the currently selected batch
    return enrollments
      .filter((item) => (item.learningMode || "recorded") === "live")
      .filter((item) => item.batchId !== selectedId && item.batchName !== form.name)
      .filter((item) => {
        if (!needle) return true;
        return [item.name, item.email, item.courseName].filter(Boolean).join(" ").toLowerCase().includes(needle);
      });
  }, [enrollments, selectedId, form.name, studentSearch]);

  const inventoryCount = inventory.length;

  const inventoryByCategory = useMemo(() => {
    return contentCategories.reduce<Record<ContentCategory, InventoryItem[]>>((acc, category) => {
      acc[category.key] = inventory.filter((item) => item.fileType === category.key);
      return acc;
    }, {} as Record<ContentCategory, InventoryItem[]>);
  }, [inventory]);

  const makeInventoryQuery = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });
    return searchParams.toString();
  };

  const buildStructuredFolder = (category: ContentCategory) => {
    return buildStructuredSharePointFolderPath({
      courseName: form.courseName,
      batchName: form.name,
      category,
    });
  };

  const loadInventory = async (batchId = form._id, courseId = form.courseId) => {
    if (!batchId || !courseId) {
      setInventory([]);
      return;
    }

    try {
      setInventoryLoading(true);
      setContentError("");
      const params = makeInventoryQuery({
        ...Object.fromEntries(authParams().entries()),
        courseId,
        batchId,
      });
      const res = await fetch(`/api/admin/content-inventory?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load content inventory");
      }
      setInventory(data.inventory || []);
    } catch (error: any) {
      setContentError(error.message || "Failed to load content inventory");
      setInventory([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  const checkUploadDuplicate = async (file: File, category: ContentCategory) => {
    const params = makeInventoryQuery({
      ...Object.fromEntries(authParams().entries()),
      courseId: form.courseId,
      batchId: form._id || "",
      fileType: category,
      fileName: file.name,
    });
    const res = await fetch(`/api/admin/content-inventory?${params}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to check duplicate file");
    }
    return {
      duplicate: Boolean(data.duplicate),
      items: data.duplicateItems || [],
    };
  };

  const uploadInventoryFile = async (file: File, category: ContentCategory, replaceExisting = false) => {
    if (!form._id || !form.courseId || !form.courseName || !form.name) {
      alert("Save this batch with a linked course before uploading content.");
      return;
    }

    try {
      setUploadingCategory(category);
      setContentError("");
      setContentMessage("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", form.courseId);
      formData.append("courseName", form.courseName);
      formData.append("batchId", form._id);
      formData.append("batchName", form.name);
      formData.append("contentCategory", category);
      formData.append("folder", "finops/courses");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      setContentMessage(
        data.duplicate || replaceExisting
          ? "Existing inventory entry replaced successfully."
          : "File uploaded successfully."
      );
      setUploadDuplicate(null);
      await loadInventory();
    } catch (error: any) {
      setContentError(error.message || "Upload failed");
    } finally {
      setUploadingCategory("");
    }
  };

  const handleInventoryFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    category: ContentCategory
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!form._id || !form.courseId) {
      setContentError("Save this batch with a linked course before uploading content.");
      return;
    }

    try {
      setContentMessage("");
      setContentError("");
      const duplicateResult = await checkUploadDuplicate(file, category);
      if (duplicateResult.duplicate) {
        setUploadDuplicate({ file, category, items: duplicateResult.items });
        return;
      }
      await uploadInventoryFile(file, category);
    } catch (error: any) {
      setContentError(error.message || "Upload failed");
    }
  };

  const openSharePointPicker = async (category: ContentCategory) => {
    if (!form._id || !form.courseId || !form.courseName || !form.name) {
      alert("Save this batch with a linked course before selecting SharePoint content.");
      return;
    }

    const config = contentCategories.find((item) => item.key === category);
    if (!config) return;

    const folder = buildStructuredFolder(category);
    if (!folder) {
      alert("Could not resolve the SharePoint folder for this batch.");
      return;
    }

    try {
      setSharePointPicker({
        category,
        title: `Select ${config.label} from SharePoint`,
        folder,
        pickerType: config.pickerType,
      });
      setPickerLoading(true);
      setSharePointFiles([]);
      const params = new URLSearchParams({ folder, type: config.pickerType });
      const res = await fetch(`/api/sharepoint-picker?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "SharePoint files could not be loaded");
      }
      setSharePointFiles(data.files || []);
    } catch (error: any) {
      alert(error.message || "SharePoint picker failed");
      setSharePointPicker(null);
    } finally {
      setPickerLoading(false);
    }
  };

  const registerSharePointFile = async (
    file: any,
    category: ContentCategory,
    replaceExisting = false
  ) => {
    if (!form._id || !form.courseId) return;

    const folderPath = buildStructuredFolder(category);
    const body = {
      userId: user?._id,
      sessionToken: localStorage.getItem("sessionToken"),
      deviceId: localStorage.getItem("deviceId"),
      courseId: form.courseId,
      courseName: form.courseName,
      batchId: form._id,
      batchName: form.name,
      fileType: category,
      fileName: file.name,
      folderPath,
      sharePointItemId: file.id || extractSharePointParam(file.url, "itemId"),
      sharePointDriveId: extractSharePointParam(file.url, "driveId"),
      url: file.url,
      webUrl: file.webUrl || "",
      replaceExisting,
    };

    const res = await fetch("/api/admin/content-inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.status === 409 && data.duplicate) {
      setPickerDuplicate({ file, category, items: data.duplicateItems || [] });
      return;
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to register SharePoint file");
    }

    setContentMessage(
      data.replaced ? "Existing inventory entry replaced successfully." : "SharePoint file registered successfully."
    );
    setPickerDuplicate(null);
    setSharePointPicker(null);
    await loadInventory();
  };

  const selectBatch = (batch: Batch) => {
    const normalized = normalizeBatch(batch);
    setSelectedId(normalized._id || "");
    setForm(normalized);
    setLegacyMaterials(normalized.materials || []);
    setActiveTab("content");
    if (normalized._id) {
      loadBatchStudents(normalized._id);
      loadSubmissions(normalized._id);
      loadInventory(normalized._id, normalized.courseId);
    } else {
      setInventory([]);
    }
  };

  const createNewBatch = async () => {
    if (!newBatchName.trim()) { alert("Batch name is required"); return; }
    try {
      setCreatingBatch(true);
      const selectedCourse = courses.find((c) => c._id === newBatchCourseId);
      const body = {
        name: newBatchName.trim(),
        courseId: newBatchCourseId,
        courseName: selectedCourse?.title || "",
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
      };
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message || "Failed to create batch"); return; }
      setShowNewBatchModal(false);
      setNewBatchName("");
      setNewBatchCourseId("");
      await loadAll();
      selectBatch(normalizeBatch(data.batch));
    } catch (error) { console.log(error); alert("Failed to create batch"); }
    finally { setCreatingBatch(false); }
  };

  const saveBatch = async () => {
    if (!form.name.trim()) { alert("Batch name is required"); return; }
    try {
      setSaving(true);
      const { materials: _legacyMaterials, ...batchWithoutMaterials } = form;
      const body = {
        ...batchWithoutMaterials,
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
      };
      const res = await fetch(form._id ? `/api/batches/${form._id}` : "/api/batches", {
        method: form._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { alert(data.message || "Unable to save batch"); return; }
      const saved = normalizeBatch(data.batch);
      setSelectedId(saved._id || "");
      setForm(saved);
      setLegacyMaterials(saved.materials || []);
      await loadAll();
      if (saved._id) {
        await loadBatchStudents(saved._id);
        await loadSubmissions(saved._id);
        await loadInventory(saved._id, saved.courseId);
      }
    } catch (error) { console.log(error); alert("Unable to save batch"); }
    finally { setSaving(false); }
  };

  const deleteBatch = async () => {
    if (!form._id || !confirm(`Delete batch "${form.name}"?\n\nThis will:\n- Remove the batch permanently\n- Unassign all students from this batch\n\nOther batches and courses will not be affected.`)) return;
    const params = authParams();
    const res = await fetch(`/api/batches/${form._id}?${params.toString()}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      setForm(emptyBatch);
      setSelectedId("");
      await loadAll();
    } else {
      alert(data.message || "Failed to delete batch");
    }
  };

  const loadBatchStudents = async (batchId = form._id) => {
    if (!batchId) { setBatchStudents({ activeStudents: [], inactiveStudents: [] }); return; }
    try {
      const params = authParams();
      const res = await fetch(`/api/batches/${batchId}/students?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setBatchStudents({
          activeStudents: data.activeStudents || [],
          inactiveStudents: data.inactiveStudents || [],
        });
      }
    } catch (error) { console.log(error); }
  };

  const loadSubmissions = async (batchId = form._id) => {
    if (!batchId) { setSubmissions([]); return; }
    const params = authParams();
    params.set("batchId", batchId);
    const res = await fetch(`/api/batch-submissions?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setSubmissions(data.submissions || []);
  };

  const assignStudentToBatch = async (enrollment: Enrollment) => {
    if ((enrollment.learningMode || "recorded") !== "live") { alert("Recorded students do not need a batch"); return; }
    if (!form._id) { alert("Save the batch first before assigning students"); return; }
    const res = await fetch(`/api/enrollments/${enrollment._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchName: form.name,
        batchId: form._id,
        status: enrollment.status || "enrolled",
        batchBlocked: false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await loadAll();
      await loadBatchStudents();
    } else {
      alert(data.message || "Unable to add student");
    }
  };

  const removeStudentFromBatch = async (student: BatchStudent) => {
    if (!confirm(`Remove ${student.name || "this student"} from batch?`)) return;
    const res = await fetch(`/api/enrollments/${student._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchName: "",
        batchId: "",
        status: student.status || "enrolled",
        batchBlocked: false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await loadAll();
      await loadBatchStudents();
    } else {
      alert(data.message || "Unable to remove student");
    }
  };

  const moveStudentToBatch = async (student: BatchStudent, targetBatchId: string) => {
    const targetBatch = batches.find((b) => b._id === targetBatchId);
    if (!targetBatch) return;
    const res = await fetch(`/api/enrollments/${student._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchName: targetBatch.name,
        batchId: targetBatch._id,
        status: student.status || "enrolled",
        batchBlocked: false,
      }),
    });
    const data = await res.json();
    if (data.success) {
      await loadAll();
      await loadBatchStudents();
    } else {
      alert(data.message || "Unable to move student");
    }
  };

  const setStudentBlocked = async (student: BatchStudent, blocked: boolean) => {
    const res = await fetch(`/api/enrollments/${student._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchName: form.name,
        batchId: form._id,
        status: student.status || "enrolled",
        batchBlocked: blocked,
        batchBlockReason: blocked ? "Blocked by admin from batch" : "",
      }),
    });
    const data = await res.json();
    if (data.success) {
      await loadAll();
      await loadBatchStudents();
    } else {
      alert(data.message || "Unable to update student");
    }
  };

  const downloadBatchStudents = (type: "active" | "inactive") => {
    if (!form._id) { alert("Save this batch first"); return; }
    const params = authParams();
    params.set("format", "excel");
    params.set("type", type);
    window.location.href = `/api/batches/${form._id}/students?${params.toString()}`;
  };

  const downloadSubmissionRecords = () => {
    if (!form._id) { alert("Save this batch first"); return; }
    const params = authParams();
    params.set("batchId", form._id);
    params.set("format", "excel");
    window.location.href = `/api/batch-submissions?${params.toString()}`;
  };

  const reviewSubmission = async (submission: any, marksAwarded: string, remarks: string, adminComment: string, adminFeedback: string, isPublished: boolean) => {
    const res = await fetch(`/api/batch-submissions/${submission._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
        marksAwarded,
        remarks,
        adminComment,
        adminFeedback,
        isPublished,
      }),
    });
    const data = await res.json();
    if (data.success) { await loadSubmissions(); }
    else { alert(data.message || "Unable to save marks"); }
  };

  const uploadFile = async (file: File, section: "tests" | "assignments", index: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", `finops/batches/${form.code || form.name}/${section}`);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) { updateArray(section, index, "fileUrl", data.url); }
    else { alert(data.message || "Upload failed"); }
  };

  const uploadAnswerSheet = async (file: File, section: "tests" | "assignments", index: number) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", `finops/batches/${form.code || form.name}/${section}/answers`);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) { updateArray(section, index, "answerSheetUrl", data.url); }
    else { alert(data.message || "Answer sheet upload failed"); }
  };

  const addArray = (key: "tests" | "assignments" | "notices" | "faculty") => {
    const next =
      key === "notices" ? emptyNotice :
      key === "faculty" ? emptyFaculty :
      emptyResource;
    setForm({ ...form, [key]: [...(form as any)[key], { ...next }] });
  };

  const updateArray = (key: string, index: number, field: string, value: any) => {
    const next = [...((form as any)[key] || [])];
    next[index] = { ...next[index], [field]: value };
    setForm({ ...form, [key]: next } as Batch);
  };

  const removeArray = (key: string, index: number) => {
    const next = [...((form as any)[key] || [])];
    next.splice(index, 1);
    setForm({ ...form, [key]: next } as Batch);
  };

  const totalStudents = batchStudents.activeStudents.length + batchStudents.inactiveStudents.length;

  useEffect(() => {
    if (form._id && form.courseId) {
      loadInventory(form._id, form.courseId);
    }
  }, [form._id, form.courseId]);

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex">
      {/* Sidebar */}


      <main className="flex-1 min-w-0  p-4 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#4d8bff]">Batch Management System</p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mt-2">Batches</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Manage your batches, students, and learning resources in one place.
            </p>
          </div>
          <button
            onClick={() => setShowNewBatchModal(true)}
            className="bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] hover:bg-blue-600 transition text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-3 w-fit"
          >
            <Plus size={20} />
            New Batch
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard title="Total Batches" value={batches.length} />
          <StatCard title="Courses with Batches" value={groupedByCourse.length} />
          <StatCard title="Total Tests" value={batches.reduce((s, b) => s + b.tests.length, 0)} />
          <StatCard title="Total Assignments" value={batches.reduce((s, b) => s + b.assignments.length, 0)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 items-start">
          {/* Left Panel: Batch List */}
          <section className="space-y-3 lg:sticky lg:top-6">
            <div className="flex items-center justify-between px-1"><h2 className="text-sm font-semibold text-slate-700">Your batches</h2><span className="rounded-full bg-slate-200/60 px-2 py-0.5 text-xs text-slate-600">{filteredBatches.length}</span></div>
            {/* Search and Filter */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search batches..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full outline-none text-black placeholder:text-gray-400 bg-transparent text-sm"
                />
              </div>
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full text-sm outline-none border border-gray-200 rounded-xl px-3 py-2 text-gray-700"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="bg-white rounded-3xl border border-gray-200 p-10 text-center text-gray-500">Loading batches...</div>
            ) : filteredBatches.length > 0 ? (
              <div ref={batchListRef} className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                {filteredBatches.map((batch) => {
                  const studentCount = enrollments.filter(
                    (e) => (e.learningMode || "recorded") === "live" && (e.batchId === batch._id || (e.batchName === batch.name && !e.batchId))
                  ).length;
                  return (
                    <button
                      key={batch._id}
                      onClick={() => selectBatch(batch)}
                      aria-current={selectedId === batch._id ? "true" : undefined}
                      className={`w-full text-left rounded-xl border p-4 transition focus-visible:outline-2 focus-visible:outline-blue-600 ${
                        selectedId === batch._id
                          ? "bg-blue-50 border-blue-400 text-slate-900 ring-1 ring-blue-100"
                          : "bg-white border-gray-200 text-gray-900 hover:border-blue-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 break-words text-base font-semibold leading-6">{batch.name}</h3>
                        <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (batch.isActive ? "bg-emerald-500" : "bg-slate-300")} title={batch.isActive ? "Active" : "Hidden"} />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{batch.courseName || "No course"}</p>
                      <p className="mt-2 break-all font-mono text-[11px] tracking-wide text-slate-500">{batch.code || "Draft"}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3 text-xs text-slate-600"><span>{studentCount} {studentCount === 1 ? "student" : "students"}</span><span className={selectedId === batch._id ? "font-semibold text-blue-700" : "text-slate-500"}>{selectedId === batch._id ? "Selected" : batch.isActive ? "Active" : "Hidden"}</span></div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-10 text-center">
                <Briefcase className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500">No batches found.</p>
                <button
                  onClick={() => setShowNewBatchModal(true)}
                  className="mt-4 bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-5 py-2 rounded-xl font-semibold text-sm"
                >
                  Create First Batch
                </button>
              </div>
            )}
          </section>

          {/* Right Panel: Batch Detail */}
          <section className="min-w-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {selectedBatch ? (
              <>
                {/* Batch Header */}
                <div className="bg-white text-slate-900 p-5 border-b border-slate-100">
                  <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <p className="text-[#4d8bff] text-xs font-black uppercase tracking-[0.3em]">
                        {form.courseName || "Batch Detail"}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">{form.name}</h2>
                      <p className="text-slate-500 mt-2 text-sm">
                        {totalStudents} {totalStudents === 1 ? "student" : "students"} · {form.isActive ? "Visible to students" : "Hidden from students"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {JSON.stringify(form) !== JSON.stringify(selectedBatch) && <span className="text-xs font-medium text-amber-700">Unsaved changes</span>}
                      <button
                        onClick={saveBatch}
                        disabled={saving || JSON.stringify(form) === JSON.stringify(selectedBatch)}
                        className="text-white bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] hover:bg-blue-400 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
                      >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save changes"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-100 px-6">
                  <div className="flex flex-wrap gap-x-1">
                    {[
                      { key: "content", label: "Content", count: null, icon: <Package size={15} /> },
                      { key: "students", label: "Students", count: totalStudents, icon: <Users size={15} /> },
                      { key: "tests", label: "Tests", count: form.tests.length, icon: <GraduationCap size={15} /> },
                      { key: "assignments", label: "Assignments", count: form.assignments.length, icon: <FileText size={15} /> },
                      { key: "notices", label: "Notices", count: form.notices.length, icon: <Megaphone size={15} /> },
                      { key: "settings", label: "Settings", count: null, icon: <Settings size={15} /> },
                      { key: "faculty", label: "Faculty", count: form.faculty.length, icon: <UserCog size={15} /> },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`flex items-center gap-2 px-3 py-3 text-sm font-semibold border-b-2 transition whitespace-nowrap ${
                          activeTab === tab.key
                            ? "border-blue-500 text-[#4d8bff]"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {tab.icon}
                        {tab.label}
                        {tab.count !== null && <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.key ? "bg-blue-100 text-[#4d8bff]" : "bg-gray-100 text-gray-500"}`}>
                          {tab.count}
                        </span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 lg:p-6">
{activeTab === "settings" && (
                <div className="space-y-6"><div><h3 className="text-xl font-bold">Batch settings</h3><p className="mt-1 text-sm text-slate-500">Manage general details and student access.</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Batch name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" /></Field>
<Field label="Batch Code">
                      <input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                        className="field"
                      />
                    </Field>
                    <Field label="Start Date">
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="field"
                      />
                    </Field>
                    <Field label="Course">
                      <select
                        value={form.courseId}
                        onChange={(e) => {
                          const c = courses.find((c) => c._id === e.target.value);
                          setForm({ ...form, courseId: e.target.value, courseName: c?.title || "" });
                        }}
                        className="field"
                      >
                        <option value="">-- Select Course --</option>
                        {courses.map((c) => (
                          <option key={c._id} value={c._id}>{c.title}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Visible">
                      <select
                        value={form.isActive ? "yes" : "no"}
                        onChange={(e) => setForm({ ...form, isActive: e.target.value === "yes" })}
                        className="field"
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </Field>
                    <Field label="Inactive After Days">
                      <input
                        type="number" min="1"
                        value={form.inactiveAfterDays}
                        onChange={(e) => setForm({ ...form, inactiveAfterDays: Math.max(1, Number(e.target.value) || 1) })}
                        className="field"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Description">
                        <input
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="field"
                          placeholder="Batch description..."
                        />
                      </Field>
                    </div>
                  </div>
<div className="rounded-xl border border-red-200 p-5"><h3 className="font-semibold text-red-700">Delete batch</h3><p className="mt-1 mb-4 text-sm text-slate-600">Permanently remove this batch. Review carefully before continuing.</p><button onClick={deleteBatch} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700">Delete batch</button></div></div>

)}
                  {activeTab === "content" && (
                    <div className="space-y-6">
                      {!form._id || !form.courseId ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          Save this batch with a linked course before uploading learning content.
                        </div>
                      ) : null}

                      {contentMessage ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                          {contentMessage}
                        </div>
                      ) : null}

                      {contentError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                          {contentError}
                        </div>
                      ) : null}

                      {uploadDuplicate ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-3">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                              <div>
                                <p className="font-semibold">This file already exists in this batch.</p>
                                <p className="mt-1 text-sm text-amber-800">
                                  {uploadDuplicate.file.name} matches an existing inventory item.
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setUploadDuplicate(null)}
                                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
                              >
                                Cancel Upload
                              </button>
                              <button
                                type="button"
                                onClick={() => uploadInventoryFile(uploadDuplicate.file, uploadDuplicate.category, true)}
                                disabled={Boolean(uploadingCategory)}
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                Replace Existing File
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {pickerDuplicate ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex gap-3">
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                              <div>
                                <p className="font-semibold">This SharePoint file is already registered.</p>
                                <p className="mt-1 text-sm text-amber-800">{pickerDuplicate.file.name}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setPickerDuplicate(null)}
                                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  registerSharePointFile(
                                    pickerDuplicate.file,
                                    pickerDuplicate.category,
                                    true
                                  ).catch((error: any) => setContentError(error.message || "Failed to register file"))
                                }
                                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                              >
                                Replace Existing File
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {form._id && form.courseId && <S3UploadPanel key={form._id + form.courseId} courseId={form.courseId} batchId={form._id} library />}
                      {inventory.length > 0 && <details className="rounded-xl border p-4 text-sm"><summary>Existing SharePoint files ({inventory.length})</summary>{inventory.map(item => <p key={item._id} className="py-2">{item.fileName}</p>)}</details>}

                      <LegacyBatchContentReadOnly materials={legacyMaterials} />
                    </div>
                  )}

                  {activeTab === "students" && (
                    <StudentsTab
                      activeStudents={batchStudents.activeStudents}
                      inactiveStudents={batchStudents.inactiveStudents}
                      availableStudents={availableStudents}
                      studentSearch={studentSearch}
                      onStudentSearch={setStudentSearch}
                      onAssign={assignStudentToBatch}
                      onBlock={setStudentBlocked}
                      onRemove={removeStudentFromBatch}
                      onMove={moveStudentToBatch}
                      onDownload={downloadBatchStudents}
                      saved={Boolean(form._id)}
                      otherBatches={batches.filter((b) => b._id !== form._id)}
                    />
                  )}

                  {activeTab === "tests" && (
                    <ResourceEditor
                      title="Tests"
                      icon={<GraduationCap size={22} />}
                      items={form.tests}
                      onAdd={() => addArray("tests")}
                      onChange={(index, field, value) => updateArray("tests", index, field, value)}
                      onRemove={(index) => removeArray("tests", index)}
                      onUpload={(file, index) => uploadFile(file, "tests", index)}
                      onAnswerUpload={(file, index) => uploadAnswerSheet(file, "tests", index)}
                      submissions={submissions}
                      resourceType="test"
                      onReview={reviewSubmission}
                      onDownloadRecords={downloadSubmissionRecords}
                      scheduleLabel="Test Date"
                      buttonText="Create Test"
                      allBatches={batches}
                      currentBatchId={selectedId}
                      authParams={authParams}
                    />
                  )}

                  {activeTab === "assignments" && (
                    <ResourceEditor
                      title="Assignments"
                      icon={<FileText size={22} />}
                      items={form.assignments}
                      onAdd={() => addArray("assignments")}
                      onChange={(index, field, value) => updateArray("assignments", index, field, value)}
                      onRemove={(index) => removeArray("assignments", index)}
                      onUpload={(file, index) => uploadFile(file, "assignments", index)}
                      onAnswerUpload={(file, index) => uploadAnswerSheet(file, "assignments", index)}
                      submissions={submissions}
                      resourceType="assignment"
                      onReview={reviewSubmission}
                      onDownloadRecords={downloadSubmissionRecords}
                      scheduleLabel="Assign Date"
                      buttonText="Add Assignment"
                    />
                  )}

                  {activeTab === "notices" && (
                    <NoticeEditor
                      notices={form.notices}
                      onAdd={() => addArray("notices")}
                      onChange={(index, field, value) => updateArray("notices", index, field, value)}
                      onRemove={(index) => removeArray("notices", index)}
                    />
                  )}

                  {activeTab === "faculty" && (
                    <FacultyEditor
                      faculty={form.faculty}
                      onAdd={() => addArray("faculty")}
                      onChange={(index, field, value) => updateArray("faculty", index, field, value)}
                      onRemove={(index) => removeArray("faculty", index)}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="p-16 text-center">
                <Briefcase className="mx-auto text-blue-500" size={64} />
                <h2 className="text-3xl font-bold text-gray-900 mt-6">Select a batch</h2>
                <p className="text-gray-500 mt-3">Click any batch to manage its content, students, tests, assignments, and more.</p>
                <button
                  onClick={() => setShowNewBatchModal(true)}
                  className="mt-6 bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 mx-auto"
                >
                  <Plus size={18} />
                  Create New Batch
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* New Batch Modal */}
      {showNewBatchModal && (
        <div className="fixed inset-0 bg-[#0f172a]/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create New Batch</h2>
              <button onClick={() => setShowNewBatchModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Batch Name">
                <input
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. Data Science Batch 1"
                  className="field"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && createNewBatch()}
                />
              </Field>
              <Field label="Course (optional)">
                <select
                  value={newBatchCourseId}
                  onChange={(e) => setNewBatchCourseId(e.target.value)}
                  className="field"
                >
                  <option value="">-- No course --</option>
                  {courses.map((c) => (
                    <option key={c._id} value={c._id}>{c.title}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                Multiple batches can belong to the same course. Each batch has its own students and content with isolated access control.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewBatchModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-2xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={createNewBatch}
                disabled={creatingBatch}
                className="flex-1 bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white py-3 rounded-2xl font-black disabled:bg-blue-300"
              >
                {creatingBatch ? "Creating..." : "Create Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SharePoint Picker Modal */}
      {sharePointPicker && (
        <div className="fixed inset-0 bg-[#0f172a]/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{sharePointPicker.title}</h2>
                <p className="text-sm text-gray-500 mt-1">{sharePointPicker.folder}</p>
              </div>
              <button onClick={() => setSharePointPicker(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {pickerLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading SharePoint files...
                </div>
              ) : sharePointFiles.length > 0 ? (
                <div className="space-y-2">
                  {sharePointFiles.map((file) => (
                    <button
                      key={file.id || file.url}
                      type="button"
                      onClick={() =>
                        registerSharePointFile(file, sharePointPicker.category).catch((error: any) =>
                          setContentError(error.message || "Failed to register SharePoint file")
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
                    >
                      <span className="text-sm font-medium text-gray-800">{file.name}</span>
                      <ExternalLink size={16} className="text-blue-500 flex-none" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-10">No SharePoint files found in this folder.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatInventoryDate(value?: string) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function LegacyBatchContentReadOnly({ materials }: { materials: BatchMaterial[] }) {
  const activeItems = (materials || []).filter((item) => item.isActive !== false);
  if (!activeItems.length) return null;

  const groups = [
    { key: "video", label: "Videos", icon: <Film size={16} className="text-blue-500" /> },
    { key: "pdf", label: "PDFs", icon: <FileText size={16} className="text-red-500" /> },
    { key: "material", label: "Study Materials", icon: <Package size={16} className="text-purple-500" /> },
    { key: "sharepoint", label: "SharePoint Links", icon: <ExternalLink size={16} className="text-blue-500" /> },
  ];

  return (
    <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-5">
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Legacy Batch Content</p>
        <h2 className="text-lg font-bold text-gray-900 mt-1">Read Only</h2>
        <p className="text-sm text-gray-500 mt-1">
          These items were added before batch content inventory. Students can still access them until migrated.
        </p>
      </div>
      <div className="space-y-4">
        {groups.map((group) => {
          const items = activeItems.filter((item) => item.type === group.key);
          if (!items.length) return null;
          return (
            <div key={group.key}>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                {group.icon}
                {group.label} ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={`${group.key}-${index}`} className="rounded-xl border border-gray-200 bg-white p-3">
                    <p className="text-sm font-medium text-gray-900">{item.name || "Untitled"}</p>
                    {item.sourceType && item.sourceType !== "upload" ? (
                      <p className="text-xs text-gray-400 mt-1">
                        Source: {item.sourceType.replace("course_", "Course ")}
                      </p>
                    ) : null}
                    {(item.webUrl || item.url) ? (
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
    </section>
  );
}

// ===================== STUDENTS TAB =====================
function StudentsTab({
  activeStudents,
  inactiveStudents,
  availableStudents,
  studentSearch,
  onStudentSearch,
  onAssign,
  onBlock,
  onRemove,
  onMove,
  onDownload,
  saved,
  otherBatches,
}: {
  activeStudents: BatchStudent[];
  inactiveStudents: BatchStudent[];
  availableStudents: Enrollment[];
  studentSearch: string;
  onStudentSearch: (v: string) => void;
  onAssign: (student: Enrollment) => void;
  onBlock: (student: BatchStudent, blocked: boolean) => void;
  onRemove: (student: BatchStudent) => void;
  onMove: (student: BatchStudent, batchId: string) => void;
  onDownload: (type: "active" | "inactive") => void;
  saved: boolean;
  otherBatches: Batch[];
}) {
  return (
    <div className="space-y-6">
      {/* Current Students */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <StudentBucket
          title="Active Students"
          students={activeStudents}
          empty="No active students."
          action={
            <button onClick={() => onDownload("active")} className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              <Download size={13} /> Excel
            </button>
          }
          onBlock={onBlock}
          onRemove={onRemove}
          onMove={onMove}
          otherBatches={otherBatches}
        />
        <StudentBucket
          title="Inactive / Blocked"
          students={inactiveStudents}
          empty="No inactive students."
          action={
            <button onClick={() => onDownload("inactive")} className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
              <Download size={13} /> Excel
            </button>
          }
          onBlock={onBlock}
          onRemove={onRemove}
          onMove={onMove}
          otherBatches={otherBatches}
        />
      </div>

      {/* Add Students */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Assign Students to Batch</h3>
            <p className="text-sm text-gray-500 mt-1">Pick enrolled students and assign them to this batch.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
            <Search size={16} className="text-gray-400" />
            <input
              value={studentSearch}
              onChange={(e) => onStudentSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full bg-transparent outline-none text-sm text-black placeholder:text-gray-400"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {availableStudents.length > 0 ? (
            availableStudents.map((student) => (
              <div key={student._id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 truncate text-sm">{student.name || "Unknown"}</h4>
                    <p className="text-xs text-gray-500 break-all">{student.email}</p>
                    <p className="text-xs text-gray-600 mt-1">{student.courseName || student.courseId || "No course"}</p>
                    {student.batchName && (
                      <p className="text-xs font-bold text-amber-700 mt-1">Current: {student.batchName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onAssign(student)}
                    className="flex-none flex items-center gap-1 bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600"
                  >
                    <UserPlus size={13} /> Add
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="xl:col-span-2 text-center text-gray-500 text-sm py-8 border border-dashed border-gray-300 rounded-xl">
              No available students to add.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentBucket({
  title, students, empty, action, onBlock, onRemove, onMove, otherBatches,
}: {
  title: string;
  students: BatchStudent[];
  empty: string;
  action: React.ReactNode;
  onBlock: (student: BatchStudent, blocked: boolean) => void;
  onRemove: (student: BatchStudent) => void;
  onMove: (student: BatchStudent, batchId: string) => void;
  otherBatches: Batch[];
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-black text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{students.length} student(s)</p>
        </div>
        {action}
      </div>
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
        {students.length > 0 ? (
          students.map((student) => (
            <div key={student._id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-gray-900 text-sm">{student.name || "Unknown"}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      student.batchBlocked ? "bg-red-100 text-red-700" :
                      student.activityStatus === "Active" ? "bg-emerald-100 text-emerald-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {student.batchBlocked ? "Blocked" : student.activityStatus || "Active"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 break-all">{student.email}</p>
                  <p className="text-xs text-gray-400 mt-1">Last seen: {student.lastSeenAt || "N/A"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {student.batchBlocked ? (
                  <button onClick={() => onBlock(student, false)} className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                    <Unlock size={11} /> Unblock
                  </button>
                ) : (
                  <button onClick={() => onBlock(student, true)} className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-lg text-xs font-bold">
                    <Lock size={11} /> Block
                  </button>
                )}
                {otherBatches.length > 0 && (
                  <select
                    onChange={(e) => { if (e.target.value) { onMove(student, e.target.value); e.target.value = ""; } }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700"
                    defaultValue=""
                  >
                    <option value="" disabled>Move to...</option>
                    {otherBatches.map((b) => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <button onClick={() => onRemove(student)} className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-2.5 py-1.5 rounded-lg text-xs font-semibold ml-auto">
                  <X size={11} /> Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-gray-500 py-6 border border-dashed border-gray-300 rounded-xl">{empty}</div>
        )}
      </div>
    </div>
  );
}

// ===================== RESOURCE EDITOR =====================
function ResourceEditor({
  title, icon, items, onAdd, onChange, onRemove, onUpload, onAnswerUpload,
  submissions, resourceType, onReview, onDownloadRecords, scheduleLabel, buttonText,
  allBatches, currentBatchId, authParams,
}: {
  title: string; icon: React.ReactNode; items: Resource[];
  onAdd: () => void;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  onUpload: (file: File, index: number) => void;
  onAnswerUpload: (file: File, index: number) => void;
  submissions: any[]; resourceType: "test" | "assignment";
  onReview: (submission: any, marksAwarded: string, remarks: string, adminComment: string, adminFeedback: string, isPublished: boolean) => void;
  onDownloadRecords: () => void; scheduleLabel: string; buttonText: string;
  allBatches?: any[]; currentBatchId?: string; authParams?: () => URLSearchParams;
}) {
  const [shareModalTest, setShareModalTest] = useState<Resource | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 text-[#4d8bff] flex items-center justify-center">{icon}</div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onDownloadRecords} className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold">
            <Download size={15} /> Records
          </button>
          <button onClick={onAdd} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
            <Plus size={15} /> {buttonText}
          </button>
        </div>
      </div>

      {shareModalTest && currentBatchId && authParams && (
        <ShareTestModal
          test={shareModalTest}
          sourceBatchId={currentBatchId}
          allBatches={(allBatches || []).filter((b) => b._id !== currentBatchId)}
          authParams={authParams}
          onClose={() => setShareModalTest(null)}
        />
      )}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <input value={item.title} onChange={(e) => onChange(index, "title", e.target.value)} className="field" placeholder={`${title.slice(0, -1)} title`} />
              <input value={item.link} onChange={(e) => onChange(index, "link", e.target.value)} className="field" placeholder="External link" />
              <textarea rows={2} value={item.description} onChange={(e) => onChange(index, "description", e.target.value)} className="field xl:col-span-2" placeholder="Instructions" />
              <Field label={scheduleLabel}><input type="datetime-local" value={item.scheduledAt} onChange={(e) => onChange(index, "scheduledAt", e.target.value)} className="field" /></Field>
              <Field label="Due Date"><input type="datetime-local" value={item.dueDate} onChange={(e) => onChange(index, "dueDate", e.target.value)} className="field" /></Field>
              <Field label="Duration (mins)"><input type="number" value={item.durationMinutes} onChange={(e) => onChange(index, "durationMinutes", Number(e.target.value))} className="field" /></Field>
              <Field label="Total Marks"><input type="number" value={item.totalMarks} onChange={(e) => onChange(index, "totalMarks", Number(e.target.value))} className="field" /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <label className="bg-white border border-gray-200 text-gray-800 px-4 py-2 rounded-xl font-semibold cursor-pointer flex items-center gap-2 text-sm">
                <Upload size={14} /> Upload From PC
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f, index); }} />
              </label>
              <label className="bg-[#2563eb]/10 border border-[#2563eb]/30 text-blue-800 px-4 py-2 rounded-xl font-semibold cursor-pointer flex items-center gap-2 text-sm">
                <Upload size={14} /> Answer Sheet
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAnswerUpload(f, index); }} />
              </label>
              {item.fileUrl && <a href={item.fileUrl} target="_blank" className="text-sm text-[#4d8bff] font-semibold">View file</a>}
              {item.answerSheetUrl && <a href={item.answerSheetUrl} target="_blank" className="text-sm text-emerald-700 font-semibold">Answer sheet</a>}
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={item.allowRetake} onChange={(e) => onChange(index, "allowRetake", e.target.checked)} /> Allow retake
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={item.isActive} onChange={(e) => onChange(index, "isActive", e.target.checked)} /> Visible
              </label>
              {resourceType === "test" && (
                <label className="flex items-center gap-2 text-sm font-bold text-[#4d8bff] bg-[#2563eb]/10 px-3 py-1.5 rounded-xl border border-[#2563eb]/30">
                  <input type="checkbox" checked={item.isMcq} onChange={(e) => onChange(index, "isMcq", e.target.checked)} /> MCQ Auto-eval
                </label>
              )}
              {resourceType === "test" && item._id && (
                <button
                  onClick={() => setShareModalTest(item)}
                  className="flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-purple-100 transition-colors"
                >
                  <Share2 size={14} /> Share to Batches
                </button>
              )}
              <button onClick={() => onRemove(index)} className="ml-auto bg-red-50 text-red-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm">
                <Trash2 size={14} /> Delete
              </button>
            </div>

            {/* MCQ Question Editor */}
            {resourceType === "test" && item.isMcq && (
              <McqEditor
                questions={item.questions || []}
                onAdd={() => {
                  const next = [...(item.questions || []), { ...emptyMcqQuestion }];
                  onChange(index, "questions", next);
                }}
                onChangeQ={(qi, field, value) => {
                  const next = [...(item.questions || [])];
                  next[qi] = { ...next[qi], [field]: value };
                  onChange(index, "questions", next);
                }}
                onRemoveQ={(qi) => {
                  const next = [...(item.questions || [])];
                  next.splice(qi, 1);
                  onChange(index, "questions", next);
                }}
              />
            )}

            {item._id && (
              <SubmissionList
                submissions={submissions.filter(
                  (s) => s.resourceType === resourceType && String(s.resourceId) === String(item._id)
                )}
                onReview={onReview}
                testId={resourceType === "test" ? String(item._id) : undefined}
                authParams={authParams}
              />
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">Nothing added yet.</div>
        )}
      </div>
    </div>
  );
}

// ===================== SHARE TEST MODAL =====================
function ShareTestModal({
  test, sourceBatchId, allBatches, authParams, onClose,
}: {
  test: Resource;
  sourceBatchId: string;
  allBatches: any[];
  authParams: () => URLSearchParams;
  onClose: () => void;
}) {
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [courseFilter, setCourseFilter] = useState("");
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const courses = Array.from(new Set(allBatches.map((b) => b.courseName || "No Course"))).sort();

  const filteredBatches = allBatches.filter((b) =>
    !courseFilter || (b.courseName || "No Course") === courseFilter
  );

  const toggleBatch = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedBatchIds(filteredBatches.map((b) => b._id));
  const clearAll = () => setSelectedBatchIds([]);

  const share = async () => {
    if (selectedBatchIds.length === 0) { alert("Select at least one batch"); return; }
    setSharing(true);
    setResult(null);
    try {
      const params = authParams();
      const res = await fetch(`/api/batches/${sourceBatchId}/share-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: params.get("userId"),
          sessionToken: params.get("sessionToken"),
          deviceId: params.get("deviceId"),
          testId: test._id,
          targetBatchIds: selectedBatchIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.message || "Test shared successfully!");
        setSelectedBatchIds([]);
      } else {
        alert(data.message || "Failed to share test");
      }
    } catch (e) {
      alert("Failed to share test");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a]/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Share2 size={18} className="text-purple-600" />
              <h2 className="text-xl font-black text-gray-900">Share Test</h2>
            </div>
            <p className="text-sm text-gray-500 leading-snug">
              Copy <span className="font-bold text-gray-700">"{test.title}"</span> to other batches.
              {test.isMcq && <span className="ml-1 text-[#4d8bff] font-bold">(MCQ · {(test.questions || []).length} questions)</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
        </div>

        {result && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-sm text-emerald-700 font-semibold flex items-center gap-2">
            ✓ {result}
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="field text-sm flex-1"
          >
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={selectAll} className="text-xs px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">All</button>
          <button onClick={clearAll} className="text-xs px-3 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200">None</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {filteredBatches.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No other batches available.</p>
          ) : (
            filteredBatches.map((b) => {
              const isSelected = selectedBatchIds.includes(b._id);
              const alreadyHasTest = (b.tests || []).some((t: any) => t.title === test.title);
              return (
                <label
                  key={b._id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-colors ${isSelected ? "bg-purple-50 border-purple-300" : "bg-gray-50 border-gray-200 hover:bg-gray-100"} ${alreadyHasTest ? "opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleBatch(b._id)}
                    className="accent-purple-600"
                    disabled={alreadyHasTest}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">{b.name}</p>
                    <p className="text-xs text-gray-500 truncate">{b.courseName || "No course"} · {(b.tests || []).length} test(s)</p>
                  </div>
                  {alreadyHasTest && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full shrink-0">Already shared</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">{selectedBatchIds.length} batch(es) selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button
              onClick={share}
              disabled={sharing || selectedBatchIds.length === 0}
              className="px-5 py-2 rounded-2xl bg-purple-600 text-white text-sm font-black disabled:opacity-50 flex items-center gap-2 hover:bg-purple-700 transition-colors"
            >
              {sharing ? "Sharing..." : <><Share2 size={14} /> Share Now</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function McqEditor({
  questions, onAdd, onChangeQ, onRemoveQ,
}: {
  questions: McqQuestion[];
  onAdd: () => void;
  onChangeQ: (index: number, field: string, value: any) => void;
  onRemoveQ: (index: number) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-[#2563eb]/30 bg-[#2563eb]/10/40 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} className="text-[#4d8bff]" />
          <span className="font-bold text-gray-900 text-sm">MCQ Questions ({questions.length})</span>
          {questions.length > 0 && (
            <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
              Total marks: {questions.reduce((s, q) => s + Number(q.marks || 1), 0)}
            </span>
          )}
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white px-3 py-1.5 rounded-xl text-xs font-bold"
        >
          <Plus size={13} /> Add Question
        </button>
      </div>
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className="text-xs font-black text-[#4d8bff] bg-[#2563eb]/10 border border-[#2563eb]/30 px-2 py-1 rounded-lg shrink-0">Q{qi + 1}</span>
              <textarea
                rows={2}
                value={q.question}
                onChange={(e) => onChangeQ(qi, "question", e.target.value)}
                className="field flex-1 text-sm"
                placeholder="Enter question text"
              />
              <button onClick={() => onRemoveQ(qi)} className="text-red-400 hover:text-red-600 shrink-0 mt-1">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {(["A", "B", "C", "D"] as const).map((opt) => (
                <div key={opt} className="flex items-center gap-2">
                  <span className={`text-xs font-black w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                    q.correctAnswer === opt ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>{opt}</span>
                  <input
                    value={(q as any)[`option${opt}`]}
                    onChange={(e) => onChangeQ(qi, `option${opt}`, e.target.value)}
                    className="field flex-1 text-sm"
                    placeholder={`Option ${opt}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Field label="Correct Answer">
                <select
                  value={q.correctAnswer}
                  onChange={(e) => onChangeQ(qi, "correctAnswer", e.target.value)}
                  className="field text-sm"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </Field>
              <Field label="Marks">
                <input
                  type="number"
                  min={1}
                  value={q.marks}
                  onChange={(e) => onChangeQ(qi, "marks", Number(e.target.value))}
                  className="field text-sm w-20"
                />
              </Field>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <div className="text-center text-sm text-[#4d8bff] py-4 border border-dashed border-[#2563eb]/30 rounded-xl">
            No questions yet. Click "Add Question" to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function SubmissionList({ submissions, onReview, testId, authParams }: {
  submissions: any[];
  onReview: (s: any, m: string, r: string, ac: string, af: string, pub: boolean) => void;
  testId?: string;
  authParams?: () => URLSearchParams;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "mcq" | "manual" | "published" | "unpublished">("all");
  const [activeView, setActiveView] = useState<"submissions" | "rankings">("submissions");
  const [rankings, setRankings] = useState<any[]>([]);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const PAGE_SIZE = 5;

  const loadRankings = async () => {
    if (!testId || !authParams) return;
    setLoadingRankings(true);
    try {
      const params = authParams();
      const res = await fetch(`/api/tests/${testId}/rankings?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setRankings(data.rankings || []);
      else alert(data.message || "Failed to load rankings");
    } catch (e) { alert("Failed to load rankings"); }
    finally { setLoadingRankings(false); }
  };

  const handleViewChange = (view: "submissions" | "rankings") => {
    setActiveView(view);
    if (view === "rankings" && rankings.length === 0) loadRankings();
  };

  const filtered = submissions.filter((s) => {
    const needle = search.toLowerCase();
    const matchText = !needle || [s.name, s.email].join(" ").toLowerCase().includes(needle);
    const matchFilter =
      filter === "all" ? true :
      filter === "mcq" ? s.isMcq :
      filter === "manual" ? !s.isMcq :
      filter === "published" ? s.isPublished :
      filter === "unpublished" ? !s.isPublished : true;
    return matchText && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-black text-gray-900 text-sm">Results ({submissions.length} submissions)</h4>
          {testId && (
            <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
              <button
                onClick={() => handleViewChange("submissions")}
                className={`px-3 py-1.5 font-semibold transition-colors ${activeView === "submissions" ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                Submissions
              </button>
              <button
                onClick={() => handleViewChange("rankings")}
                className={`px-3 py-1.5 font-semibold flex items-center gap-1 transition-colors ${activeView === "rankings" ? "bg-amber-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Trophy size={11} /> Rankings
              </button>
            </div>
          )}
        </div>
        {activeView === "submissions" && (
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search student..."
              className="field text-xs px-3 py-1.5 w-36"
            />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}
              className="field text-xs px-3 py-1.5"
            >
              <option value="all">All</option>
              <option value="mcq">MCQ</option>
              <option value="manual">Manual</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>
          </div>
        )}
        {activeView === "rankings" && (
          <button onClick={loadRankings} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center gap-1">
            ↻ Refresh
          </button>
        )}
      </div>

      {activeView === "rankings" ? (
        <RankingBoard rankings={rankings} loading={loadingRankings} />
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {paged.length > 0 ? (
              paged.map((s) => <SubmissionRow key={s._id} submission={s} onReview={onReview} />)
            ) : (
              <div className="text-center text-sm text-gray-500 py-4 border border-dashed border-gray-200 rounded-xl">No submissions found.</div>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">Prev</button>
              <span className="text-xs text-gray-500">{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RankingBoard({ rankings, loading }: { rankings: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-gray-500">Loading rankings...</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="py-8 text-center border border-dashed border-gray-200 rounded-xl">
        <Trophy size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No submissions yet. Rankings will appear once students attempt this test.</p>
      </div>
    );
  }

  const medalColors: Record<number, string> = {
    1: "bg-amber-400 text-white",
    2: "bg-gray-400 text-white",
    3: "bg-amber-700 text-white",
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-3">Showing best attempt per student · Tied scores ranked equally</p>
      {rankings.map((entry: any) => {
        const rank = entry.rank as number;
        const isMedal = rank <= 3;
        return (
          <div
            key={entry._id}
            className={`flex items-center gap-3 rounded-xl p-3 border transition-colors ${rank === 1 ? "bg-amber-50 border-amber-200" : rank === 2 ? "bg-gray-50 border-gray-200" : rank === 3 ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${medalColors[rank] || "bg-gray-100 text-gray-600"}`}>
              {rank <= 3 ? ["🥇","🥈","🥉"][rank-1] : `#${rank}`}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 text-sm truncate">{entry.name}</p>
              <p className="text-xs text-gray-500 truncate">{entry.email}</p>
              {entry.batchName && (
                <span className="text-[10px] bg-blue-100 text-[#4d8bff] font-bold px-2 py-0.5 rounded-full">{entry.batchName}</span>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black text-gray-900">
                {entry.obtainedMarks}
                {entry.totalMarks > 0 && <span className="text-xs font-normal text-gray-400">/{entry.totalMarks}</span>}
              </div>
              {entry.percentage > 0 && (
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.percentage >= 70 ? "bg-emerald-100 text-emerald-700" : entry.percentage >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  {entry.percentage}%
                </div>
              )}
              {entry.isMcq && (
                <div className="text-[10px] text-gray-400 mt-0.5">{entry.correctAnswers}/{entry.totalQuestions} correct</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubmissionRow({ submission, onReview }: { submission: any; onReview: (s: any, m: string, r: string, ac: string, af: string, pub: boolean) => void }) {
  const [marks, setMarks] = useState(String(submission.marksAwarded ?? ""));
  const [remarks, setRemarks] = useState(submission.remarks || "");
  const [adminComment, setAdminComment] = useState(submission.adminComment || "");
  const [adminFeedback, setAdminFeedback] = useState(submission.adminFeedback || "");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSave = async (publish = submission.isPublished) => {
    setSaving(true);
    await onReview(submission, marks, remarks, adminComment, adminFeedback, publish);
    setSaving(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h5 className="font-bold text-gray-900 text-sm">{submission.name}</h5>
            {submission.isPublished && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Published</span>
            )}
            {submission.isMcq && (
              <span className="text-[10px] bg-blue-100 text-[#4d8bff] font-bold px-2 py-0.5 rounded-full">MCQ</span>
            )}
            {submission.status === "checked" && !submission.isPublished && (
              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Checked, not published</span>
            )}
          </div>
          <p className="text-xs text-gray-500">{submission.email}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
            <span>{new Date(submission.createdAt).toLocaleString("en-IN")}</span>
            {submission.autoSubmitted && <span className="text-amber-700">Auto submitted</span>}
          </div>

          {/* MCQ Summary */}
          {submission.isMcq && (
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
                <strong>{submission.correctAnswers}</strong>/{submission.totalQuestions} correct
              </span>
              <span className="bg-gray-100 px-2 py-1 rounded-lg text-gray-700">
                <strong>{submission.obtainedMarks}</strong>/{submission.totalMarks} marks
              </span>
              <span className={`px-2 py-1 rounded-lg font-bold ${
                submission.percentage >= 70 ? "bg-emerald-100 text-emerald-700" :
                submission.percentage >= 40 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {submission.percentage}%
              </span>
              <span className="bg-red-50 px-2 py-1 rounded-lg text-red-600">{submission.wrongAnswers} wrong</span>
            </div>
          )}

          {!submission.isMcq && submission.answerText && (
            <p className="mt-1 text-sm text-gray-700 line-clamp-2">{submission.answerText}</p>
          )}

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
            {submission.fileUrl && <a href={submission.fileUrl} target="_blank" className="text-[#4d8bff]">Uploaded file</a>}
            {submission.adminFeedback && !expanded && (
              <span className="text-purple-600">Feedback set</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl hover:bg-gray-200"
        >
          {expanded ? "Collapse" : "Review"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-gray-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Marks Awarded</label>
            <input value={marks} onChange={(e) => setMarks(e.target.value)} placeholder="Marks" type="number" className="field text-sm mt-1.5" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Internal Remarks</label>
            <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Internal remarks" className="field text-sm mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Comment (visible to student)</label>
            <textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} placeholder="Comment for the student..." rows={2} className="field text-sm mt-1.5" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Feedback (visible to student)</label>
            <textarea value={adminFeedback} onChange={(e) => setAdminFeedback(e.target.value)} placeholder="Detailed feedback, suggestions..." rows={2} className="field text-sm mt-1.5" />
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              disabled={saving}
              onClick={() => handleSave(false)}
              className="rounded-xl bg-gray-800 px-4 py-2 font-black text-white text-sm"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              disabled={saving}
              onClick={() => handleSave(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white text-sm flex items-center gap-1.5"
            >
              ✓ Save & Publish to Student
            </button>
            {submission.isPublished && (
              <button
                disabled={saving}
                onClick={() => handleSave(false)}
                className="rounded-xl bg-red-50 text-red-600 border border-red-200 px-4 py-2 font-semibold text-sm"
              >
                Unpublish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoticeEditor({ notices, onAdd, onChange, onRemove }: {
  notices: Notice[]; onAdd: () => void;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Megaphone size={20} /></div>
          <h2 className="text-xl font-bold text-gray-900">Notice Board</h2>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus size={15} /> Add Notice
        </button>
      </div>
      <div className="space-y-4">
        {notices.map((notice, index) => (
          <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <input value={notice.title} onChange={(e) => onChange(index, "title", e.target.value)} className="field" placeholder="Notice title" />
              <select value={notice.priority} onChange={(e) => onChange(index, "priority", e.target.value)} className="field">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
              <input type="datetime-local" value={notice.publishAt} onChange={(e) => onChange(index, "publishAt", e.target.value)} className="field" />
              <textarea rows={3} value={notice.message} onChange={(e) => onChange(index, "message", e.target.value)} className="field xl:col-span-3" placeholder="Notice message" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={notice.isActive} onChange={(e) => onChange(index, "isActive", e.target.checked)} /> Visible
              </label>
              <button onClick={() => onRemove(index)} className="ml-auto bg-red-50 text-red-600 px-4 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
        {notices.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No notices yet.</div>}
      </div>
    </div>
  );
}

function FacultyEditor({ faculty, onAdd, onChange, onRemove }: {
  faculty: Faculty[]; onAdd: () => void;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><UserCog size={20} /></div>
          <h2 className="text-xl font-bold text-gray-900">Faculty</h2>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
          <Plus size={15} /> Assign Faculty
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {faculty.map((item, index) => (
          <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={item.name} onChange={(e) => onChange(index, "name", e.target.value)} className="field text-sm" placeholder="Faculty name" />
              <input value={item.role} onChange={(e) => onChange(index, "role", e.target.value)} className="field text-sm" placeholder="Role" />
              <input value={item.email} onChange={(e) => onChange(index, "email", e.target.value)} className="field text-sm" placeholder="Email" />
              <input value={item.phone} onChange={(e) => onChange(index, "phone", e.target.value)} className="field text-sm" placeholder="Phone" />
              <textarea value={item.bio} onChange={(e) => onChange(index, "bio", e.target.value)} className="field md:col-span-2 text-sm" rows={2} placeholder="Faculty notes" />
            </div>
            <button onClick={() => onRemove(index)} className="mt-3 bg-red-50 text-red-600 px-3 py-2 rounded-xl font-semibold flex items-center gap-2 text-sm">
              <Trash2 size={14} /> Remove
            </button>
          </div>
        ))}
        {faculty.length === 0 && <div className="xl:col-span-2 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500">No faculty assigned yet.</div>}
      </div>
    </div>
  );
}

// ===================== UTILITY COMPONENTS =====================
function SidebarLink({ href, icon, text, active = false, badge = null }: any) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl font-medium transition ${
        active ? "bg-blue-100 text-[#4d8bff]" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="flex items-center gap-4">{icon}{text}</span>
      {badge}
    </Link>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <p className="text-2xl font-semibold tracking-tight text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function MiniStat({ label, value, dark }: { label: string; value: number; dark?: boolean }) {
  return (
    <div className={`rounded-xl p-2 text-center ${dark ? "bg-white/10" : "bg-gray-50 border border-gray-100"}`}>
      <p className={`text-base font-black ${dark ? "text-white" : "text-gray-900"}`}>{value}</p>
      <p className={`text-[9px] uppercase tracking-wider ${dark ? "text-gray-300" : "text-gray-400"}`}>{label}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function normalizeBatch(batch: any): Batch {
  return {
    _id: batch._id,
    name: batch.name || "",
    code: batch.code || "",
    courseId: batch.courseId || "",
    courseName: batch.courseName || "",
    startDate: toDateInput(batch.startDate),
    description: batch.description || "",
    isActive: batch.isActive !== false,
    inactiveAfterDays: Number(batch.inactiveAfterDays || 5),
    tests: (batch.tests || []).map(normalizeResource),
    assignments: (batch.assignments || []).map(normalizeResource),
    notices: (batch.notices || []).map((item: any) => ({
      title: item.title || "", message: item.message || "",
      priority: item.priority || "normal",
      publishAt: toDateTimeInput(item.publishAt),
      isActive: item.isActive !== false,
    })),
    faculty: (batch.faculty || []).map((item: any) => ({
      name: item.name || "", email: item.email || "", phone: item.phone || "",
      role: item.role || "Faculty", bio: item.bio || "",
    })),
    materials: (batch.materials || []).map((item: any) => ({
      _id: item._id,
      type: item.type || "video",
      name: item.name || "", url: item.url || "", webUrl: item.webUrl || "",
      sourceType: item.sourceType || "upload",
      isActive: item.isActive !== false,
    })),
  };
}

function normalizeResource(item: any): Resource {
  return {
    _id: item._id,
    title: item.title || "", description: item.description || "",
    fileUrl: item.fileUrl || "", answerSheetUrl: item.answerSheetUrl || "",
    link: item.link || "", dueDate: toDateTimeInput(item.dueDate),
    scheduledAt: toDateTimeInput(item.scheduledAt),
    durationMinutes: Number(item.durationMinutes || 0),
    totalMarks: Number(item.totalMarks || 0),
    allowRetake: item.allowRetake === true,
    isActive: item.isActive !== false,
    isMcq: item.isMcq === true,
    questions: (item.questions || []).map((q: any) => ({
      _id: q._id,
      question: q.question || "",
      optionA: q.optionA || "", optionB: q.optionB || "",
      optionC: q.optionC || "", optionD: q.optionD || "",
      correctAnswer: q.correctAnswer || "A",
      marks: Number(q.marks || 1),
    })),
  };
}

function toDateInput(value?: string) {
  if (!value) return "";
  try { return new Date(value).toISOString().slice(0, 10); } catch { return ""; }
}

function toDateTimeInput(value?: string) {
  if (!value) return "";
  try {
    const date = new Date(value);
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
  } catch { return ""; }
}
