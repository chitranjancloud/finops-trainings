"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Briefcase,
  CreditCard,
  Edit3,
  FileText,
  ImagePlus,
  LayoutList,
  Loader2,
  MessageCircle,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import AdminNotificationBadge from "@/components/AdminNotificationBadge";

type Blog = {
  _id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  coverImage: string;
  tags: string[];
  readTime: string;
  isPublished: boolean;
  featured: boolean;
  publishedAt?: string;
};

const emptyForm: Blog = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "Training",
  author: "FinOps Trainings",
  coverImage: "",
  tags: [],
  readTime: "5 min read",
  isPublished: true,
  featured: false,
};

function SidebarLink({ href, icon, text, active = false, badge }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-4 rounded-2xl px-5 py-4 font-medium transition ${
        active ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <span className="flex items-center gap-4">
        {icon}
        {text}
      </span>
      {badge}
    </Link>
  );
}

function authPayload() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return {
    userId: user._id || "",
    sessionToken: localStorage.getItem("sessionToken") || "",
    deviceId: localStorage.getItem("deviceId") || "",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [form, setForm] = useState<Blog>(emptyForm);
  const [tagInput, setTagInput] = useState("");
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  const uploadBlogImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", "finops/blogs");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Upload failed");
    return data.url as string;
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setCoverError("Unsupported file type. Please use JPG, PNG, or WEBP.");
      e.target.value = "";
      return;
    }
    try {
      setUploadingCover(true);
      const url = await uploadBlogImage(file);
      setForm((prev) => ({ ...prev, coverImage: url }));
    } catch (err: any) {
      setCoverError(err.message || "Image upload failed. Please try again.");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  const loadBlogs = async () => {
    const params = new URLSearchParams({ all: "true", ...authPayload() });
    const res = await fetch(`/api/blogs?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setBlogs(data.blogs || []);
    setLoading(false);
  };

  useEffect(() => {
    loadBlogs().catch(() => setLoading(false));
  }, []);

  const stats = useMemo(
    () => ({
      total: blogs.length,
      published: blogs.filter((blog) => blog.isPublished).length,
      featured: blogs.filter((blog) => blog.featured).length,
    }),
    [blogs]
  );

  const updateForm = (patch: Partial<Blog>) => {
    const next = { ...form, ...patch };
    if (patch.title !== undefined && !editingId) next.slug = slugify(patch.title);
    setForm(next);
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag)) return;
    setForm({ ...form, tags: [...form.tags, tag] });
    setTagInput("");
  };

  const saveBlog = async () => {
    if (!form.title.trim()) {
      alert("Blog title is required");
      return;
    }

    const payload = { ...form, ...authPayload() };
    const res = await fetch(editingId ? `/api/blogs/${editingId}` : "/api/blogs", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert(editingId ? "Blog updated" : "Blog published");
      setForm(emptyForm);
      setEditingId("");
      setCoverError("");
      loadBlogs();
    } else {
      alert(data.message || "Blog save failed");
    }
  };

  const editBlog = (blog: Blog) => {
    setEditingId(blog._id || "");
    setForm({
      ...emptyForm,
      ...blog,
      tags: blog.tags || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBlog = async (id?: string) => {
    if (!id || !confirm("Delete this blog?")) return;
    const res = await fetch(`/api/blogs/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload()),
    });
    const data = await res.json();
    if (data.success) {
      loadBlogs();
    } else {
      alert(data.message || "Delete failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex overflow-hidden">
      <aside className="fixed h-screen w-[250px] overflow-y-auto border-r border-gray-200 bg-white">
        <div className="px-8 py-10">
          <h1 className="text-4xl font-bold text-blue-500">FinOps</h1>
        </div>
        <div className="px-4 space-y-2">
          <SidebarLink href="/admin-page" icon={<BookOpen size={22} />} text="Courses" />
          <SidebarLink href="/admin-page/batches" icon={<Briefcase size={22} />} text="Batches" />
          <SidebarLink href="/admin-page/blogs" icon={<LayoutList size={22} />} text="Blogs" active />
          <SidebarLink href="/admin-page/fees" icon={<CreditCard size={22} />} text="Fees" />
          <SidebarLink href="/admin-page/notifications" icon={<Bell size={22} />} text="Notifications" badge={<AdminNotificationBadge />} />
          <SidebarLink href="/admin-page/tests" icon={<FileText size={22} />} text="Tests" />
          <SidebarLink href="/admin-page/assignments" icon={<FileText size={22} />} text="Assignments" />
          <SidebarLink href="/admin-page/chats" icon={<MessageCircle size={22} />} text="Chats" />
          <SidebarLink href="/admin-page/people" icon={<Users size={22} />} text="People" />
        </div>
      </aside>

      <main className="ml-[250px] min-h-screen flex-1 p-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-600">Content Studio</p>
            <h1 className="text-4xl font-black text-gray-950">Blogs</h1>
            <p className="mt-2 text-gray-500">Create, edit, publish, feature, or delete website blog posts.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total" value={stats.total} />
            <Stat label="Published" value={stats.published} />
            <Stat label="Featured" value={stats.featured} />
          </div>
        </div>

        <section className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-gray-950">{editingId ? "Edit Blog" : "New Blog"}</h2>
            {editingId && (
              <button onClick={() => { setEditingId(""); setForm(emptyForm); setCoverError(""); }} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600">
                Cancel
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Title" value={form.title} onChange={(value) => updateForm({ title: value })} className="lg:col-span-2" />
            <Field label="Slug" value={form.slug} onChange={(value) => updateForm({ slug: slugify(value) })} />
            <Field label="Category" value={form.category} onChange={(value) => updateForm({ category: value })} />
            <Field label="Author" value={form.author} onChange={(value) => updateForm({ author: value })} />
            <Field label="Read Time" value={form.readTime} onChange={(value) => updateForm({ readTime: value })} />

            {/* ── Cover Image Upload ─────────────────────────────────────── */}
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">
                Cover Image
              </label>

              {/* Preview */}
              {form.coverImage && (
                <div className="relative mb-3 inline-block">
                  <img
                    src={form.coverImage}
                    alt="Cover preview"
                    className="h-40 w-64 rounded-2xl object-cover border border-gray-200 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => { setForm((p) => ({ ...p, coverImage: "" })); setCoverError(""); }}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 shadow"
                    title="Remove image"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-3 items-center">
                {/* Upload from PC */}
                <label className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition ${uploadingCover ? "border-blue-300 bg-blue-50 text-blue-400" : "border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600"}`}>
                  {uploadingCover ? (
                    <><Loader2 size={15} className="animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload size={15} /> {form.coverImage ? "Replace Image" : "Upload from PC"}</>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                  />
                </label>

                {/* Or paste URL */}
                <div className="flex-1 min-w-[220px]">
                  <input
                    value={form.coverImage}
                    onChange={(e) => { updateForm({ coverImage: e.target.value }); setCoverError(""); }}
                    placeholder="…or paste an image URL"
                    className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm text-black outline-none focus:border-blue-400"
                  />
                </div>

                {form.coverImage && (
                  <button
                    type="button"
                    onClick={() => { setForm((p) => ({ ...p, coverImage: "" })); setCoverError(""); }}
                    className="inline-flex items-center gap-1 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                )}
              </div>

              {coverError && (
                <p className="mt-2 text-xs font-semibold text-red-500">{coverError}</p>
              )}
              <p className="mt-1.5 text-xs text-gray-400">Supported formats: JPG, PNG, WEBP. Upload from your PC or paste a URL.</p>
            </div>
            {/* ─────────────────────────────────────────────────────────── */}

            <TextArea label="Excerpt" value={form.excerpt} onChange={(value) => updateForm({ excerpt: value })} rows={3} />
            <TextArea label="Content" value={form.content} onChange={(value) => updateForm({ content: value })} rows={8} />
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                className="flex-1 rounded-2xl border border-gray-200 px-5 py-3 text-sm text-black outline-none focus:border-blue-400"
                placeholder="Add tag and press Enter"
              />
              <button onClick={addTag} className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white">
                <Plus size={16} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setForm({ ...form, tags: form.tags.filter((item) => item !== tag) })}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                >
                  #{tag} ×
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-5">
            <Toggle label="Published" checked={form.isPublished} onClick={() => updateForm({ isPublished: !form.isPublished })} />
            <Toggle label="Featured" checked={form.featured} onClick={() => updateForm({ featured: !form.featured })} />
            <button onClick={saveBlog} className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-7 py-3 text-sm font-black text-white hover:bg-[#2563eb]">
              <Save size={16} /> {editingId ? "Update Blog" : "Publish Blog"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-black text-gray-950">All Blogs</h2>
          {loading ? (
            <p className="py-10 text-center text-gray-500">Loading blogs...</p>
          ) : blogs.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {blogs.map((blog) => (
                <article key={blog._id} className="flex gap-4 rounded-2xl border border-gray-200 p-4">
                  <div className="h-28 w-36 flex-none overflow-hidden rounded-2xl bg-gray-100">
                    {blog.coverImage ? <img src={blog.coverImage} alt={blog.title} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">{blog.category}</span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${blog.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {blog.isPublished ? "Published" : "Draft"}
                      </span>
                      {blog.featured && <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">Featured</span>}
                    </div>
                    <h3 className="truncate text-lg font-black text-gray-950">{blog.title}</h3>
                    <p className="line-clamp-2 text-sm text-gray-500">{blog.excerpt || blog.content}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => editBlog(blog)} className="inline-flex items-center gap-1 rounded-xl bg-gray-950 px-3 py-2 text-xs font-bold text-white">
                        <Edit3 size={13} /> Edit
                      </button>
                      <button onClick={() => deleteBlog(blog._id)} className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-gray-500">No blogs yet. Create your first post above.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center shadow-sm">
      <p className="text-2xl font-black text-gray-950">{value}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm text-black outline-none focus:border-blue-400" />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-widest text-gray-400">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-2xl border border-gray-200 px-5 py-3 text-sm text-black outline-none resize-none focus:border-blue-400" />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 text-sm font-bold text-gray-700">
      <span className={`relative h-6 w-12 rounded-full transition ${checked ? "bg-blue-500" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-0.5"}`} />
      </span>
      {label}
    </button>
  );
}
