import { getMushafById } from "@/application/mushaf/get-mushaf-by-id";
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
  const mushafId = Number(id);

  if (!Number.isInteger(mushafId) || mushafId <= 0) {
    return NextResponse.json(
      { error: "Invalid mushaf id" },
      { status: 400 },
    );
  }

  const mushaf = await getMushafById(mushafId);

  if (!mushaf) {
    return NextResponse.json(
      { error: "Mushaf not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: mushaf,
  });
}
