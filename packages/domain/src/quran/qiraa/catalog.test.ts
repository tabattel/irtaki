import { describe, expect, it } from "vitest";
import { QIRAAT } from "./qiraa-catalog";
import { RIWAYAT } from "../riwaya/riwaya-catalog";

describe("Qiraat and Riwayat catalog", () => {
  it("contains exactly ten qiraat", () => {
    expect(QIRAAT).toHaveLength(10);
  });

  it("contains exactly twenty riwayat", () => {
    expect(RIWAYAT).toHaveLength(20);
  });

  it("contains the ten expected qiraat", () => {
    expect(QIRAAT.map((qiraa) => qiraa.shortName)).toEqual([
      "نافع",
      "ابن كثير",
      "أبو عمرو",
      "ابن عامر",
      "عاصم",
      "حمزة",
      "الكسائي",
      "أبو جعفر",
      "يعقوب",
      "خلف",
    ]);
  });

  it("contains the expected two riwayat for each qiraa", () => {
    const expected = {
      1: ["قالون", "ورش"],
      2: ["البزي", "قنبل"],
      3: ["الدوري", "السوسي"],
      4: ["هشام", "ابن ذكوان"],
      5: ["شعبة", "حفص"],
      6: ["خلف", "خلاد"],
      7: ["أبو الحارث", "الدوري"],
      8: ["ابن وردان", "ابن جماز"],
      9: ["رويس", "روح"],
      10: ["إسحاق", "إدريس"],
    };

    for (const qiraa of QIRAAT) {
      const riwayat = RIWAYAT.filter(
        (riwaya) => riwaya.qiraaId === qiraa.id,
      ).map((riwaya) => riwaya.shortName);

      expect(riwayat).toEqual(expected[qiraa.id as keyof typeof expected]);
    }
  });

  it("has unique qiraa IDs", () => {
    const ids = QIRAAT.map((qiraa) => qiraa.id);

    expect(new Set(ids).size).toBe(10);
  });

  it("has unique riwaya IDs", () => {
    const ids = RIWAYAT.map((riwaya) => riwaya.id);

    expect(new Set(ids).size).toBe(20);
  });
});
