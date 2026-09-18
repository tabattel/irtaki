import { getAyahsByPage } from "@/application/ayah/get-ayahs-by-page";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    page: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { page } = await context.params;
  const pageNumber = Number(page);

  if (!Number.isInteger(pageNumber) || pageNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid page number" },
      { status: 400 },
    );
  }

  const ayahs = await getAyahsByPage(pageNumber);

  return NextResponse.json({
    data: ayahs,
  });
}
