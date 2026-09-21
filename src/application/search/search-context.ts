import type { SearchOccurrence } from "./search-types";

export interface SearchContext {
  before: string;
  match: string;
  after: string;
  context: string;
}

export function buildSearchContext(
  text: string,
  occurrence: SearchOccurrence,
): SearchContext {
  const words = text.split(/\s+/u).filter(Boolean);

  let characterOffset = 0;
  let matchWordIndex = -1;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const wordStart = text.indexOf(word, characterOffset);
    const wordEnd = wordStart + word.length;

    if (occurrence.start >= wordStart && occurrence.start < wordEnd) {
      matchWordIndex = index;
      break;
    }

    characterOffset = wordEnd;
  }

  if (matchWordIndex === -1) {
    const match = text.slice(occurrence.start, occurrence.end);

    return {
      before: "",
      match,
      after: "",
      context: match,
    };
  }

  const startWord = Math.max(0, matchWordIndex - 3);
  const endWord = Math.min(words.length, matchWordIndex + 4);

  const contextWords = words.slice(startWord, endWord);
  const relativeIndex = matchWordIndex - startWord;

  const before = contextWords.slice(0, relativeIndex).join(" ");
  const match = text.slice(occurrence.start, occurrence.end);
  const after = contextWords.slice(relativeIndex + 1).join(" ");

  return {
    before,
    match,
    after,
    context: [before, match, after].filter(Boolean).join(" "),
  };
}
