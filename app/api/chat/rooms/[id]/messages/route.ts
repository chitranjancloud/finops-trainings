import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import ChatRoom from "@/models/ChatRoom";
import Message from "@/models/Message";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";

    const messages = await Message.find({
      roomId: id,
    }).sort({
      createdAt: 1,
    });

    if (userId) {
      await Message.updateMany(
        {
          roomId: id,
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        },
        { $addToSet: { readBy: userId }, seen: true }
      );
    }

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error: any) {
    console.log("GET CHAT MESSAGES ERROR:", error);

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    if (!body.text?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Message is required",
        },
        {
          status: 400,
        }
      );
    }

    const message = await Message.create({
      roomId: id,
      senderId: body.senderId || "guest",
      senderName: body.senderName || "Guest",
      senderRole: body.senderRole || "user",
      text: body.text.trim(),
      readBy: body.senderId ? [String(body.senderId)] : [],
    });

    const room = await ChatRoom.findById(id);

    if (room) {
      room.lastMessage = body.text.trim();
      room.updatedAt = new Date();

      if (
        body.senderId &&
        !room.participants.map(String).includes(String(body.senderId))
      ) {
        room.participants.push(body.senderId);
      }

      await room.save();
    }

    await createNotification({
      audience: body.senderRole === "admin" ? "user" : "admin",
      type: "chat",
      title: "New unread chat",
      message: `${body.senderName || "Someone"} sent a new message in ${
        room?.name || "chat"
      }.`,
      link:
        body.senderRole === "admin"
          ? "/student/chats"
          : "/admin-page/chats",
      meta: { roomId: id, messageId: String(message._id) },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.log("SEND CHAT MESSAGE ERROR:", error);

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