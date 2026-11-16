import { getWujuhByTariq } from "@/application/tariq/get-wujuh-by-tariq";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type WajhRow = {
  id: number;
  tariqId: number;
  name: string;
  position: number;
  isDefault: boolean;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const tariqId = Number(id);

  if (!Number.isInteger(tariqId) || tariqId <= 0) {
    return NextResponse.json({ error: "Invalid tariq id" }, { status: 400 });
  }

  const wujuh = await getWujuhByTariq(tariqId);

  if (!wujuh) {
    return NextResponse.json({ error: "Tariq not found" }, { status: 404 });
  }

  return NextResponse.json({
    data: wujuh.map((wajh: WajhRow) => ({
      id: wajh.id,
      tariqId: wajh.tariqId,
      name: wajh.name,
      position: wajh.position,
      isDefault: wajh.isDefault,
    })),
  });
}
