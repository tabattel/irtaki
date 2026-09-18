import { describe, expect, it } from "vitest";
import { toQiraaDto } from "./qiraa-dto";

describe("qiraa dto", () => {
  it("maps a qiraa to the API DTO", () => {
    const result = toQiraaDto({
      id: 1,
      shortName: "نافع",
      fullName: "نافع بن عبد الرحمن بن أبي نعيم المدني",
      region: "madinah",
    });

    expect(result).toEqual({
      id: 1,
      shortName: "نافع",
      fullName: "نافع بن عبد الرحمن بن أبي نعيم المدني",
      region: "madinah",
    });
  });
});
