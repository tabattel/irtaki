import { describe, expect, it } from "vitest";
import { Riwaya } from "./riwaya";
import { Tariq } from "../tariq/tariq";

describe("Riwaya", () => {
  it("creates a valid riwaya", () => {
    const riwaya = new Riwaya({
      id: 10,
      shortName: "حفص",
      fullName: "حفص عن عاصم",
      qiraaId: 5,
    });

    expect(riwaya.id).toBe(10);
    expect(riwaya.shortName).toBe("حفص");
    expect(riwaya.qiraaId).toBe(5);
    expect(riwaya.tariqs).toHaveLength(0);
  });

  it("accepts one tariq", () => {
    const riwaya = new Riwaya({
      id: 10,
      shortName: "حفص",
      fullName: "حفص عن عاصم",
      qiraaId: 5,
    });

    const tariq = new Tariq({
      id: 1,
      name: "Tariq 1",
    });

    riwaya.addTariq(tariq);

    expect(riwaya.tariqs).toHaveLength(1);
    expect(riwaya.tariqs[0]).toBe(tariq);
  });

  it("accepts two tariqs", () => {
    const riwaya = new Riwaya({
      id: 10,
      shortName: "حفص",
      fullName: "حفص عن عاصم",
      qiraaId: 5,
    });

    riwaya.addTariq(new Tariq({ id: 1, name: "Tariq 1" }));
    riwaya.addTariq(new Tariq({ id: 2, name: "Tariq 2" }));

    expect(riwaya.tariqs).toHaveLength(2);
  });

  it("rejects a third tariq", () => {
    const riwaya = new Riwaya({
      id: 10,
      shortName: "حفص",
      fullName: "حفص عن عاصم",
      qiraaId: 5,
    });

    riwaya.addTariq(new Tariq({ id: 1, name: "Tariq 1" }));
    riwaya.addTariq(new Tariq({ id: 2, name: "Tariq 2" }));

    expect(() =>
      riwaya.addTariq(new Tariq({ id: 3, name: "Tariq 3" })),
    ).toThrow();
  });

  it("rejects a duplicate tariq", () => {
    const riwaya = new Riwaya({
      id: 10,
      shortName: "حفص",
      fullName: "حفص عن عاصم",
      qiraaId: 5,
    });

    riwaya.addTariq(new Tariq({ id: 1, name: "Tariq 1" }));

    expect(() =>
      riwaya.addTariq(new Tariq({ id: 1, name: "Tariq 1" })),
    ).toThrow();
  });

  it("rejects an invalid qiraa reference", () => {
    expect(
      () =>
        new Riwaya({
          id: 10,
          shortName: "حفص",
          fullName: "حفص عن عاصم",
          qiraaId: 11,
        }),
    ).toThrow();
  });
});
