import { getAyahsBySurah } from "@/application/ayah/get-ayahs-by-surah";
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
  const surahNumber = Number(id);

  if (!Number.isInteger(surahNumber) || surahNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid surah number" },
      { status: 400 },
    );
  }

  const ayahs = await getAyahsBySurah(surahNumber);

  return NextResponse.json({
    data: ayahs,
  });
}
