"use client";
import { calculateRecordedPagePercentage } from "@/application/learning/page-line-progress";
import { reconstructMissingPageLineMetadata } from "@/lib/mushaf/reconstruct-page-line-metadata";

import { useEffect, useMemo, useState } from "react";
import {
  MUSHAF_ACTION_JOURNAL_CHANGE_EVENT,
  readMushafActionJournal,
  type MushafActionJournalEvent,
} from "./mushaf-action-journal";

export type MushafHistoryView =
  "pages" | "ayahs" | "activity" | "day" | "action";

type HistoryLearner = {
  id: string;
  name: string;
};

type HistorySurah = {
  number: number;
  name?: string | null;
};

type HistoryRecord = {
  activityId: string;
  ayahId: number;
  status: string;
  action: string;
  ayahNumber: number;
  surahNumber: number;
  pageNumber: number;
  occurredAt: string;
  startedAt: string;
  lineNumbers?: number[];
  pageLineCount?: number | null;
};

type HistoryRow = {
  key: string;
  surahNumber?: number;
  reference: string;
  page: number | string;
  pages: string;
  action: string;
  date: string;
  count: number;
  percentage?: number | null;
};

type Props = {
  view: MushafHistoryView;
  onViewChange: (view: MushafHistoryView) => void;
};

const ACTIONS: Record<string, string> = {
  listen: "استماع",
  read: "قراءة",
  memorize: "حفظ",
  recite: "تلاوة",
  tathbit: "تثبيت",
  revise: "مراجعة",
  tajwid: "تجويد",
  tadabbur: "تدبر",
  talkin: "تلقين",
};

function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDay(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function actionLabel(value: string): string {
  if (value === "qiraa") return "القراءة";
  return ACTIONS[value] ?? value;
}

function surahLabel(
  surahNumber: number | undefined,
  surahs: HistorySurah[],
): string {
  if (!surahNumber) return "—";
  const name = surahs
    .find((surah) => surah.number === surahNumber)
    ?.name?.trim();
  return name && /[\u0600-\u06FF]/.test(name)
    ? `${name} (${surahNumber})`
    : `السورة رقم ${surahNumber}`;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function compactNumbers(values: number[]): string {
  const numbers = uniqueNumbers(values);
  if (!numbers.length) return "—";
  const result: string[] = [];
  let start = numbers[0];
  let end = numbers[0];

  for (const number of numbers.slice(1)) {
    if (number === end + 1) {
      end = number;
    } else {
      result.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = number;
    }
  }
  result.push(start === end ? `${start}` : `${start}–${end}`);
  return result.join("، ");
}

function groupBy(
  records: HistoryRecord[],
  keyFor: (record: HistoryRecord) => string,
): Array<{ key: string; records: HistoryRecord[] }> {
  const groups = new Map<string, HistoryRecord[]>();
  for (const record of records) {
    const key = keyFor(record);
    const current = groups.get(key);
    if (current) current.push(record);
    else groups.set(key, [record]);
  }
  return Array.from(groups, ([key, grouped]) => ({ key, records: grouped }));
}

function normalizeJournalColor(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function findRectangleNameInData(
  data: unknown,
  color: string,
  depth = 0,
): string | null {
  if (depth > 12 || data === null || typeof data !== "object") {
    return null;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRectangleNameInData(item, color, depth + 1);
      if (result) return result;
    }
    return null;
  }

  const item = data as Record<string, unknown>;
  const colorKeys = [
    "color",
    "colour",
    "hex",
    "value",
    "background",
    "fill",
    "code",
    "colorValue",
    "backgroundColor",
    "couleur",
  ];
  const nameKeys = [
    "rectangleName",
    "rectName",
    "customName",
    "displayName",
    "name",
    "label",
    "title",
    "nom",
  ];

  const target = normalizeJournalColor(color);
  const colorMatches = colorKeys.some((key) => {
    const candidate = normalizeJournalColor(item[key]);
    return candidate !== null && candidate === target;
  });

  if (colorMatches) {
    for (const key of nameKeys) {
      const name = item[key];
      if (typeof name === "string" && name.trim()) {
        return name.trim();
      }
    }
  }

  for (const value of Object.values(item)) {
    const result = findRectangleNameInData(value, color, depth + 1);
    if (result) return result;
  }

  return null;
}

function findUserRectangleName(color: string): string {
  if (typeof window === "undefined") return "اسم المستطيل غير متاح";

  try {
    const keys: string[] = [];
    const otherKeys: string[] = [];

    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key) continue;

      if (/rect|rectangle|palette|swatch|color|couleur|لون|مستطيل/i.test(key)) {
        keys.push(key);
      } else {
        otherKeys.push(key);
      }
    }

    // Examiner d'abord les entrées susceptibles de contenir les palettes.
    for (const key of [...keys, ...otherKeys]) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed: unknown = JSON.parse(raw);
        const name = findRectangleNameInData(parsed, color);
        if (name) return name;
      } catch {
        // Ignorer les entrées qui ne contiennent pas de JSON.
      }
    }
  } catch {
    // Le tableau reste affichable si le stockage est inaccessible.
  }

  return "اسم المستطيل غير متاح";
}

