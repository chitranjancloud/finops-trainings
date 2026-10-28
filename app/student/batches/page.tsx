"use client";
import { notify } from "@/components/Feedback";
import S3BatchContent from "@/components/S3BatchContent";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BatchClassroomView, { type ClassroomTab } from "@/components/BatchClassroomView";
import BatchLibraryCard from "@/components/BatchLibraryCard";
import AnswerSheetModal from "@/components/AnswerSheetModal";
import ProtectedContentShell from "@/components/ProtectedContentShell";
import ProtectedVideoPlayer from "@/components/ProtectedVideoPlayer";
import {
  buildBatchContentPreviewUrl,
  buildBatchContentProxyUrl,
  buildRecordedContentPreviewUrl,
  buildRecordedContentProxyUrl,
} from "@/lib/auth/protectedContentUrls";
import { trackEvent } from "@/lib/trackEvent";
import {
  ArrowLeft,
  ChevronDown,
  Search,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Film,
  GraduationCap,
  Megaphone,
  Package,
  PlayCircle,
  Send,
  Trophy,
  Upload,
  UserCog,
  Users,
  X,
} from "lucide-react";

export default function StudentBatchesPage() {
  return <Suspense fallback={<BatchPageLoading />}><StudentBatchesWorkspace /></Suspense>;
}

function BatchPageLoading() {
  return <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-8"><div role="status" aria-label="Loading your learning library" className="mx-auto max-w-6xl animate-pulse space-y-5"><div className="h-8 w-48 rounded-lg bg-slate-200" /><div className="h-4 w-80 max-w-full rounded bg-slate-200" /><div className="grid gap-5 pt-6 md:grid-cols-2"><div className="h-64 rounded-2xl bg-slate-200" /><div className="h-64 rounded-2xl bg-slate-200" /></div><span className="sr-only">Loading your learning library</span></div></main>;
}

function StudentBatchesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedBatch = searchParams.get("batch") || "";
  const requestedRecording = requestedBatch ? "" : searchParams.get("recorded") || "";
  const requestedTab = searchParams.get("tab");
  const activeTab: ClassroomTab = ["materials", "tests", "assignments", "notices", "faculty"].includes(requestedTab || "") ? requestedTab as ClassroomTab : "materials";
  const [search, setSearch] = useState("");
  const loadedOnce = useRef(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [recordedCourses, setRecordedCourses] = useState<any[]>([]);
  const [pendingLiveEnrollments, setPendingLiveEnrollments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // batchId → { completedCount, totalCount, pct }
  const [batchProgress, setBatchProgress] = useState<Record<string, { completedCount: number; totalCount: number; pct: number }>>({});


  const auth = () => {
    const storedUser = localStorage.getItem("user");
    return {
      user: (() => { try { return storedUser ? JSON.parse(storedUser) : null; } catch { return null; } })(),
      sessionToken: localStorage.getItem("sessionToken") || "",
      deviceId: localStorage.getItem("deviceId") || "",
    };
  };

  const markNotificationsRead = async (userId: string, types: string[]) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionToken: localStorage.getItem("sessionToken"),
          deviceId: localStorage.getItem("deviceId"),
          types,
        }),
      });
    } catch (error) { console.log(error); }
  };

  const loadAll = async () => {
    const { user, sessionToken, deviceId } = auth();
    if (!user || !sessionToken || !deviceId) { window.location.href = "/login"; return; }

    void markNotificationsRead(user._id, ["batch", "test", "assignment"]);

    const params = new URLSearchParams({ scope: "student", userId: user._id, sessionToken, deviceId });
    try {
      setLoading(!loadedOnce.current); setError("");
      const [batchRes, submissionRes] = await Promise.all([
        fetch(`/api/batches?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/batch-submissions?${params.toString()}`, { cache: "no-store" }),
      ]);
      const batchData = await batchRes.json();
      const submissionData = await submissionRes.json();
      if (!batchRes.ok || !batchData.success) throw new Error(batchData.message || "Unable to load batches");
      setBatches(batchData.batches || []);
      setEnrollments(batchData.enrollments || []);
      setRecordedCourses(batchData.recordedCourses || []);
      setPendingLiveEnrollments(batchData.pendingLiveEnrollments || []);
      setSubmissions(submissionData.submissions || []);
      loadedOnce.current = true;

      setLoading(false);
      // Load lesson progress for all batches to populate sidebar progress bars
      const loadedBatches: any[] = batchData.batches || [];
      if (loadedBatches.length > 0 && user && sessionToken && deviceId) {
        try {
          const progressParams = new URLSearchParams({ userId: user._id, sessionToken, deviceId });
          const progressRes = await fetch(`/api/lesson-progress?${progressParams.toString()}`, { cache: "no-store" });
          const progressData = await progressRes.json();
          if (progressData.success && progressData.byBatch) {
            const prog: Record<string, { completedCount: number; totalCount: number; pct: number }> = {};
            for (const b of loadedBatches) {
              const bId = String(b._id);
              const activeMats = (b.materials || []).filter((m: any) => m.isActive !== false);
              const total = activeMats.length;
              const completedSet: string[] = progressData.byBatch[bId]?.completedMaterialIds || [];
              const completed = activeMats.filter((m: any) => completedSet.includes(String(m._id))).length;
              prog[bId] = {
                completedCount: completed,
                totalCount: total,
                pct: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
              };
            }
            setBatchProgress(prog);
          }
        } catch { /* non-critical */ }
      }
    } catch (err: any) {
      setError(err.message || "Unable to load batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const selected = useMemo(() => batches.find(batch => String(batch._id) === requestedBatch), [batches, requestedBatch]);
  const selectedRecording = recordedCourses.find(item => recordedCourseKey(item) === requestedRecording);
  const selectedEnrollment = selected && enrollments.find(item => String(item.batchId) === String(selected._id) || item.batchName === selected.name);
  const filteredBatches = batches.filter(batch => [batch.name, batch.courseName, batch.code].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const filteredRecordings = recordedCourses.filter(item => [item.course?.title, item.enrollment?.courseName].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const detailRequested = Boolean(requestedBatch || requestedRecording);

  function changeTab(tab: ClassroomTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "materials") params.delete("tab"); else params.set("tab", tab);
    router.replace(`/student/batches?${params}`, { scroll: false });
  }

  if (loading) return <BatchPageLoading />;
  if (error) return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900"><div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8"><h1 className="text-2xl font-semibold">We couldn’t load your classroom</h1><p className="mt-3 text-sm text-slate-600">{error}</p><button onClick={loadAll} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">Try again</button></div></main>;
  if (detailRequested && !selected && !selectedRecording) return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900"><div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8"><BookOpen size={28} className="text-blue-600" /><h1 className="mt-4 text-2xl font-semibold">This classroom isn’t available</h1><p className="mt-3 text-sm leading-7 text-slate-600">This link may be out of date, or the classroom may no longer be assigned to your account. Choose from your available batches.</p><Link href="/student/batches" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"><ArrowLeft size={16} />All my batches</Link></div></main>;

  if (selectedRecording) return <main className="dash-page min-h-screen px-4 pb-16 pt-4 sm:px-8"><BatchClassroomView recorded title={selectedRecording.course?.title || selectedRecording.enrollment?.courseName || "Recorded course"} description={selectedRecording.course?.description}><RecordedCoursesSection items={[selectedRecording]} auth={auth} compact /></BatchClassroomView></main>;

  if (selected) return (
    <main className="dash-page min-h-screen px-4 pb-16 pt-4 sm:px-8">
      <BatchClassroomView
        title={selected.name}
        courseName={selected.courseName || selectedEnrollment?.courseName}
        code={selected.code}
        startDate={selected.startDate}
        description={selected.description}
        activeTab={activeTab}
        onTabChange={changeTab}
        counts={{ tests: active(selected.tests).length, assignments: active(selected.assignments).length, notices: active(selected.notices).length, faculty: (selected.faculty || []).length }}
      >
        {activeTab === "materials" && <BatchLearningContent key={selected._id} batch={selected} auth={auth} onProgressUpdate={(batchId, completedCount, totalCount, pct) => setBatchProgress(prev => ({ ...prev, [batchId]: { completedCount, totalCount, pct } }))} />}
                  {activeTab === "tests" && (
                    <AssessmentList
                      type="test"
                      batch={selected}
                      items={active(selected.tests)}
                      submissions={submissions}
                      onSubmitted={loadAll}
                      auth={auth}
                      empty="No tests published for this batch yet."
                    />
                  )}

                  {activeTab === "assignments" && (
                    <AssessmentList
                      type="assignment"
                      batch={selected}
                      items={active(selected.assignments)}
                      submissions={submissions}
                      onSubmitted={loadAll}
                      auth={auth}
                      empty="No assignments published for this batch yet."
                    />
                  )}

                  {activeTab === "notices" && (
                    <div className="space-y-4">
                      {active(selected.notices).length > 0 ? (
                        active(selected.notices).map((notice: any, index: number) => (
                          <div key={index} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
                            <span className={noticeBadge(notice.priority)}>{notice.priority || "normal"}</span>
                            <h3 className="text-xl font-bold mt-3">{notice.title}</h3>
                            <p className="text-slate-400 mt-2 whitespace-pre-wrap">{notice.message}</p>
                          </div>
                        ))
                      ) : (
                        <EmptyInline text="No notices posted yet." />
                      )}
                    </div>
                  )}

                  {activeTab === "faculty" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {(selected.faculty || []).length > 0 ? (
                        selected.faculty.map((item: any, index: number) => (
                          <div key={index} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
                            <h3 className="text-xl font-bold">{item.name}</h3>
                            <p className="text-blue-200 text-sm mt-1">{item.role}</p>
                            <p className="text-slate-400 text-sm mt-3">{item.email}</p>
                            <p className="text-slate-400 text-sm">{item.phone}</p>
                            {item.bio && <p className="text-slate-500 mt-3">{item.bio}</p>}
                          </div>
                        ))
                      ) : (
                        <div className="lg:col-span-2"><EmptyInline text="Faculty details not assigned yet." /></div>
                      )}
                    </div>
                  )}
      </BatchClassroomView>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/student" className="mb-7 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-700"><ArrowLeft size={16} />Back to Dashboard</Link>
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-blue-700">Your learning space</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">My Batches</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Choose a classroom to find its lessons, assignments, and trainer updates.</p></div><Link href="/student/chats" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700"><Users size={16} />Messages & support</Link></div>
        {batches.length > 0 || recordedCourses.length > 0 ? <>
          <label className="relative mb-8 block max-w-xl"><span className="sr-only">Search your batches and courses</span><Search size={18} className="absolute left-4 top-3.5 text-slate-400" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your batches or courses" className="min-h-12 w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-400" /></label>
          {filteredBatches.length > 0 && <section aria-labelledby="live-batches-title" className="mb-10"><div className="mb-4 flex items-center gap-3"><h2 id="live-batches-title" className="text-lg font-semibold">Live classrooms</h2><span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600">{filteredBatches.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredBatches.map(batch => <BatchLibraryCard key={batch._id} href={`/student/batches?batch=${encodeURIComponent(batch._id)}`} title={batch.name} courseName={batch.courseName} code={batch.code} startDate={batch.startDate} progress={batchProgress[String(batch._id)]} assignments={active(batch.assignments).length} tests={active(batch.tests).length} />)}</div></section>}
          {filteredRecordings.length > 0 && <section aria-labelledby="recorded-courses-title" className="mb-10"><div className="mb-4 flex items-center gap-3"><h2 id="recorded-courses-title" className="text-lg font-semibold">Self-paced courses</h2><span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-600">{filteredRecordings.length}</span></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredRecordings.map(item => <BatchLibraryCard key={recordedCourseKey(item)} recorded href={`/student/batches?recorded=${encodeURIComponent(recordedCourseKey(item))}`} title={item.course?.title || item.enrollment?.courseName || "Recorded course"} />)}</div></section>}
          {filteredBatches.length === 0 && filteredRecordings.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><Search size={26} className="mx-auto text-slate-400" /><h2 className="mt-4 text-lg font-semibold">No matching classrooms</h2><p className="mt-2 text-sm text-slate-500">Try a course name or a different batch code.</p><button onClick={() => setSearch("")} className="mt-5 text-sm font-semibold text-blue-700">Clear search</button></div>}
        </> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><BookOpen size={30} className="mx-auto text-blue-600" /><h2 className="mt-4 text-xl font-semibold">Your learning starts here</h2><p className="mt-3 text-sm leading-7 text-slate-600">Your assigned classrooms and self-paced courses will appear here.</p><Link href="/#top-courses" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Explore courses<ExternalLink size={16} /></Link></div>}
        {pendingLiveEnrollments.length > 0 && <details className="mt-8 rounded-2xl border border-amber-200 bg-amber-50"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-amber-900"><span>{pendingLiveEnrollments.length} {pendingLiveEnrollments.length === 1 ? "enrollment is" : "enrollments are"} waiting for batch assignment</span><ChevronDown size={17} /></summary><div className="rounded-b-2xl bg-slate-900 p-4"><PendingLiveSection items={pendingLiveEnrollments} /></div></details>}
      </div>
    </main>
  );
}

function recordedCourseKey(item: any) {
  return String(item.enrollment?._id || item.course?.slug || item.course?._id || item.enrollment?.courseId || "");
}

function BatchLearningContent({ batch, auth, onProgressUpdate }: { batch: any; auth: () => any; onProgressUpdate: (batchId: string, completedCount: number, totalCount: number, pct: number) => void }) {
  const [libraryAvailable, setLibraryAvailable] = useState<boolean | null>(null);
  const [showAdditional, setShowAdditional] = useState(false);
  const materials = active(batch.materials || []);
  return <div className="space-y-6"><div><h2 className="text-xl font-semibold text-white">Learning library</h2><p className="mt-2 text-sm leading-7 text-slate-400">Choose a recording or resource to start learning.</p></div>
    <S3BatchContent compact batchId={batch._id} onAvailabilityChange={setLibraryAvailable} />
    {libraryAvailable === false ? <MaterialsSection materials={materials} batchId={batch._id} auth={auth} onProgressUpdate={onProgressUpdate} /> : libraryAvailable === true && <div className="border-t border-white/[0.08] pt-5"><button type="button" aria-expanded={showAdditional} aria-controls="additional-study-resources" onClick={() => setShowAdditional(value => !value)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-4 text-left"><span><span className="block text-sm font-medium text-slate-200">Additional study resources{materials.length > 0 ? ` · ${materials.length}` : ""}</span><span className="mt-1 block text-xs leading-6 text-slate-400">Other notes, documents, and course links shared by your trainer.</span></span><ChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${showAdditional ? "rotate-180" : ""}`} /></button>{showAdditional && <div id="additional-study-resources" className="pt-4"><MaterialsSection materials={materials} batchId={batch._id} auth={auth} onProgressUpdate={onProgressUpdate} /></div>}</div>}
  </div>;
}

function RecordedCoursesSection({ items, auth, compact = false }: { items: any[]; auth: () => any; compact?: boolean }) {
  return (
    <section className={compact ? "space-y-4" : "rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.04] p-6"}>
      {!compact && <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/20 text-emerald-300 flex items-center justify-center">
          <BookOpen size={20} />
        </div>
        <div>
          <p className="eyebrow mb-0" style={{ color: "#34d399" }}>Self-Paced Learning</p>
          <h2 className="text-2xl font-black text-white">Recorded Course Content</h2>
        </div>
      </div>}
      <div className={compact ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-5"}>
        {items.map(({ course, enrollment }: any) => {
          const resources = [
            ...normalizeCourseItems(course?.videos, course?.videoUrl, "video", "Course Video").map(
              (resource, resourceIndex) => ({ ...resource, resourceIndex })
            ),
            ...normalizeCourseItems(course?.pdfs, course?.pdfUrl, "pdf", "Course PDF").map(
              (resource, resourceIndex) => ({ ...resource, resourceIndex })
            ),
            ...normalizeCourseItems(
              course?.materials,
              course?.materialUrl,
              "material",
              course?.materialTitle || "Study Material"
            ).map((resource, resourceIndex) => ({ ...resource, resourceIndex })),
          ].map((resource) => ({
            ...resource,
            courseId: course?.slug || course?._id || enrollment?.courseId || "",
          }));
          return (
            <div key={enrollment?._id || course?._id} className={compact ? "space-y-3" : "rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5"}>
              {!compact && <><h3 className="text-xl font-bold">{course?.title || enrollment?.courseName || "Course"}</h3>
              <p className="mt-1 text-sm text-emerald-100/80">Instant recorded access enabled</p></>}
              <div className="mt-4 space-y-3">
                {resources.length > 0 ? resources.map((item: any, index: number) => (
                  <RecordedResource key={`${item.type}-${index}`} item={item} auth={auth} />
                )) : <EmptyInline text="No recorded materials have been added yet." />}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PendingLiveSection({ items }: { items: any[] }) {
  return (
    <section className="rounded-[34px] border border-amber-300/20 bg-amber-400/[0.06] p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-2xl bg-amber-400/10 border border-amber-300/20 text-amber-200 flex items-center justify-center">
          <Clock size={20} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200 font-black">Live Training</p>
          <h2 className="text-2xl font-black text-white">Waiting For Batch Assignment</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map((item: any) => (
          <div key={item._id} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
            <h3 className="font-bold text-lg">{item.courseName || "Live Course"}</h3>
            <p className="mt-2 text-sm text-slate-300">
              You will get live classes, meeting links, batch materials, assignments, and notices after admin assigns your batch.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getWatermarkLabels(auth: () => any) {
  const { user } = auth();
  return {
    watermarkLabel: [user?.name, user?.email].filter(Boolean).join(" | "),
    tenantLabel: new Date().toLocaleString("en-IN"),
  };
}

function normalizeCourseItems(items: any[] = [], legacyUrl = "", type = "material", legacyName = "Resource") {
  const list = Array.isArray(items) ? items : [];
  if (list.length > 0) {
    return list.filter((item) => item?.url || item?.webUrl).map((item) => ({ ...item, type }));
  }
  return legacyUrl ? [{ name: legacyName, url: legacyUrl, type }] : [];
}

function RecordedResource({ item, auth }: { item: any; auth: () => any }) {
  const icon = item.type === "video" ? <Film size={16} /> : item.type === "pdf" ? <FileText size={16} /> : <Package size={16} />;
  const hasLink = Boolean(item.webUrl || item.url);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const [activeViewer, setActiveViewer] = useState<"video" | "pdf" | "material" | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const watermark = getWatermarkLabels(auth);

  const buildProxyUrl = (preview = false) => {
    const { user, sessionToken, deviceId } = auth();
    if (!user || !sessionToken || !deviceId || !item.courseId) return "";
    if (item.resourceIndex === undefined || item.resourceIndex === null) return "";

    const opts = {
      courseId: String(item.courseId),
      resourceType: String(item.type || "material"),
      resourceIndex: Number(item.resourceIndex),
      userId: user._id || "",
      sessionToken,
      deviceId,
    };

    return preview
      ? buildRecordedContentPreviewUrl(opts)
      : buildRecordedContentProxyUrl(opts);
  };

  const handleOpen = async () => {
    if (!hasLink || opening) return;

    setOpenError("");
    setOpening(true);
    try {
      const { user, sessionToken, deviceId } = auth();
      if (!user || !sessionToken || !deviceId || !item.courseId) {
        window.location.href = "/login";
        return;
      }

      const url = buildProxyUrl();
      if (!url) {
        setOpenError("Unable to open this content right now. Please try again.");
        return;
      }

      if (item.type === "video") {
        setPlaybackUrl(url);
        setActiveViewer("video");
      } else if (item.type === "pdf") {
        setPlaybackUrl(url);
        setActiveViewer("pdf");
      } else {
        const previewUrl = buildProxyUrl(true);
        if (!previewUrl) {
          setOpenError("Unable to open this content right now. Please try again.");
          return;
        }
        setPlaybackUrl(previewUrl);
        setActiveViewer("material");
      }
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
    <button
      onClick={handleOpen}
      disabled={!hasLink || opening}
      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 hover:border-blue-300/40 transition text-left disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className="text-blue-200">{icon}</span>
        <span className="font-semibold truncate">{item.name || "Course Resource"}</span>
      </span>
      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-lg shrink-0">
        <ExternalLink size={10} /> Open
      </span>
    </button>
    {openError && (
      <p className="mt-1 px-1 text-[11px] text-red-300">{openError}</p>
    )}

    {activeViewer === "video" && (
      <ContentModal title={item.name || "Video"} onClose={() => { setActiveViewer(null); setPlaybackUrl(""); }}>
        <ProtectedContentShell suppressWatermark className="p-2 sm:p-3">
          <ProtectedVideoPlayer src={playbackUrl} {...watermark} />
        </ProtectedContentShell>
      </ContentModal>
    )}

    {activeViewer === "pdf" && (
      <ContentModal title={item.name || "PDF"} onClose={() => { setActiveViewer(null); setPlaybackUrl(""); }}>
        <ProtectedContentShell {...watermark}>
          <iframe
            src={`${playbackUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            title={item.name || "PDF"}
            className="h-[75vh] w-full bg-white"
          />
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-12 bg-white" />
        </ProtectedContentShell>
      </ContentModal>
    )}

    {activeViewer === "material" && (
      <ContentModal title={item.name || "Study Material"} onClose={() => { setActiveViewer(null); setPlaybackUrl(""); }}>
        <ProtectedContentShell {...watermark}>
          <StudyMaterialFrame src={playbackUrl} title={item.name || "Study Material"} />
        </ProtectedContentShell>
      </ContentModal>
    )}
    </div>
  );
}

// ===================== MATERIALS SECTION =====================

type MatCategory = "video" | "pdf" | "material" | "assignment" | "sharepoint";

const CAT_CONFIG: Record<MatCategory, {
  label: string; plural: string; emoji: string;
  accent: string; iconBg: string; iconColor: string;
  cardBorder: string; cardBg: string; badgeBg: string; badgeText: string;
  btnClass: string; btnLabel: string;
}> = {
  video: {
    label: "Videos", plural: "Videos", emoji: "📹",
    accent: "border-blue-400/40",
    iconBg: "bg-blue-500/15 border-blue-400/30", iconColor: "text-blue-300",
    cardBorder: "border-blue-400/20", cardBg: "bg-blue-400/[0.04]",
    badgeBg: "bg-blue-500/15", badgeText: "text-blue-300",
    btnClass: "bg-blue-500 hover:bg-[#2563eb] text-white",
    btnLabel: "Watch Video",
  },
  pdf: {
    label: "PDFs", plural: "PDFs", emoji: "📄",
    accent: "border-red-400/40",
    iconBg: "bg-red-500/15 border-red-400/30", iconColor: "text-red-300",
    cardBorder: "border-red-400/20", cardBg: "bg-red-400/[0.04]",
    badgeBg: "bg-red-500/15", badgeText: "text-red-300",
    btnClass: "bg-red-500 hover:bg-red-400 text-white",
    btnLabel: "View PDF",
  },
  material: {
    label: "Study Materials", plural: "Study Materials", emoji: "📚",
    accent: "border-purple-400/40",
    iconBg: "bg-blue-500/10 border-blue-400/20", iconColor: "text-blue-300",
    cardBorder: "border-purple-400/20", cardBg: "bg-purple-400/[0.04]",
    badgeBg: "bg-blue-500/10", badgeText: "text-blue-300",
    btnClass: "bg-purple-500 hover:bg-purple-400 text-white",
    btnLabel: "View Material",
  },
    assignment: {
    label: "Assignments", plural: "Assignments", emoji: "Assignments",
    accent: "border-amber-400/40",
    iconBg: "bg-amber-500/15 border-amber-400/30", iconColor: "text-amber-300",
    cardBorder: "border-amber-400/20", cardBg: "bg-amber-400/[0.04]",
    badgeBg: "bg-amber-500/15", badgeText: "text-amber-300",
    btnClass: "bg-amber-500 hover:bg-amber-400 text-slate-950",
    btnLabel: "Open Assignment",
  },
  sharepoint: {
    label: "SharePoint", plural: "SharePoint Links", emoji: "🔗",
    accent: "border-blue-400/40",
    iconBg: "bg-blue-500/15 border-blue-400/30", iconColor: "text-blue-300",
    cardBorder: "border-blue-400/20", cardBg: "bg-blue-400/[0.04]",
    badgeBg: "bg-blue-500/15", badgeText: "text-blue-300",
    btnClass: "bg-blue-500 hover:bg-blue-400 text-white",
    btnLabel: "Open SharePoint",
  },
};

function CategoryIcon({ type }: { type: MatCategory }) {
  if (type === "video") return <Film size={20} />;
  if (type === "pdf") return <FileText size={20} />;
    if (type === "assignment") return <ClipboardList size={20} />;
  if (type === "sharepoint") return <ExternalLink size={20} />;
  return <Package size={20} />;
}

function extractSharePointParam(url: string, param: string) {
  try {
    const parsed = new URL(url, "http://local");
    return parsed.searchParams.get(param) || "";
  } catch {
    return "";
  }
}

function collectMaterialDedupKeys(item: { url?: string; webUrl?: string; name?: string }): string[] {
  const keys: string[] = [];
  const urls = [item.url, item.webUrl].filter(Boolean) as string[];

  for (const raw of urls) {
    const driveId = extractSharePointParam(raw, "driveId");
    const itemId = extractSharePointParam(raw, "itemId");
    if (driveId && itemId) {
      keys.push(`sp:${driveId}:${itemId}`);
    }
    if (raw.includes("/api/sharepoint-file")) {
      keys.push(`url:${raw}`);
    }
  }

  if (keys.length === 0) {
    const name = (item.name || "").trim().toLowerCase();
    if (name) keys.push(`name:${name}`);
  }

  return keys;
}

function mergeStudentBatchMaterials(inventoryItems: any[], legacyItems: any[]): any[] {
  const inventoryKeys = new Set<string>();
  for (const item of inventoryItems) {
    for (const key of collectMaterialDedupKeys(item)) {
      inventoryKeys.add(key);
    }
  }

  const dedupedLegacy = legacyItems.filter((item) => {
    if (item.isActive === false) return false;
    const keys = collectMaterialDedupKeys(item);
    return !keys.some((key) => inventoryKeys.has(key));
  });

  return [...inventoryItems, ...dedupedLegacy];
}

function MaterialsSection({
  materials,
  batchId,
  auth,
  onProgressUpdate,
  hideEmpty = false,
}: {
  materials: any[];
  batchId: string;
  auth: () => any;
  onProgressUpdate?: (batchId: string, completedCount: number, totalCount: number, pct: number) => void;
  hideEmpty?: boolean;
}) {
  const [openCat, setOpenCat] = useState<MatCategory | null>(null);
  const [search, setSearch] = useState("");
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    const [structuredMaterials, setStructuredMaterials] = useState<any[]>([]);
  const [structuredLoading, setStructuredLoading] = useState(false);

  useEffect(() => {
    const loadStructuredContent = async () => {
      const { user, sessionToken, deviceId } = auth();
      if (!user || !sessionToken || !deviceId || !batchId) return;

      try {
        setStructuredLoading(true);
        const params = new URLSearchParams({
          userId: user._id,
          sessionToken,
          deviceId,
          batchId,
        });
        const res = await fetch(`/api/student/content-inventory?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (res.ok && data.success && Array.isArray(data.inventory)) {
          setStructuredMaterials(
            data.inventory.map((item: any) => ({
              _id: String(item._id),
              inventoryId: String(item._id),
              type:
                item.fileType === "study-material"
                  ? "material"
                  : item.fileType,
              name: item.fileName,
              url: item.url,
              webUrl: item.webUrl,
              createdAt: item.uploadedAt || item.createdAt,
              sourceType: "inventory",
            }))
          );
        } else {
          setStructuredMaterials([]);
        }
      } catch {
        setStructuredMaterials([]);
      } finally {
        setStructuredLoading(false);
      }
    };

    loadStructuredContent();
  }, [batchId]);

  // Load persisted progress for this batch on mount
  useEffect(() => {
    const load = async () => {
      const { user, sessionToken, deviceId } = auth();
      if (!user || !sessionToken || !deviceId || !batchId) return;
      try {
        const params = new URLSearchParams({ userId: user._id, sessionToken, deviceId, batchId });
        const res = await fetch(`/api/lesson-progress?${params}`, { cache: "no-store" });
        const data = await res.json();
        if (data.success && Array.isArray(data.completedMaterialIds)) {
          const ids = new Set<string>(data.completedMaterialIds);
          setCompletedIds(ids);
          // Notify parent of current progress
          const total = materials.length;
          const completed = materials.filter((m) => ids.has(String(m._id))).length;
          const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
          onProgressUpdate?.(batchId, completed, total, pct);
        }
      } catch { /* non-critical */ }
    };
    load();
  }, [batchId]);

  const markComplete = async (materialId: string) => {
    if (!materialId || completedIds.has(materialId)) return;
    const { user, sessionToken, deviceId } = auth();
    if (!user || !sessionToken || !deviceId) return;
    try {
      const res = await fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, sessionToken, deviceId, batchId, materialId }),
      });
      const data = await res.json();
      if (data.success) {
        setCompletedIds((prev) => {
          const next = new Set([...prev, materialId]);
          // Notify parent of updated progress using API's authoritative counts
          onProgressUpdate?.(
            batchId,
            data.completedCount,
            data.totalMaterials,
            data.completionPct,
          );
          return next;
        });
      }
    } catch { /* non-critical */ }
  };

  const displayMaterials = useMemo(
    () => mergeStudentBatchMaterials(structuredMaterials, materials),
    [structuredMaterials, materials]
  );
  const videos    = displayMaterials.filter((m) => m.type === "video");
  const pdfs      = displayMaterials.filter((m) => m.type === "pdf");
  const docs      = displayMaterials.filter((m) => m.type === "material");
  const assignments = displayMaterials.filter((m) => m.type === "assignment");
  const sharepoint = displayMaterials.filter((m) => m.type === "sharepoint");

  const catMap: Record<MatCategory, any[]> = { video: videos, pdf: pdfs, material: docs, assignment: assignments, sharepoint };
  const visibleCategories = (["video", "pdf", "material", "assignment", "sharepoint"] as MatCategory[])
    .filter((cat) => (catMap[cat] || []).length > 0);

  if (structuredLoading && materials.length === 0) {
    return <EmptyInline text="Loading structured batch content..." />;
  }

  if (!structuredLoading && displayMaterials.length === 0) {
    if (hideEmpty) return null;
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 py-16 px-6 text-center gap-3">
        <div className="text-4xl">📂</div>
        <p className="text-slate-300 font-semibold">No content yet</p>
        <p className="text-slate-500 text-sm">Your instructor hasn't added any materials to this batch yet.</p>
      </div>
    );
  }

  const activeItems = openCat ? (catMap[openCat] || []) : displayMaterials;
  const filteredItems = search.trim()
    ? activeItems.filter(item => (item.name || "").toLowerCase().includes(search.trim().toLowerCase()))
    : activeItems;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter study resources">
        <button type="button" aria-pressed={openCat === null} onClick={() => { setOpenCat(null); setSearch(""); }} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium ${openCat === null ? "border-blue-400/40 bg-blue-400/10 text-blue-200" : "border-white/10 text-slate-400 hover:text-white"}`}>All resources · {displayMaterials.length}</button>
        {visibleCategories.map(cat => <button key={cat} type="button" aria-pressed={openCat === cat} onClick={() => { setOpenCat(cat); setSearch(""); }} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${openCat === cat ? "border-blue-400/40 bg-blue-400/10 text-blue-200" : "border-white/10 text-slate-400 hover:text-white"}`}>{CAT_CONFIG[cat].label}<span className="text-slate-400">{catMap[cat].length}</span></button>)}
      </div>
      <label className="relative block"><span className="sr-only">Search study resources</span><Search size={17} className="absolute left-3 top-3.5 text-slate-500" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search study resources" className="min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/30 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
      {filteredItems.length > 0 ? <div className="grid gap-3 md:grid-cols-2">{filteredItems.map((item, index) => <MaterialCard key={item._id || index} item={item} catType={(visibleCategories.includes(item.type) ? item.type : "material") as MatCategory} batchId={batchId} auth={auth} isCompleted={completedIds.has(String(item._id))} onMarkComplete={markComplete} />)}</div> : <EmptyInline text={search ? `No resources match “${search}”.` : "No resources in this category yet."} />}
    </div>
  );
}

function MaterialCard({
  item,
  catType,
  batchId,
  auth,
  isCompleted,
  onMarkComplete,
}: {
  item: any;
  catType: MatCategory;
  batchId: string;
  auth: () => any;
  isCompleted: boolean;
  onMarkComplete: (materialId: string) => void;
}) {
  const cfg = CAT_CONFIG[catType];
  const [activeViewer, setActiveViewer] = useState<"video" | "pdf" | "material" | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState("");
  const [opening, setOpening] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const watermark = getWatermarkLabels(auth);

  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const { user, sessionToken, deviceId } = auth();
  const hasContent = Boolean(item._id && (item.url || item.webUrl));
  const proxyOpts =
    hasContent && user && sessionToken && deviceId
      ? {
          batchId,
          materialId: item.inventoryId ? "" : String(item._id),
          inventoryId: item.inventoryId ? String(item.inventoryId) : "",
          userId: user._id || "",
          sessionToken,
          deviceId,
        }
      : null;
  const contentHref = proxyOpts ? buildBatchContentProxyUrl(proxyOpts) : "";
  const previewHref = proxyOpts ? buildBatchContentPreviewUrl(proxyOpts) : "";

  const closeViewer = () => {
    setActiveViewer(null);
    setPlaybackUrl("");
    setPlaybackError("");
  };

  const openViewer = async () => {
    if (!hasContent || opening) return;
    if (catType === "material" ? !previewHref : !contentHref) return;

    setPlaybackError("");
    setOpening(true);
    try {
      if (item._id) onMarkComplete(String(item.inventoryId || item._id));

      const evtMeta = {
        batchId,
        batchName: item.batchName || "",
        resourceId: String(item._id || ""),
        resourceName: item.name || "",
      };

      if (catType === "video") {
        trackEvent("video_started", evtMeta);
        setPlaybackUrl(contentHref);
        setActiveViewer("video");
        return;
      }
      if (catType === "pdf") {
        trackEvent("material_downloaded", evtMeta);
        setPlaybackUrl(contentHref);
        setActiveViewer("pdf");
        return;
      }
      trackEvent("material_downloaded", evtMeta);
      setPlaybackUrl(previewHref);
      setActiveViewer("material");
    } finally {
      setOpening(false);
    }
  };

  const btnIcon =
    catType === "video" ? <PlayCircle size={13} /> :
    catType === "pdf" ? <FileText size={13} /> :
    catType === "assignment" ? <ClipboardList size={13} /> :
    catType === "sharepoint" ? <ExternalLink size={13} /> :
    <Package size={13} />;

  return (
    <>
      <div
        className={`group rounded-2xl border p-4 flex flex-col gap-3 transition-colors ${
          isCompleted
            ? "border-emerald-400/30 bg-emerald-400/[0.06] hover:border-emerald-400/50"
            : `${cfg.cardBorder} ${cfg.cardBg} hover:border-white/20`
        }`}
      >
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" : `${cfg.iconBg} ${cfg.iconColor}`}`}>
            {isCompleted ? <CheckCircle2 size={18} /> : <CategoryIcon type={catType} />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-white text-sm leading-snug line-clamp-2">{item.name || "Untitled"}</h4>
            {item.description && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{item.description}</p>
            )}
          </div>
          {/* Completion badge */}
          {isCompleted && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-2 py-0.5 text-[9px] font-black text-emerald-300 uppercase tracking-widest">
              Done
            </span>
          )}
        </div>

        {/* Meta */}
        {dateStr && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <CalendarDays size={10} />
            <span>Added {dateStr}</span>
          </div>
        )}

        {/* Action */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {hasContent ? (
            <button
              onClick={openViewer}
              disabled={opening}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                isCompleted
                  ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/25"
                  : cfg.btnClass
              }`}
            >
              {isCompleted ? <CheckCircle2 size={13} /> : btnIcon}
              {isCompleted ? "View Again" : cfg.btnLabel}
            </button>
          ) : (
            <span className="flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold bg-white/5 text-slate-500 border border-white/10">
              Not Available
            </span>
          )}
        </div>
      </div>

      {activeViewer === "video" && (
        <ContentModal title={item.name || "Video"} onClose={closeViewer}>
          <ProtectedContentShell suppressWatermark className="p-2 sm:p-3">
            {playbackError ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <p className="text-sm text-red-300">{playbackError}</p>
              </div>
            ) : (
              <ProtectedVideoPlayer
                src={playbackUrl}
                {...watermark}
                onEnded={() => trackEvent("video_completed", {
                  batchId,
                  resourceId: String(item._id || ""),
                  resourceName: item.name || "",
                })}
                onError={() => setPlaybackError("Video playback failed. Please close and try again.")}
              />
            )}
          </ProtectedContentShell>
        </ContentModal>
      )}

      {activeViewer === "pdf" && (
        <ContentModal title={item.name || "PDF"} onClose={closeViewer}>
          <ProtectedContentShell {...watermark}>
            {playbackError ? (
              <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
                <p className="text-sm text-red-300">{playbackError}</p>
              </div>
            ) : (
              <>
                <iframe
                  key={playbackUrl}
                  src={`${playbackUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                  title={item.name || "PDF"}
                  className="h-[75vh] w-full bg-white"
                />
                <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-12 bg-white" />
              </>
            )}
          </ProtectedContentShell>
        </ContentModal>
      )}

      {activeViewer === "material" && (
        <ContentModal title={item.name || "Study Material"} onClose={closeViewer}>
          <ProtectedContentShell {...watermark}>
            <StudyMaterialFrame src={playbackUrl} title={item.name || "Study Material"} />
          </ProtectedContentShell>
        </ContentModal>
      )}
    </>
  );
}

function StudyMaterialFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative">
      <p className="border-b border-white/10 bg-slate-900 px-5 py-2 text-[11px] font-semibold text-slate-300">
        View only on the website. Download is disabled.
      </p>
      <iframe
        key={src}
        src={src}
        title={title}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="origin"
        allowFullScreen
        className="h-[75vh] w-full bg-white"
      />
      <div className="pointer-events-none absolute left-0 right-0 top-10 z-30 h-12 bg-transparent" />
    </div>
  );
}

function ContentModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <h3 className="min-w-0 truncate text-lg font-black text-white">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200 hover:bg-white/15"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ===================== ASSESSMENT LIST =====================
function AssessmentList({ type, batch, items, submissions, onSubmitted, auth, empty }: any) {
  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        items.map((item: any) => (
          <AssessmentCard
            key={item._id}
            type={type}
            batch={batch}
            item={item}
            submission={submissions.find((s: any) => s.resourceId === String(item._id))}
            onSubmitted={onSubmitted}
            auth={auth}
          />
        ))
      ) : (
        <EmptyInline text={empty} />
      )}
    </div>
  );
}

// ===================== ASSESSMENT LIST =====================
function AssessmentCard({ type, batch, item, submission, onSubmitted, auth }: any) {
  const [started, setStarted] = useState(false);
  const [seconds, setSeconds] = useState(Number(item.durationMinutes || 0) * 60);
  const [submitting, setSubmitting] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [identity, setIdentity] = useState({ name: "", email: "" });
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [answerSheetId, setAnswerSheetId] = useState<string | null>(null);
  const [fileOpenError, setFileOpenError] = useState("");
  const [activeFileViewer, setActiveFileViewer] = useState<"question" | "answerSheet" | null>(null);
  const [fileViewerUrl, setFileViewerUrl] = useState("");
  const watermark = getWatermarkLabels(auth);

  const isMcq = item.isMcq === true && Array.isArray(item.questions) && item.questions.length > 0;

  const openAssessmentFile = async (rawUrl: string, fileKind: "question" | "answerSheet") => {
    if (!rawUrl) return;

    const session = auth();
    if (!session.user || !session.sessionToken || !session.deviceId) {
      window.location.href = "/login";
      return;
    }

    setFileOpenError("");
    const proxyUrl = buildBatchContentProxyUrl({
      batchId: String(batch._id),
      userId: session.user._id,
      sessionToken: session.sessionToken,
      deviceId: session.deviceId,
      resourceId: String(item._id),
      resourceType: type,
      fileKind,
    });

    setFileViewerUrl(proxyUrl);
    setActiveFileViewer(fileKind);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setIdentity({ name: user.name || "", email: user.email || "" });
    }
  }, []);

  useEffect(() => {
    if (!started || submission || Number(item.durationMinutes || 0) <= 0) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) { window.clearInterval(timer); submit(true); return 0; }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, submission]);

  const now = Date.now();
  const startsAt = item.scheduledAt ? new Date(item.scheduledAt).getTime() : 0;
  const dueAt = item.dueDate ? new Date(item.dueDate).getTime() : 0;
  const notStarted = startsAt && now < startsAt;
  const closed = dueAt && now > dueAt;
  const canStart = !notStarted && !closed && (!submission || item.allowRetake);

  const upload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", `submissions/${batch.code || batch.name}/${type}`);
    const storedUser = localStorage.getItem("user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    formData.append("userId", parsedUser?._id || "");
    formData.append("sessionToken", localStorage.getItem("sessionToken") || "");
    formData.append("deviceId", localStorage.getItem("deviceId") || "");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) setFileUrl(data.url);
    else notify(data.message || "Upload failed");
  };

  const submit = async (autoSubmitted = false) => {
    if (submitting || submission) return;
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const duration = Number(item.durationMinutes || 0) * 60;
    setSubmitting(true);
    const mcqAnswersArray = Object.entries(mcqAnswers).map(([questionId, selectedAnswer]) => ({ questionId, selectedAnswer }));
    const res = await fetch("/api/batch-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        batchId: batch._id,
        resourceId: item._id,
        resourceType: type,
        userId: user?._id,
        sessionToken: localStorage.getItem("sessionToken"),
        deviceId: localStorage.getItem("deviceId"),
        name: identity.name,
        email: identity.email,
        answerText,
        fileUrl,
        autoSubmitted,
        elapsedSeconds: duration > 0 ? duration - seconds : 0,
        mcqAnswers: mcqAnswersArray,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      trackEvent(type === "test" ? "test_submitted" : "assignment_submitted", {
        batchId: String(batch._id || ""),
        batchName: batch.name || "",
        resourceId: String(item._id || ""),
        resourceName: item.title || "",
      });
      onSubmitted();
    } else {
      notify(data.message || "Submission failed");
    }
  };

  return (
    <>
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
            <CheckCircle2 size={16} />
            {type === "test" ? "Test" : "Assignment"}
            {isMcq && <span className="text-xs bg-blue-500/15 text-blue-300 border border-blue-400/20 px-2 py-0.5 rounded-full font-bold">MCQ</span>}
          </div>
          <h3 className="text-2xl font-bold mt-3">{item.title}</h3>
          <p className="text-slate-400 mt-2 whitespace-pre-wrap">{item.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
            {item.scheduledAt && <span>Start: {formatDate(item.scheduledAt)}</span>}
            {item.dueDate && <span>Due: {formatDate(item.dueDate)}</span>}
            {Number(item.durationMinutes || 0) > 0 && <span>Timer: {item.durationMinutes} min</span>}
            {isMcq ? (
              <span>{item.questions.length} questions · {item.questions.reduce((s: number, q: any) => s + Number(q.marks || 1), 0)} marks</span>
            ) : Number(item.totalMarks || 0) > 0 ? (
              <span>Marks: {item.totalMarks}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {item.fileUrl && (
            <button
              type="button"
              onClick={() => openAssessmentFile(item.fileUrl, "question")}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 font-bold text-white"
            >
              <Download size={18} />Question
            </button>
          )}
          {item.link && <a href={item.link} target="_blank" className="rounded-2xl bg-white/10 border border-white/10 px-5 py-3 font-bold">Open Link</a>}
        </div>
        {fileOpenError && (
          <p className="mt-2 text-xs text-red-300">{fileOpenError}</p>
        )}
      </div>

      {submission ? (
        <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
          <div className="flex items-center gap-2 text-emerald-200 font-black"><Award size={18} />Submitted</div>
          {submission.isPublished ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="bg-white/10 px-3 py-1.5 rounded-xl text-emerald-200 font-bold">
                  {submission.obtainedMarks ?? submission.marksAwarded} / {submission.totalMarks} marks
                </span>
                {submission.isMcq && (
                  <>
                    <span className="bg-white/10 px-3 py-1.5 rounded-xl text-slate-300">
                      {submission.correctAnswers}/{submission.totalQuestions} correct
                    </span>
                    <span className={`px-3 py-1.5 rounded-xl font-bold ${
                      submission.percentage >= 70 ? "bg-emerald-500/20 text-emerald-300" :
                      submission.percentage >= 40 ? "bg-amber-500/20 text-amber-300" :
                      "bg-red-500/20 text-red-300"
                    }`}>
                      {submission.percentage}%
                    </span>
                  </>
                )}
              </div>
              {submission.adminComment && (
                <p className="mt-2 text-sm text-slate-200">
                  <span className="text-slate-400">Comment: </span>{submission.adminComment}
                </p>
              )}
              {submission.adminFeedback && (
                <p className="mt-1 text-sm text-slate-200">
                  <span className="text-slate-400">Feedback: </span>{submission.adminFeedback}
                </p>
              )}
              {submission.remarks && (
                <p className="mt-1 text-sm text-slate-300">
                  <span className="text-slate-400">Remarks: </span>{submission.remarks}
                </p>
              )}
              {/* My Ranking */}
              {submission.isMcq && item._id && (
                <StudentRankWidget testId={String(item._id)} myUserId={submission.userId} auth={auth} />
              )}
              {/* Answer Sheet Review button — only for MCQ tests */}
              {submission.isMcq && (
                <button
                  onClick={() => setAnswerSheetId(String(submission._id))}
                  className="mt-3 flex items-center gap-2 rounded-xl bg-blue-500/15 border border-blue-400/20 hover:bg-blue-500/25 px-4 py-2.5 text-sm font-bold text-blue-400 transition-colors"
                >
                  <ClipboardList size={15} /> View Answer Sheet
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-300">
                Submitted on {new Date(submission.createdAt).toLocaleDateString("en-IN")}
              </p>
              <p className="text-sm text-slate-400">Result will be published by the instructor.</p>
              {/* For MCQ, allow answer sheet review even before result is published */}
              {submission.isMcq && (
                <button
                  onClick={() => setAnswerSheetId(String(submission._id))}
                  className="mt-2 flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-400/15 hover:bg-blue-500/20 px-4 py-2 text-xs font-bold text-blue-400 transition-colors"
                >
                  <ClipboardList size={13} /> Review Your Answers
                </button>
              )}
            </div>
          )}
          {item.answerSheetUrl && (
            <button
              type="button"
              onClick={() => openAssessmentFile(item.answerSheetUrl, "answerSheet")}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-slate-950"
            >
              View Answer Sheet
            </button>
          )}
        </div>
      ) : started ? (
        <div className="mt-5 rounded-3xl border border-blue-300/20 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2 text-blue-200 font-black">
            <Clock size={18} /> Time Left: {formatTimer(seconds)}
          </div>
          <div className="grid gap-4">
            <input value={identity.name} onChange={(e) => setIdentity({ ...identity, name: e.target.value })} placeholder="Name" className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none" />
            <input value={identity.email} onChange={(e) => setIdentity({ ...identity, email: e.target.value })} placeholder="Email" className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none" />

            {isMcq ? (
              <div className="space-y-5">
                {item.questions.map((q: any, qi: number) => (
                  <div key={q._id || qi} className="rounded-2xl border border-white/10 bg-black/20 p-5">
                    <p className="font-bold text-sm mb-3">
                      <span className="text-blue-400 mr-2">Q{qi + 1}.</span>
                      {q.question}
                      <span className="text-xs text-slate-400 ml-2">({q.marks} mark{q.marks !== 1 ? "s" : ""})</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const optText = (q as any)[`option${opt}`];
                        if (!optText) return null;
                        const selected = mcqAnswers[q._id] === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setMcqAnswers({ ...mcqAnswers, [q._id]: opt })}
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all ${
                              selected
                                ? "bg-gradient-to-r from-[#2563eb] to-[#1a4fd6] text-white border border-blue-400"
                                : "bg-black/20 border border-white/10 text-slate-300 hover:border-blue-400/40"
                            }`}
                          >
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${selected ? "bg-white/20" : "bg-white/10"}`}>{opt}</span>
                            {optText}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={6} placeholder="Write answer here..." className="resize-none rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none" />
                <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-5 py-3 font-bold">
                  <Upload size={18} /> Upload Answer File
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {fileUrl && <a href={fileUrl} target="_blank" className="text-blue-200 font-semibold">Uploaded file ready</a>}
              </>
            )}

            <button disabled={submitting} onClick={() => submit(false)} className="inline-flex w-fit items-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 font-black text-white">
              <Send size={18} /> {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>
      ) : (
        <button
          disabled={!canStart}
          onClick={() => {
            setStarted(true);
            trackEvent(type === "test" ? "test_started" : "assignment_opened", {
              batchId: String(batch._id || ""),
              batchName: batch.name || "",
              resourceId: String(item._id || ""),
              resourceName: item.title || "",
            });
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 font-black text-white disabled:bg-slate-700 disabled:text-slate-400"
        >
          <PlayCircle size={20} />
          {notStarted ? "Not Started" : closed ? "Closed" : `Start ${type === "test" ? "Test" : "Assignment"}`}
        </button>
      )}
    </div>
    {/* Answer Sheet Modal */}
    {answerSheetId && (
      <AnswerSheetModal
        submissionId={answerSheetId}
        auth={auth}
        onClose={() => setAnswerSheetId(null)}
      />
    )}

    {activeFileViewer && fileViewerUrl && (
      <ContentModal
        title={activeFileViewer === "answerSheet" ? "Answer Sheet" : "Question Paper"}
        onClose={() => {
          setActiveFileViewer(null);
          setFileViewerUrl("");
        }}
      >
        <ProtectedContentShell {...watermark}>
          <iframe
            src={`${fileViewerUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            title={activeFileViewer === "answerSheet" ? "Answer Sheet" : "Question Paper"}
            className="h-[75vh] w-full bg-white"
          />
          <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-12 bg-white" />
        </ProtectedContentShell>
      </ContentModal>
    )}
    </>
  );
}

// ===================== HELPERS =====================
function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-black/15 border border-white/10 p-2 text-center">
      <p className="font-black text-sm">{value}</p>
      <p className="text-[9px] uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function Empty({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-12 text-center ${danger ? "border-red-400/20 bg-red-500/[0.08] text-red-300" : "border-white/[0.07] bg-white/[0.03] text-slate-400"}`}>
      {text}
    </div>
  );
}

function EmptyInline({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/[0.10] p-8 text-center text-slate-500 text-sm">{text}</div>;
}

function active(items: any[] = []) {
  return items.filter((item) => item.isActive !== false);
}

function formatDate(value?: string) {
  if (!value) return "Date not shared";
  try { return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return value; }
}

function formatTimer(value: number) {
  const minutes = Math.floor(Math.max(0, value) / 60);
  const secs = Math.max(0, value) % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function noticeBadge(priority: string) {
  if (priority === "urgent") return "inline-flex rounded-full bg-red-500/15 text-red-200 border border-red-400/20 px-3 py-1 text-xs font-bold capitalize";
  if (priority === "important") return "inline-flex rounded-full bg-amber-500/15 text-amber-200 border border-amber-400/20 px-3 py-1 text-xs font-bold capitalize";
  return "inline-flex rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/20 px-3 py-1 text-xs font-bold capitalize";
}

// ===================== STUDENT RANK WIDGET =====================
function StudentRankWidget({ testId, myUserId, auth }: {
  testId: string;
  myUserId: string;
  auth: () => { user: any; sessionToken: string; deviceId: string };
}) {
  const [ranking, setRanking] = useState<any | null>(null);
  const [total, setTotal] = useState(0);
  const [top3, setTop3] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { user, sessionToken, deviceId } = auth();
      const params = new URLSearchParams({
        userId: user?._id || "",
        sessionToken,
        deviceId,
      });
      const res = await fetch(`/api/tests/${testId}/rankings?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        const all: any[] = data.rankings || [];
        setTotal(all.length);
        setTop3(all.slice(0, 3));
        const mine = all.find((r: any) => String(r.userId) === String(myUserId));
        setRanking(mine || null);
      }
    } catch (e) {}
    finally { setLoading(false); setLoaded(true); }
  };

  if (!loaded) {
    return (
      <button
        onClick={load}
        disabled={loading}
        className="mt-3 flex items-center gap-2 text-xs text-amber-300 border border-amber-400/30 bg-amber-500/10 px-4 py-2 rounded-xl font-bold hover:bg-amber-500/20 transition-colors disabled:opacity-50"
      >
        <Trophy size={13} /> {loading ? "Loading rankings..." : "View My Ranking"}
      </button>
    );
  }

  const medalEmoji: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
          <Trophy size={15} /> Leaderboard
        </div>
        <button onClick={load} className="text-xs text-amber-400/70 hover:text-amber-300">↻ Refresh</button>
      </div>

      {/* My rank card */}
      {ranking ? (
        <div className="mb-3 bg-white/10 rounded-xl p-3 border border-amber-400/30">
          <p className="text-xs text-amber-200/70 mb-1">Your Ranking</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-amber-300">
                {ranking.rank <= 3 ? medalEmoji[ranking.rank] : `#${ranking.rank}`}
              </span>
              <span className="text-sm text-slate-200 font-semibold">out of {total} student{total !== 1 ? "s" : ""}</span>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-white">{ranking.obtainedMarks}{ranking.totalMarks > 0 ? <span className="text-xs font-normal text-slate-400">/{ranking.totalMarks}</span> : null}</div>
              {ranking.percentage > 0 && (
                <div className={`text-xs font-bold ${ranking.percentage >= 70 ? "text-emerald-300" : ranking.percentage >= 40 ? "text-amber-300" : "text-red-300"}`}>{ranking.percentage}%</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mb-3">Your rank is not available yet.</p>
      )}

      {/* Top 3 */}
      {top3.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1">Top Performers</p>
          {top3.map((entry) => (
            <div
              key={entry._id}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${String(entry.userId) === String(myUserId) ? "bg-white/15 border border-amber-400/40" : "bg-white/5"}`}
            >
              <span className="text-base shrink-0">{medalEmoji[entry.rank] || `#${entry.rank}`}</span>
              <span className="flex-1 font-semibold text-slate-200 truncate">{entry.name}</span>
              <span className="font-black text-white shrink-0">
                {entry.obtainedMarks}{entry.totalMarks > 0 ? <span className="font-normal text-slate-400">/{entry.totalMarks}</span> : null}
              </span>
              {entry.percentage > 0 && (
                <span className={`font-bold shrink-0 ${entry.percentage >= 70 ? "text-emerald-300" : entry.percentage >= 40 ? "text-amber-300" : "text-red-300"}`}>{entry.percentage}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
