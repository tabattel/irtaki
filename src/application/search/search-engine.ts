import { buildSearchContext } from "./search-context";
import { matchSearchText } from "./search-matcher";
import type {
  SearchDocument,
  SearchQuery,
  SearchResponse,
  SearchResult,
} from "./search-types";

export function searchDocuments(
  documents: readonly SearchDocument[],
  searchQuery: SearchQuery,
): SearchResponse {
  const query = searchQuery.query.trim();

  if (!query) {
    return {
      query,
      mode: searchQuery.mode,
      results: [],
      total: 0,
      rootSearchAvailable: false,
    };
  }

  const matches: Array<{
    document: SearchDocument;
    occurrence: SearchResult["occurrence"];
    context: ReturnType<typeof buildSearchContext>;
  }> = [];

  for (const document of documents) {
    const searchableText =
      document.source === "surah" ? document.surahName : document.text;

    const result = matchSearchText(searchableText, query, searchQuery.mode);

    for (const match of result.matches) {
      const context = buildSearchContext(searchableText, match.occurrence);

      matches.push({
        document,
        occurrence: match.occurrence,
        context,
      });
    }
  }

  matches.sort((left, right) => {
    const leftId =
      left.document.source === "ayah"
        ? left.document.id
        : Number.MAX_SAFE_INTEGER;

    const rightId =
      right.document.source === "ayah"
        ? right.document.id
        : Number.MAX_SAFE_INTEGER;

    if (leftId !== rightId) {
      return leftId - rightId;
    }

    if (left.document.surahNumber !== right.document.surahNumber) {
      return left.document.surahNumber - right.document.surahNumber;
    }

    const leftAyah = left.document.ayahNumber ?? 0;
    const rightAyah = right.document.ayahNumber ?? 0;

    if (leftAyah !== rightAyah) {
      return leftAyah - rightAyah;
    }

    return left.occurrence.start - right.occurrence.start;
  });

  const results: SearchResult[] = matches.map((item, index) => ({
    resultNumber: index + 1,
    source: item.document.source,
    surahNumber: item.document.surahNumber,
    surahName: item.document.surahName,
    ayahNumber: item.document.ayahNumber,
    occurrence: item.occurrence,
    context: item.context.context,
    before: item.context.before,
    match: item.context.match,
    after: item.context.after,
  }));

  return {
    query,
    mode: searchQuery.mode,
    results,
    total: results.length,
    rootSearchAvailable: false,
  };
}
