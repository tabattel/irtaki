import { getQiraaById } from "@/application/qiraa/get-qiraa-by-id";
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
  const qiraaId = Number(id);

  if (!Number.isInteger(qiraaId) || qiraaId <= 0) {
    return NextResponse.json(
      {
        error: "Invalid qiraa id",
      },
      { status: 400 },
    );
  }

  const qiraa = await getQiraaById(qiraaId);

  if (!qiraa) {
    return NextResponse.json(
      {
        error: "Qiraa not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: qiraa,
  });
}
