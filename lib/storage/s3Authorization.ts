import { verifyTenantSession } from "@/lib/auth/tenantSession";
import { verifyBatchEnrollment, verifyCourseEnrollment } from "@/lib/auth/protectedContentAccess";
import { requireTenantId, withTenantScope } from "@/lib/platform/runtime";
import { connectDB } from "@/lib/mongodb";
import Course from "@/models/Course";
import Batch from "@/models/Batch";
import { objectId, StorageError } from "./s3Validation";

export type StorageUser = { _id: unknown; email: string; name: string; role: string; activeDevice: string };
export async function storageUser(req: Request, admin = false): Promise<StorageUser> {
  if (!req.headers.get("x-user-id")) throw new StorageError(401, "Please log in again.");
  const userId = objectId(req.headers.get("x-user-id"), "user ID");
  const session = req.headers.get("x-session-token") || "";
  const device = req.headers.get("x-device-id") || "";
  if (!session || !device || session.length > 200 || device.length > 200) throw new StorageError(401, "Please log in again.");
  await connectDB();
  const user = await verifyTenantSession(userId, session, device);
  if (!user) throw new StorageError(401, "Session expired. Please log in again.");
  if (admin && user.role !== "admin") throw new StorageError(403, "Administrator access required.");
  return user as StorageUser;
}

export async function authorizeScope(user: StorageUser, courseId: string, batchId: string, uploading = false) {
  const course = await Course.findOne(withTenantScope({ _id: objectId(courseId, "course ID") }));
  if (!course) throw new StorageError(404, "Course not found.");
  if (batchId) {
    const batch = await Batch.findOne(withTenantScope({ _id: objectId(batchId, "batch ID"), isActive: { $ne: false } }));
    if (!batch || ![String(course._id), course.slug].includes(String(batch.courseId))) {
      throw new StorageError(403, "Batch does not belong to this course or is inactive.");
    }
    if (user.role !== "admin" && !(await verifyBatchEnrollment(user, batch))) throw new StorageError(403, "You are not enrolled in this batch.");
  } else if (user.role !== "admin" && !(await verifyCourseEnrollment(user, course))) {
    throw new StorageError(403, "You are not enrolled in this course.");
  }
  if (uploading && user.role !== "admin") throw new StorageError(403, "Administrator access required.");
}

// New S3 collections NEVER include the legacy empty-tenant compatibility rows.
export function strictScope(extra: Record<string, unknown> = {}) {
  return { ...extra, tenantId: requireTenantId() };
}
