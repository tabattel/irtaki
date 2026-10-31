import type { QuranpediaQiraatWord } from "@irtaki/resource";
import { apiGet } from "./client";

export interface QiraatAyahDto {
  readonly status: "found" | "missing";
  readonly surah: number;
  readonly ayah: number;
  readonly dataVersion: string;
  readonly words: readonly QuranpediaQiraatWord[];
}

interface QiraatApiResponse {
  readonly data: QiraatAyahDto;
}

export async function getQiraatForAyah(
  surah: number,
  ayah: number,
  signal?: AbortSignal,
): Promise<QiraatAyahDto> {
  const response = await apiGet<QiraatApiResponse>(
    `/api/qiraat/ayah/${surah}/${ayah}`,
    { signal },
  );

  return response.data;
}
