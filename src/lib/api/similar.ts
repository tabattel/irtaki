import type { QuranpediaSimilarGroup } from "@irtaki/resource";
import { apiGet } from "./client";

export interface SimilarAyahDto {
  readonly status: "found" | "missing";
  readonly surah: number;
  readonly ayah: number;
  readonly dataVersion: string;
  readonly groups: readonly QuranpediaSimilarGroup[];
}

interface SimilarApiResponse {
  readonly data: SimilarAyahDto;
}

export async function getSimilarForAyah(
  surah: number,
  ayah: number,
  signal?: AbortSignal,
): Promise<SimilarAyahDto> {
  const response = await apiGet<SimilarApiResponse>(
    `/api/similar/ayah/${surah}/${ayah}`,
    { signal },
  );

  return response.data;
}
