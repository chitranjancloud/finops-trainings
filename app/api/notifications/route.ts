import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

async function verifySession(userId: string, sessionToken: string, deviceId: string) {
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

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const user = await verifySession(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const query =
      user.role === "admin"
        ? { audience: { $in: ["admin", "all"] } }
        : {
            $or: [
              { audience: "all" },
              { audience: "user", userId: "" },
              { audience: "user", userId: String(user._id) },
            ],
          };

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(200);

    return NextResponse.json({
      success: true,
      notifications,
      unread: notifications.filter((item: any) => !item.readBy?.includes(String(user._id))).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const user = await verifySession(body.userId || "", body.sessionToken || "", body.deviceId || "");

    if (!user) {
      return NextResponse.json({ success: false, message: "Session expired" }, { status: 401 });
    }

    const filter: any = {};
    if (body.notificationId) {
      filter._id = body.notificationId;
    }
    if (Array.isArray(body.types) && body.types.length > 0) {
      filter.type = { $in: body.types };
    }

    await Notification.updateMany(filter, { $addToSet: { readBy: String(user._id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update notifications" },
      { status: 500 }
    );
  }
}
