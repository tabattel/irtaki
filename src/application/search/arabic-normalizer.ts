const ARABIC_DIACRITICS_REGEX =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;

const ARABIC_SEARCH_REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  ["أ", "ا"],
  ["إ", "ا"],
  ["آ", "ا"],
  ["ى", "ا"],
  ["ئ", "ء"],
  ["ؤ", "و"],
]);

export interface NormalizedArabicText {
  text: string;
  originalStart: number[];
  originalEnd: number[];
}

export function removeArabicDiacritics(text: string): string {
  return text.normalize("NFC").replace(ARABIC_DIACRITICS_REGEX, "");
}

export function normalizeArabicLetters(text: string): string {
  let normalized = text;

  for (const [source, target] of ARABIC_SEARCH_REPLACEMENTS) {
    normalized = normalized.replaceAll(source, target);
  }

  return normalized;
}

export function normalizeArabicForSearch(text: string): string {
  return normalizeArabicLetters(removeArabicDiacritics(text));
}

export function normalizeArabicForSearchWithMapping(
  text: string,
): NormalizedArabicText {
  const source = text.normalize("NFC");

  let normalizedText = "";
  const originalStart: number[] = [];
  const originalEnd: number[] = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]!;

    if (ARABIC_DIACRITICS_REGEX.test(character)) {
      ARABIC_DIACRITICS_REGEX.lastIndex = 0;
      continue;
    }

    let normalizedCharacter = character;

    for (const [from, to] of ARABIC_SEARCH_REPLACEMENTS) {
      normalizedCharacter = normalizedCharacter.replaceAll(from, to);
    }

    for (let offset = 0; offset < normalizedCharacter.length; offset += 1) {
      normalizedText += normalizedCharacter[offset];
      originalStart.push(index);
      originalEnd.push(index + 1);
    }
  }

  return {
    text: normalizedText,
    originalStart,
    originalEnd,
  };
}
