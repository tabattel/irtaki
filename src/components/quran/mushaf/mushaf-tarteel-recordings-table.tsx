"use client";

import { useEffect, useState } from "react";
import {
  deleteTarteelRecordingLocally,
  listTarteelRecordingsLocally,
  updateTarteelRecordingRangeLocally,
  type StoredRecording,
} from "./mushaf-tilawa-recorder";

type Props = {
  mode: "tarteel1" | "tarteel2";
  riwayaId: number;
  mushafId: number;
};

const RECITERS = [
  { id: "hafs-afassi", name: "مشاري العفاسي" },
  { id: "hafs-abdelbasset", name: "عبد الباسط عبد الصمد" },
  { id: "hafs-soudais", name: "عبد الرحمن السديس" },
  { id: "hafs-houssari", name: "محمود خليل الحصري" },
  { id: "hafs-chatir", name: "أبو بكر الشاطري" },
  { id: "hafs-djebril", name: "محمد جبريل" },
];

type AyahReference = StoredRecording["ayahs"][number];

function displaySurahName(name: string) {
  return name.replace(/^سورة\s*/u, "").trim();
}

function displayTariqName(name: string | undefined) {
  return (name ?? "").replace(/^(ال)?طريق\s*/u, "").trim();
}

function getDisplaySurahName(
  storedName: string,
  surahNumber: number,
  names: Record<number, string>,
): string {
  const rawName = storedName.trim();
  const candidate = rawName.startsWith("سورة")
    ? rawName.slice("سورة".length).trim()
    : rawName;
  const digits = "0123456789٠١٢٣٤٥٦٧٨٩";
  const isNumeric = candidate.length > 0 &&
    Array.from(candidate).every((character) => digits.includes(character));

  if (!candidate || isNumeric) return names[surahNumber] ?? "";
  return candidate;
}

