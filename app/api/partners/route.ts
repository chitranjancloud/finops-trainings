import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";
import { defaultPartners } from "@/lib/defaultHomepageContent";
import Partner from "@/models/Partner";

export async function GET() {
  try {
    await connectDB();

    if ((await Partner.countDocuments()) === 0) {
      await Partner.insertMany(defaultPartners);
    }

    const partners = await Partner.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      partners,
    });
  } catch (error: any) {
    console.log("GET PARTNERS ERROR:", error);

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

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body.name || !body.logo) {
      return NextResponse.json(
        {
          success: false,
          message: "Name and logo are required",
        },
        {
          status: 400,
        }
      );
    }

    const partner = await Partner.create({
      name: body.name,
      logo: body.logo,
      description: body.description || "",
      role: body.role || "",
      website: body.website || "",
      displayOrder: Number(body.displayOrder) || 0,
    });

    await createNotification({
      audience: "admin",
      type: "partner",
      title: "Partner created",
      message: `${partner.name} was added to partners.`,
      link: "/admin-page#partners",
    });

    return NextResponse.json({
      success: true,
      partner,
    });
  } catch (error: any) {
    console.log("CREATE PARTNER ERROR:", error);

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
