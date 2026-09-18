import { describe, expect, it } from "vitest";
import { toMushafDto } from "./mushaf-dto";

describe("mushaf dto", () => {
  it("maps a mushaf including nullable fields", () => {
    const result = toMushafDto({
      id: 1,
      name: "Hafs",
      description: null,
      bismillah: null,
      riwayaId: 10,
    });

    expect(result).toEqual({
      id: 1,
      name: "Hafs",
      description: null,
      bismillah: null,
      riwayaId: 10,
    });
  });
});
