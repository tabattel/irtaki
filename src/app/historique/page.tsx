"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type HistoryView = "ayahs" | "pages" | "activity" | "day";

type LearnerOption = {
  id: string;
  name: string;
};

type SurahOption = {
  number: number;
  name?: string | null;
  codedName?: string | null;
  translatedName?: string | null;
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

type TableRow = {
  key: string;
  reference?: string;
  page?: number;
  pages?: string;
  action: string;
  date: string;
  count: number;
};

const VIEWS: { id: HistoryView; label: string }[] = [
  { id: "ayahs", label: "آيات" },
  { id: "pages", label: "صفحات" },
  { id: "activity", label: "النشاط" },
  { id: "day", label: "اليوم" },
];

// L'ordre et les libellés arabes demandés sont conservés.
// Les valeurs internes correspondent aux actions disponibles dans les traces.
const MODES = [
  { value: "listen", label: "استماع" },
  { value: "read", label: "قراء" },
  { value: "memorize", label: "حفظ" },
  { value: "recite", label: "تلاوة" },
  { value: "tathbit", label: "تثبيت" },
  { value: "tahajjud", label: "تهجد" },
  { value: "revise", label: "مراجعة" },
  { value: "khatma", label: "ختمة" },
  { value: "tadabbur", label: "تدبير" },
  { value: "talkin", label: "تلقين" },
] as const;

const DISPLAYED_ACTIONS = new Set<string>(MODES.map((mode) => mode.value));

function actionLabel(action: string): string {
  return MODES.find((mode) => mode.value === action)?.label ?? action;
}

function extractArray<T>(value: unknown, keys: string[]): T[] {
  if (Array.isArray(value)) return value as T[];

  if (typeof value === "object" && value !== null) {
    const object = value as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(object[key])) return object[key] as T[];
    }
  }

  return [];
}

