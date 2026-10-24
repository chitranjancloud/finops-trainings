import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import Payment from "@/models/Payment";

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();
    const update: any = {
      batchName: body.batchName || "",
      batchId: body.batchId || "",
      status: body.status || "enrolled",
      batchAssignedAt: body.batchName ? new Date() : null,
    };

    if (body.batchBlocked !== undefined) {
      update.batchBlocked = Boolean(body.batchBlocked);
      update.batchBlockedAt = body.batchBlocked ? new Date() : null;
      update.batchBlockReason = body.batchBlocked ? body.batchBlockReason || "" : "";
    }

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(params.id, update, { new: true });

    if (updatedEnrollment?.paymentId) {
      await Payment.findByIdAndUpdate(updatedEnrollment.paymentId, {
        batchName: updatedEnrollment.batchName || "",
      });
    }

    return NextResponse.json({ success: true, enrollment: updatedEnrollment });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: any) {
  try {
    await connectDB();
    await Enrollment.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
