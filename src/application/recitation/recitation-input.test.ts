import { describe, expect, it } from "vitest";

import { parseCreateRecitationBody, parseFinalizeBody } from "./recitation-input";

const NOW = new Date("2026-11-16T12:00:00Z");
const valid = {
  clientSessionId: "7f1c2a9e-1b3d-4c5e-8f00-123456789abc",
  learnerId: "clx123abc",
  mode: "tarteel2",
  riwayaId: 10,
  tariqId: 101,
  wajhId: null,
  startedAt: "2026-11-16T10:00:00.000Z",
  endedAt: "2026-11-16T10:05:00.000Z",
  sampleRate: 16000,
  timeline: { v: 1, events: [] },
};

describe("parseCreateRecitationBody", () => {
  it("accepte un corps valide", () => {
    const r = parseCreateRecitationBody(valid, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.tariqId).toBe(101);
      expect(r.data.wajhId).toBeNull();
    }
  });

  it("traite Tariq et Wajh absents comme null", () => {
    const { tariqId, wajhId, ...rest } = valid;
    void tariqId;
    void wajhId;
    const r = parseCreateRecitationBody(rest, NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.tariqId).toBeNull();
  });

  it.each([
    [{ ...valid, mode: "tilawa" }, "INVALID_MODE"],
    [{ ...valid, clientSessionId: "../etc/passwd" }, "INVALID_CLIENT_SESSION_ID"],
    [{ ...valid, riwayaId: 0 }, "INVALID_RIWAYA_ID"],
    [{ ...valid, tariqId: 0 }, "INVALID_TARIQ_ID"],
    [{ ...valid, startedAt: "2031-01-01T00:00:00Z" }, "INVALID_STARTED_AT"],
    [{ ...valid, endedAt: "2026-11-16T09:00:00Z" }, "INVALID_ENDED_AT"],
    [{ ...valid, sampleRate: 44100 }, "INVALID_SAMPLE_RATE"],
    [{ ...valid, timeline: "x" }, "INVALID_TIMELINE"],
  ])("refuse %#", (body, error) => {
    expect(parseCreateRecitationBody(body, NOW)).toEqual({ ok: false, error });
  });

  it("refuse un corps qui n'est pas un objet", () => {
    expect(parseCreateRecitationBody(null, NOW).ok).toBe(false);
    expect(parseCreateRecitationBody([], NOW).ok).toBe(false);
  });
});

describe("parseFinalizeBody", () => {
  it("accepte un corps valide", () => {
    expect(parseFinalizeBody({ parts: 3, totalBytes: 24_000_000 })).toEqual({
      ok: true,
      parts: 3,
      totalBytes: 24_000_000,
    });
  });
  it("refuse des valeurs hors bornes", () => {
    expect(parseFinalizeBody({ parts: 0, totalBytes: 10 }).ok).toBe(false);
    expect(parseFinalizeBody({ parts: 201, totalBytes: 10 }).ok).toBe(false);
    expect(parseFinalizeBody({ parts: 1, totalBytes: 1.5 }).ok).toBe(false);
  });
});
