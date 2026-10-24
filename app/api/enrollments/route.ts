import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";

export async function GET() {
  try {
    await connectDB();

    const enrollments = await Enrollment.find().sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      enrollments,
    });
  } catch (error: any) {
    console.log("GET ENROLLMENTS ERROR:", error);

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
