import { NextResponse } from "next/server";

import { loadMushafPageLayout } from "@/lib/mushaf/layout/load-layout";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      mushafId: string;
      page: string;
    }>;
  },
) {
  const { mushafId, page } = await params;

  const mushafIdNumber = Number(mushafId);
  const pageNumber = Number(page);

  if (!Number.isInteger(mushafIdNumber) || mushafIdNumber < 1) {
    return NextResponse.json({ error: "Invalid Mushaf." }, { status: 400 });
  }

  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 604) {
    return NextResponse.json(
      { error: "Invalid Mushaf page." },
      { status: 400 },
    );
  }

  // Current validated layout:
  // Quranpedia Mushaf 2 — Hafs.
  if (mushafIdNumber !== 2) {
    return NextResponse.json(
      { error: "Mushaf layout not available." },
      { status: 404 },
    );
  }

  try {
    const layout = await loadMushafPageLayout(pageNumber);

    return NextResponse.json({
      mushafId: mushafIdNumber,
      ...layout,
    });
  } catch {
    return NextResponse.json(
      { error: "Mushaf layout not found." },
      { status: 404 },
    );
  }
}
