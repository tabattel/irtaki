import { describe, expect, it } from "vitest";
import { Mushaf } from "./mushaf";

describe("Mushaf", () => {
  it("creates a valid mushaf", () => {
    const mushaf = new Mushaf({
      id: 1,
      name: "مصحف حفص",
      description: "القرآن الكريم برواية حفص عن عاصم",
      bismillah: "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ",
      riwayaId: 10,
    });

    expect(mushaf.id).toBe(1);
    expect(mushaf.name).toBe("مصحف حفص");
    expect(mushaf.description).toBe("القرآن الكريم برواية حفص عن عاصم");
    expect(mushaf.bismillah).toBe("بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ");
    expect(mushaf.riwayaId).toBe(10);
  });

  it("rejects an invalid mushaf ID", () => {
    expect(
      () =>
        new Mushaf({
          id: 0,
          name: "مصحف حفص",
          riwayaId: 10,
        }),
    ).toThrow();
  });

  it("rejects an empty name", () => {
    expect(
      () =>
        new Mushaf({
          id: 1,
          name: "   ",
          riwayaId: 10,
        }),
    ).toThrow();
  });

  it("rejects an invalid riwaya ID", () => {
    expect(
      () =>
        new Mushaf({
          id: 1,
          name: "مصحف حفص",
          riwayaId: 0,
        }),
    ).toThrow();
  });
});
