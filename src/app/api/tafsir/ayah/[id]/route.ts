import { getTafsirForAyah } from "@/application/tafsir/get-tafsir-for-ayah";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TAFSIR_BOOK_ID = "quranpedia-tafsir-muyassar";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;
  const ayahId = Number(id);

  if (!Number.isInteger(ayahId) || ayahId <= 0) {
    return NextResponse.json(
      { error: "Invalid ayah id" },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const bookId =
    url.searchParams.get("bookId") || DEFAULT_TAFSIR_BOOK_ID;

  try {
    const result = await getTafsirForAyah(ayahId, bookId);

    if (result.status === "ayah-not-found") {
      return NextResponse.json(
        { error: "Ayah not found" },
        { status: 404 },
      );
    }

    if (result.status === "book-not-found") {
      return NextResponse.json(
        { error: "Tafsir book not found or unavailable" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[tafsir] Failed to load Tafsir:", error);

    return NextResponse.json(
      { error: "Tafsir is temporarily unavailable" },
      { status: 503 },
    );
  }
}
