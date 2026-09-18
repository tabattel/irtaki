import { describe, expect, it } from "vitest";
import { toTariqDto } from "./tariq-dto";

describe("tariq dto", () => {
  it("maps a tariq to the API DTO", () => {
    const result = toTariqDto({
      id: 11,
      name: "قالون 1",
      riwayaId: 1,
    });

    expect(result).toEqual({
      id: 11,
      name: "قالون 1",
      riwayaId: 1,
    });
  });
});
