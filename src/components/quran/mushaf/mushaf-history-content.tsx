"use client";

import { useEffect, useMemo, useState } from "react";

export type MushafHistoryView = "pages" | "ayahs" | "activity" | "day";

type HistoryLearner = {
  id: string;
  name: string;
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
};

type HistoryRow = {
  key: string;
  reference: string;
  page: number | string;
  pages: string;
  action: string;
  date: string;
  count: number;
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
  return new Intl.DateTimeFormat("fr-FR", {
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
  return ACTIONS[value] ?? value;
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

export function MushafHistoryContent({ view, onViewChange }: Props) {
  const [learners, setLearners] = useState<HistoryLearner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");

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
          throw new Error(`Impossible de charger les apprenants : ${detail}`);
        }

        const incoming =
          payload && typeof payload === "object" && "learners" in payload
            ? payload.learners
            : undefined;

        if (!Array.isArray(incoming)) {
          throw new Error("La réponse des apprenants est invalide.");
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
              : "Impossible de charger les apprenants.",
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
          throw new Error(
            `Impossible de charger le Sidjil : HTTP ${response.status}.`,
          );
        }

        const incoming =
          payload && typeof payload === "object" && "records" in payload
            ? payload.records
            : undefined;

        if (!Array.isArray(incoming)) {
          throw new Error("Le format des traces du Sidjil est invalide.");
        }

        if (active) setRecords(incoming as HistoryRecord[]);
      } catch (loadError) {
        if (active) {
          setRecords([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le Sidjil.",
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
    const groups = groupBy(records, (record) => {
      if (view === "pages") {
        return `${record.pageNumber}:${record.action}`;
      }
      if (view === "ayahs") {
        return `${record.surahNumber}:${record.ayahNumber}:${record.action}`;
      }
      if (view === "activity") {
        return `${record.activityId}:${record.action}`;
      }
      return `${dayKey(record.occurredAt)}:${record.activityId}:${record.action}`;
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
          reference:
            view === "ayahs"
              ? `${first.surahNumber}:${first.ayahNumber}`
              : references.join("، ") || "—",
          page: first?.pageNumber ?? "—",
          pages,
          action: first?.action ?? "—",
          date: view === "day" ? key.split(":")[0] : latest,
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
      ? "Aucune trace enregistrée pour une page."
      : view === "ayahs"
        ? "Aucune trace enregistrée pour une ayah."
        : view === "activity"
          ? "Aucune activité enregistrée."
          : "Aucune activité enregistrée pour ce jour.";

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
          سجل الأنشطة المسجلة فعليًا — Historique des traces enregistrées
        </p>
      </header>

      <label className="block max-w-xl space-y-2">
        <span className="text-sm font-medium">المتعلم — Apprenant</span>
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

      {learnerId && !recordsLoading && !error && (
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
                      الآية
                    </th>
                    <th scope="col" className="p-3">
                      الصفحة
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
                {view === "activity" && (
                  <>
                    <th scope="col" className="p-3">
                      نوع النشاط
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
                      أرقام الآيات
                    </th>
                    <th scope="col" className="p-3">
                      أرقام الصفحات
                    </th>
                    <th scope="col" className="p-3">
                      نوع النشاط
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
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                  {view === "ayahs" && (
                    <>
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
                  <td colSpan={5} className="p-6 text-center text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-[var(--muted-foreground)]">
        Les tableaux reflètent uniquement les traces présentes en base de
        données.
      </p>
    </section>
  );
}
