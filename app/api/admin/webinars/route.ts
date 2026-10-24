import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Webinar from "@/models/Webinar";

export async function GET() {
  await connectDB();

  const data = await Webinar.find().sort({ createdAt: -1 });

  return NextResponse.json(data);
}