import { describe, expect, it } from "vitest";
import { Qiraa } from "./qiraa";

describe("Qiraa", () => {
  it("creates a valid qiraa", () => {
    const qiraa = new Qiraa({
      id: 5,
      shortName: "عاصم",
      fullName: "عاصم بن أبي النَّجود الأسدي الكوفي",
      region: "kufa",
    });

    expect(qiraa.id).toBe(5);
    expect(qiraa.shortName).toBe("عاصم");
    expect(qiraa.fullName).toBe("عاصم بن أبي النَّجود الأسدي الكوفي");
    expect(qiraa.region).toBe("kufa");
  });

  it("accepts the first and last qiraa IDs", () => {
    const first = new Qiraa({
      id: 1,
      shortName: "نافع",
      fullName: "نافع بن عبد الرحمن بن أبي نعيم المدني",
      region: "madinah",
    });

    const last = new Qiraa({
      id: 10,
      shortName: "خلف",
      fullName: "خلف العاشر",
      region: "kufa",
    });

    expect(first.id).toBe(1);
    expect(last.id).toBe(10);
  });

  it("rejects an ID outside the ten qiraat", () => {
    expect(
      () =>
        new Qiraa({
          id: 0,
          shortName: "اختبار",
          fullName: "اختبار",
          region: "kufa",
        }),
    ).toThrow();

    expect(
      () =>
        new Qiraa({
          id: 11,
          shortName: "اختبار",
          fullName: "اختبار",
          region: "kufa",
        }),
    ).toThrow();
  });

  it("rejects an empty short name", () => {
    expect(
      () =>
        new Qiraa({
          id: 1,
          shortName: "   ",
          fullName: "نافع بن عبد الرحمن بن أبي نعيم المدني",
          region: "madinah",
        }),
    ).toThrow();
  });

  it("rejects an empty full name", () => {
    expect(
      () =>
        new Qiraa({
          id: 1,
          shortName: "نافع",
          fullName: "   ",
          region: "madinah",
        }),
    ).toThrow();
  });

  it("trims names", () => {
    const qiraa = new Qiraa({
      id: 1,
      shortName: "  نافع  ",
      fullName: "  نافع بن عبد الرحمن بن أبي نعيم المدني  ",
      region: "madinah",
    });

    expect(qiraa.shortName).toBe("نافع");
    expect(qiraa.fullName).toBe("نافع بن عبد الرحمن بن أبي نعيم المدني");
  });
});
