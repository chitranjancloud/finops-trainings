import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import TrustedCompany from "@/models/TrustedCompany";

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedTrustedCompany =
      await TrustedCompany.findByIdAndUpdate(
        params.id,
        {
          name: body.name,
          logo: body.logo,
          website: body.website || "",
          displayOrder: Number(body.displayOrder) || 0,
        },
        {
          new: true,
        }
      );

    return NextResponse.json({
      success: true,
      trustedCompany: updatedTrustedCompany,
    });
  } catch (error: any) {
    console.log("UPDATE TRUSTED COMPANY ERROR:", error);

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

export async function DELETE(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    await TrustedCompany.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("DELETE TRUSTED COMPANY ERROR:", error);

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