function journalEventDetails(event: MushafActionJournalEvent): string {
  const details = event.details?.trim() ?? "";

  if (event.action === "color" || event.action === "highlight") {
    if (!details) return "اسم المستطيل غير متاح";

    // Les anciens événements peuvent ne contenir que la valeur de couleur.
    if (/^#(?:[0-9a-f]{3,8})$/i.test(details) || /^rgba?\(/i.test(details)) {
      return "اسم المستطيل غير متاح";
    }

    return details;
  }

  if (event.action === "underline") {
    const styles: Record<string, string> = {
      single: "مفرد",
      simple: "مفرد",
      "underline-single": "مفرد",
      مزدوج: "مزدوج",
      double: "مزدوج",
      mozdawadj: "مزدوج",
      "underline-double": "مزدوج",
      wavy: "متموّج",
      motmawidj: "متموّج",
      "underline-wavy": "متموّج",
      "double-wavy": "متموّج مزدوج",
      "motamawidj mozdawadj": "متموّج مزدوج",
      "underline-double-wavy": "متموّج مزدوج",
    };

    return styles[details.toLowerCase()] ?? "غير محدد";
  }

  if (event.action === "comment") {
    return details || "—";
  }

  if (event.action === "text-modification") {
    const modifications: Record<string, string> = {
      hidden: "إخفاء النص",
      bold: "خط عريض",
      italic: "خط مائل",
      underline: "مفرد",
      "underline-single": "مفرد",
      "underline-double": "مزدوج",
      "underline-wavy": "متموّج",
      "underline-double-wavy": "متموّج مزدوج",
    };

    return modifications[details.toLowerCase()] ?? (details || "—");
  }

  return details || "—";
}

function ActionJournalContent({ surahs }: { surahs: HistorySurah[] }) {
  const [events, setEvents] = useState<MushafActionJournalEvent[]>([]);

  useEffect(() => {
    const refresh = () => setEvents(readMushafActionJournal());

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(MUSHAF_ACTION_JOURNAL_CHANGE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(MUSHAF_ACTION_JOURNAL_CHANGE_EVENT, refresh);
    };
  }, []);

  const ordered = useMemo(
    () => [...events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [events],
  );

  const tableRows = useMemo(() => {
    return ordered.flatMap((event) => {
      const grouped = new Map<number, Set<number>>();
      const unresolved: string[] = [];

      for (const reference of event.references) {
        const match = /^(\d{1,3}):(\d{1,3})$/.exec(reference);

        if (match) {
          const surahNumber = Number(match[1]);
          const ayahNumber = Number(match[2]);

          if (surahNumber >= 1 && surahNumber <= 114 && ayahNumber >= 1) {
            if (!grouped.has(surahNumber)) {
              grouped.set(surahNumber, new Set<number>());
            }
            grouped.get(surahNumber)!.add(ayahNumber);
            continue;
          }
        }

        unresolved.push(reference);
      }

      const rows: Array<{
        surahNumber?: number;
        ayahNumbers: string;
      }> = [...grouped.entries()]
        .sort(([a], [b]) => a - b)
        .map(([surahNumber, ayahNumbers]) => ({
          surahNumber,
          ayahNumbers: compactNumbers([...ayahNumbers].sort((a, b) => a - b)),
        }));

      if (unresolved.length > 0) {
        rows.push({
          ayahNumbers: unresolved.join("، "),
        });
      }

      if (rows.length === 0) {
        rows.push({ ayahNumbers: "—" });
      }

      return rows.map((row, index) => ({
        ...row,
        event,
        rowKey: `${event.id}:${index}`,
      }));
    });
  }, [ordered]);

  return (
    <section
      dir="rtl"
      aria-label="سجل الإجراءات"
      className="overflow-x-auto rounded-xl border border-[var(--border)]"
    >
      <table className="w-full min-w-[700px] border-collapse text-right text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
            <th scope="col" className="p-3">
              الإجراء
            </th>
            <th scope="col" className="p-3">
              السورة
            </th>
            <th scope="col" className="p-3">
              أرقام الآيات
            </th>
            <th scope="col" className="p-3">
              التاريخ
            </th>
            <th scope="col" className="p-3">
              التفاصيل
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row) => {
            const date = new Date(row.event.occurredAt);
            const formattedDate = Number.isNaN(date.getTime())
              ? "—"
              : new Intl.DateTimeFormat("ar-DZ", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(date);

            return (
              <tr
                key={row.rowKey}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="p-3">{row.event.label}</td>
                <td className="p-3">
                  {row.surahNumber ? surahLabel(row.surahNumber, surahs) : "—"}
                </td>
                <td className="p-3 tabular-nums">{row.ayahNumbers}</td>
                <td className="p-3">{formattedDate}</td>
                <td className="max-w-sm p-3 break-words whitespace-pre-wrap">
                  {journalEventDetails(row.event)}
                </td>
              </tr>
            );
          })}
          {tableRows.length === 0 && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-sm">
                لا توجد إجراءات مسجّلة بعد.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="p-3 text-xs text-[var(--muted-foreground)]">
        يُحفظ سجل الإجراءات على هذا الجهاز والمتصفح.
      </p>
    </section>
  );
}

