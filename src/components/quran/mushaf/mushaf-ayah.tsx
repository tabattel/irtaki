import { useMemo } from "react";

import type { AyahDto } from "@/lib/api/quran";
import type { MushafLayoutWord } from "@/lib/api/mushaf";

type MushafAyahProps = {
  ayah: AyahDto;
  layoutWords?: MushafLayoutWord[];
  selected?: boolean;
  selectedWords?: Set<string>;
  onAyahClick?: (ayah: AyahDto) => void;
};

function isAyahNumberMarker(text: string): boolean {
  return /^\d+$/.test(text) || /^[٠-٩]+$/.test(text);
}

function renderAyahMarker(number: string) {
  return (
    <span
      aria-hidden="true"
      data-mushaf-ayah-marker
      className="mx-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-current px-1 align-middle text-sm leading-none"
    >
      {number}
    </span>
  );
}

export function MushafAyah({
  ayah,
  layoutWords,
  selected = false,
  selectedWords,
  onAyahClick,
}: MushafAyahProps) {
  const fallbackWords = useMemo(
    () => ayah.text.trim().split(/\s+/),
    [ayah.text],
  );

  const markerWord = layoutWords?.find((word) => isAyahNumberMarker(word.text));

  const renderedWords =
    layoutWords?.filter((word) => !isAyahNumberMarker(word.text)) ??
    fallbackWords.map((word, index) => ({
      id: index,
      key: `${ayah.id}-${index}`,
      surah: ayah.surahNumber,
      ayah: ayah.number,
      word: index + 1,
      text: word,
    }));

  return (
    <span
      data-ayah-id={ayah.id}
      data-surah-number={ayah.surahNumber}
      data-ayah-number={ayah.number}
      data-mushaf-ayah
      className={[
        "inline rounded-md transition-colors",
        selected ? "bg-gray-200/80" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={() => onAyahClick?.(ayah)}
        className={[
          "rounded-md px-1 text-right leading-loose transition",
          selected ? "border border-black" : "border border-transparent",
        ].join(" ")}
        aria-label={`آية ${ayah.number}`}
      >
        {renderedWords.map((word, index) => {
          const wordKey = `${word.surah}:${word.ayah}:${word.word}`;
          const selectedWord = selectedWords?.has(wordKey) ?? false;

          return (
            <span
              key={`${ayah.id}-${word.key}`}
              data-mushaf-word
              data-word-key={wordKey}
              data-surah-number={word.surah}
              data-ayah-number={word.ayah}
              data-word-number={word.word}
              className={[
                "inline",
                selectedWord
                  ? "rounded-sm border border-black bg-gray-300/80 px-1"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {word.text}
              {index < renderedWords.length - 1 ? " " : ""}
            </span>
          );
        })}

        {markerWord ? renderAyahMarker(markerWord.text) : null}
      </button>
    </span>
  );
}
