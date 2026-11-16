"use client";

import { useEffect, useState } from "react";

// Riwayat pour lesquelles le choix du Tariq est ouvert.
// Hafs (10) seulement pour l'instant ; les autres s'ajouteront ici plus tard.
export const TARIQ_ENABLED_RIWAYAT: readonly number[] = [10];

type TariqOption = { id: number; name: string };

type Props = {
  mode: "tarteel1" | "tarteel2";
  riwayaId: number;
  readPreference: (key: string) => string | null;
  writePreference: (key: string, value: string) => void;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseTuruq(payload: unknown): TariqOption[] {
  const data = asRecord(payload)?.data;
  if (!Array.isArray(data)) return [];
  const result: TariqOption[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (row && typeof row.id === "number" && typeof row.name === "string") {
      result.push({ id: row.id, name: row.name });
    }
  }
  return result;
}

function parseRiwayaName(payload: unknown): string | null {
  const data = asRecord(asRecord(payload)?.data);
  if (!data) return null;
  if (typeof data.fullName === "string" && data.fullName.trim()) {
    return data.fullName;
  }
  if (typeof data.shortName === "string" && data.shortName.trim()) {
    return data.shortName;
  }
  return null;
}

export function MushafTarteelDetails({
  mode,
  riwayaId,
  readPreference,
  writePreference,
}: Props) {
  const tariqEnabled = TARIQ_ENABLED_RIWAYAT.includes(riwayaId);
  const wantsTuruq = mode === "tarteel2" && tariqEnabled;
  const prefKey = `irtaki.mushaf.tarteel2.tariq.${riwayaId}`;

  const [tariqId, setTariqId] = useState<string | null>(() =>
    readPreference(prefKey),
  );
  const [riwayaInfo, setRiwayaInfo] = useState<{
    id: number;
    name: string | null;
  } | null>(null);
  const [turuqInfo, setTuruqInfo] = useState<{
    id: number;
    items: TariqOption[];
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/riwayat/${riwayaId}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: unknown) =>
        setRiwayaInfo({ id: riwayaId, name: parseRiwayaName(payload) }),
      )
      .catch(() => {});
    return () => controller.abort();
  }, [riwayaId]);

  useEffect(() => {
    if (!wantsTuruq) return;
    const controller = new AbortController();
    fetch(`/api/riwayat/${riwayaId}/turuq`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((payload: unknown) =>
        setTuruqInfo({ id: riwayaId, items: parseTuruq(payload), failed: false }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTuruqInfo({ id: riwayaId, items: [], failed: true });
      });
    return () => controller.abort();
  }, [wantsTuruq, riwayaId]);

  const title = mode === "tarteel1" ? "إعدادات ترتيل ١" : "إعدادات ترتيل ٢";
  const riwayaLabel =
    riwayaInfo?.id === riwayaId && riwayaInfo.name
      ? riwayaInfo.name
      : `الرواية رقم ${riwayaId}`;
  const turuqReady =
    turuqInfo !== null && turuqInfo.id === riwayaId ? turuqInfo : null;
  const options = turuqReady?.items ?? [];

  const choose = (id: number) => {
    const value = String(id);
    writePreference(prefKey, value);
    setTariqId(value);
  };

  return (
    <section
      data-mode-settings
      dir="rtl"
      aria-label={title}
      className="flex w-full min-w-0 flex-col gap-3 border-t border-[var(--border)] pt-3"
    >
      <div className="text-center text-sm font-semibold">{title}</div>

      <div className="rounded-lg border p-3">
        <div className="text-xs text-[var(--muted-foreground)]">الرواية</div>
        <div className="mt-1 text-sm font-semibold">{riwayaLabel}</div>
        {mode === "tarteel1" && (
          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
            يتبع هذا الوضع رواية المصحف المفتوح.
          </div>
        )}
      </div>

      {mode === "tarteel2" && (
        <>
          {tariqEnabled ? (
            <fieldset className="rounded-lg border p-3">
              <legend className="px-1 text-sm font-semibold">الطريق</legend>
              {!turuqReady ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  جارٍ التحميل…
                </div>
              ) : options.length === 0 ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  تعذّر تحميل الطرق.
                </div>
              ) : (
                <div
                  role="group"
                  aria-label="اختيار الطريق"
                  className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {options.map((option) => {
                    const active = String(option.id) === tariqId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={active}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          active ? "font-semibold ring-2 ring-current" : ""
                        }`}
                        onClick={() => choose(option.id)}
                      >
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {/* الوجه : sélecteur ajouté plus tard, quand un Tariq aura au moins 2 Wujuh. */}
            </fieldset>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-xs text-[var(--muted-foreground)]">
              طرق وأوجه هذه الرواية ستُضاف لاحقًا.
            </div>
          )}

          <div
            aria-disabled="true"
            className="rounded-lg border border-dashed p-3 opacity-60"
          >
            <div className="text-sm font-semibold">الأحكام</div>
            <div className="mt-1 text-xs">قريبًا</div>
          </div>

          <p className="text-center text-xs text-[var(--muted-foreground)]">
            الاختيار محفوظ فقط، ولا يغيّر التعرّف على التلاوة حاليًا.
          </p>
        </>
      )}
    </section>
  );
}
