"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  MessageCircle,
  Search,
  Send,
  Users,
} from "lucide-react";

type Room = {
  _id: string;
  name: string;
  description?: string;
  lastMessage?: string;
  courseName?: string;
  participantCount?: number;
  messageCount?: number;
};

type ChatMessage = {
  _id: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  text: string;
  createdAt?: string;
};

export default function StudentChatsPage() {
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchRooms(parsedUser._id);
    markNotificationsRead(parsedUser._id, ["chat"]);
  }, []);

  useEffect(() => {
    if (!selectedRoom) return;

    fetchMessages(selectedRoom._id);

    const interval = window.setInterval(() => {
      fetchMessages(selectedRoom._id);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [selectedRoom]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const fetchRooms = async (userId: string) => {
    try {
      const res = await fetch(`/api/chat/rooms?role=user&userId=${userId}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setRooms(data.rooms);

        if (data.rooms?.length) {
          setSelectedRoom(data.rooms[0]);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages?userId=${user?._id || ""}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !selectedRoom || !user) return;

    const text = message.trim();
    setMessage("");

    try {
      const res = await fetch(`/api/chat/rooms/${selectedRoom._id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user._id,
          senderName: user.name || user.email || "Student",
          senderRole: "student",
          text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        await fetchRooms(user._id);
      }
    } catch (error) {
      console.log(error);
    }
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
    } catch (error) {
      console.log(error);
    }
  };

  const filteredRooms = rooms.filter((room) =>
    [room.name, room.description, room.courseName, room.lastMessage]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div className="h-screen bg-[#f4f7fb] flex flex-col overflow-hidden">
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-3 rounded-xl hover:bg-gray-100 transition">
            <ArrowLeft size={22} />
          </Link>

          <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-lg">
            <MessageCircle size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-[#010309]">Chat Groups</h1>
            <p className="text-green-500 text-sm">Admin and batch support online</p>
          </div>
        </div>

        <div className="bg-blue-100 text-blue-700 px-5 py-2 rounded-xl font-medium">
          {user?.name || "Student"}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col min-h-0">
          <div className="shrink-0 p-5 border-b border-gray-200">
            <div className="flex items-center gap-3 border border-gray-300 rounded-2xl px-4 py-3">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chat groups"
                className="w-full outline-none text-black placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {filteredRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => setSelectedRoom(room)}
                className={`w-full text-left flex items-start gap-4 p-4 border-b border-gray-100 transition ${
                  selectedRoom?._id === room._id ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center shrink-0">
                  {room.courseName ? <BookOpen size={20} /> : <Users size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{room.name}</h3>
                  <p className="text-sm text-gray-500 truncate mt-1">
                    {room.lastMessage || room.description || "Start a discussion"}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    {room.participantCount || 0} members | {room.messageCount || 0} messages
                  </p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col min-h-0">
          {selectedRoom ? (
            <>
              <div className="shrink-0 px-6 py-5 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">{selectedRoom.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRoom.courseName || selectedRoom.description || "Course and support discussion"}
                  </p>
                </div>
                <span className="bg-green-50 text-green-600 px-4 py-2 rounded-xl text-sm font-medium">
                  Active
                </span>
              </div>

              <div
                ref={messagesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 bg-[#fafcff]"
              >
                {messages.length > 0 ? (
                  messages.map((msg) => {
                    const isMe = msg.senderId === user?._id;

                    return (
                      <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[520px] px-5 py-3 rounded-3xl text-sm shadow-sm ${
                            isMe
                              ? "bg-[#2563eb] text-white"
                              : "bg-white border border-gray-200 text-gray-900"
                          }`}
                        >
                          <div className={`text-xs mb-1 ${isMe ? "text-blue-50" : "text-gray-500"}`}>
                            {msg.senderName || "Admin"} | {formatMessageTime(msg.createdAt)}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No messages yet.
                  </div>
                )}
              </div>

              <div className="shrink-0 bg-white border-t border-gray-200 p-5">
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-6 py-4 rounded-2xl border border-gray-300 outline-none focus:border-blue-500 text-black"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-[#2563eb] hover:bg-[#2563eb] transition text-white p-4 rounded-2xl"
                  >
                    <Send size={22} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <MessageCircle size={76} className="text-blue-400 mb-5" />
              <h2 className="text-2xl font-semibold text-gray-900">No chat group selected</h2>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function formatMessageTime(value?: string) {
  if (!value) return "";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}