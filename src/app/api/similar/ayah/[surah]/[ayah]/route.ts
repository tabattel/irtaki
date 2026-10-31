import { getSimilarForAyah } from "@/application/similar/get-similar-for-ayah";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    surah: string;
    ayah: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { surah: rawSurah, ayah: rawAyah } = await context.params;

  const surah = Number(rawSurah);
  const ayah = Number(rawAyah);

  if (
    !Number.isInteger(surah) ||
    surah < 1 ||
    surah > 114 ||
    !Number.isInteger(ayah) ||
    ayah < 1
  ) {
    return NextResponse.json(
      { error: "Invalid surah or ayah coordinates" },
      { status: 400 },
    );
  }

  try {
    const result = await getSimilarForAyah(surah, ayah);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[similar] Failed to load Quranpedia Similar data:", error);

    return NextResponse.json(
      { error: "Similar verses are temporarily unavailable" },
      { status: 503 },
    );
  }
}