export function MushafTarteelRecordingsTable({
  mode,
  riwayaId,
  mushafId,
}: Props) {
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [tariqNames, setTariqNames] = useState<Record<number, string>>({});
  const [wajhNames, setWajhNames] = useState<Record<number, string>>({});
  const [selectedReciters, setSelectedReciters] = useState<Record<string, string>>({});
  const [comparisonRequested, setComparisonRequested] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [surahNames, setSurahNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/surahs", { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("SURAH_NAMES_LOAD_FAILED");
        return (await response.json()) as unknown;
      })
      .then((payload) => {
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("data" in payload) ||
          !Array.isArray(payload.data)
        ) return;

        const names: Record<number, string> = {};
        for (const value of payload.data) {
          if (typeof value !== "object" || value === null) continue;
          const row = value as Record<string, unknown>;
          if (
            typeof row.number === "number" &&
            typeof row.name === "string" &&
            row.name.trim()
          ) {
            names[row.number] = row.name.trim();
          }
        }
        setSurahNames(names);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      setLearnerId(window.localStorage.getItem("irtaki.activeLearnerId"));
    } catch {
      setLearnerId(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!learnerId) {
      setRecordings([]);
      return;
    }

    void listTarteelRecordingsLocally(learnerId)
      .then((items) => {
        if (!cancelled) {
          setRecordings(items.filter((item) =>
            item.mode === mode &&
            item.riwayaId === riwayaId &&
            (item.mushafId === mushafId || item.mushafId == null)
          ));
        }
      })
      .catch(() => {
        if (!cancelled) setMessage("تعذر تحميل تسجيلات الترتيل");
      });

    return () => { cancelled = true; };
  }, [learnerId, mode, riwayaId, mushafId]);

  useEffect(() => {
    const created: Record<string, string> = {};
    for (const item of recordings) {
      created[item.id] = URL.createObjectURL(item.blob);
    }
    setUrls(created);
    return () => Object.values(created).forEach(URL.revokeObjectURL);
  }, [recordings]);

  useEffect(() => {
    let cancelled = false;

    async function loadNames() {
      const tariqIds = [...new Set(
        recordings
          .map((item) => item.tariqId)
          .filter((id): id is number => typeof id === "number"),
      )];

      if (tariqIds.length === 0) {
        setTariqNames({});
        setWajhNames({});
        return;
      }

      try {
        const response = await fetch(`/api/riwayat/${riwayaId}/turuq`, {
          cache: "no-store",
        });
        const payload = response.ok
          ? await response.json() as { data?: unknown }
          : null;
        const rows = Array.isArray(payload?.data)
          ? payload.data as Array<{ id?: unknown; name?: unknown }>
          : [];

        const nextTariqNames: Record<number, string> = {};
        for (const row of rows) {
          if (typeof row.id === "number" && typeof row.name === "string") {
            nextTariqNames[row.id] = row.name;
          }
        }

        const nextWajhNames: Record<number, string> = {};
        await Promise.all(tariqIds.map(async (tariqId) => {
          try {
            const wajhResponse = await fetch(`/api/turuq/${tariqId}/wujuh`, {
              cache: "no-store",
            });
            if (!wajhResponse.ok) return;
            const wajhPayload = await wajhResponse.json() as { data?: unknown };
            if (!Array.isArray(wajhPayload.data)) return;

            for (const value of wajhPayload.data) {
              if (
                value !== null &&
                typeof value === "object" &&
                "id" in value &&
                "name" in value &&
                typeof value.id === "number" &&
                typeof value.name === "string"
              ) {
                nextWajhNames[value.id] = value.name;
              }
            }
          } catch {
            // Sans nom de wajh, laisser la cellule vide.
          }
        }));

        if (!cancelled) {
          setTariqNames(nextTariqNames);
          setWajhNames(nextWajhNames);
        }
      } catch {
        if (!cancelled) {
          setTariqNames({});
          setWajhNames({});
        }
      }
    }

    void loadNames();
    return () => { cancelled = true; };
  }, [recordings, riwayaId]);

  async function changeAyahNumber(
    item: StoredRecording,
    side: "start" | "end",
    rawValue: string,
  ) {
    if (!learnerId) return;

    const number = Number(rawValue);
    if (!Number.isInteger(number) || number < 1 || number > 286) {
      setMessage("أدخل رقم آية صحيحًا");
      return;
    }

    const first = item.ayahs[0];
    const last = item.ayahs[item.ayahs.length - 1];
    if (!first || !last) return;

    let start = item.rangeStart ?? first;
    let end = item.rangeEnd ?? last;

    if (side === "start") {
      start = { ...start, ayahNumber: number };
      if (start.surahNumber > end.surahNumber ||
          (start.surahNumber === end.surahNumber && start.ayahNumber > end.ayahNumber)) {
        end = { ...end, surahNumber: start.surahNumber, ayahNumber: number };
      }
    } else {
      end = { ...end, ayahNumber: number };
      if (end.surahNumber < start.surahNumber ||
          (end.surahNumber === start.surahNumber && end.ayahNumber < start.ayahNumber)) {
        start = { ...start, surahNumber: end.surahNumber, ayahNumber: number };
      }
    }

    try {
      await updateTarteelRecordingRangeLocally(item.id, learnerId, start, end);
      setRecordings((current) => current.map((row) =>
        row.id === item.id ? { ...row, rangeStart: start, rangeEnd: end } : row
      ));
      setMessage("");
    } catch {
      setMessage("تعذر حفظ نطاق الآيات المعدل");
    }
  }

  async function remove(item: StoredRecording) {
    if (!window.confirm("حذف هذا التسجيل نهائيًا من الجهاز؟")) return;
    try {
      await deleteTarteelRecordingLocally(item.id, item.learnerId);
      setRecordings((current) => current.filter((row) => row.id !== item.id));
    } catch {
      setMessage("تعذر حذف التسجيل");
    }
  }

  async function share(item: StoredRecording) {
    const extension = item.mimeType.includes("mp4") ? "m4a" : "webm";
    const file = new File(
      [item.blob],
      `irtaki-${item.createdAt.slice(0, 10)}.${extension}`,
      { type: item.mimeType },
    );

    try {
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        try {
          await navigator.share({ files: [file], title: "تسجيل الترتيل" });
          setMessage("");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // En cas d’échec du partage natif, proposer le téléchargement.
        }
      }

      const url = URL.createObjectURL(item.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage("تعذر فتح المشاركة؛ تم تنزيل التسجيل");
    } catch {
      setMessage("تعذر مشاركة التسجيل أو تنزيله");
    }
  }


  return (
    <section className="mt-2 min-w-0" dir="rtl">
      {!learnerId ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          اختر المتعلم الحالي لعرض التسجيلات.
        </p>
      ) : recordings.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          لا توجد تسجيلات محفوظة لهذا المتعلم والمصحف.
        </p>
      ) : (
        <div className="max-h-[26rem] overflow-auto rounded-lg border">
          <table className="w-full min-w-[56rem] text-right text-[11px]">
            <thead>
              <tr className="border-b bg-[var(--muted)]/20">
                <th className="px-1.5 py-1">التاريخ</th>
                <th className="px-1.5 py-1">التحديد</th>
                <th className="px-1.5 py-1">الطريق / الوجه</th>
                <th className="px-1.5 py-1">التسجيل</th>
                <th className="px-1.5 py-1">القارئ المرجعي</th>
                <th className="px-1.5 py-1">المقارنة</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((item) => {
                const first = item.ayahs[0];
                const last = item.ayahs[item.ayahs.length - 1];
                if (!first || !last) return null;

                const start = item.rangeStart ?? first;
                const end = item.rangeEnd ?? last;
                const reciterId = selectedReciters[item.id] ?? RECITERS[0]!.id;

                return (
                  <tr key={item.id} className="border-b last:border-0 align-top">
                    <td className="whitespace-nowrap px-1.5 py-1">
                      <div>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(item.createdAt))}</div>
                      <div className="text-[var(--muted-foreground)]">
                        {new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(new Date(item.createdAt))}
                      </div>
                    </td>

                    <td className="min-w-44 px-1.5 py-1">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1">
                          <span className="whitespace-nowrap">{getDisplaySurahName(start.surahName, start.surahNumber, surahNames)} · آية</span>
                          <input
                            type="number"
                            min={1}
                            max={286}
                            defaultValue={start.ayahNumber}
                            aria-label="Numéro ayah début"
                            className="w-14 rounded border bg-[var(--background)] px-1 py-0.5"
                            onBlur={(event) => void changeAyahNumber(item, "start", event.currentTarget.value)}
                          />
                        </label>
                        <label className="flex items-center gap-1">
                          <span className="whitespace-nowrap">{getDisplaySurahName(end.surahName, end.surahNumber, surahNames)} · آية</span>
                          <input
                            type="number"
                            min={1}
                            max={286}
                            defaultValue={end.ayahNumber}
                            aria-label="Numéro ayah fin"
                            className="w-14 rounded border bg-[var(--background)] px-1 py-0.5"
                            onBlur={(event) => void changeAyahNumber(item, "end", event.currentTarget.value)}
                          />
                        </label>
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-1.5 py-1">
                      <div>
                        {typeof item.tariqId === "number"
                          ? displayTariqName(tariqNames[item.tariqId])
                          : ""}
                      </div>
                      <div>{typeof item.wajhId === "number" ? (wajhNames[item.wajhId] ?? "") : ""}</div>
                    </td>

                    <td className="min-w-40 px-1.5 py-1">
                      <audio
                        controls
                        preload="none"
                        src={urls[item.id]}
                        className="h-8 max-w-44"
                      />
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded border"
                          aria-label="مشاركة التسجيل"
                          title="مشاركة"
                          onClick={() => void share(item)}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="5" r="2" />
                            <circle cx="6" cy="12" r="2" />
                            <circle cx="18" cy="19" r="2" />
                            <path d="m8 11 8-5M8 13l8 5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded border"
                          aria-label="حذف التسجيل"
                          title="حذف"
                          onClick={() => void remove(item)}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    </td>

                    <td className="min-w-36 px-1.5 py-1">
                      <select
                        className="w-full rounded border bg-[var(--background)] px-1 py-1"
                        aria-label="اختيار القارئ المرجعي"
                        value={reciterId}
                        onChange={(event) => {
                          setSelectedReciters((current) => ({ ...current, [item.id]: event.target.value }));
                          setComparisonRequested((current) => ({ ...current, [item.id]: false }));
                        }}
                      >
                        {RECITERS.map((reciter) => (
                          <option key={reciter.id} value={reciter.id}>{reciter.name}</option>
                        ))}
                      </select>
                    </td>

                    <td className="px-1.5 py-1">
                      <button
                        type="button"
                        className="whitespace-nowrap rounded border px-2 py-1"
                        onClick={() => setComparisonRequested((current) => ({ ...current, [item.id]: true }))}
                      >
                        {comparisonRequested[item.id] ? "قريبًا" : "قارن"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {message && <p role="alert" className="mt-1 text-xs text-rose-600">{message}</p>}
    </section>
  );
}
