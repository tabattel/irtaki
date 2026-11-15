"use client";
import { calculateRecordedPagePercentage } from "@/application/learning/page-line-progress";
import { reconstructMissingPageLineMetadata } from "@/lib/mushaf/reconstruct-page-line-metadata";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackCloseNav } from "@/components/layout/back-close-nav";

type HistoryView = "ayahs" | "pages" | "activity" | "day";

type LearnerOption = {
  id: string;
  name: string;
  childProfileId?: string | null;
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
  lineNumbers?: number[];
  pageLineCount?: number | null;
  riwayaId?: number | null;
  tariqId?: number | null;
  riwayaShortName?: string | null;
  riwayaFullName?: string | null;
  tariqName?: string | null;
};

type TableRow = {
  key: string;
  surahNumber?: number;
  reference?: string;
  page?: number;
  pages?: string;
  action: string;
  date: string;
  count: number;
  percentage?: number | null;
  riwaya?: string | null;
  tariq?: string | null;
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
  { value: "read", label: "قراءة" },
  { value: "memorize", label: "حفظ" },
  { value: "recite", label: "تلاوة" },
  { value: "tathbit", label: "تثبيت" },
  { value: "tahajjud", label: "تهجد" },
  { value: "revise", label: "مراجعة" },
  { value: "khatma", label: "ختمة" },
  { value: "tadabbur", label: "تدبر" },
  { value: "talkin", label: "تلقين" },
  { value: "tarteel1", label: "ترتيل ١" },
  { value: "tarteel2", label: "ترتيل ٢" },
] as const;

const DISPLAYED_ACTIONS = new Set<string>(MODES.map((mode) => mode.value));

function actionLabel(action: string): string {
  if (action === "qiraa") return "القراءة";
  return MODES.find((mode) => mode.value === action)?.label ?? action;
}

function surahLabel(surahNumber: number, surahs: SurahOption[]): string {
  const name = surahs
    .find((surah) => surah.number === surahNumber)
    ?.name?.trim();
  return name && /[\u0600-\u06FF]/.test(name)
    ? `${name} (${surahNumber})`
    : `السورة رقم ${surahNumber}`;
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

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDay(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "—";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "short",
    calendar: "gregory",
  }).format(date);
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

function riwayaOf(records: HistoryRecord[]): string | null {
  for (const record of records) {
    if (record.riwayaShortName) return record.riwayaShortName;
  }
  return null;
}

function tariqOf(records: HistoryRecord[]): string | null {
  for (const record of records) {
    if (record.tariqName) return record.tariqName;
  }
  return null;
}

