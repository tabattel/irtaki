"use client";

import { useEffect, useState } from "react";

// Turuq affichés dans Tarteel 2, par riwaya. Un Tariq absent de cette carte
// reste masqué (nom provisoire). Pour en ouvrir un : ajouter son id ici.
export const TARIQ_ENABLED: Readonly<Record<number, readonly number[]>> = {
  10: [101, 102], // حفص : الشاطبية، طيبة النشر
  2: [21], // ورش : الأزرق
};

const TARIQ_KEY_PREFIX = "irtaki.mushaf.tarteel2.tariq.";
const WAJH_KEY_PREFIX = "irtaki.mushaf.tarteel2.wajh.";

type TariqOption = { id: number; name: string };
type WajhOption = { id: number; name: string; isDefault: boolean };

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

function parseWujuh(payload: unknown): WajhOption[] {
  const data = asRecord(payload)?.data;
  if (!Array.isArray(data)) return [];
  const result: WajhOption[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (row && typeof row.id === "number" && typeof row.name === "string") {
      result.push({
        id: row.id,
        name: row.name,
        isDefault: row.isDefault === true,
      });
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
  const allowedTuruq: readonly number[] = TARIQ_ENABLED[riwayaId] ?? [];
  const tariqEnabled = allowedTuruq.length > 0;
  const wantsTuruq = mode === "tarteel2" && tariqEnabled;
  const tariqKey = `${TARIQ_KEY_PREFIX}${riwayaId}`;

  const [tariqId, setTariqId] = useState<string | null>(() =>
    readPreference(tariqKey),
  );
  const [wajhChosen, setWajhChosen] = useState<Record<number, string>>({});
  const [riwayaInfo, setRiwayaInfo] = useState<{
    id: number;
    name: string | null;
  } | null>(null);
  const [turuqInfo, setTuruqInfo] = useState<{
    id: number;
    items: TariqOption[];
  } | null>(null);
  const [wujuhInfo, setWujuhInfo] = useState<{
    tariqId: number;
    items: WajhOption[];
  } | null>(null);

  // Tariq actif : celui qui est enregistré, ou l'unique Tariq ouvert.
  const turuqReady =
    turuqInfo !== null && turuqInfo.id === riwayaId ? turuqInfo : null;
  const options = (turuqReady?.items ?? []).filter((option) =>
    allowedTuruq.includes(option.id),
  );
  const activeTariq =
    options.find((option) => String(option.id) === tariqId) ??
    (options.length === 1 ? options[0] : null);
  const activeTariqId = activeTariq ? activeTariq.id : null;

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
        setTuruqInfo({ id: riwayaId, items: parseTuruq(payload) }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setTuruqInfo({ id: riwayaId, items: [] });
      });
    return () => controller.abort();
  }, [wantsTuruq, riwayaId]);

  useEffect(() => {
    if (!wantsTuruq || activeTariqId === null) return;
    const controller = new AbortController();
    fetch(`/api/turuq/${activeTariqId}/wujuh`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((payload: unknown) =>
        setWujuhInfo({ tariqId: activeTariqId, items: parseWujuh(payload) }),
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setWujuhInfo({ tariqId: activeTariqId, items: [] });
      });
    return () => controller.abort();
  }, [wantsTuruq, activeTariqId]);

  const wujuhReady =
    activeTariqId !== null && wujuhInfo?.tariqId === activeTariqId
      ? wujuhInfo
      : null;
  const wujuh = wujuhReady?.items ?? [];
  const showWajh = wujuh.length >= 2; // 0 ou 1 Wajh : pas de sélecteur
  const storedWajh =
    activeTariqId !== null
      ? (wajhChosen[activeTariqId] ??
        readPreference(`${WAJH_KEY_PREFIX}${activeTariqId}`))
      : null;
  const activeWajh =
    wujuh.find((item) => String(item.id) === storedWajh) ??
    wujuh.find((item) => item.isDefault) ??
    null;

  const title = mode === "tarteel1" ? "إعدادات ترتيل ١" : "إعدادات ترتيل ٢";
  const riwayaLabel =
    riwayaInfo?.id === riwayaId && riwayaInfo.name
      ? riwayaInfo.name
      : `الرواية رقم ${riwayaId}`;

  const chooseTariq = (id: number) => {
    const value = String(id);
    writePreference(tariqKey, value);
    setTariqId(value);
  };

  const chooseWajh = (id: number) => {
    if (activeTariqId === null) return;
    const value = String(id);
    writePreference(`${WAJH_KEY_PREFIX}${activeTariqId}`, value);
    setWajhChosen((previous) => ({ ...previous, [activeTariqId]: value }));
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
            <>
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
                      const active = option.id === activeTariqId;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            active ? "font-semibold ring-2 ring-current" : ""
                          }`}
                          onClick={() => chooseTariq(option.id)}
                        >
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              {showWajh && (
                <fieldset className="rounded-lg border p-3">
                  <legend className="px-1 text-sm font-semibold">الوجه</legend>
                  <div
                    role="group"
                    aria-label="اختيار الوجه"
                    className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
                  >
                    {wujuh.map((item) => {
                      const active = item.id === activeWajh?.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={active}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            active ? "font-semibold ring-2 ring-current" : ""
                          }`}
                          onClick={() => chooseWajh(item.id)}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}
            </>
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
