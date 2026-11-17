"use client";

import { useEffect, useState } from "react";
import {
  evaluateSelection,
  requiresTariq,
  TARIQ_ENABLED,
  TARIQ_KEY_PREFIX,
  WAJH_KEY_PREFIX,
} from "@/application/recitation/tariq-selection";

type TariqOption = {
  id: number;
  name: string;
  riwayaId: number;
};

type WajhOption = {
  id: number;
  name: string;
  isDefault?: boolean;
};

type ApiResponse<T> = {
  data?: T[];
};

export type Tarteel2Selection = {
  riwayaId: number;
  tariqId: number | null;
  wajhId: number | null;
};

type Props = {
  riwayaId: number;
  readPreference: (key: string) => string | null;
  onCancel: () => void;
  onConfirm: (selection: Tarteel2Selection) => void;
};

function parsePreference(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

export function MushafTarteel2StartDialog({
  riwayaId,
  readPreference,
  onCancel,
  onConfirm,
}: Props) {
  const tariqRequired = requiresTariq("tarteel2", riwayaId);

  const [turuq, setTuruq] = useState<TariqOption[]>([]);
  const [wujuh, setWujuh] = useState<WajhOption[]>([]);

  const [selectedTariqId, setSelectedTariqId] = useState<number | null>(
    () => parsePreference(
      readPreference(`${TARIQ_KEY_PREFIX}${riwayaId}`),
    ),
  );

  const [selectedWajhId, setSelectedWajhId] = useState<number | null>(
    null,
  );

  const [loadingTuruq, setLoadingTuruq] = useState(tariqRequired);
  const [loadingWujuh, setLoadingWujuh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tariqRequired) {
      setLoadingTuruq(false);
      setTuruq([]);
      setSelectedTariqId(null);
      return;
    }

    const controller = new AbortController();

    async function loadTuruq() {
      setLoadingTuruq(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/riwayat/${riwayaId}/turuq`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("تعذر تحميل الطرق");
        }

        const result = (await response.json()) as ApiResponse<TariqOption>;

        const allowedIds = TARIQ_ENABLED[riwayaId] ?? [];

        const available = (result.data ?? []).filter(
          (item) =>
            item.riwayaId === riwayaId &&
            allowedIds.includes(item.id),
        );

        if (controller.signal.aborted) return;

        setTuruq(available);

        setSelectedTariqId((current) => {
          const preferred = parsePreference(
            readPreference(`${TARIQ_KEY_PREFIX}${riwayaId}`),
          );

          const candidate = current ?? preferred;

          if (
            candidate !== null &&
            available.some((item) => item.id === candidate)
          ) {
            return candidate;
          }

          return available.length === 1 ? available[0].id : null;
        });

        if (available.length === 0) {
          setError("لا توجد طرق متاحة لهذه الرواية.");
        }
      } catch (cause) {
        if (controller.signal.aborted) return;

        setError(
          cause instanceof Error
            ? cause.message
            : "تعذر تحميل الطرق",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingTuruq(false);
        }
      }
    }

    void loadTuruq();

    return () => controller.abort();
  }, [riwayaId, tariqRequired, readPreference]);

  useEffect(() => {
    if (!tariqRequired || selectedTariqId === null) {
      setWujuh([]);
      setSelectedWajhId(null);
      setLoadingWujuh(false);
      return;
    }

    const controller = new AbortController();
    const tariqId = selectedTariqId;

    async function loadWujuh() {
      setLoadingWujuh(true);
      setError(null);
      setWujuh([]);
      setSelectedWajhId(null);

      try {
        const response = await fetch(
          `/api/turuq/${tariqId}/wujuh`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("تعذر تحميل الأوجه");
        }

        const result = (await response.json()) as ApiResponse<WajhOption>;
        const available = result.data ?? [];

        if (controller.signal.aborted) return;

        setWujuh(available);

        const preferred = parsePreference(
          readPreference(`${WAJH_KEY_PREFIX}${tariqId}`),
        );

        if (
          preferred !== null &&
          available.some((item) => item.id === preferred)
        ) {
          setSelectedWajhId(preferred);
        } else if (available.length === 1) {
          setSelectedWajhId(available[0].id);
        } else {
          const defaultWajh = available.find((item) => item.isDefault);
          setSelectedWajhId(defaultWajh?.id ?? null);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;

        setError(
          cause instanceof Error
            ? cause.message
            : "تعذر تحميل الأوجه",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoadingWujuh(false);
        }
      }
    }

    void loadWujuh();

    return () => controller.abort();
  }, [selectedTariqId, tariqRequired, readPreference]);

  const selectedTariq =
    turuq.find((item) => item.id === selectedTariqId) ?? null;

  const validation = evaluateSelection(
    {
      mode: "tarteel2",
      riwayaId,
      tariqId: selectedTariqId,
      wajhId: selectedWajhId,
    },
    {
      tariq: selectedTariq
        ? {
            id: selectedTariq.id,
            riwayaId: selectedTariq.riwayaId,
          }
        : null,
      wujuh,
    },
  );

  const busy = loadingTuruq || loadingWujuh;

  function handleConfirm() {
    if (busy || !validation.ok) return;

    onConfirm({
      riwayaId,
      tariqId: validation.tariqId,
      wajhId: validation.wajhId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tarteel2-start-title"
        dir="rtl"
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-background p-5 shadow-2xl"
        style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="إغلاق"
          className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          ×
        </button>

        <div className="mb-5">
          <h2
            id="tarteel2-start-title"
            className="text-lg font-semibold"
          >
            إعداد الترتيل
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            اختر الطريق والوجه قبل بدء التلاوة.
          </p>
        </div>

        {tariqRequired && (
          <div className="mb-4">
            <label
              htmlFor="tarteel2-tariq"
              className="mb-2 block text-sm font-medium"
            >
              الطريق
            </label>

            {loadingTuruq ? (
              <p className="text-sm text-muted-foreground">
                جاري تحميل الطرق...
              </p>
            ) : (
              <select
                id="tarteel2-tariq"
                value={selectedTariqId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  setSelectedTariqId(
                    Number.isSafeInteger(value) && value > 0
                      ? value
                      : null,
                  );
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
                disabled={turuq.length === 0}
              >
                <option value="">اختر الطريق</option>

                {turuq.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {tariqRequired && selectedTariqId !== null && (
          <div className="mb-4">
            <label
              htmlFor="tarteel2-wajh"
              className="mb-2 block text-sm font-medium"
            >
              الوجه
            </label>

            {loadingWujuh ? (
              <p className="text-sm text-muted-foreground">
                جاري تحميل الأوجه...
              </p>
            ) : wujuh.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد أوجه متعددة لهذا الطريق.
              </p>
            ) : wujuh.length === 1 ? (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-3 text-sm">
                {wujuh[0].name}
              </div>
            ) : (
              <select
                id="tarteel2-wajh"
                value={selectedWajhId ?? ""}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  setSelectedWajhId(
                    Number.isSafeInteger(value) && value > 0
                      ? value
                      : null,
                  );
                }}
                className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"
              >
                <option value="">اختر الوجه</option>

                {wujuh.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.isDefault ? " (الافتراضي)" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        {!error && !busy && !validation.ok && (
          <p className="mb-4 text-sm text-amber-600">
            {validation.error === "TARIQ_REQUIRED" ||
            validation.error === "TARIQ_NOT_ALLOWED"
              ? "يرجى اختيار طريق صحيح."
              : "يرجى اختيار وجه صحيح."}
          </p>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !validation.ok || Boolean(error)}
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            تأكيد وبدء
          </button>
        </div>
      </section>
    </div>
  );
}
