import { describe, expect, it } from "vitest";

import { createTarteelTracker } from "./mushaf-tarteel-tracker";

// Sourate Al-A'la, ayat 1 à 10, écrite sans signes (37 mots).
const AYAHS = [
  "سبح اسم ربك الاعلى",
  "الذي خلق فسوى",
  "والذي قدر فهدى",
  "والذي اخرج المرعى",
  "فجعله غثاء احوى",
  "سنقرئك فلا تنسى",
  "الا ما شاء الله انه يعلم الجهر وما يخفى",
  "ونيسرك لليسرى",
  "فذكر ان نفعت الذكرى",
  "سيذكر من يخشى",
];

const targets = AYAHS.flatMap((text, a) =>
  text.split(" ").map((word, k) => ({ key: `87:${a + 1}:${k + 1}`, text: word })),
);
const { track } = createTarteelTracker(targets);

function indices(result: { matches: { index: number }[] }): number[] {
  return result.matches.map((match) => match.index).sort((a, b) => a - b);
}

describe("jeu de test", () => {
  it("contient 37 mots, l'ayah 10 commence à l'index 34", () => {
    expect(targets).toHaveLength(37);
    expect(targets[34]?.key).toBe("87:10:1");
  });
});

describe("createTarteelTracker.track", () => {
  it("ne fait rien tant que le curseur n'est pas verrouillé", () => {
    const r = track(0, "سبح اسم ربك");
    expect(r.matches).toEqual([]);
    expect(r.endIndex).toBeNull();
    expect(r.nextCursor).toBe(0);
  });

  it("suit une récitation propre", () => {
    const r = track(4, "سبح اسم ربك الاعلى الذي خلق");
    expect(indices(r)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(r.endIndex).toBe(5);
    expect(r.nextCursor).toBe(6);
  });

  it("n'est pas bloqué par un dernier mot faux ou incomplet", () => {
    const r = track(7, "الذي خلق فسوى والذي قدر ف");
    expect(indices(r)).toEqual([4, 5, 6, 7, 8]);
    expect(r.nextCursor).toBe(9);
  });

  it("colore un mot faux au milieu, puis le corrige au tick suivant", () => {
    const first = track(7, "والذي قدر فهدى والذي اجرج المرعى فجعله");
    expect(indices(first)).toEqual([7, 8, 9, 10, 12, 13]);
    expect(first.nextCursor).toBe(14);

    const second = track(first.nextCursor, "والذي اخرج المرعى فجعله غثاء");
    expect(indices(second)).toEqual([10, 11, 12, 13, 14]);
    expect(indices(second)).toContain(11);
    expect(second.nextCursor).toBe(15);
  });

  it("tolère un mot sauté par la reconnaissance", () => {
    const r = track(4, "الذي فسوى والذي قدر");
    expect(indices(r)).toEqual([4, 6, 7, 8]);
    expect(r.nextCursor).toBe(9);
  });

  it("refuse un mot isolé", () => {
    const r = track(19, "ما");
    expect(r.matches).toEqual([]);
    expect(r.nextCursor).toBe(19);
  });

  it("refuse une transcription sans rapport", () => {
    const r = track(10, "ترجمة نانسي قنقر");
    expect(r.matches).toEqual([]);
    expect(r.endIndex).toBeNull();
  });

  it("n'accepte un saut lointain qu'à partir de 3 mots", () => {
    expect(track(4, "يعلم الجهر").matches).toEqual([]);
    const r = track(4, "انه يعلم الجهر");
    expect(indices(r)).toEqual([23, 24, 25]);
    expect(r.endIndex).toBe(25);
  });

  it("atteint la fin de l'ayah 10 malgré un dernier mot tronqué", () => {
    const partial = track(
      28,
      "ونيسرك لليسرى فذكر ان نفعت الذكرى سيذكر من يخش",
    );
    expect(partial.endIndex).toBe(35);
    expect(targets[partial.endIndex ?? 0]?.key).toBe("87:10:2");

    const full = track(
      partial.nextCursor,
      "ونيسرك لليسرى فذكر ان نفعت الذكرى سيذكر من يخشى",
    );
    expect(full.endIndex).toBe(36);
    expect(targets[full.endIndex ?? 0]?.key).toBe("87:10:3");
  });
});

// ── Alef suscrit : mots écrits comme dans le Mushaf (séquences d'échappement) ──
const WA_MA = "\u0648\u064E\u0645\u064E\u0627"; // وَمَا
const YAKHFA = "\u064A\u064E\u062E\u0652\u0641\u064E\u0649\u0670"; // يَخْفَىٰ
const RAHMAN =
  "\u0671\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650"; // ٱلرَّحْمَٰنِ

describe("alef suscrit", () => {
  const uthmani = ["انه", "يعلم", "الجهر", WA_MA, YAKHFA, RAHMAN, "الرحيم"].map(
    (text, index) => ({ key: `u:${index}`, text }),
  );
  const { track: trackUthmani } = createTarteelTracker(uthmani);

  it("colore un ى final écrit avec alef suscrit (يخفى)", () => {
    const r = trackUthmani(3, "يعلم الجهر وما يخفى");
    expect(indices(r)).toEqual([1, 2, 3, 4]);
    expect(r.endIndex).toBe(4);
    expect(r.nextCursor).toBe(5);
  });

  it("accepte les deux orthographes de الرحمن", () => {
    expect(indices(trackUthmani(5, "وما يخفى الرحمن الرحيم"))).toEqual([3, 4, 5, 6]);
    expect(indices(trackUthmani(5, "وما يخفى الرحمان الرحيم"))).toEqual([3, 4, 5, 6]);
  });
});
