/**
 * trackEvent — fire a discrete student activity event.
 * Call this from any student-facing page for actions listed below.
 * Silent-fails so it never disrupts the user experience.
 *
 * Usage:
 *   import { trackEvent } from "@/lib/trackEvent";
 *   trackEvent("video_started", { courseId: "...", courseName: "...", resourceName: "Lesson 1" });
 */
export type EventType =
  | "login"
  | "logout"
  | "course_opened"
  | "video_started"
  | "video_completed"
  | "material_downloaded"
  | "assignment_opened"
  | "assignment_submitted"
  | "test_started"
  | "test_submitted"
  | "certificate_downloaded";

interface EventMeta {
  courseId?:     string;
  courseName?:   string;
  batchId?:      string;
  batchName?:    string;
  resourceId?:   string;
  resourceName?: string;
}

export async function trackEvent(
  eventType: EventType,
  meta: EventMeta = {}
): Promise<void> {
  try {
    const raw = typeof window !== "undefined" && localStorage.getItem("user");
    if (!raw) return;
    const user = JSON.parse(raw);
    const sessionToken = localStorage.getItem("sessionToken") || "";
    const deviceId     = localStorage.getItem("deviceId")     || "";
    if (!user?._id || !sessionToken || !deviceId) return;

    await fetch("/api/admin/student-monitoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id,
        sessionToken,
        deviceId,
        eventType,
        ...meta,
      }),
    });
  } catch {
    // never surface errors to the user
  }
}
