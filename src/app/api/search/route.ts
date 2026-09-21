import { NextResponse } from "next/server";

import { SearchUseCase } from "@/application/search/search-use-case";
import type { SearchMode } from "@/application/search/search-types";

const searchUseCase = new SearchUseCase();

export async function GET(request: Request) {
  const url = new URL(request.url);

  const query = url.searchParams.get("q") ?? "";
  const modeParam = url.searchParams.get("mode") ?? "partial";

  if (modeParam !== "exact" && modeParam !== "partial") {
    return NextResponse.json(
      {
        error: "Invalid search mode",
      },
      { status: 400 },
    );
  }

  const mode = modeParam as SearchMode;

  const response = await searchUseCase.execute({
    query,
    mode,
  });

  return NextResponse.json(response);
}
