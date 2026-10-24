import { NextResponse } from "next/server";

import { listSharePointFiles } from "@/lib/sharepoint";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const course = searchParams.get("course") || "";
    const type = searchParams.get("type") || "all";

    let folder = searchParams.get("folder");

    // Dynamic course-based folders
    if (!folder) {
      if (course) {
        if (type === "video") {
          folder = `finops/courses/${course}/videos`;
        } else if (type === "pdf") {
          folder = `finops/courses/${course}/pdfs`;
        } else {
          folder = `finops/courses/${course}`;
        }
      } else {
        // Fallback for old structure
        folder = "finops/courses";
      }
    }

    const files = await listSharePointFiles(folder, type);

    return NextResponse.json({
      success: true,
      files,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "SharePoint picker failed",
      },
      {
        status: 500,
      }
    );
  }
}