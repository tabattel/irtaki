export type SearchMode = "exact" | "partial";

export type SearchSource = "ayah" | "surah";

export interface SearchOccurrence {
  start: number;
  end: number;
}

export interface SearchMatch {
  occurrence: SearchOccurrence;
  context: string;
  before: string;
  match: string;
  after: string;
}

export interface SearchTextMatch {
  normalizedText: string;
  matches: SearchMatch[];
}

export interface SearchDocument {
  id: number;
  source: SearchSource;
  surahNumber: number;
  surahName: string;
  ayahNumber?: number;
  text: string;
}

export interface SearchResult {
  resultNumber: number;
  source: SearchSource;
  surahNumber: number;
  surahName: string;
  ayahNumber?: number;
  occurrence: SearchOccurrence;
  context: string;
  before: string;
  match: string;
  after: string;
}

export interface SearchQuery {
  query: string;
  mode: SearchMode;
}

export interface SearchResponse {
  query: string;
  mode: SearchMode;
  results: SearchResult[];
  total: number;
  rootSearchAvailable: false;
}
