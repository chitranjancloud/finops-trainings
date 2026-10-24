"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Download,
  Printer,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Award,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  BookOpen,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuestionSnapshot {
  questionId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  selectedAnswer: "A" | "B" | "C" | "D" | "";
  marks: number;
}

interface SubmissionData {
  _id: string;
  resourceTitle: string;
  batchName: string;
  courseName?: string;
  name: string;
  email: string;
  createdAt: string;
  totalQuestions: number;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  elapsedSeconds?: number;
  questionSnapshot: QuestionSnapshot[];
}

interface AnswerSheetModalProps {
  submissionId: string;
  auth: () => { user: any; sessionToken: string; deviceId: string };
  onClose: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function getQuestionStatus(q: QuestionSnapshot): "correct" | "wrong" | "unattempted" {
  if (!q.selectedAnswer) return "unattempted";
  return q.selectedAnswer === q.correctAnswer ? "correct" : "wrong";
}

// ─── Print / PDF styles ───────────────────────────────────────────────────────

const PRINT_STYLES = `
@media print {
  body * { visibility: hidden !important; }
  #answer-sheet-print, #answer-sheet-print * { visibility: visible !important; }
  #answer-sheet-print {
    position: fixed !important;
    inset: 0 !important;
    z-index: 99999 !important;
    background: white !important;
    padding: 24px !important;
    overflow: auto !important;
  }
  .no-print { display: none !important; }
}
`;

// ─── Answer Sheet Modal ───────────────────────────────────────────────────────

export default function AnswerSheetModal({ submissionId, auth, onClose }: AnswerSheetModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<SubmissionData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnswerSheet = async () => {
      try {
        const { user, sessionToken, deviceId } = auth();
        const params = new URLSearchParams({
          userId: user?._id || "",
          sessionToken,
          deviceId,
        });
        const res = await fetch(
          `/api/batch-submissions/${submissionId}/answer-sheet?${params}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.success) {
          setData(json.submission);
        } else {
          setError(json.message || "Failed to load answer sheet");
        }
      } catch {
        setError("Failed to load answer sheet");
      } finally {
        setLoading(false);
      }
    };
    fetchAnswerSheet();
  }, [submissionId]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // PDF download via print-to-PDF
  const handleDownloadPdf = () => {
    window.print();
  };

  // Computed stats
  const unattempted = data
    ? data.totalQuestions - data.correctAnswers - data.wrongAnswers
    : 0;
  const accuracy =
    data && data.correctAnswers + data.wrongAnswers > 0
      ? Math.round((data.correctAnswers / (data.correctAnswers + data.wrongAnswers)) * 100)
      : 0;

  return (
    <>
      {/* Print-only styles */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
        onClick={handleBackdrop}
      >
        {/* Modal container */}
        <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-white/[0.10] bg-[#0f172a] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.04] shrink-0 no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                <BookOpen size={16} className="text-blue-300" />
              </div>
              <div>
                <p className="font-black text-white text-sm">Answer Sheet Review</p>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  {data?.resourceTitle || "Loading..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition-colors"
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 px-3 py-2 text-xs font-bold text-white transition-colors"
                  >
                    <Download size={13} /> PDF
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
              >
                <X size={15} className="text-slate-300" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                <p className="text-slate-400 text-sm">Loading answer sheet...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
                <AlertCircle size={32} className="text-red-400" />
                <p className="text-red-300 text-sm text-center">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-slate-200"
                >
                  Close
                </button>
              </div>
            )}

            {data && (
              <div ref={printRef} id="answer-sheet-print" className="p-6 space-y-6">
                {/* ── Print header (shown in print only) ── */}
                <div className="hidden print:block mb-6 pb-4 border-b-2 border-gray-200">
                  <h1 className="text-2xl font-black text-gray-900">Answer Sheet Review</h1>
                  <p className="text-gray-600 mt-1">{data.resourceTitle}</p>
                </div>

                {/* ── Test info ── */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 print:border print:border-gray-200 print:bg-gray-50">
                  <h2 className="text-lg font-black text-white print:text-gray-900 mb-4">
                    {data.resourceTitle}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <InfoPair label="Student" value={data.name} />
                    <InfoPair label="Batch" value={data.batchName} />
                    {data.courseName && <InfoPair label="Course" value={data.courseName} />}
                    <InfoPair label="Submitted" value={formatDate(data.createdAt)} />
                    {data.elapsedSeconds ? (
                      <InfoPair label="Time Taken" value={formatElapsed(data.elapsedSeconds)} />
                    ) : null}
                    <InfoPair label="Total Questions" value={String(data.totalQuestions)} />
                  </div>
                </div>

                {/* ── Performance summary cards ── */}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Performance Summary
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    <SummaryCard
                      label="Score"
                      value={`${data.obtainedMarks}/${data.totalMarks}`}
                      color="cyan"
                      icon={<Award size={14} />}
                    />
                    <SummaryCard
                      label="Percentage"
                      value={`${data.percentage}%`}
                      color={data.percentage >= 70 ? "emerald" : data.percentage >= 40 ? "amber" : "red"}
                      icon={<TrendingUp size={14} />}
                    />
                    <SummaryCard
                      label="Correct"
                      value={String(data.correctAnswers)}
                      color="emerald"
                      icon={<CheckCircle2 size={14} />}
                    />
                    <SummaryCard
                      label="Wrong"
                      value={String(data.wrongAnswers)}
                      color="red"
                      icon={<XCircle size={14} />}
                    />
                    <SummaryCard
                      label="Skipped"
                      value={String(unattempted)}
                      color="slate"
                      icon={<MinusCircle size={14} />}
                    />
                    <SummaryCard
                      label="Accuracy"
                      value={`${accuracy}%`}
                      color={accuracy >= 70 ? "emerald" : accuracy >= 40 ? "amber" : "red"}
                      icon={<Target size={14} />}
                    />
                  </div>
                </div>

                {/* ── Question-wise review ── */}
                {data.questionSnapshot && data.questionSnapshot.length > 0 ? (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Question-wise Review ({data.questionSnapshot.length} Questions)
                    </p>
                    <div className="space-y-4">
                      {data.questionSnapshot.map((q, idx) => (
                        <QuestionReviewCard key={q.questionId || idx} q={q} index={idx} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-5 text-center">
                    <AlertCircle size={24} className="text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-amber-200 font-semibold">Detailed question review not available</p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      This submission was made before detailed answer sheets were enabled.
                    </p>
                  </div>
                )}

                {/* ── Print footer ── */}
                <div className="hidden print:block mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between">
                  <span>Generated from FinOps Trainings</span>
                  <span>{new Date().toLocaleDateString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5 print:text-gray-500">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-200 print:text-gray-800">{value}</p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: "cyan" | "emerald" | "amber" | "red" | "slate";
  icon: React.ReactNode;
}) {
  const colorMap = {
    cyan: "bg-blue-500/15 border-blue-400/25 text-blue-300",
    emerald: "bg-emerald-500/15 border-emerald-400/25 text-emerald-300",
    amber: "bg-amber-500/15 border-amber-400/25 text-amber-300",
    red: "bg-red-500/15 border-red-400/25 text-red-300",
    slate: "bg-slate-500/15 border-slate-400/25 text-slate-300",
  };
  const printMap = {
    cyan: "print:bg-blue-50 print:border-blue-200 print:text-blue-700",
    emerald: "print:bg-green-50 print:border-green-200 print:text-green-700",
    amber: "print:bg-yellow-50 print:border-yellow-200 print:text-yellow-700",
    red: "print:bg-red-50 print:border-red-200 print:text-red-700",
    slate: "print:bg-gray-50 print:border-gray-200 print:text-gray-700",
  };

  return (
    <div
      className={`rounded-2xl border p-3 text-center ${colorMap[color]} ${printMap[color]}`}
    >
      <div className="flex justify-center mb-1.5 opacity-80">{icon}</div>
      <p className="text-lg font-black">{value}</p>
      <p className="text-[9px] uppercase tracking-widest opacity-70 mt-0.5">{label}</p>
    </div>
  );
}

function QuestionReviewCard({ q, index }: { q: QuestionSnapshot; index: number }) {
  const status = getQuestionStatus(q);

  const statusConfig = {
    correct: {
      border: "border-emerald-400/30",
      bg: "bg-emerald-500/[0.07]",
      badge: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
      label: "Correct",
      icon: <CheckCircle2 size={13} />,
      printBorder: "print:border-green-300",
      printBg: "print:bg-green-50",
    },
    wrong: {
      border: "border-red-400/30",
      bg: "bg-red-500/[0.07]",
      badge: "bg-red-500/20 text-red-300 border-red-400/30",
      label: "Incorrect",
      icon: <XCircle size={13} />,
      printBorder: "print:border-red-300",
      printBg: "print:bg-red-50",
    },
    unattempted: {
      border: "border-white/10",
      bg: "bg-white/[0.03]",
      badge: "bg-slate-500/20 text-slate-400 border-slate-400/20",
      label: "Not Attempted",
      icon: <MinusCircle size={13} />,
      printBorder: "print:border-gray-300",
      printBg: "print:bg-gray-50",
    },
  };

  const cfg = statusConfig[status];

  const opts = [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD },
  ].filter(
    (o): o is { key: "A" | "B" | "C" | "D"; text: string } => Boolean(o.text)
  );

  return (
    <div
      className={`rounded-2xl border p-5 ${cfg.border} ${cfg.bg} ${cfg.printBorder} ${cfg.printBg}`}
    >
      {/* Question header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-xs font-black text-slate-300 shrink-0 print:bg-gray-100 print:text-gray-700">
            {index + 1}
          </span>
          <p className="text-sm font-semibold text-slate-100 leading-relaxed print:text-gray-900">
            {q.question}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.badge}`}
          >
            {cfg.icon} {cfg.label}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold print:text-gray-500">
            {q.marks}m
          </span>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opts.map((opt) => {
          const isCorrect = opt.key === q.correctAnswer;
          const isSelected = opt.key === q.selectedAnswer;
          const isWrongSelected = isSelected && !isCorrect;

          let cls =
            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm border transition-all ";

          if (isCorrect && isSelected) {
            // Student picked correct answer
            cls +=
              "bg-emerald-500/20 border-emerald-400/50 text-emerald-200 print:bg-green-100 print:border-green-400 print:text-green-800";
          } else if (isCorrect && !isSelected) {
            // Correct answer but student didn't pick it
            cls +=
              "bg-emerald-500/10 border-emerald-400/30 text-emerald-300/80 print:bg-green-50 print:border-green-300 print:text-green-700";
          } else if (isWrongSelected) {
            // Student's wrong pick
            cls +=
              "bg-red-500/20 border-red-400/50 text-red-200 print:bg-red-100 print:border-red-400 print:text-red-800";
          } else {
            // Regular unselected wrong option
            cls +=
              "bg-white/[0.04] border-white/10 text-slate-400 print:bg-white print:border-gray-200 print:text-gray-600";
          }

          return (
            <div key={opt.key} className={cls}>
              {/* Option badge */}
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  isCorrect && isSelected
                    ? "bg-emerald-400/30 print:bg-green-200"
                    : isCorrect
                    ? "bg-emerald-400/20 print:bg-green-100"
                    : isWrongSelected
                    ? "bg-red-400/30 print:bg-red-200"
                    : "bg-white/10 print:bg-gray-100"
                }`}
              >
                {opt.key}
              </span>
              <span className="flex-1 leading-snug">{opt.text}</span>

              {/* Indicator icons */}
              <div className="flex items-center gap-1 shrink-0">
                {isCorrect && (
                  <span
                    className="text-[10px] font-bold text-emerald-400 print:text-green-700"
                    title="Correct Answer"
                  >
                    ✓ Correct
                  </span>
                )}
                {isSelected && isWrongSelected && (
                  <span
                    className="text-[10px] font-bold text-red-400 print:text-red-700"
                    title="Your Answer"
                  >
                    ✗ Your Answer
                  </span>
                )}
                {isSelected && isCorrect && (
                  <span
                    className="text-[10px] font-bold text-emerald-400 print:text-green-700"
                    title="Your Answer"
                  >
                    · Your Answer
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Not attempted notice */}
      {status === "unattempted" && (
        <p className="mt-3 text-xs text-slate-500 italic print:text-gray-400">
          ⚪ You did not attempt this question. Correct answer: {q.correctAnswer}
        </p>
      )}
    </div>
  );
}
