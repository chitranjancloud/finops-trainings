"use client";

import Link from "next/link";

import {
  BookOpen,
  LayoutDashboard,
  Monitor,
  Users,
  MessageCircle,
  BarChart3,
  Settings,
  Megaphone,
  FolderOpen,
  FileText,
  Search,
} from "lucide-react";

export default function ContentPage() {
  return (
    <div className="flex min-h-screen bg-[#eef3f8]">

      {/* SIDEBAR */}
      <div className="w-[230px] bg-white border-r border-gray-200 px-4 py-6 flex flex-col">

        {/* LOGO */}
        <h1 className="text-3xl font-bold mb-10 text-[#0f172a]">
          Classplus
        </h1>

        <div className="space-y-2 text-[17px]">

          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            text="Dashboard"
          />

          <SidebarItem
            icon={<Monitor size={20} />}
            text="Website"
          />

          <SidebarItem
            icon={<BookOpen size={20} />}
            text="Courses"
          />

          <SidebarItem
            icon={<Users size={20} />}
            text="Batches"
          />

          {/* CONTENT */}
          <div>

            {/* MAIN ACTIVE */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-100 text-blue-700 font-medium">
              <FolderOpen size={20} />
              Content
            </div>

            {/* SUB MENU */}
            <div className="ml-5 mt-2 bg-white rounded-xl border shadow-sm overflow-hidden">

              {/* TEST PORTAL */}
              <Link
                href="/admin-page/content"
                className="block w-full text-left px-5 py-3 transition font-medium bg-blue-100 text-blue-700 border-l-4 border-blue-500"
              >
                Test Portal
              </Link>

              {/* FREE MATERIAL */}
              <Link
                href="/admin-page/content/free-material"
                className="block w-full text-left px-5 py-3 transition font-medium text-black hover:bg-gray-100"
              >
                Free Material
              </Link>

            </div>

          </div>

          <SidebarItem
            icon={<FileText size={20} />}
            text="Your App"
          />

          <SidebarItem
            icon={<Users size={20} />}
            text="Landing Pages"
          />

          <SidebarItem
            icon={<MessageCircle size={20} />}
            text="1:1 Sessions"
          />

          <SidebarItem
            icon={<MessageCircle size={20} />}
            text="Chats"
          />

          <SidebarItem
            icon={<BarChart3 size={20} />}
            text="Analytics"
          />

          <SidebarItem
            icon={<Settings size={20} />}
            text="Integrations"
          />

          <SidebarItem
            icon={<Megaphone size={20} />}
            text="Campaigns"
          />

        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-8">

        {/* TOP */}
        <div className="flex justify-between items-start mb-8">

          <div>

            <h1 className="text-5xl font-bold text-[#0f172a]">
              Test Portal
            </h1>

            <p className="text-gray-500 mt-2 text-lg">
              Only published tests are shown here
            </p>

          </div>

          <button className="bg-blue-500 hover:bg-[#2563eb] text-white px-8 py-4 rounded-2xl text-lg font-medium transition">
            Go to Test portal
          </button>

        </div>

        {/* SEARCH */}
        <div className="mb-8 relative w-[320px]">

          <Search
            size={18}
            className="absolute left-4 top-4 text-gray-400"
          />

          <input
            type="text"
            placeholder="Search online tests"
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300 outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />

        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">

          {/* HEADER */}
          <div className="grid grid-cols-3 px-8 py-5 border-b text-gray-500 font-semibold">

            <div>Tests / Folders</div>

            <div>Date</div>

            <div>Options</div>

          </div>

          {/* ROW 1 */}
          <div className="grid grid-cols-3 px-8 py-6 border-b hover:bg-gray-50 transition">

            <div className="font-medium text-[#0f172a]">
              Scenario Based Assessment
            </div>

            <div className="text-gray-500">
              08-Sep-2024
            </div>

            <div className="text-2xl">
              ⋮
            </div>

          </div>

          {/* ROW 2 */}
          <div className="grid grid-cols-3 px-8 py-6 hover:bg-gray-50 transition">

            <div className="font-medium text-[#0f172a]">
              DevOps Test
            </div>

            <div className="text-gray-500">
              09-Dec-2023
            </div>

            <div className="text-2xl">
              ⋮
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

/* SIDEBAR ITEM */
function SidebarItem({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition cursor-pointer text-gray-700">
      {icon}
      {text}
    </div>
  );
}