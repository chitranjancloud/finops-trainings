import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import ChatRoom from "@/models/ChatRoom";
import Enrollment from "@/models/Enrollment";
import Message from "@/models/Message";
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

async function visibleRoomIds(user: any) {
  const rooms = await ChatRoom.find({
    $or: [{ type: "group" }, { participants: String(user._id) }],
  }).select("_id batchName");

  const checks = await Promise.all(
    rooms.map(async (room: any) => {
      if (!room.batchName) return true;
      const allowed = await Enrollment.findOne({
        $or: [{ userId: String(user._id) }, { email: user.email }],
        batchName: room.batchName,
        batchBlocked: { $ne: true },
      });
      return Boolean(allowed);
    })
  );

  return rooms.filter((_, index) => checks[index]).map((room: any) => room._id);
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

    const userId = String(user._id);
    const notificationQuery =
      user.role === "admin"
        ? { audience: { $in: ["admin", "all"] }, readBy: { $ne: userId } }
        : {
            readBy: { $ne: userId },
            $or: [
              { audience: "all" },
              { audience: "user", userId: "" },
              { audience: "user", userId },
            ],
          };

    const notifications = await Notification.find(notificationQuery).select("type");
    const typeCount = (types: string[]) =>
      notifications.filter((item: any) => types.includes(item.type)).length;

    const roomIds = user.role === "admin" ? [] : await visibleRoomIds(user);
    const chat =
      user.role === "admin"
        ? typeCount(["chat"])
        : await Message.countDocuments({
            roomId: { $in: roomIds },
            senderId: { $ne: userId },
            readBy: { $ne: userId },
          });

    return NextResponse.json({
      success: true,
      counts: {
        notifications: notifications.length,
        chat,
        meetings: typeCount(["meeting"]),
        batches: typeCount(["batch", "test", "assignment"]),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load badge counts" },
      { status: 500 }
    );
  }
}