export function MushafHistoryContent({ view, onViewChange }: Props) {
  const [learners, setLearners] = useState<HistoryLearner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");
  const [surahs, setSurahs] = useState<HistorySurah[]>([]);

  // Filtres facultatifs du سجل. Une valeur vide signifie « sans limite ».
  const [filterStartPage, setFilterStartPage] = useState("");
  const [filterEndPage, setFilterEndPage] = useState("");
  const [filterStartSurah, setFilterStartSurah] = useState("");
  const [filterStartAyah, setFilterStartAyah] = useState("");
  const [filterEndSurah, setFilterEndSurah] = useState("");
  const [filterEndAyah, setFilterEndAyah] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const startPage = filterStartPage.trim() ? Number(filterStartPage) : null;
      const endPage = filterEndPage.trim() ? Number(filterEndPage) : null;

      if (startPage !== null && record.pageNumber < startPage) return false;
      if (endPage !== null && record.pageNumber > endPage) return false;

      const recordDay = dayKey(record.occurredAt);
      if (filterStartDate && recordDay < filterStartDate) return false;
      if (filterEndDate && recordDay > filterEndDate) return false;

      const startSurah = filterStartSurah ? Number(filterStartSurah) : null;
      const startAyah = filterStartAyah.trim() ? Number(filterStartAyah) : null;
      const endSurah = filterEndSurah ? Number(filterEndSurah) : null;
      const endAyah = filterEndAyah.trim() ? Number(filterEndAyah) : null;

      // La borne coranique est une paire (sourate, ayah).
      // Si la sourate est renseignée sans ayah, on prend le début
      // de cette sourate pour la borne initiale et sa fin pour la finale.
      if (startSurah !== null) {
        if (record.surahNumber < startSurah) return false;
        if (
          record.surahNumber === startSurah &&
          startAyah !== null &&
          record.ayahNumber < startAyah
        ) {
          return false;
        }
      } else if (startAyah !== null && record.ayahNumber < startAyah) {
        // Une ayah sans sourate est interprétée comme une limite
        // appliquée au numéro d'ayah dans toutes les sourates.
        return false;
      }

      if (endSurah !== null) {
        if (record.surahNumber > endSurah) return false;
        if (
          record.surahNumber === endSurah &&
          endAyah !== null &&
          record.ayahNumber > endAyah
        ) {
          return false;
        }
      } else if (endAyah !== null && record.ayahNumber > endAyah) {
        return false;
      }

      return true;
    });
  }, [
    records,
    filterStartPage,
    filterEndPage,
    filterStartSurah,
    filterStartAyah,
    filterEndSurah,
    filterEndAyah,
    filterStartDate,
    filterEndDate,
  ]);

  useEffect(() => {
    let active = true;

    async function loadSurahs() {
      try {
        const response = await fetch("/api/surahs", { cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        const incoming =
          payload && typeof payload === "object" && "data" in payload
            ? payload.data
            : undefined;

        if (!Array.isArray(incoming)) return;
        const available = incoming.filter(
          (item): item is HistorySurah =>
            typeof item === "object" &&
            item !== null &&
            "number" in item &&
            typeof item.number === "number" &&
            item.number >= 1 &&
            item.number <= 114 &&
            "name" in item &&
            (typeof item.name === "string" || item.name === null),
        );
        if (active) setSurahs(available);
      } catch {
        // L'historique reste utilisable si les noms des sourates ne chargent pas.
      }
    }

    void loadSurahs();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLearners() {
      setOptionsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/history");
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          const detail =
            payload && typeof payload === "object" && "error" in payload
              ? String(payload.error)
              : `HTTP ${response.status}`;
          throw new Error(`تعذّر تحميل المستخدمين: ${detail}`);
        }

        const incoming =
          payload && typeof payload === "object" && "learners" in payload
            ? payload.learners
            : undefined;

        if (!Array.isArray(incoming)) {
          throw new Error("بيانات المستخدمين غير صالحة.");
        }

        const available = incoming.filter(
          (item): item is HistoryLearner =>
            typeof item === "object" &&
            item !== null &&
            "id" in item &&
            "name" in item &&
            typeof item.id === "string" &&
            typeof item.name === "string",
        );

        if (active) {
          setLearners(available);
          setLearnerId((current) =>
            current && available.some((item) => item.id === current)
              ? current
              : available.length === 1
                ? available[0].id
                : "",
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "تعذّر تحميل المستخدمين.",
          );
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void loadLearners();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!learnerId) {
      setRecords([]);
      setRecordsLoading(false);
      return;
    }

    let active = true;

    async function loadRecords() {
      setRecordsLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ learnerId });
        const response = await fetch(`/api/history?${query.toString()}`);
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(`تعذّر تحميل السجل: HTTP ${response.status}.`);
        }

        const incoming =
          payload && typeof payload === "object" && "records" in payload
            ? payload.records
            : undefined;

        if (!Array.isArray(incoming)) {
          throw new Error("تنسيق بيانات السجل غير صالح.");
        }

        if (active) setRecords(await reconstructMissingPageLineMetadata(incoming as HistoryRecord[]));
      } catch (loadError) {
        if (active) {
          setRecords([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "تعذّر تحميل السجل.",
          );
        }
      } finally {
        if (active) setRecordsLoading(false);
      }
    }

    void loadRecords();
    return () => {
      active = false;
    };
  }, [learnerId]);

  const rows = useMemo<HistoryRow[]>(() => {
    const groups = groupBy(filteredRecords, (record) => {
      if (view === "pages") {
        return `${record.pageNumber}:${record.action}`;
      }
      if (view === "ayahs") {
        return `${record.surahNumber}:${record.action}`;
      }
      if (view === "activity") {
        return `${record.activityId}:${record.surahNumber}:${record.action}`;
      }
      return `${dayKey(record.occurredAt)}:${record.activityId}:${record.surahNumber}:${record.action}`;
    });

    return groups
      .map(({ key, records: group }) => {
        const latest = group.reduce(
          (value, record) =>
            record.occurredAt > value ? record.occurredAt : value,
          group[0]?.occurredAt ?? "",
        );
        const references = [
          ...new Set(
            group.map((record) => `${record.surahNumber}:${record.ayahNumber}`),
          ),
        ].sort((a, b) => {
          const [as, aa] = a.split(":").map(Number);
          const [bs, ba] = b.split(":").map(Number);
          return as - bs || aa - ba;
        });
        const pages = compactNumbers(group.map((record) => record.pageNumber));
        const first = group[0];

        return {
          key,
          surahNumber: first?.surahNumber,
          reference:
            view === "pages"
              ? references.join("، ") || "—"
              : compactNumbers(group.map((record) => record.ayahNumber)),
          page:
            view === "ayahs"
              ? compactNumbers(group.map((record) => record.pageNumber))
              : (first?.pageNumber ?? "—"),
          pages,
          action: first?.action ?? "—",
          date: view === "day" ? key.split(":")[0] : latest,
          percentage:
            view === "pages"
              ? calculateRecordedPagePercentage(group)
              : null,
          count:
            view === "pages" || view === "ayahs"
              ? new Set(group.map((record) => record.activityId)).size
              : new Set(group.map((record) => record.ayahId)).size,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, view]);

  const emptyMessage =
    view === "pages"
      ? "لا توجد آثار مسجّلة لهذه الصفحة."
      : view === "ayahs"
        ? "لا توجد آثار مسجّلة لهذه الآية."
        : view === "activity"
          ? "لا توجد أنشطة مسجّلة."
          : "لا توجد أنشطة مسجّلة في هذا اليوم.";

  return (
    <section
      dir="rtl"
      className="my-3 w-full space-y-4 rounded-lg border border-[var(--border)] p-3 sm:p-5"
      aria-label="السجل"
      data-history-view={view}
    >
      <header className="text-right">
        <h2 className="text-lg font-bold">📅 السجل</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          سجل الأنشطة المسجلة فعليًا
        </p>
      </header>

      <label className="block max-w-xl space-y-2">
        <span className="text-sm font-medium">المستخدم</span>
        <select
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
          value={learnerId}
          onChange={(event) => setLearnerId(event.target.value)}
          disabled={optionsLoading}
        >
          <option value="">Choisir un apprenant</option>
          {learners.map((learner) => (
            <option key={learner.id} value={learner.id}>
              {learner.name}
            </option>
          ))}
        </select>
      </label>

      <section
        dir="rtl"
        aria-label="التحديد"
        className="space-y-3 rounded-lg border border-[var(--border)] p-3"
      >
        <h3 className="text-sm font-bold">التحديد</h3>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 text-sm font-semibold">البداية</div>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              الصفحة
              <input
                type="number"
                min="1"
                max="604"
                placeholder="كل الصفحات"
                value={filterStartPage}
                onChange={(event) => setFilterStartPage(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              السورة
              <select
                aria-label="سورة البداية في التحديد"
                value={filterStartSurah}
                onChange={(event) => setFilterStartSurah(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
              >
                <option value="">كل السور</option>
                {surahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number} - {surah.name || `سورة ${surah.number}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              الآية
              <input
                type="number"
                min="1"
                placeholder="من أول السورة"
                value={filterStartAyah}
                onChange={(event) => setFilterStartAyah(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 text-sm font-semibold">النهاية</div>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              الصفحة
              <input
                type="number"
                min="1"
                max="604"
                placeholder="كل الصفحات"
                value={filterEndPage}
                onChange={(event) => setFilterEndPage(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              السورة
              <select
                aria-label="سورة النهاية في التحديد"
                value={filterEndSurah}
                onChange={(event) => setFilterEndSurah(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm"
              >
                <option value="">كل السور</option>
                {surahs.map((surah) => (
                  <option key={surah.number} value={surah.number}>
                    {surah.number} - {surah.name || `سورة ${surah.number}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              الآية
              <input
                type="number"
                min="1"
                placeholder="حتى آخر السورة"
                value={filterEndAyah}
                onChange={(event) => setFilterEndAyah(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex min-w-0 flex-col gap-1 text-xs">
              من (تاريخ)
              <input
                type="date"
                value={filterStartDate}
                max={filterEndDate || undefined}
                onChange={(event) => setFilterStartDate(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </label>

            <label className="flex min-w-0 flex-col gap-1 text-xs">
              إلى (تاريخ)
              <input
                type="date"
                value={filterEndDate}
                min={filterStartDate || undefined}
                onChange={(event) => setFilterEndDate(event.target.value)}
                className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold"
              onClick={() => {
                setFilterStartPage("");
                setFilterEndPage("");
                setFilterStartSurah("");
                setFilterStartAyah("");
                setFilterEndSurah("");
                setFilterEndAyah("");
                setFilterStartDate("");
                setFilterEndDate("");
              }}
            >
              مسح التحديد
            </button>
          </div>
        </div>
      </section>

      {optionsLoading && (
        <p role="status" className="text-sm">
          Chargement des apprenants…
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500 p-3 text-sm"
        >
          {error}
        </p>
      )}

      {!optionsLoading && !error && learners.length === 0 && (
        <p className="rounded-lg border border-[var(--border)] p-4 text-sm">
          Aucun apprenant disponible pour ce compte.
        </p>
      )}

      {recordsLoading && (
        <p role="status" className="text-sm">
          Chargement du Sidjil…
        </p>
      )}

      {view === "action" ? (
        <ActionJournalContent surahs={surahs} />
      ) : (
        learnerId &&
        !recordsLoading &&
        !error && (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[540px] border-collapse text-right text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  {view === "pages" && (
                    <>
                      <th scope="col" className="p-3">
                        الصفحة
                      </th>
                      <th scope="col" className="p-3">
                        النسبة
                      </th>
                      <th scope="col" className="p-3">
                        المهمة
                      </th>
                      <th scope="col" className="p-3">
                        آخر تاريخ
                      </th>
                      <th scope="col" className="p-3">
                        عدد المرات
                      </th>
                    </>
                  )}
                  {view === "ayahs" && (
                    <>
                      <th scope="col" className="p-3">
                        السورة
                      </th>
                      <th scope="col" className="p-3">
                        أرقام الآيات
                      </th>
                      <th scope="col" className="p-3">
                        الصفحات
                      </th>
                      <th scope="col" className="p-3">
                        النشاط
                      </th>
                      <th scope="col" className="p-3">
                        آخر تاريخ
                      </th>
                      <th scope="col" className="p-3">
                        عدد المرات
                      </th>
                    </>
                  )}
                  {view === "activity" && (
                    <>
                      <th scope="col" className="p-3">
                        النشاط
                      </th>
                      <th scope="col" className="p-3">
                        السورة
                      </th>
                      <th scope="col" className="p-3">
                        أرقام الآيات
                      </th>
                      <th scope="col" className="p-3">
                        أرقام الصفحات
                      </th>
                      <th scope="col" className="p-3">
                        التاريخ
                      </th>
                      <th scope="col" className="p-3">
                        عدد الآيات
                      </th>
                    </>
                  )}
                  {view === "day" && (
                    <>
                      <th scope="col" className="p-3">
                        التاريخ
                      </th>
                      <th scope="col" className="p-3">
                        السورة
                      </th>
                      <th scope="col" className="p-3">
                        أرقام الآيات
                      </th>
                      <th scope="col" className="p-3">
                        أرقام الصفحات
                      </th>
                      <th scope="col" className="p-3">
                        النشاط
                      </th>
                      <th scope="col" className="p-3">
                        عدد الآيات
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-[var(--border)] last:border-b-0"
                  >
                    {view === "pages" && (
                      <>
                        <td className="p-3 tabular-nums">{row.page}</td>
                        <td className="p-3 tabular-nums">{row.percentage == null ? "—" : `${row.percentage}%`}</td>
                        <td className="p-3">{actionLabel(row.action)}</td>
                        <td className="p-3">{formatDate(row.date)}</td>
                        <td className="p-3 tabular-nums">{row.count}</td>
                      </>
                    )}
                    {view === "ayahs" && (
                      <>
                        <td className="p-3">
                          {surahLabel(row.surahNumber, surahs)}
                        </td>
                        <td className="p-3 tabular-nums">{row.reference}</td>
                        <td className="p-3 tabular-nums">{row.page}</td>
                        <td className="p-3">{actionLabel(row.action)}</td>
                        <td className="p-3">{formatDate(row.date)}</td>
                        <td className="p-3 tabular-nums">{row.count}</td>
                      </>
                    )}
                    {view === "activity" && (
                      <>
                        <td className="p-3">{actionLabel(row.action)}</td>
                        <td className="p-3">
                          {surahLabel(row.surahNumber, surahs)}
                        </td>
                        <td className="p-3 tabular-nums">{row.reference}</td>
                        <td className="p-3 tabular-nums">{row.pages}</td>
                        <td className="p-3">{formatDate(row.date)}</td>
                        <td className="p-3 tabular-nums">{row.count}</td>
                      </>
                    )}
                    {view === "day" && (
                      <>
                        <td className="p-3 tabular-nums">
                          {formatDay(row.date)}
                        </td>
                        <td className="p-3">
                          {surahLabel(row.surahNumber, surahs)}
                        </td>
                        <td className="p-3 tabular-nums">{row.reference}</td>
                        <td className="p-3 tabular-nums">{row.pages}</td>
                        <td className="p-3">{actionLabel(row.action)}</td>
                        <td className="p-3 tabular-nums">{row.count}</td>
                      </>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={view === "pages" ? 5 : 6}
                      className="p-6 text-center text-sm"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )
      )}

    </section>
  );
}
