import { useMemo } from "react";

import type { AyahDto } from "@/lib/api/quran";
import type { MushafLayoutWord } from "@/lib/api/mushaf";

type UnderlineStyle = "single" | "double" | "wavy" | "double-wavy";

function resolveUnderlineStyle(
  textModifications: Record<string, boolean>,
  mode: string,
  target: string,
  previewOriginal: boolean,
): UnderlineStyle | null {
  if (previewOriginal) return null;

  const priority: UnderlineStyle[] = [
    "double-wavy",
    "wavy",
    "double",
    "single",
  ];

  for (const style of priority) {
    if (textModifications[`${mode}:${target}:underline-${style}`] === true) {
      return style;
    }
  }

  // Compatibilité avec les soulignements simples déjà sauvegardés.
  return textModifications[`${mode}:${target}:underline`] === true
    ? "single"
    : null;
}

type MushafAyahProps = {
  ayah: AyahDto;
  layoutWords?: MushafLayoutWord[];
  selected?: boolean;
  selectedWords?: Set<string>;
  onAyahClick?: (ayah: AyahDto) => void;
  mode: string;
  textModifications: Record<string, boolean>;
  colorAssignments: Record<string, string>;
  previewOriginalOptions: Record<string, boolean>;
  showAllTextOverride: boolean;
  hideText?: boolean;
};

function isAyahNumberMarker(text: string): boolean {
  return /^\d+$/.test(text) || /^[٠-٩]+$/.test(text);
}

function renderAyahMarker(number: string) {
  return (
    <span
      aria-hidden="true"
      data-mushaf-ayah-marker
      className="mx-1 inline-flex min-w-[1.4em] items-center justify-center px-1 align-middle text-[1.15em] leading-normal font-semibold"
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
  mode,
  textModifications,
  colorAssignments,
  previewOriginalOptions,
  showAllTextOverride,
  hideText = false,
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

  const ayahColors =
    previewOriginalOptions[`${mode}:colors`] !== true &&
    textModifications[`${mode}:ayah:${ayah.id}:colors`] === true;
  const ayahHighlight =
    previewOriginalOptions[`${mode}:highlight`] !== true &&
    textModifications[`${mode}:ayah:${ayah.id}:highlight`] === true;
  const ayahUnderlineStyle = resolveUnderlineStyle(
    textModifications,
    mode,
    `ayah:${ayah.id}`,
    previewOriginalOptions[`${mode}:underline`] === true,
  );
  const ayahColor =
    previewOriginalOptions[`${mode}:colors`] !== true
      ? colorAssignments[`${mode}:ayah:${ayah.id}:colors`]
      : undefined;
  const ayahHighlightColor =
    previewOriginalOptions[`${mode}:highlight`] !== true
      ? colorAssignments[`${mode}:ayah:${ayah.id}:highlight`]
      : undefined;
  const ayahHidden =
    hideText ||
    (!showAllTextOverride &&
      textModifications[`${mode}:ayah:${ayah.id}:hidden`] === true);

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
          const wordColors =
            previewOriginalOptions[`${mode}:colors`] !== true &&
            textModifications[`${mode}:word:${wordKey}:colors`] === true;
          const wordHighlight =
            previewOriginalOptions[`${mode}:highlight`] !== true &&
            textModifications[`${mode}:word:${wordKey}:highlight`] === true;
          const wordUnderlineStyle = resolveUnderlineStyle(
            textModifications,
            mode,
            `word:${wordKey}`,
            previewOriginalOptions[`${mode}:underline`] === true,
          );
          const wordColor =
            previewOriginalOptions[`${mode}:colors`] !== true
              ? colorAssignments[`${mode}:word:${wordKey}:colors`]
              : undefined;
          const wordHighlightColor =
            previewOriginalOptions[`${mode}:highlight`] !== true
              ? colorAssignments[`${mode}:word:${wordKey}:highlight`]
              : undefined;
          const wordHidden =
            !showAllTextOverride &&
            textModifications[`${mode}:word:${wordKey}:hidden`] === true;
          const underlineStyle = wordUnderlineStyle ?? ayahUnderlineStyle;

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
                wordColors || ayahColors
                  ? "text-blue-700 dark:text-blue-300"
                  : "",
                wordHighlight || ayahHighlight
                  ? "rounded-sm bg-yellow-200/80 dark:bg-yellow-400/30"
                  : "",
                underlineStyle ? `mushaf-underline-${underlineStyle}` : "",
                underlineStyle === "double-wavy" ? "relative" : "",
                wordHidden || ayahHidden ? "opacity-0" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                opacity: wordHidden || ayahHidden ? 0 : 1,
                color: wordColor ?? ayahColor,
                backgroundColor:
                  wordHighlightColor || ayahHighlightColor
                    ? `${wordHighlightColor ?? ayahHighlightColor}55`
                    : undefined,
              }}
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
