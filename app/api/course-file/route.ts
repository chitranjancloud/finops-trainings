import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message:
        "Direct course content access is disabled. Please access learning materials from the Batch Content area.",
    },
    { status: 403 }
  );
}