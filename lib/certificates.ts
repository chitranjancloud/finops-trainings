import crypto from "crypto";
import AssessmentSubmission from "@/models/AssessmentSubmission";
import Badge from "@/models/Badge";
import Certificate from "@/models/Certificate";
import CertificateAuditLog from "@/models/CertificateAuditLog";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import StudentActivity from "@/models/StudentActivity";
import StudentBadge from "@/models/StudentBadge";
import User from "@/models/User";

const CERT_SECRET =
  process.env.CERTIFICATE_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "change-this-certificate-secret";

const SYSTEM_BADGES = [
  {
    badgeId: "course-completion",
    name: "Course Completion",
    description: "Awarded after completing all course requirements.",
    icon: "Award",
    criteria: "Course progress reaches 100% and required assessments are passed.",
  },
  {
    badgeId: "top-performer",
    name: "Top Performer",
    description: "Awarded for excellent overall course performance.",
    icon: "Trophy",
    criteria: "Assessment performance is 90% or higher.",
  },
  {
    badgeId: "perfect-score",
    name: "Perfect Score",
    description: "Awarded for scoring 100% in course assessments.",
    icon: "Star",
    criteria: "Assessment score is 100%.",
  },
  {
    badgeId: "fast-learner",
    name: "Fast Learner",
    description: "Awarded for completing the course with strong progress velocity.",
    icon: "Zap",
    criteria: "Course completion reaches 100% with active learning progress.",
  },
  {
    badgeId: "batch-rank-1",
    name: "Batch Rank #1",
    description: "Awarded to the highest scorer in a batch.",
    icon: "Medal",
    criteria: "Rank 1 by published assessment score.",
  },
  {
    badgeId: "batch-rank-2",
    name: "Batch Rank #2",
    description: "Awarded to the second highest scorer in a batch.",
    icon: "Medal",
    criteria: "Rank 2 by published assessment score.",
  },
  {
    badgeId: "batch-rank-3",
    name: "Batch Rank #3",
    description: "Awarded to the third highest scorer in a batch.",
    icon: "Medal",
    criteria: "Rank 3 by published assessment score.",
  },
];

export function getAppOrigin(req?: Request) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (req) {
    const url = new URL(req.url);
    return `${url.protocol}//${url.host}`;
  }
  return "";
}

export function certificateHash(input: {
  uuid: string;
  studentId: string;
  courseId: string;
  issueDate: Date | string;
}) {
  return crypto
    .createHash("sha256")
    .update(
      [
        input.uuid,
        input.studentId,
        input.courseId,
        new Date(input.issueDate).toISOString(),
        CERT_SECRET,
      ].join("|")
    )
    .digest("hex");
}

export function validateCertificateIntegrity(certificate: any) {
  try {
    const expected = certificateHash({
      uuid: certificate.uuid,
      studentId: certificate.studentId,
      courseId: certificate.courseId,
      issueDate: certificate.issuedAt,
    });
    const stored = Buffer.from(String(certificate.verificationHash || ""), "hex");
    const actual = Buffer.from(expected, "hex");
    if (stored.length !== actual.length) return false;
    return crypto.timingSafeEqual(stored, actual);
  } catch {
    return false;
  }
}

export async function auditCertificate(opts: {
  certificateCode?: string;
  action: "generated" | "downloaded" | "verified" | "revoked" | "reactivated" | "expired";
  actorId?: string;
  actorRole?: string;
  message?: string;
  req?: Request;
}) {
  try {
    const ip =
      opts.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      opts.req?.headers.get("x-real-ip") ||
      "";
    await CertificateAuditLog.create({
      certificateCode: opts.certificateCode || "",
      action: opts.action,
      actorId: opts.actorId || "",
      actorRole: opts.actorRole || "",
      message: opts.message || "",
      ipAddress: ip,
      userAgent: (opts.req?.headers.get("user-agent") || "").slice(0, 400),
    });
  } catch {}
}

