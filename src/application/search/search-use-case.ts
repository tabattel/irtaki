import { AyahRepository, SurahRepository } from "@irtaki/persistence";

import { searchDocuments } from "./search-engine";
import type { SearchQuery, SearchResponse } from "./search-types";

type Ayah = Awaited<ReturnType<AyahRepository["findAllForSearch"]>>[number];

type Surah = Awaited<ReturnType<SurahRepository["findAll"]>>[number];

export interface SearchAyahRepository {
  findAllForSearch(): Promise<Ayah[]>;
}

export interface SearchSurahRepository {
  findAll(): Promise<Surah[]>;
}

export class SearchUseCase {
  constructor(
    private readonly ayahRepository: SearchAyahRepository = new AyahRepository(),
    private readonly surahRepository: SearchSurahRepository = new SurahRepository(),
  ) {}

  async execute(searchQuery: SearchQuery): Promise<SearchResponse> {
    const [ayahs, surahs] = await Promise.all([
      this.ayahRepository.findAllForSearch(),
      this.surahRepository.findAll(),
    ]);

    const surahNames = new Map<number, string>(
      surahs.map((surah) => [surah.number, surah.name]),
    );

    const documents = [
      ...ayahs.map((ayah) => ({
        id: ayah.id,
        source: "ayah" as const,
        surahNumber: ayah.surahNumber,
        surahName: surahNames.get(ayah.surahNumber) ?? "",
        ayahNumber: ayah.number,
        text: ayah.text,
      })),
      ...surahs.map((surah) => ({
        id: surah.id,
        source: "surah" as const,
        surahNumber: surah.number,
        surahName: surah.name,
        text: surah.name,
      })),
    ];

    return searchDocuments(documents, searchQuery);
  }
}
