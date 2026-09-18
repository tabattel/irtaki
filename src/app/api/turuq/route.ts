import { getTuruq } from "@/application/tariq/get-turuq";
import { NextResponse } from "next/server";

export async function GET() {
  const turuq = await getTuruq();

  return NextResponse.json({
    data: turuq,
  });
}
