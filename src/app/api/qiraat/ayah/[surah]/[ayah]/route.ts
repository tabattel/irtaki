import { getQiraatForAyah } from "@/application/qiraa/get-qiraat-for-ayah";
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
    const result = await getQiraatForAyah(surah, ayah);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[qiraat] Failed to load Quranpedia Qiraat data:", error);

    return NextResponse.json(
      { error: "Qiraat readings are temporarily unavailable" },
      { status: 503 },
    );
  }
}
