import { getQiraat } from "@/application/qiraa/get-qiraat";
import { NextResponse } from "next/server";

export async function GET() {
  const qiraat = await getQiraat();

  return NextResponse.json({
    data: qiraat,
  });
}
