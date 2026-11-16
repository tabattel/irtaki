import { describe, expect, it } from "vitest";

import {
  allowedTuruq,
  evaluateSelection,
  requiresTariq,
} from "./tariq-selection";

const hafs = { id: 101, riwayaId: 10 };
const azraq = { id: 21, riwayaId: 2 };
const asbahani = { id: 22, riwayaId: 2 };
const wujuh3 = [{ id: 4 }, { id: 5 }, { id: 6 }];

describe("requiresTariq", () => {
  it("n'exige rien pour Tarteel 1", () => {
    expect(requiresTariq("tarteel1", 10)).toBe(false);
  });
  it("exige le Tariq pour Hafs et Warsh en Tarteel 2", () => {
    expect(requiresTariq("tarteel2", 10)).toBe(true);
    expect(requiresTariq("tarteel2", 2)).toBe(true);
  });
  it("n'exige rien pour une riwaya non ouverte", () => {
    expect(requiresTariq("tarteel2", 5)).toBe(false);
    expect(allowedTuruq(5)).toEqual([]);
  });
});

describe("evaluateSelection", () => {
  it("ignore Tariq et Wajh en Tarteel 1", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel1", riwayaId: 10, tariqId: 101, wajhId: null },
        { tariq: hafs, wujuh: [] },
      ),
    ).toEqual({ ok: true, tariqId: null, wajhId: null });
  });

  it("refuse Hafs sans Tariq", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 10, tariqId: null, wajhId: null },
        { tariq: null, wujuh: [] },
      ),
    ).toEqual({ ok: false, error: "TARIQ_REQUIRED" });
  });

  it("refuse un Tariq d'une autre riwaya", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 10, tariqId: 21, wajhId: null },
        { tariq: azraq, wujuh: wujuh3 },
      ),
    ).toEqual({ ok: false, error: "TARIQ_NOT_ALLOWED" });
  });

  it("accepte Hafs avec un Tariq et sans Wajh", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 10, tariqId: 101, wajhId: null },
        { tariq: hafs, wujuh: [] },
      ),
    ).toEqual({ ok: true, tariqId: 101, wajhId: null });
  });

  it("exige un Wajh pour l'Azraq", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 2, tariqId: 21, wajhId: null },
        { tariq: azraq, wujuh: wujuh3 },
      ),
    ).toEqual({ ok: false, error: "WAJH_REQUIRED" });
  });

  it("accepte un Wajh de l'Azraq et refuse un Wajh étranger", () => {
    const base = { mode: "tarteel2" as const, riwayaId: 2, tariqId: 21 };
    expect(
      evaluateSelection({ ...base, wajhId: 5 }, { tariq: azraq, wujuh: wujuh3 }),
    ).toEqual({ ok: true, tariqId: 21, wajhId: 5 });
    expect(
      evaluateSelection({ ...base, wajhId: 99 }, { tariq: azraq, wujuh: wujuh3 }),
    ).toEqual({ ok: false, error: "WAJH_NOT_ALLOWED" });
  });

  it("refuse un Wajh pour l'Asbahani, qui n'en a pas", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 2, tariqId: 22, wajhId: 4 },
        { tariq: asbahani, wujuh: [] },
      ),
    ).toEqual({ ok: false, error: "WAJH_NOT_ALLOWED" });
  });

  it("sélectionne d'office un Wajh unique", () => {
    expect(
      evaluateSelection(
        { mode: "tarteel2", riwayaId: 2, tariqId: 21, wajhId: null },
        { tariq: azraq, wujuh: [{ id: 4 }] },
      ),
    ).toEqual({ ok: true, tariqId: 21, wajhId: 4 });
  });
});
