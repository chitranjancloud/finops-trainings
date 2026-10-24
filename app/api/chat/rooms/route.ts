import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ChatRoom from "@/models/ChatRoom";
import Enrollment from "@/models/Enrollment";
import Message from "@/models/Message";

async function ensureGeneralRoom(userId?: string) {
  let room = await ChatRoom.findOne({
    type: "group",
    name: "FinOps Student Group",
  });

  if (!room) {
    room = await ChatRoom.create({
      type: "group",
      name: "FinOps Student Group",
      description: "Common group for course updates, support, notes, and student questions.",
      participants: [],
      lastMessage: "Welcome to FinOps Student Group",
    });
  }

  if (userId && !room.participants.map(String).includes(String(userId))) {
    room.participants.push(userId);
    await room.save();
  }

  return room;
}

async function ensureEnrollmentRooms(userId?: string) {
  if (!userId) return [];

  const enrollments = await Enrollment.find({
    userId,
    batchName: {
      $ne: "",
    },
    batchBlocked: { $ne: true },
  });

  const rooms = [];

  for (const enrollment of enrollments) {
    const roomName = enrollment.batchName || enrollment.courseName || "Course Group";

    let room = await ChatRoom.findOne({
      type: "group",
      name: roomName,
    });

    if (!room) {
      room = await ChatRoom.create({
        type: "group",
        name: roomName,
        description: enrollment.courseName
          ? `Batch discussion for ${enrollment.courseName}`
          : "Batch discussion group",
        participants: [userId],
        batchName: enrollment.batchName || "",
        courseName: enrollment.courseName || "",
        lastMessage: "Batch group created",
      });
    } else if (!room.participants.map(String).includes(String(userId))) {
      room.participants.push(userId);
      await room.save();
    }

    rooms.push(room);
  }

  return rooms;
}

async function filterBlockedRooms(rooms: any[], userId: string) {
  const checks = await Promise.all(
    rooms.map(async (room) => {
      if (!room.batchName) return true;
      const allowed = await Enrollment.findOne({
        userId,
        batchName: room.batchName,
        batchBlocked: { $ne: true },
      });
      return Boolean(allowed);
    })
  );

  return rooms.filter((_, index) => checks[index]);
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "user";
    const userId = searchParams.get("userId") || "";

    await ensureGeneralRoom(userId);
    await ensureEnrollmentRooms(userId);

    const rooms =
      role === "admin"
        ? await ChatRoom.find().sort({ updatedAt: -1 })
        : await filterBlockedRooms(
          await ChatRoom.find({
            $or: [
              { type: "group" },
              { participants: userId },
            ],
          }).sort({ updatedAt: -1 }),
          userId
        );

    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => ({
        ...room.toObject(),
        messageCount: await Message.countDocuments({ roomId: room._id }),
        participantCount: room.participants?.length || 0,
      }))
    );

    return NextResponse.json({
      success: true,
      rooms: roomsWithCounts,
    });
  } catch (error: any) {
    console.log("GET CHAT ROOMS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        {
          success: false,
          message: "Group name is required",
        },
        {
          status: 400,
        }
      );
    }

    const room = await ChatRoom.create({
      type: body.type || "group",
      name: body.name,
      description: body.description || "",
      participants: body.participants || [],
      createdBy: body.createdBy || undefined,
      batchName: body.batchName || "",
      courseName: body.courseName || "",
      lastMessage: "Group created",
    });

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error: any) {
    console.log("CREATE CHAT ROOM ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      {
        status: 500,
      }
    );
  }
}
