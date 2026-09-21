import {
  normalizeArabicForSearch,
  normalizeArabicForSearchWithMapping,
} from "./arabic-normalizer";
import type {
  SearchMode,
  SearchOccurrence,
  SearchTextMatch,
} from "./search-types";

const MIN_PARTIAL_LENGTH = 3;

function countArabicLetters(text: string): number {
  return [...text].filter((character) => /\p{Script=Arabic}/u.test(character))
    .length;
}

function findOccurrences(
  text: string,
  query: string,
  mode: SearchMode,
): SearchOccurrence[] {
  const occurrences: SearchOccurrence[] = [];

  let position = 0;

  while (position <= text.length - query.length) {
    const index = text.indexOf(query, position);

    if (index === -1) {
      break;
    }

    occurrences.push({
      start: index,
      end: index + query.length,
    });

    position = index + (mode === "exact" ? query.length : 1);
  }

  return occurrences;
}

function isExactWordMatch(text: string, occurrence: SearchOccurrence): boolean {
  const before = occurrence.start === 0 ? "" : text[occurrence.start - 1];
  const after = occurrence.end >= text.length ? "" : text[occurrence.end];

  const isSeparator = (character: string) =>
    character === "" || /\s/u.test(character);

  return isSeparator(before) && isSeparator(after);
}

function mapToOriginal(
  occurrence: SearchOccurrence,
  originalStart: number[],
  originalEnd: number[],
): SearchOccurrence {
  const start = originalStart[occurrence.start];
  const end = originalEnd[occurrence.end - 1];

  if (start === undefined || end === undefined) {
    return occurrence;
  }

  return { start, end };
}

export function matchSearchText(
  text: string,
  query: string,
  mode: SearchMode,
): SearchTextMatch {
  const mapped = normalizeArabicForSearchWithMapping(text);
  const normalizedQuery = normalizeArabicForSearch(query).trim();

  if (!normalizedQuery) {
    return {
      normalizedText: mapped.text,
      matches: [],
    };
  }

  if (
    mode === "partial" &&
    countArabicLetters(normalizedQuery) < MIN_PARTIAL_LENGTH
  ) {
    return {
      normalizedText: mapped.text,
      matches: [],
    };
  }

  const occurrences = findOccurrences(mapped.text, normalizedQuery, mode);

  const valid =
    mode === "exact"
      ? occurrences.filter((occurrence) =>
          isExactWordMatch(mapped.text, occurrence),
        )
      : occurrences;

  return {
    normalizedText: mapped.text,
    matches: valid.map((occurrence) => {
      const originalOccurrence = mapToOriginal(
        occurrence,
        mapped.originalStart,
        mapped.originalEnd,
      );

      return {
        occurrence: originalOccurrence,
        context: "",
        before: "",
        match: text.slice(originalOccurrence.start, originalOccurrence.end),
        after: "",
      };
    }),
  };
}
