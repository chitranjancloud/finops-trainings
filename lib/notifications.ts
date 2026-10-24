import Notification from "@/models/Notification";

type NotificationInput = {
  audience?: "admin" | "user" | "all";
  userId?: string;
  type?: string;
  title: string;
  message?: string;
  link?: string;
  meta?: Record<string, any>;
};

export async function createNotification(input: NotificationInput) {
  try {
    return await Notification.create({
      audience: input.audience || "admin",
      userId: input.userId || "",
      type: input.type || "activity",
      title: input.title,
      message: input.message || "",
      link: input.link || "",
      meta: input.meta || {},
    });
  } catch (error) {
    console.log("NOTIFICATION CREATE ERROR:", error);
    return null;
  }
}
