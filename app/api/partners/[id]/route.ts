import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Partner from "@/models/Partner";

export async function PUT(
  req: Request,
  { params }: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const updatedPartner = await Partner.findByIdAndUpdate(
      params.id,
      {
        name: body.name,
        logo: body.logo,
        description: body.description || "",
        role: body.role || "",
        website: body.website || "",
        displayOrder: Number(body.displayOrder) || 0,
      },
      {
        new: true,
      }
    );

    return NextResponse.json({
      success: true,
      partner: updatedPartner,
    });
  } catch (error: any) {
    console.log("UPDATE PARTNER ERROR:", error);

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

    await Partner.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.log("DELETE PARTNER ERROR:", error);

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
