import type { AyahDto } from "@/lib/api/quran";
import type { MushafLayoutLine } from "@/lib/api/mushaf";

import { MushafAyah } from "./mushaf-ayah";

type MushafLineProps = {
  line: MushafLayoutLine;
  ayahs: AyahDto[];
  surahNames: Map<number, string>;
  selectedAyahId?: number;
  selectedWords?: Set<string>;
  mode: string;
  modificationModes: string[];
  textModifications: Record<string, boolean>;
  colorAssignments: Record<string, string>;
  previewOriginalOptions: Record<string, boolean>;
  showAllTextOverride: boolean;
  hideUnrevealedAyahs: boolean;
  revealedAyahIds: Set<number>;
};

const BASMALLAH = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ";

export function MushafLine({
  line,
  ayahs,
  surahNames,
  selectedAyahId,
  selectedWords,
  mode,
  modificationModes,
  textModifications,
  colorAssignments,
  previewOriginalOptions,
  showAllTextOverride,
  hideUnrevealedAyahs,
  revealedAyahIds,
}: MushafLineProps) {
  if (line.type === "surah_name") {
    const name =
      line.surahNumber !== null ? surahNames.get(line.surahNumber) : undefined;

    return (
      <div
        className="py-1 text-center text-2xl font-semibold"
        data-mushaf-line
        data-mushaf-line-type="surah_name"
      >
        {name ?? ""}
      </div>
    );
  }

  if (line.type === "basmallah") {
    return (
      <div
        className="py-1 text-center text-2xl"
        data-mushaf-line
        data-mushaf-line-type="basmallah"
      >
        {BASMALLAH}
      </div>
    );
  }

  const groups = new Map<string, MushafLayoutLine["words"]>();

  for (const word of line.words) {
    const key = `${word.surah}:${word.ayah}`;
    const words = groups.get(key) ?? [];
    words.push(word);
    groups.set(key, words);
  }

  return (
    <div
      className={[
        "w-full text-xl leading-[1.7] whitespace-nowrap sm:text-2xl sm:leading-[1.9]",
        "select-none",
        "text-center",
      ].join(" ")}
      dir="rtl"
      data-mushaf-line
      data-mushaf-line-type="ayah"
      data-mushaf-line-number={line.line}
    >
      {Array.from(groups.values()).map((words) => {
        const firstWord = words[0];

        const ayah = ayahs.find(
          (item) =>
            item.surahNumber === firstWord.surah &&
            item.number === firstWord.ayah,
        );

        if (!ayah) {
          return null;
        }

        return (
          <MushafAyah
            key={`${ayah.id}-${line.line}`}
            ayah={ayah}
            layoutWords={words}
            selected={ayah.id === selectedAyahId}
            selectedWords={selectedWords}
            mode={mode}
            modificationModes={modificationModes}
            textModifications={textModifications}
            colorAssignments={colorAssignments}
            previewOriginalOptions={previewOriginalOptions}
            showAllTextOverride={showAllTextOverride}
            hideText={
              hideUnrevealedAyahs &&
              (mode !== "listening" || !revealedAyahIds.has(ayah.id))
            }
          />
        );
      })}
    </div>
  );
}
