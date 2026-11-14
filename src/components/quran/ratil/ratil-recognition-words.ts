import type { RatilRecognitionWord } from "./ratil-recognition-client";

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;

const DEFAULT_MAX_AGE_SECONDS = 8;
const DEFAULT_MAX_WORDS = 32;

/**
 * Normalise un mot arabe pour comparer les occurrences reconnues.
 * Cette fonction ne modifie jamais le texte original conservé.
 */
export function normalizeRatilWordToken(value: string): string {
  return value
    .normalize("NFC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/ـ/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ا")
    .replace(/ئ/gu, "ء")
    .replace(/ؤ/gu, "و")
    .trim();
}

function overlapRatio(
  left: RatilRecognitionWord,
  right: RatilRecognitionWord,
): number {
  const intersection = Math.max(
    0,
    Math.min(left.end, right.end) - Math.max(left.start, right.start),
  );

  const shortestDuration = Math.min(
    left.end - left.start,
    right.end - right.start,
  );

  if (shortestDuration <= 0) return 0;

  return intersection / shortestDuration;
}

/**
 * Deux occurrences ne sont identiques que si :
 * - leur contenu arabe normalisé est identique ;
 * - leurs intervalles audio se chevauchent à au moins 50 %.
 *
 * Deux répétitions réellement prononcées à des instants distincts
 * restent donc deux occurrences distinctes.
 */
function isDuplicateWord(
  left: RatilRecognitionWord,
  right: RatilRecognitionWord,
): boolean {
  if (
    normalizeRatilWordToken(left.text) !== normalizeRatilWordToken(right.text)
  ) {
    return false;
  }

  return overlapRatio(left, right) >= 0.5;
}

function probabilityScore(word: RatilRecognitionWord): number {
  return word.probability ?? -1;
}

export type MergeRatilWordsOptions = {
  maxAgeSeconds?: number;
  maxWords?: number;
  referenceTimeSeconds?: number;
};

/**
 * Fusionne les mots de fenêtres audio successives.
 *
 * Les doublons temporels sont fusionnés en conservant
 * la reconnaissance ayant la meilleure probabilité.
 */
export function mergeRatilRecognitionWords(
  previous: readonly RatilRecognitionWord[],
  incoming: readonly RatilRecognitionWord[],
  options: MergeRatilWordsOptions = {},
): RatilRecognitionWord[] {
  const maxAgeSeconds =
    Number.isFinite(options.maxAgeSeconds) && (options.maxAgeSeconds ?? 0) > 0
      ? options.maxAgeSeconds!
      : DEFAULT_MAX_AGE_SECONDS;

  const maxWords =
    Number.isInteger(options.maxWords) && (options.maxWords ?? 0) > 0
      ? options.maxWords!
      : DEFAULT_MAX_WORDS;

  const ordered = [...previous, ...incoming]
    .filter(
      (word) =>
        typeof word.text === "string" &&
        word.text.trim().length > 0 &&
        Number.isFinite(word.start) &&
        Number.isFinite(word.end) &&
        word.start >= 0 &&
        word.end > word.start &&
        Number.isInteger(word.sequence) &&
        Number.isInteger(word.segmentIndex),
    )
    .sort(
      (left, right) =>
        left.start - right.start ||
        left.end - right.end ||
        left.sequence - right.sequence,
    );

  const unique: RatilRecognitionWord[] = [];

  for (const word of ordered) {
    let duplicateIndex = -1;

    for (let index = unique.length - 1; index >= 0; index -= 1) {
      if (isDuplicateWord(unique[index]!, word)) {
        duplicateIndex = index;
        break;
      }
    }

    if (duplicateIndex === -1) {
      unique.push(word);
      continue;
    }

    const existing = unique[duplicateIndex]!;

    if (probabilityScore(word) > probabilityScore(existing)) {
      unique[duplicateIndex] = word;
    }
  }

  if (unique.length === 0) return [];

  const latestEnd = Math.max(...unique.map((word) => word.end));

  // Le temps de la fenêtre audio avance même lorsque Whisper
  // ne renvoie aucun mot pour le segment courant.
  const referenceTime =
    Number.isFinite(options.referenceTimeSeconds) &&
    options.referenceTimeSeconds! >= 0
      ? Math.max(latestEnd, options.referenceTimeSeconds!)
      : latestEnd;

  const minimumStart = referenceTime - maxAgeSeconds;

  return unique
    .filter((word) => word.end >= minimumStart)
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .slice(-maxWords);
}
