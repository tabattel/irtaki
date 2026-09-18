import { getMushafs } from "@/application/mushaf/get-mushafs";
import { NextResponse } from "next/server";

export async function GET() {
  const mushafs = await getMushafs();

  return NextResponse.json({
    data: mushafs,
  });
}
