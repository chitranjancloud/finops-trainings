"use client";

import Link from "next/link";

import {
  LayoutDashboard,
  Monitor,
  BookOpen,
  Briefcase,
  FolderOpen,
  Smartphone,
  Globe,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react";

export default function FreeMaterialPage() {
  return (
    <div className="min-h-screen bg-[#eef3f8] flex">

      {/* SIDEBAR */}
      <div className="w-[230px] bg-white border-r border-gray-200 flex flex-col justify-between">

        <div>

          {/* LOGO */}
          <div className="px-8 py-8">
            <h1 className="text-5xl font-bold text-[#0f172a]">
              Classplus
            </h1>
          </div>

          {/* MENU */}
          <div className="space-y-1 px-4">

            {/* DASHBOARD */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <LayoutDashboard size={24} />
              <span className="text-[18px]">Dashboard</span>
            </div>

            {/* WEBSITE */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <Monitor size={24} />
              <span className="text-[18px]">Website</span>
            </div>

            {/* COURSES */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <BookOpen size={24} />
              <span className="text-[18px]">Courses</span>
            </div>

            {/* BATCHES */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <Briefcase size={24} />
              <span className="text-[18px]">Batches</span>
            </div>

            {/* CONTENT */}
            <div className="bg-blue-100 rounded-2xl overflow-hidden">

              <div className="flex items-center gap-4 px-4 py-4 text-blue-700 font-semibold border-r-4 border-blue-500">
                <FolderOpen size={24} />
                <span className="text-[18px]">Content</span>
              </div>

              {/* SUBMENU */}
              <div className="ml-6 mr-3 mb-3 bg-white rounded-2xl overflow-hidden border border-gray-200">

                {/* TEST PORTAL */}
                <Link
                  href="/admin-page/content"
                  className="block w-full text-left px-5 py-4 transition font-medium text-black hover:bg-gray-100"
                >
                  Test Portal
                </Link>

                {/* FREE MATERIAL ACTIVE */}
                <Link
                  href="/admin-page/content/free-material"
                  className="block w-full text-left px-5 py-4 transition font-medium bg-blue-100 text-blue-700 border-l-4 border-blue-500"
                >
                  Free Material
                </Link>

              </div>
            </div>

            {/* YOUR APP */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <Smartphone size={24} />
              <span className="text-[18px]">Your App</span>
            </div>

            {/* LANDING PAGES */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <Globe size={24} />
              <span className="text-[18px]">Landing Pages</span>
            </div>

            {/* 1:1 SESSIONS */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <MessageSquare size={24} />
              <span className="text-[18px]">1:1 Sessions</span>
            </div>

            {/* ANALYTICS */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <BarChart3 size={24} />
              <span className="text-[18px]">Analytics</span>
            </div>

            {/* INTEGRATIONS */}
            <div className="flex items-center gap-4 px-4 py-4 rounded-2xl text-gray-600 hover:bg-gray-100 cursor-pointer">
              <Settings size={24} />
              <span className="text-[18px]">Integrations</span>
            </div>

          </div>
        </div>

        {/* HELP SUPPORT */}
        <div className="p-4">
          <button className="w-full bg-blue-500 hover:bg-[#2563eb] transition text-white py-4 rounded-2xl font-semibold text-lg">
            Help & Support
          </button>
        </div>

      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-10">

        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-6xl font-bold text-[#0f172a]">
            Free Material
          </h1>

          <p className="text-gray-500 text-xl mt-2">
            Add / view free material for your visitors
          </p>
        </div>

        {/* CONTENT BOX */}
        <div className="bg-white rounded-[30px] p-8 border border-gray-200">

          <div className="grid grid-cols-3 gap-8">

            {/* DOCUMENT */}
            <div className="border border-gray-200 rounded-[30px] p-8 hover:shadow-md transition cursor-pointer">

              <div className="bg-[#edf4f7] rounded-2xl h-[170px] flex items-center justify-center">
                <div className="text-7xl">📘</div>
              </div>

              <div className="text-center mt-6">

                <h2 className="text-3xl font-semibold text-[#0f172a]">
                  Document
                </h2>

                <p className="text-gray-500 mt-3">
                  File type Includes .doc, .docx, .pdf, .png, .jpg, .csv etc
                </p>

              </div>

            </div>

            {/* VIDEO */}
            <div className="border border-gray-200 rounded-[30px] p-8 hover:shadow-md transition cursor-pointer">

              <div className="bg-[#edf4f7] rounded-2xl h-[170px] flex items-center justify-center">
                <div className="text-7xl">▶️</div>
              </div>

              <div className="text-center mt-6">

                <h2 className="text-3xl font-semibold text-[#0f172a]">
                  Video
                </h2>

                <p className="text-gray-500 mt-3">
                  Supported Link : Youtube URL
                </p>

              </div>

            </div>

            {/* TESTS */}
            <div className="border border-gray-200 rounded-[30px] p-8 hover:shadow-md transition cursor-pointer">

              <div className="bg-[#edf4f7] rounded-2xl h-[170px] flex items-center justify-center">
                <div className="text-7xl">📄</div>
              </div>

              <div className="text-center mt-6">

                <h2 className="text-3xl font-semibold text-[#0f172a]">
                  Tests
                </h2>

                <p className="text-gray-500 mt-3">
                  Import free test from CMS portal
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}