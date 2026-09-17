import { describe, expect, it } from "vitest";
import { QURANPEDIA_RIWAYAT } from "./quranpedia-riwayat";

describe("Quranpedia riwayat", () => {
  it("defines exactly the twenty riwaya", () => {
    expect(QURANPEDIA_RIWAYAT).toHaveLength(20);
  });

  it("keeps only the selected Quranpedia mushaf for duplicate editions", () => {
    const hafs = QURANPEDIA_RIWAYAT.find(
      (riwaya) => riwaya.id === "asim-hafs",
    );

    const qalun = QURANPEDIA_RIWAYAT.find(
      (riwaya) => riwaya.id === "nafi-qalun",
    );

    expect(hafs?.mushafId).toBe(2);
    expect(qalun?.mushafId).toBe(7);
  });

  it("marks the available and unavailable riwaya", () => {
    const available = QURANPEDIA_RIWAYAT.filter(
      (riwaya) => riwaya.available,
    );

    const unavailable = QURANPEDIA_RIWAYAT.filter(
      (riwaya) => !riwaya.available,
    );

    expect(available).toHaveLength(8);
    expect(unavailable).toHaveLength(12);
  });

  it("keeps the two distinct الدوري riwaya", () => {
    const douri = QURANPEDIA_RIWAYAT.filter(
      (riwaya) => riwaya.riwayaName === "الدوري",
    );

    expect(douri).toHaveLength(2);
    expect(douri.map((riwaya) => riwaya.qiraaName)).toEqual([
      "أبو عمرو",
      "الكسائي",
    ]);
  });
});
