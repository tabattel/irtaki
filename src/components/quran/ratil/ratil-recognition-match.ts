export type RatilAyahCandidate = {
  ayahId: number;
  text: string;
};

export type RatilCandidateSelection<T> = {
  candidate: T | null;
  ambiguous: boolean;
};

/**
 * Sélectionne une ayah uniquement si son identifiant est unique.
 * Plusieurs ayat candidates ne sont jamais départagées arbitrairement.
 */
export function selectUniqueRatilCandidate<
  T extends RatilAyahCandidate,
>(
  candidates: readonly T[],
): RatilCandidateSelection<T> {
  const unique = [
    ...new Map(
      candidates.map((candidate) => [
        candidate.ayahId,
        candidate,
      ]),
    ).values(),
  ];

  if (unique.length === 1) {
    return {
      candidate: unique[0]!,
      ambiguous: false,
    };
  }

  return {
    candidate: null,
    ambiguous: unique.length > 1,
  };
}

/**
 * Compte les mots arabes de l'ayah selon la même extraction
 * de base que le contrôleur Ratil.
 */
export function normalizeRatilArabicWords(text: string): string[] {
  return text
    .normalize("NFC")
    .replace(
      /[^\p{Script_Extensions=Arabic}\p{M}\s]/gu,
      " ",
    )
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((word) =>
      word
        .normalize("NFC")
        .replace(
          /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu,
          "",
        )
        .replace(/ـ/gu, "")
        .replace(/[أإآ]/gu, "ا")
        .replace(/ى/gu, "ا")
        .replace(/ئ/gu, "ء")
        .replace(/ؤ/gu, "و"),
    )
    .filter(Boolean);
}

export function countRatilArabicWords(text: string): number {
  return normalizeRatilArabicWords(text).length;
}

export function isRatilCompleteShortAyah(
  candidate: RatilAyahCandidate,
  recognizedWords: readonly string[],
  ambiguous: boolean,
): boolean {
  if (
    ambiguous ||
    recognizedWords.length < 1 ||
    recognizedWords.length > 2
  ) {
    return false;
  }

  const ayahWords = normalizeRatilArabicWords(candidate.text);
  const recognized = recognizedWords
    .map((word) => normalizeRatilArabicWords(word))
    .flat();

  if (
    ayahWords.length !== recognized.length ||
    ayahWords.length < 1 ||
    ayahWords.length > 2
  ) {
    return false;
  }

  return ayahWords.every(
    (word, index) => word === recognized[index],
  );
}

/**
 * Règle initiale de confirmation :
 * - aucune ambiguïté ;
 * - au moins quatre mots distincts correspondants ;
 * - ou correspondance couvrant une ayah entière plus courte.
 */
export function isRatilAyahConfirmed(
  candidate: RatilAyahCandidate,
  matchedWordCount: number,
  ambiguous: boolean,
): boolean {
  if (
    ambiguous ||
    !Number.isInteger(matchedWordCount) ||
    matchedWordCount < 1
  ) {
    return false;
  }

  const ayahWordCount = countRatilArabicWords(candidate.text);

  // Une ayah d'un seul mot reste provisoire.
  if (ayahWordCount < 2) return false;

  return (
    matchedWordCount >= 4 ||
    matchedWordCount >= ayahWordCount
  );
}
