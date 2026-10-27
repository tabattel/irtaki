import { useMemo } from "react";

import type { AyahDto } from "@/lib/api/quran";
import type { MushafLayoutWord } from "@/lib/api/mushaf";

type UnderlineStyle = "single" | "double" | "wavy" | "double-wavy";

function resolveUnderlineStyle(
  textModifications: Record<string, boolean>,
  modes: string[],
  target: string,
  previewOriginalOptions: Record<string, boolean>,
): UnderlineStyle | null {
  const priority: UnderlineStyle[] = [
    "double-wavy",
    "wavy",
    "double",
    "single",
  ];

  for (const mode of modes) {
    if (previewOriginalOptions[`${mode}:underline`] === true) continue;

    for (const style of priority) {
      if (textModifications[`${mode}:${target}:underline-${style}`] === true) {
        return style;
      }
    }

    if (textModifications[`${mode}:${target}:underline`] === true) {
      return "single";
    }
  }
  return null;
}

type MushafAyahProps = {
  ayah: AyahDto;
  layoutWords?: MushafLayoutWord[];
  selected?: boolean;
  selectedWords?: Set<string>;
  onAyahClick?: (ayah: AyahDto) => void;
  mode: string;
  modificationModes: string[];
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
  modificationModes,
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

  const ayahColors = modificationModes.some(
    (candidate) =>
      previewOriginalOptions[`${candidate}:colors`] !== true &&
      textModifications[`${candidate}:ayah:${ayah.id}:colors`] === true,
  );
  const ayahHighlight = modificationModes.some(
    (candidate) =>
      previewOriginalOptions[`${candidate}:highlight`] !== true &&
      textModifications[`${candidate}:ayah:${ayah.id}:highlight`] === true,
  );
  const ayahUnderlineStyle = resolveUnderlineStyle(
    textModifications,
    modificationModes,
    `ayah:${ayah.id}`,
    previewOriginalOptions,
  );
  const ayahColorMode = modificationModes.find(
    (candidate) =>
      previewOriginalOptions[`${candidate}:colors`] !== true &&
      textModifications[`${candidate}:ayah:${ayah.id}:colors`] === true &&
      colorAssignments[`${candidate}:ayah:${ayah.id}:colors`] !== undefined,
  );
  const ayahColor = ayahColorMode
    ? colorAssignments[`${ayahColorMode}:ayah:${ayah.id}:colors`]
    : undefined;
  const ayahHighlightMode = modificationModes.find(
    (candidate) =>
      previewOriginalOptions[`${candidate}:highlight`] !== true &&
      textModifications[`${candidate}:ayah:${ayah.id}:highlight`] === true &&
      colorAssignments[`${candidate}:ayah:${ayah.id}:highlight`] !== undefined,
  );
  const ayahHighlightColor = ayahHighlightMode
    ? colorAssignments[`${ayahHighlightMode}:ayah:${ayah.id}:highlight`]
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
          "inline rounded-md px-1 text-right leading-[1.7] transition sm:leading-[1.9]",
        ].join(" ")}
        aria-label={`آية ${ayah.number}`}
      >
        {renderedWords.map((word, index) => {
          const wordKey = `${word.surah}:${word.ayah}:${word.word}`;
          const selectedWord = selectedWords?.has(wordKey) ?? false;
          const wordColors = modificationModes.some(
            (candidate) =>
              previewOriginalOptions[`${candidate}:colors`] !== true &&
              textModifications[`${candidate}:word:${wordKey}:colors`] === true,
          );
          const wordHighlight = modificationModes.some(
            (candidate) =>
              previewOriginalOptions[`${candidate}:highlight`] !== true &&
              textModifications[`${candidate}:word:${wordKey}:highlight`] ===
                true,
          );
          const wordUnderlineStyle = resolveUnderlineStyle(
            textModifications,
            modificationModes,
            `word:${wordKey}`,
            previewOriginalOptions,
          );
          const wordColorMode = modificationModes.find(
            (candidate) =>
              previewOriginalOptions[`${candidate}:colors`] !== true &&
              textModifications[`${candidate}:word:${wordKey}:colors`] ===
                true &&
              colorAssignments[`${candidate}:word:${wordKey}:colors`] !==
                undefined,
          );
          const wordColor = wordColorMode
            ? colorAssignments[`${wordColorMode}:word:${wordKey}:colors`]
            : undefined;
          const wordHighlightMode = modificationModes.find(
            (candidate) =>
              previewOriginalOptions[`${candidate}:highlight`] !== true &&
              textModifications[`${candidate}:word:${wordKey}:highlight`] ===
                true &&
              colorAssignments[`${candidate}:word:${wordKey}:highlight`] !==
                undefined,
          );
          const wordHighlightColor = wordHighlightMode
            ? colorAssignments[`${wordHighlightMode}:word:${wordKey}:highlight`]
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
