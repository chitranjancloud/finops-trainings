import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/certificates";

export async function GET(req: Request, { params }: any) {
  const code = encodeURIComponent(String(params.certificateCode || ""));
  const verificationUrl = `${getAppOrigin(req)}/verify/${code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verificationUrl)}`;
  return NextResponse.redirect(qrUrl);
}
