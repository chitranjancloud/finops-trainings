import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import ContentAccessLog from "@/models/ContentAccessLog";
import User from "@/models/User";

async function verifyAdmin(userId: string, sessionToken: string, deviceId: string) {
  if (!userId || !sessionToken || !deviceId) return null;
  const user = await User.findById(userId);
  if (
    !user ||
    user.role !== "admin" ||
    !user.isLoggedIn ||
    user.sessionToken !== sessionToken ||
    user.activeDevice !== deviceId
  ) return null;
  return user;
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildExcel(rows: any[]) {
  const headers = ["Student", "Email", "Batch", "Material", "Type", "Action", "IP Address", "Accessed At"];
  const keys = ["name", "email", "batchName", "materialName", "materialType", "action", "ipAddress", "accessedAt"];
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body>
    <table border="1">
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
      ${rows.map((row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(k === "accessedAt" ? new Date(row[k]).toLocaleString("en-IN") : row[k])}</td>`).join("")}</tr>`
      ).join("")}
    </table>
  </body></html>`;
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const admin = await verifyAdmin(
      searchParams.get("userId") || "",
      searchParams.get("sessionToken") || "",
      searchParams.get("deviceId") || ""
    );
    if (!admin) {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 401 });
    }

    const batchId = searchParams.get("batchId") || "";
    const studentId = searchParams.get("studentId") || "";
    const format = searchParams.get("format") || "json";
    const limit = Math.min(Number(searchParams.get("limit") || 200), 1000);

    const query: any = {};
    if (batchId) query.batchId = batchId;
    if (studentId) query.userId = studentId;

    const logs = await ContentAccessLog.find(query).sort({ accessedAt: -1 }).limit(limit);

    if (format === "excel") {
      return new NextResponse(buildExcel(logs), {
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="content-access-log-${batchId || "all"}.xls"`,
        },
      });
    }

    return NextResponse.json({ success: true, logs, total: logs.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