function latestDate(records: HistoryRecord[]): string {
  return records.reduce(
    (latest, record) =>
      record.occurredAt > latest ? record.occurredAt : latest,
    records[0]?.occurredAt ?? "",
  );
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
  const [selectedActions, setSelectedActions] = useState<Set<string>>(
    () => new Set(MODES.map((mode) => mode.value)),
  );
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
            // Priorité : localStorage > main learner > premier de la liste
            let stored: string | null = null;
            try {
              stored = window.localStorage.getItem("irtaki.activeLearnerId");
            } catch {
              stored = null;
            }
            if (stored && availableLearners.some((l) => l.id === stored)) {
              return stored;
            }
            const main = availableLearners.find((l) => !l.childProfileId);
            return main?.id ?? availableLearners[0]?.id ?? "";
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

        if (active) setRecords(await reconstructMissingPageLineMetadata(incoming as HistoryRecord[]));
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

        if (view === "activity" && !selectedActions.has(record.action)) {
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
    [records, view, surahFilter, pageFilter, selectedActions, dayFilter],
  );

  const rows = useMemo<TableRow[]>(() => {
    if (view === "ayahs") {
      return groupRecords(
        filteredRecords,
        (record) => `${record.surahNumber}:${record.action}`,
      )
        .map(({ key, records: grouped }) => ({
          key,
          surahNumber: grouped[0].surahNumber,
          reference: compactNumbers(grouped.map((record) => record.ayahNumber)),
          pages: pageRange(grouped),
          action: grouped[0].action,
          date: latestDate(grouped),
          count: sessionCount(grouped),
          riwaya: riwayaOf(grouped),
          tariq: tariqOf(grouped),
        }))
        .sort(
          (a, b) =>
            (a.surahNumber ?? 0) - (b.surahNumber ?? 0) ||
            a.action.localeCompare(b.action),
        );
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
          percentage: calculateRecordedPagePercentage(grouped),
          riwaya: riwayaOf(grouped),
          tariq: tariqOf(grouped),
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
          surahNumber: grouped[0].surahNumber,
          reference: compactNumbers(grouped.map((record) => record.ayahNumber)),
          pages: pageRange(grouped),
          action: grouped[0].action,
          date: latestDate(grouped),
          count: new Set(grouped.map((record) => record.ayahId)).size,
          riwaya: riwayaOf(grouped),
          tariq: tariqOf(grouped),
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
        surahNumber: grouped[0].surahNumber,
        reference: compactNumbers(grouped.map((record) => record.ayahNumber)),
        pages: pageRange(grouped),
        action: grouped[0].action,
        date: localDayKey(latestDate(grouped)),
        count: new Set(grouped.map((record) => record.ayahId)).size,
        riwaya: riwayaOf(grouped),
        tariq: tariqOf(grouped),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredRecords, view]);

  const allChecked =
    MODES.length > 0 && selectedActions.size === MODES.length;
  const someChecked = selectedActions.size > 0 && !allChecked;

  const emptyMessage =
    view === "ayahs"
      ? "لا توجد آثار مسجّلة للآيات وفق هذا التصفية."
      : view === "pages"
        ? "لا توجد جلسات تتضمن آيات مسجّلة في هذه الصفحة."
        : view === "activity"
          ? "لا توجد جلسات مسجّلة لهذا النشاط."
          : "لا توجد جلسات مسجّلة في هذا اليوم.";

  return (
    <section dir="rtl" className="space-y-5">
      <BackCloseNav />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">📅 السجل</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            سجل الأنشطة المسجّلة: أرقام الآيات والصفحات والتواريخ وعدد
            التكرارات، دون عرض النص القرآني.
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
        <span className="text-sm font-medium">المتعلم</span>
        <select
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
          value={learnerId}
          onChange={(event) => setLearnerId(event.target.value)}
          disabled={optionsLoading}
        >
          {learners.map((learner) => (
            <option key={learner.id} value={learner.id}>
              {learner.name?.trim() ||
                (learner.childProfileId
                  ? "حساب طفل"
                  : "الحساب الرئيسي")}
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
          <span className="text-sm font-medium">السورة</span>
          <select
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
            value={surahFilter}
            onChange={(event) => setSurahFilter(event.target.value)}
          >
            <option value="all">جميع السور</option>
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
          <span className="text-sm font-medium">الصفحة</span>
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
        <div className="max-w-3xl space-y-3">
          <span className="text-sm font-semibold">الأنشطة</span>

          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={() => {
                setSelectedActions(
                  allChecked
                    ? new Set()
                    : new Set(MODES.map((m) => m.value)),
                );
              }}
              className="h-4 w-4 accent-emerald-600"
            />
            <span>الكل</span>
          </label>

          <div className="grid grid-cols-6 gap-2">
            {MODES.map((mode) => {
              const checked = selectedActions.has(mode.value);
              return (
                <label
                  key={mode.value}
                  className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border p-2 text-xs transition ${
                    checked
                      ? "border-emerald-600 bg-emerald-600/10 font-semibold"
                      : "border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedActions((prev) => {
                        const next = new Set(prev);
                        if (next.has(mode.value)) next.delete(mode.value);
                        else next.add(mode.value);
                        return next;
                      });
                    }}
                    className="h-3.5 w-3.5 shrink-0 accent-emerald-600"
                  />
                  <span className="truncate">{mode.label}</span>
                </label>
              );
            })}
          </div>
        </div>
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
              كل التواريخ
            </button>
          )}
        </label>
      )}

      {(optionsLoading || recordsLoading) && (
        <p role="status" className="text-sm">
          جارٍ تحميل السجل…
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
          لا يوجد مستخدم متاح لهذا الحساب.
        </p>
      )}

      {learnerId && !recordsLoading && !error && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full min-w-[480px] border-collapse text-right text-xs md:min-w-[600px] md:text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
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
                      الرواية
                    </th>
                    <th scope="col" className="p-3">
                      الطريق
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
                      النسبة
                    </th>
                    <th scope="col" className="p-3">
                      المهمة
                    </th>
                    <th scope="col" className="p-3">
                      الرواية
                    </th>
                    <th scope="col" className="p-3">
                      الطريق
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
                      الرواية
                    </th>
                    <th scope="col" className="p-3">
                      الطريق
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
                      الرواية
                    </th>
                    <th scope="col" className="p-3">
                      الطريق
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
                      <td className="p-3">
                        {surahLabel(row.surahNumber ?? 0, surahs)}
                      </td>
                      <td className="p-3 tabular-nums">{row.reference}</td>
                      <td className="p-3 tabular-nums">{row.pages}</td>
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">{row.riwaya ?? "—"}</td>
                      <td className="p-3">{row.tariq ?? "—"}</td>
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                  {view === "pages" && (
                    <>
                      <td className="p-3 tabular-nums">{row.page}</td>
                      <td className="p-3 tabular-nums">
                        {row.percentage == null ? "—" : `${row.percentage}%`}
                      </td>
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">{row.riwaya ?? "—"}</td>
                      <td className="p-3">{row.tariq ?? "—"}</td>
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                  {view === "activity" && (
                    <>
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">
                        {surahLabel(row.surahNumber ?? 0, surahs)}
                      </td>
                      <td className="p-3 tabular-nums">{row.reference}</td>
                      <td className="p-3 tabular-nums">{row.pages}</td>
                      <td className="p-3">{row.riwaya ?? "—"}</td>
                      <td className="p-3">{row.tariq ?? "—"}</td>
                      <td className="p-3">{formatDate(row.date)}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                  {view === "day" && (
                    <>
                      <td className="p-3">{formatDay(row.date)}</td>
                      <td className="p-3">
                        {surahLabel(row.surahNumber ?? 0, surahs)}
                      </td>
                      <td className="p-3 tabular-nums">{row.reference}</td>
                      <td className="p-3 tabular-nums">{row.pages}</td>
                      <td className="p-3">{actionLabel(row.action)}</td>
                      <td className="p-3">{row.riwaya ?? "—"}</td>
                      <td className="p-3">{row.tariq ?? "—"}</td>
                      <td className="p-3 tabular-nums">{row.count}</td>
                    </>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={view === "pages" ? 7 : 8}
                    className="p-6 text-center text-sm"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </section>
  );
}
