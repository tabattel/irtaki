import { getAllAyahs } from "@/application/ayah/get-all-ayahs";
import { NextResponse } from "next/server";

export async function GET() {
  const ayahs = await getAllAyahs();

  return NextResponse.json({
    data: ayahs,
  });
}
