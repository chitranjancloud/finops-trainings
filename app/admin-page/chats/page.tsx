"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
  Settings,
  Users,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type Room = {
  _id: string;
  name: string;
  description?: string;
  lastMessage?: string;
  batchName?: string;
  courseName?: string;
  participantCount?: number;
  messageCount?: number;
  updatedAt?: string;
};

type ChatMessage = {
  _id: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  text: string;
  createdAt?: string;
};

export default function ChatsPage() {
  const [user, setUser] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    courseName: "",
    batchName: "",
    description: "",
  });
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      window.location.href = "/login";
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "admin") {
      window.location.href = "/";
      return;
    }

    setUser(parsedUser);
    fetchRooms();
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

  const filteredRooms = useMemo(() => {
    const value = search.trim().toLowerCase();

    return rooms.filter((room) =>
      [room.name, room.description, room.courseName, room.batchName, room.lastMessage]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [rooms, search]);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/chat/rooms?role=admin", {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setRooms(data.rooms);

        if (!selectedRoom && data.rooms?.length) {
          setSelectedRoom(data.rooms[0]);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
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

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) return;

    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newGroup,
          createdBy: user?._id,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setNewGroup({
          name: "",
          courseName: "",
          batchName: "",
          description: "",
        });
        setShowNewGroup(false);
        await fetchRooms();
        setSelectedRoom(data.room);
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
          senderName: user.name || "Admin",
          senderRole: "admin",
          text,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        await fetchRooms();
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="h-screen bg-[#faf7f7] flex overflow-hidden">


      <div className="flex-1 min-h-0 overflow-hidden p-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-5xl font-bold text-[#0f172a]">Chat Groups</h1>
            <p className="text-gray-500 mt-3 text-lg">
              Manage course groups, batch discussions, student questions, and announcements.
            </p>
          </div>

          <button
            onClick={() => setShowNewGroup(true)}
            className="bg-[#2563eb] hover:bg-blue-600 text-white px-6 py-4 rounded-2xl font-semibold flex items-center gap-2 w-fit"
          >
            <Plus size={20} />
            New Group
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-gray-200 h-[calc(100vh-160px)] min-h-0 flex overflow-hidden">
          <div className="w-[420px] border-r border-gray-200 flex flex-col min-h-0">
            <div className="shrink-0 p-5 border-b border-gray-200">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-300">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search groups or courses"
                  className="w-full outline-none text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0">
              {filteredRooms.map((room) => (
                <button
                  key={room._id}
                  onClick={() => setSelectedRoom(room)}
                  className={`w-full text-left flex items-start gap-4 p-4 border-b border-gray-100 cursor-pointer transition ${
                    selectedRoom?._id === room._id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold shrink-0">
                    {room.name?.charAt(0) || "G"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-[#0f172a] truncate">{room.name}</h3>
                      <span className="text-xs text-gray-400 shrink-0">
                        {formatShortTime(room.updatedAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {room.lastMessage || room.description || "No messages yet"}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      {room.participantCount || 0} members | {room.messageCount || 0} messages
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-[#fafcff]">
            {!selectedRoom ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <MessageCircle size={82} className="text-blue-400 mb-6" />
                <h2 className="text-3xl font-semibold text-[#0f172a]">No group selected</h2>
                <p className="text-gray-500 mt-4 text-lg">Select a chat group from the left panel</p>
              </div>
            ) : (
              <>
                <div className="shrink-0 p-5 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#2563eb] text-white flex items-center justify-center font-bold">
                      {selectedRoom.name?.charAt(0) || "G"}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-[#0f172a] truncate">
                        {selectedRoom.name}
                      </h2>
                      <p className="text-sm text-gray-500 truncate">
                        {selectedRoom.courseName || selectedRoom.description || "Group chat"}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                    Active
                  </div>
                </div>

                <div
                  ref={messagesContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5"
                >
                  {messages.length > 0 ? (
                    messages.map((msg) => {
                      const isAdmin = msg.senderRole === "admin";

                      return (
                        <div key={msg._id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[520px] px-5 py-3 rounded-3xl text-sm ${
                              isAdmin
                                ? "bg-[#2563eb] text-white"
                                : "bg-white border border-gray-200 text-[#0f172a]"
                            }`}
                          >
                            <div className={`text-xs mb-1 ${isAdmin ? "text-blue-50" : "text-gray-500"}`}>
                              {msg.senderName || (isAdmin ? "Admin" : "Student")} | {formatMessageTime(msg.createdAt)}
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

                <div className="shrink-0 p-5 border-t border-gray-200 bg-white flex items-center gap-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                    placeholder="Type announcement or reply..."
                    className="flex-1 px-5 py-4 rounded-2xl border border-gray-300 outline-none text-black"
                  />
                  <button
                    onClick={handleSend}
                    className="bg-[#2563eb] hover:bg-blue-600 transition text-white p-4 rounded-2xl"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showNewGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Create Chat Group</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Group name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black"
              />
              <input
                type="text"
                placeholder="Batch name"
                value={newGroup.batchName}
                onChange={(e) => setNewGroup({ ...newGroup, batchName: e.target.value })}
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black"
              />
              <input
                type="text"
                placeholder="Course name"
                value={newGroup.courseName}
                onChange={(e) => setNewGroup({ ...newGroup, courseName: e.target.value })}
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black md:col-span-2"
              />
              <textarea
                rows={4}
                placeholder="Description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="border border-gray-300 rounded-2xl px-5 py-4 outline-none text-black md:col-span-2"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewGroup(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-2xl font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="bg-[#2563eb] hover:bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  text,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  text: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="w-full flex items-center justify-between gap-4 hover:bg-gray-100 text-gray-700 px-5 py-4 rounded-2xl transition"
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function formatShortTime(value?: string) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function formatMessageTime(value?: string) {
  if (!value) return "";

  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}