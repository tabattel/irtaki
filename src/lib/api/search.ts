import { apiGet } from "./client";

export type SearchMode = "exact" | "partial";

export type SearchSource = "ayah" | "surah";

export interface SearchOccurrence {
  start: number;
  end: number;
}

export interface SearchResult {
  resultNumber: number;
  source: SearchSource;
  surahNumber: number;
  surahName: string;
  ayahNumber?: number;
  ayahId?: number;
  pageNumber?: number;
  text: string;
  occurrence: SearchOccurrence;
  context: string;
  before: string;
  match: string;
  after: string;
}

export interface SearchResponse {
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  total: number;
  rootSearchAvailable: false;
}

export async function searchQuran(
  query: string,
  mode: SearchMode = "partial",
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    mode,
  });

  return apiGet<SearchResponse>(`/api/search?${params.toString()}`);
}
