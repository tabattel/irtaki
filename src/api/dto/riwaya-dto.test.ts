import { describe, expect, it } from "vitest";
import { toRiwayaDto } from "./riwaya-dto";

describe("riwaya dto", () => {
  it("maps a riwaya to the API DTO", () => {
    const result = toRiwayaDto({
      id: 1,
      shortName: "قالون",
      fullName: "قالون عن نافع",
      qiraaId: 1,
    });

    expect(result).toEqual({
      id: 1,
      shortName: "قالون",
      fullName: "قالون عن نافع",
      qiraaId: 1,
    });
  });
});
