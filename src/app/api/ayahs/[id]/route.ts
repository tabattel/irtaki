import { getAyahById } from "@/application/ayah/get-ayah-by-id";
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
  const ayahId = Number(id);

  if (!Number.isInteger(ayahId) || ayahId <= 0) {
    return NextResponse.json(
      { error: "Invalid ayah id" },
      { status: 400 },
    );
  }

  const ayah = await getAyahById(ayahId);

  if (!ayah) {
    return NextResponse.json(
      { error: "Ayah not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: ayah,
  });
}