export async function ensureSystemBadges(courseId = "") {
  const badges = [];
  for (const badge of SYSTEM_BADGES) {
    const saved = await Badge.findOneAndUpdate(
      { badgeId: badge.badgeId },
      { ...badge, courseId: "", isSystem: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    badges.push(saved);
  }
  return badges;
}

export async function awardBadge(opts: {
  studentId: string;
  badgeId: string;
  courseId: string;
  certificateCode: string;
}) {
  return StudentBadge.findOneAndUpdate(
    {
      studentId: opts.studentId,
      badgeId: opts.badgeId,
      courseId: opts.courseId,
    },
    {
      ...opts,
      earnedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function parseCourseHours(duration?: string) {
  const match = String(duration || "").match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 24;
}

export async function calculateCompletion(user: any, enrollment: any, course: any) {
  const activities = await StudentActivity.find({
    userId: String(user._id),
    $or: [
      { courseId: enrollment.courseId || "" },
      { courseId: course.slug || "" },
      { courseName: enrollment.courseName || "" },
      { courseName: course.title || "" },
    ],
  });

  const activeSeconds = activities.reduce(
    (sum: number, item: any) => sum + Number(item.activeSeconds || 0),
    0
  );
  const targetSeconds = parseCourseHours(course.duration) * 3600;
  const progress = Math.min(
    100,
    Math.round((activeSeconds / Math.max(targetSeconds, 1)) * 100)
  );

  const submissions = await AssessmentSubmission.find({
    userId: String(user._id),
    $or: [
      { courseId: enrollment.courseId || "" },
      { courseId: course.slug || "" },
      { courseName: enrollment.courseName || "" },
      { courseName: course.title || "" },
      ...(enrollment.batchId ? [{ batchId: enrollment.batchId }] : []),
      ...(enrollment.batchName ? [{ batchName: enrollment.batchName }] : []),
    ],
  });

  const graded = submissions.filter(
    (item: any) => item.isPublished || item.status === "checked" || item.isMcq
  );
  const failed = graded.filter((item: any) => {
    const total = Number(item.totalMarks || 0);
    const earned = Number(item.obtainedMarks ?? item.marksAwarded ?? 0);
    const percentage = Number(item.percentage || (total > 0 ? (earned / total) * 100 : 0));
    return percentage < 40;
  });
  const score = graded.length
    ? Math.round(
        graded.reduce((sum: number, item: any) => {
          const total = Number(item.totalMarks || 0);
          const earned = Number(item.obtainedMarks ?? item.marksAwarded ?? 0);
          return sum + Number(item.percentage || (total > 0 ? (earned / total) * 100 : 0));
        }, 0) / graded.length
      )
    : 0;

  const reasons = [];
  if (progress < 100) reasons.push("Course progress is not 100% yet.");
  if (failed.length > 0) reasons.push("One or more mandatory assessments are not passed.");

  return {
    eligible: progress >= 100 && failed.length === 0,
    progress,
    score,
    activeSeconds,
    assessmentCount: graded.length,
    reasons,
  };
}

export async function findCourseForEnrollment(enrollment: any) {
  return (
    (await Course.findOne({ slug: enrollment.courseId })) ||
    (await Course.findById(enrollment.courseId).catch(() => null)) ||
    (await Course.findOne({ title: enrollment.courseName }))
  );
}

export async function verifyActiveSession(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (
    !user ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) {
    return null;
  }
  return user;
}

export async function createCertificateForEnrollment(opts: {
  user: any;
  enrollment: any;
  req?: Request;
  bypassEligibility?: boolean;
  actor?: any;
}) {
  const course = await findCourseForEnrollment(opts.enrollment);
  if (!course) {
    return { success: false, message: "Course not found." };
  }

  const existing = await Certificate.findOne({
    studentId: String(opts.user._id),
    courseId: course.slug || String(course._id),
  });
  if (existing) {
    return { success: true, certificate: existing, existing: true };
  }

  const completion = await calculateCompletion(opts.user, opts.enrollment, course);
  if (!opts.bypassEligibility && !completion.eligible) {
    return {
      success: false,
      message: completion.reasons.join(" ") || "Certificate requirements are not complete.",
      completion,
    };
  }

  await ensureSystemBadges(course.slug || String(course._id));

  let certificateCode = "";
  for (let i = 0; i < 5; i += 1) {
    certificateCode = `CERT-${new Date().getFullYear()}-${crypto
      .randomBytes(6)
      .toString("hex")
      .toUpperCase()}`;
    const exists = await Certificate.exists({ certificateCode });
    if (!exists) break;
  }

  const uuid = crypto.randomUUID();
  const issuedAt = new Date();
  const courseId = course.slug || String(course._id);
  const origin = getAppOrigin(opts.req);
  const badgeIds = ["course-completion"];
  if (completion.score >= 90) badgeIds.push("top-performer");
  if (completion.score >= 100) badgeIds.push("perfect-score");
  if (completion.activeSeconds > 0) badgeIds.push("fast-learner");

  const certificate = await Certificate.create({
    uuid,
    certificateCode,
    studentId: String(opts.user._id),
    studentName: opts.user.name,
    studentEmail: opts.user.email,
    courseId,
    courseName: course.title || opts.enrollment.courseName || "Course",
    batchId: opts.enrollment.batchId || "",
    batchName: opts.enrollment.batchName || "",
    completionDate: issuedAt,
    issuedAt,
    verificationHash: certificateHash({
      uuid,
      studentId: String(opts.user._id),
      courseId,
      issueDate: issuedAt,
    }),
    credentialUrl: origin ? `${origin}/credential/${certificateCode}` : `/credential/${certificateCode}`,
    verificationUrl: origin ? `${origin}/verify/${certificateCode}` : `/verify/${certificateCode}`,
    badgeIds,
    skills: Array.isArray(course.learn) ? course.learn.slice(0, 12) : [],
    completion: completion.progress,
    assessmentScore: completion.score,
    metadata: {
      assessmentCount: completion.assessmentCount,
      activeSeconds: completion.activeSeconds,
      manuallyIssued: opts.bypassEligibility === true,
    },
    history: [
      {
        action: "generated",
        actorId: String(opts.actor?._id || opts.user._id),
        actorRole: opts.actor?.role || "user",
        reason: opts.bypassEligibility ? "Manual admin generation for testing/verification." : "",
      },
    ],
  });

  for (const badgeId of badgeIds) {
    await awardBadge({
      studentId: String(opts.user._id),
      badgeId,
      courseId,
      certificateCode,
    });
  }

  await auditCertificate({
    certificateCode,
    action: "generated",
    actorId: String(opts.actor?._id || opts.user._id),
    actorRole: opts.actor?.role || "user",
    message: opts.bypassEligibility
      ? "Certificate manually generated by admin for testing/verification."
      : "Certificate generated automatically after eligibility check.",
    req: opts.req,
  });

  return { success: true, certificate, existing: false };
}
