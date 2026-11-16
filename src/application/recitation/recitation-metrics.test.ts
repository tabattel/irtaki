import { describe, expect, it } from "vitest";

import {
  calculateWer,
  compareRecitation,
  gradeFromWerPercent,
  normalizeRecitationText,
  recitationWords,
} from "./recitation-metrics";

// « ٱلۡحَمۡدُ لِلَّهِ » écrit en séquences d'échappement (voyelles et signes coraniques).
const UTHMANI_HAMD =
  "\u0671\u0644\u06E1\u062D\u064E\u0645\u06E1\u062F\u064F \u0644\u0650\u0644\u064E\u0651\u0647\u0650";

describe("normalizeRecitationText", () => {
  it("ramène le texte uthmani au texte simple", () => {
    expect(normalizeRecitationText(UTHMANI_HAMD)).toBe("الحمد لله");
  });

  it("convertit l'alef suscrit en alef", () => {
    const kafirin =
      "\u0671\u0644\u06E1\u0643\u064E\u0670\u0641\u0650\u0631\u0650\u064A\u0646\u064E";
    expect(normalizeRecitationText(kafirin)).toBe("الكافرين");
  });

  it("ignore le tatweel", () => {
    expect(normalizeRecitationText("\u0627\u0644\u062D\u0645\u0640\u062F")).toBe(
      "الحمد",
    );
  });
});

describe("calculateWer", () => {
  const ref = "الحمد لله رب العالمين";

  it("compte une substitution", () => {
    const r = calculateWer(
      recitationWords(ref),
      recitationWords("الحمد لله رب العلمين"),
    );
    expect(r.substitutions).toBe(1);
    expect(r.editDistance).toBe(1);
    expect(r.werPercent).toBe(25);
  });

  it("compte une insertion", () => {
    const r = calculateWer(
      recitationWords(ref),
      recitationWords("الحمد لله رب العالمين جدا"),
    );
    expect(r.insertions).toBe(1);
    expect(r.editDistance).toBe(1);
  });

  it("compte une suppression", () => {
    const r = calculateWer(
      recitationWords(ref),
      recitationWords("الحمد لله رب"),
    );
    expect(r.deletions).toBe(1);
    expect(r.editDistance).toBe(1);
  });

  it("donne 100 % quand rien n'est reconnu", () => {
    expect(
      calculateWer(recitationWords(ref), recitationWords("")).werPercent,
    ).toBe(100);
  });

  it("refuse une référence vide", () => {
    expect(() => calculateWer([], ["كلمة"])).toThrow();
  });
});

describe("gradeFromWerPercent", () => {
  it("respecte les bornes", () => {
    expect(gradeFromWerPercent(0)).toBe("A");
    expect(gradeFromWerPercent(4.99)).toBe("A");
    expect(gradeFromWerPercent(5)).toBe("B");
    expect(gradeFromWerPercent(20)).toBe("B");
    expect(gradeFromWerPercent(20.01)).toBe("C");
  });
});

describe("compareRecitation", () => {
  it("détecte la correspondance exacte malgré les signes", () => {
    const r = compareRecitation(UTHMANI_HAMD, "الحمد لله");
    expect(r.exactMatch).toBe(true);
    expect(r.grade).toBe("A");
    expect(r.normalizationVersion).toBe("recitation-match-v1");
  });

  it("classe selon la longueur de l'Ayah", () => {
    const words = (n: number) => new Array<string>(n).fill("كلمة").join(" ");
    const oneOff = (n: number) =>
      ["كتاب", ...new Array<string>(n - 1).fill("كلمة")].join(" ");
    expect(compareRecitation(words(40), oneOff(40)).grade).toBe("A"); // 2,5 %
    expect(compareRecitation(words(20), oneOff(20)).grade).toBe("B"); // 5 %
    expect(compareRecitation(words(5), oneOff(5)).grade).toBe("B"); // 20 %
    expect(compareRecitation(words(4), oneOff(4)).grade).toBe("C"); // 25 %
  });
});