function localDayKey(value: string): string {
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

function compactNumbers(numbers: number[]): string {
  const sorted = [...new Set(numbers)].sort((a, b) => a - b);
  if (sorted.length === 0) return "—";

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (const number of sorted.slice(1)) {
    if (number === end + 1) {
      end = number;
    } else {
      ranges.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = number;
    }
  }

  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join("، ");
}

function groupRecords(
  records: HistoryRecord[],
  keyOf: (record: HistoryRecord) => string,
): { key: string; records: HistoryRecord[] }[] {
  const groups = new Map<string, HistoryRecord[]>();

  for (const record of records) {
    const key = keyOf(record);
    const current = groups.get(key);
    if (current) current.push(record);
    else groups.set(key, [record]);
  }

  return Array.from(groups, ([key, grouped]) => ({
    key,
    records: grouped,
  }));
}

function latestDate(records: HistoryRecord[]): string {
  return records.reduce(
    (latest, record) =>
      record.occurredAt > latest ? record.occurredAt : latest,
    records[0]?.occurredAt ?? "",
  );
}

function verseRange(records: HistoryRecord[]): string {
  const groups = groupRecords(records, (record) => String(record.surahNumber));

  return groups
    .sort((a, b) => Number(a.key) - Number(b.key))
    .map(
      ({ key, records: grouped }) =>
        `${key}:${compactNumbers(grouped.map((record) => record.ayahNumber))}`,
    )
    .join(" ؛ ");
}

function pageRange(records: HistoryRecord[]): string {
  return compactNumbers(records.map((record) => record.pageNumber));
}

function sessionCount(records: HistoryRecord[]): number {
  return new Set(records.map((record) => record.activityId)).size;
}

export default function HistoryPage() {
  const router = useRouter();

  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [surahs, setSurahs] = useState<SurahOption[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [view, setView] = useState<HistoryView>("activity");
  const [actionFilter, setActionFilter] = useState("all");
  const [surahFilter, setSurahFilter] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [dayFilter, setDayFilter] = useState("");
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const requestedView = new URLSearchParams(window.location.search).get(
      "view",
    );

    if (
      requestedView === "pages" ||
      requestedView === "ayahs" ||
      requestedView === "activity" ||
      requestedView === "day"
    ) {
      setView(requestedView);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setOptionsLoading(true);
      setError("");

      try {
        const [learnerResponse, surahResponse] = await Promise.all([
          fetch("/api/history"),
          fetch("/api/surahs"),
        ]);

        async function readPayload(response: Response): Promise<unknown> {
          const body = await response.text();
          if (!body) return null;

          try {
            return JSON.parse(body) as unknown;
          } catch {
            return { raw: body.slice(0, 240) };
          }
        }

        const [learnerPayload, surahPayload] = await Promise.all([
          readPayload(learnerResponse),
          readPayload(surahResponse),
        ]);

        function describeFailure(
          path: string,
          response: Response,
          payload: unknown,
        ): string | null {
          if (response.ok) return null;

          let detail = "";
          if (typeof payload === "object" && payload !== null) {
            const data = payload as Record<string, unknown>;
            const value = data.error ?? data.message ?? data.raw;
            if (typeof value === "string") detail = value.slice(0, 180);
          }

          return `${path} HTTP ${response.status}${detail ? ` — ${detail}` : ""}`;
        }

        const failures = [
          describeFailure("/api/history", learnerResponse, learnerPayload),
          describeFailure("/api/surahs", surahResponse, surahPayload),
        ].filter((failure): failure is string => failure !== null);

        if (failures.length > 0) {
          throw new Error(failures.join(" | "));
        }

        const availableLearners = extractArray<LearnerOption>(learnerPayload, [
          "learners",
          "data",
          "items",
        ]);

        const availableSurahs = extractArray<SurahOption>(surahPayload, [
          "surahs",
          "data",
          "items",
          "results",
        ])
          .filter(
            (surah) =>
              Number.isInteger(surah.number) &&
              surah.number >= 1 &&
              surah.number <= 114,
          )
          .sort((a, b) => a.number - b.number);

        if (active) {
          setLearners(availableLearners);
          setSurahs(availableSurahs);
          setLearnerId((current) => {
            if (
              current &&
              availableLearners.some((learner) => learner.id === current)
            ) {
              return current;
            }
            return availableLearners.length === 1
              ? availableLearners[0].id
              : "";
          });
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les filtres.",
          );
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!learnerId) {
      setRecords([]);
      return;
    }

    let active = true;

    async function loadRecords() {
      setRecordsLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({ learnerId });
        const response = await fetch(`/api/history?${query.toString()}`);
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error("Impossible de charger cet historique.");
        }

        const incoming =
          typeof payload === "object" && payload !== null
            ? (payload as { records?: unknown }).records
            : undefined;

        if (!Array.isArray(incoming)) {
          throw new Error("Le format de l’historique est invalide.");
        }

        if (active) setRecords(incoming as HistoryRecord[]);
      } catch (loadError) {
        if (active) {
          setRecords([]);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger l’historique.",
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

  const availablePages = useMemo(
    () =>
      [...new Set(records.map((record) => record.pageNumber))].sort(
        (a, b) => a - b,
      ),
    [records],
  );

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (!DISPLAYED_ACTIONS.has(record.action)) return false;

        if (
          view === "ayahs" &&
          surahFilter !== "all" &&
          record.surahNumber !== Number(surahFilter)
        ) {
          return false;
        }

        if (
          view === "pages" &&
          pageFilter !== "all" &&
          record.pageNumber !== Number(pageFilter)
        ) {
          return false;
        }

        if (
          view === "activity" &&
          actionFilter !== "all" &&
          record.action !== actionFilter
        ) {
          return false;
        }

        if (
          view === "day" &&
          dayFilter &&
          localDayKey(record.occurredAt) !== dayFilter
        ) {
          return false;
        }

        return true;
      }),
    [records, view, surahFilter, pageFilter, actionFilter, dayFilter],
  );

  const rows = useMemo<TableRow[]>(() => {
    if (view === "ayahs") {
      return groupRecords(
        filteredRecords,
        (record) =>
          `${record.surahNumber}:${record.ayahNumber}:${record.action}`,
      )
        .map(({ key, records: grouped }) => ({
          key,
          reference: `${grouped[0].surahNumber}:${grouped[0].ayahNumber}`,
          page: grouped[0].pageNumber,
          action: grouped[0].action,
          date: latestDate(grouped),
          count: sessionCount(grouped),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    if (view === "pages") {
      return groupRecords(
        filteredRecords,
        (record) => `${record.pageNumber}:${record.action}`,
      )
        .map(({ key, records: grouped }) => ({
          key,
          page: grouped[0].pageNumber,
          action: grouped[0].action,
          date: latestDate(grouped),
          count: sessionCount(grouped),
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    if (view === "activity") {
      return groupRecords(
        filteredRecords,
        (record) =>
          `${record.activityId}:${record.surahNumber}:${record.action}`,
      )
        .map(({ key, records: grouped }) => ({
          key,
          reference: verseRange(grouped),
          pages: pageRange(grouped),
          action: grouped[0].action,
          date: latestDate(grouped),
          count: new Set(grouped.map((record) => record.ayahId)).size,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return groupRecords(
      filteredRecords,
      (record) =>
        `${localDayKey(record.occurredAt)}:${record.activityId}:${record.surahNumber}:${record.action}`,
    )
      .map(({ key, records: grouped }) => ({
        key,
        reference: verseRange(grouped),
        pages: pageRange(grouped),
        action: grouped[0].action,
        date: localDayKey(latestDate(grouped)),
        count: new Set(grouped.map((record) => record.ayahId)).size,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredRecords, view]);

  const emptyMessage =
    view === "ayahs"
      ? "Aucune trace de verset enregistrée pour ce filtre."
      : view === "pages"
        ? "Aucune séance avec des versets tracés pour cette page."
        : view === "activity"
          ? "Aucune séance enregistrée pour ce mode."
          : "Aucune séance enregistrée pour cette date.";

  return (
    <section dir="rtl" className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">📅 السجل — Historique</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Tableaux des tâches enregistrées : numéros, plages de versets, dates
            et répétitions, sans texte coranique.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => router.back()}
        >
          ↩ العودة
        </button>
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

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="نوع السجل"
      >
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            className={
              view === item.id
                ? "rounded-lg border bg-[var(--foreground)] px-4 py-2 text-sm text-[var(--background)]"
                : "rounded-lg border px-4 py-2 text-sm"
            }
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "ayahs" && (
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-medium">السورة — Sourate</span>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
            value={surahFilter}
            onChange={(event) => setSurahFilter(event.target.value)}
          >
            <option value="all">كل السور — Toutes les sourates</option>
            {surahs.map((surah) => (
              <option key={surah.number} value={surah.number}>
                {surah.number}.{" "}
                {surah.name ??
                  surah.translatedName ??
                  surah.codedName ??
                  `Sourate ${surah.number}`}
              </option>
            ))}
          </select>
        </label>
      )}

      {view === "pages" && (
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-medium">الصفحة — Page</span>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
            value={pageFilter}
            onChange={(event) => setPageFilter(event.target.value)}
          >
            <option value="all">كل الصفحات — Toutes les pages</option>
            {availablePages.map((page) => (
              <option key={page} value={page}>
                {page}
              </option>
            ))}
          </select>
        </label>
      )}

      {view === "activity" && (
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-medium">النشاط — Mode</span>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
          >
            <option value="all">كل الأنشطة — Toutes les activités</option>
            {MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {view === "day" && (
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-medium">اليوم — Date</span>
          <input
            type="date"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
            value={dayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
          />
          {dayFilter && (
            <button
              type="button"
              className="text-sm underline"
              onClick={() => setDayFilter("")}
            >
              Toutes les dates
            </button>
          )}
        </label>
      )}

      {(optionsLoading || recordsLoading) && (
        <p role="status" className="text-sm">
          Chargement de l’historique…
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

      {!optionsLoading && learners.length === 0 && !error && (
        <p className="rounded-lg border border-[var(--border)] p-4">
          Aucun apprenant disponible pour ce compte.
        </p>
      )}

      {learnerId && !recordsLoading && !error && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[600px] border-collapse text-right">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
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
                  {view === "ayahs" && (
                    <>
                      <td className="p-3 tabular-nums">{row.reference}</td>
                      <td className="p-3 tabular-nums">{row.page}</td>
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                  {view === "pages" && (
                    <>
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
                      <td className="p-3">{formatDay(row.date)}</td>
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
        Les résultats reflètent les traces présentes en base de données. Les
        modes « تهجد » et « ختمة » apparaissent dans le filtre, mais ne seront
        comptés que lorsqu’ils auront une source réelle d’enregistrement.
      </p>
    </section>
  );
}
