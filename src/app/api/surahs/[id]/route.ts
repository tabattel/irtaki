import { getSurahById } from "@/application/surah/get-surah-by-id";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  const surahId = Number(id);

  if (!Number.isInteger(surahId) || surahId <= 0) {
    return NextResponse.json(
      { error: "Invalid surah id" },
      { status: 400 },
    );
  }

  const surah = await getSurahById(surahId);

  if (!surah) {
    return NextResponse.json(
      { error: "Surah not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: surah,
  });
}
