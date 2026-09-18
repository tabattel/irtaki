import { getSurahs } from "@/application/surah/get-surahs";
import { NextResponse } from "next/server";

export async function GET() {
  const surahs = await getSurahs();

  return NextResponse.json({
    data: surahs,
  });
}
