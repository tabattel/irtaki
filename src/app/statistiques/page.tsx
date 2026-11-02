"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type {
  StatisticsAction,
  StatisticsResult,
} from "@/application/statistics/statistics-types";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

type AuthState = "loading" | "authenticated" | "guest" | "error";
type QuranDimension = "bySurah" | "byJuz" | "byHizb" | "byPage";

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";
const ACTIVE_LEARNER_EVENT = "irtaki:active-learner-changed";

const ACTION_META: Record<StatisticsAction, { label: string; color: string }> = {
  read: { label: "قراءة", color: "#2563eb" },
  listen: { label: "استماع", color: "#0d9488" },
  recite: { label: "تلاوة", color: "#7c3aed" },
  memorize: { label: "حفظ", color: "#16a34a" },
  revise: { label: "مراجعة", color: "#d97706" },
  tajwid: { label: "تجويد", color: "#db2777" },
  tadabbur: { label: "تدبر", color: "#0891b2" },
  talkin: { label: "تلقين", color: "#65a30d" },
  tathbit: { label: "تثبيت", color: "#9333ea" },
  qiraa: { label: "قراءة", color: "#475569" },
  khatma: { label: "ختمة", color: "#ea580c" },
  tahajjud: { label: "تهجد", color: "#4f46e5" },
};

const QURAN_DIMENSIONS: {
  id: QuranDimension;
  label: string;
}[] = [
  { id: "bySurah", label: "السور" },
  { id: "byJuz", label: "الأجزاء" },
  { id: "byHizb", label: "الأحزاب" },
  { id: "byPage", label: "الصفحات" },
];

function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Algiers";
  } catch {
    return "Africa/Algiers";
  }
}

function dateKeyInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDateKey(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ar-DZ", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(value: number): string {
  const safe = Math.max(0, Math.floor(value));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${formatNumber(hours)} س ${formatNumber(minutes)} د`;
  }

  if (minutes > 0) {
    return `${formatNumber(minutes)} د`;
  }

  return `${formatNumber(seconds)} ث`;
}

function formatDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatPeriod(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("ar-DZ", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}-01T12:00:00.000Z`));
  }

  return formatDate(value);
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold tabular-nums sm:text-3xl">
        {value}
      </p>
      {detail ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
      ) : null}
    </article>
  );
}

export default function StatisticsPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [learnerId, setLearnerId] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState(() => {
    const zone = getTimeZone();
    const today = dateKeyInZone(new Date(), zone);

    return {
      timeZone: zone,
      from: shiftDateKey(today, -29),
      to: today,
    };
  });

  const { timeZone, from, to } = dateRange;

  const setFrom = (value: string) =>
    setDateRange((current) => ({ ...current, from: value }));

  const setTo = (value: string) =>
    setDateRange((current) => ({ ...current, to: value }));

  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [stats, setStats] = useState<StatisticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTimelineKey, setSelectedTimelineKey] = useState<string | null>(null);
  const [quranDimension, setQuranDimension] =
    useState<QuranDimension>("byHizb");



  // Authentification et synchronisation du profil actuel.
  useEffect(() => {
    let alive = true;

    function readRememberedLearner(): string | null {
      try {
        return window.localStorage.getItem(ACTIVE_LEARNER_KEY);
      } catch {
        return null;
      }
    }

    function handleActiveLearner(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail;

      setLearnerId(
        typeof detail === "string" && detail.length > 0
          ? detail
          : readRememberedLearner(),
      );
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ACTIVE_LEARNER_KEY || event.key === null) {
        setLearnerId(readRememberedLearner());
      }
    }

    window.addEventListener(ACTIVE_LEARNER_EVENT, handleActiveLearner);
    window.addEventListener("storage", handleStorage);

    async function loadAccount() {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!sessionResponse.ok) {
          throw new Error("تعذر التحقق من جلسة الحساب.");
        }

        const sessionPayload = (await sessionResponse.json()) as {
          user?: unknown;
        };

        if (!sessionPayload.user) {
          if (alive) {
            setAuthState("guest");
            setLearners([]);
            setLearnerId(null);
          }
          return;
        }

        const historyResponse = await fetch("/api/history", {
          cache: "no-store",
        });

        if (historyResponse.status === 401) {
          if (alive) setAuthState("guest");
          return;
        }

        if (!historyResponse.ok) {
          throw new Error("تعذر تحميل المستخدمين المرتبطين بالحساب.");
        }

        const payload = (await historyResponse.json()) as {
          learners?: LearnerOption[];
        };

        const available = Array.isArray(payload.learners)
          ? payload.learners.filter(
              (item) =>
                item &&
                typeof item.id === "string" &&
                item.id.length > 0,
            )
          : [];

        if (!alive) return;

        const rememberedId = readRememberedLearner();

        const current =
          available.find((item) => item.id === rememberedId) ??
          available.find((item) => item.childProfileId === null) ??
          available[0] ??
          null;

        setLearners(available);
        setLearnerId(current?.id ?? null);
        setAuthState("authenticated");

        if (current) {
          try {
            window.localStorage.setItem(ACTIVE_LEARNER_KEY, current.id);
          } catch {
            // Le profil reste sélectionné en mémoire.
          }
        }
      } catch (loadError) {
        if (!alive) return;

        setAuthState("error");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل بيانات الحساب.",
        );
      }
    }

    void loadAccount();

    return () => {
      alive = false;
      window.removeEventListener(ACTIVE_LEARNER_EVENT, handleActiveLearner);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Chargement des statistiques du profil actuel.
  useEffect(() => {
    if (authState !== "authenticated" || !learnerId || !from || !to) {
      return;
    }

    const controller = new AbortController();

    const params = new URLSearchParams({
      learnerId,
      from,
      to,
      timeZone,
      groupBy,
    });

    async function loadStatistics() {
      setStats(null);
      setLoading(true);
      setError(null);
      setSelectedTimelineKey(null);

      try {
        const response = await fetch(
          `/api/learning/statistics?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | (StatisticsResult & { error?: string })
          | null;

        if (response.status === 401) {
          setAuthState("guest");
          setStats(null);
          return;
        }

        if (!response.ok) {
          throw new Error(
            payload?.error === "LEARNER_NOT_FOUND"
              ? "المستخدم الحالي غير مرتبط بهذا الحساب. اختر مستخدماً آخر."
              : payload?.error ?? "تعذر تحميل الإحصائيات.",
          );
        }

        if (!payload) {
          throw new Error("استجابة الإحصائيات غير صالحة.");
        }

        setStats(payload);
      } catch (loadError) {
        if (controller.signal.aborted) return;

        setStats(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "تعذر تحميل الإحصائيات.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadStatistics();

    return () => controller.abort();
  }, [authState, learnerId, from, to, timeZone, groupBy]);

  const activeLearner =
    learners.find((item) => item.id === learnerId) ?? null;

  const modeItems = useMemo(
    () => (stats?.byAction ?? []).filter((item) => item.activityCount > 0),
    [stats],
  );

  const modeTotal = modeItems.reduce(
    (total, item) => total + item.activityCount,
    0,
  );

  const modeGradient = useMemo(() => {
    if (modeTotal === 0) {
      return "conic-gradient(var(--border) 0% 100%)";
    }

    let cursor = 0;

    const segments = modeItems.map((item) => {
      const color = ACTION_META[item.action].color;
      const start = cursor;

      cursor += (item.activityCount / modeTotal) * 100;

      return `${color} ${start}% ${cursor}%`;
    });

    return `conic-gradient(${segments.join(", ")})`;
  }, [modeItems, modeTotal]);

  const selectedTimeline =
    stats?.timeline.find((item) => item.key === selectedTimelineKey) ?? null;

  const quranItems = stats?.quran[quranDimension] ?? [];

  const quranMax = Math.max(
    1,
    ...quranItems.map((item) => item.traceCount),
  );

  const timelineMax = Math.max(
    1,
    ...(stats?.timeline.map((item) => item.activityCount) ?? [0]),
  );

  function selectLearner(id: string) {
    setLearnerId(id);

    try {
      window.localStorage.setItem(ACTIVE_LEARNER_KEY, id);
    } catch {
      // Le profil reste sélectionné en mémoire.
    }

    window.dispatchEvent(
      new CustomEvent(ACTIVE_LEARNER_EVENT, { detail: id }),
    );
  }

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-6xl space-y-5"
      dir="rtl"
    >
      <header className="space-y-2">
        <p className="text-sm text-[var(--muted)]">المساحة الشخصية</p>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              الإحصائيات
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              نظرة شاملة على أنشطة القراءة والتعلم والتقدم في القرآن الكريم.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/coran"
              aria-label="العودة إلى المصحف"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--surface)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" />
                <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20" />
                <path d="M12 7v5m-2.5-2.5h5" />
              </svg>
              العودة إلى المصحف
            </Link>

            <Link
              href="/objectifs"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition hover:bg-[var(--surface)]"
            >
              الأهداف
            </Link>
          </div>
        </div>
      </header>

      {authState === "loading" ? (
        <div
          className="rounded-2xl border border-[var(--border)] p-5 text-sm text-[var(--muted)]"
          aria-live="polite"
        >
          جارٍ تحميل الحساب...
        </div>
      ) : null}

      {authState === "guest" ? (
        <section className="rounded-2xl border border-[var(--border)] p-6 text-center">
          <h2 className="font-semibold">
            الإحصائيات الشخصية تتطلب تسجيل الدخول
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            سجّل الدخول لعرض أنشطتك وبيانات المستخدم الحالي.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium"
          >
            العودة إلى الرئيسية
          </Link>
        </section>
      ) : null}

      {authState === "error" ? (
        <div
          className="rounded-2xl border border-[var(--border)] p-4 text-sm"
          role="alert"
        >
          {error ?? "تعذر تحميل الحساب."}
        </div>
      ) : null}

      {authState === "authenticated" ? (
        <>
          <section className="grid min-w-0 gap-3 rounded-2xl border border-[var(--border)] p-3 sm:grid-cols-2 sm:p-4">
            {learners.length > 0 ? (
              <label className="min-w-0 space-y-1.5 text-sm">
                <span className="font-medium">المستخدم الحالي</span>
                <select
                  value={learnerId ?? ""}
                  onChange={(event) => selectLearner(event.target.value)}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base"
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
            ) : (
              <p className="self-center text-sm text-[var(--muted)]">
                لا يوجد مستخدم مرتبط بهذا الحساب.
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="min-w-0 space-y-1.5 text-sm">
                <span className="font-medium">من تاريخ</span>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(event) => setFrom(event.target.value)}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                />
              </label>

              <label className="min-w-0 space-y-1.5 text-sm">
                <span className="font-medium">إلى تاريخ</span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  max={dateKeyInZone(new Date(), timeZone)}
                  onChange={(event) => setTo(event.target.value)}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <span className="text-sm font-medium">التجميع:</span>

              {([
                ["day", "يومي"],
                ["week", "أسبوعي"],
                ["month", "شهري"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={groupBy === value}
                  onClick={() => setGroupBy(value)}
                  className={`min-h-10 rounded-lg border px-4 text-sm font-medium transition ${
                    groupBy === value
                      ? "border-[var(--foreground)] bg-[var(--surface)]"
                      : "border-[var(--border)] hover:bg-[var(--surface)]"
                  }`}
                >
                  {label}
                </button>
              ))}

              <span className="me-auto text-xs text-[var(--muted)]">
                {timeZone}
              </span>
            </div>
          </section>

          {error ? (
            <div
              className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {loading ? (
            <div
              className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]"
              aria-live="polite"
            >
              جارٍ تحميل الإحصائيات...
            </div>
          ) : null}

          {stats && learnerId ? (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">النظرة العامة</h2>
                  <span className="text-xs text-[var(--muted)]">
                    {formatDate(stats.period.from)} — {formatDate(stats.period.to)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard
                    label="إجمالي الجلسات"
                    value={formatNumber(stats.summary.activityCount)}
                    detail={`${formatNumber(stats.summary.finishedActivityCount)} جلسة منتهية`}
                  />
                  <StatCard
                    label="أيام النشاط"
                    value={formatNumber(stats.summary.activeDayCount)}
                  />
                  <StatCard
                    label="المدة المسجلة"
                    value={formatDuration(stats.summary.durationSec)}
                    detail={`${formatNumber(stats.summary.activitiesWithDuration)} جلسة لها مدة مسجلة`}
                  />
                  <StatCard
                    label="آيات لها سجلات"
                    value={formatNumber(stats.summary.uniqueAyahCount)}
                    detail={`${formatNumber(stats.summary.validatedUniqueAyahCount)} مكتملة أو جزئية`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard
                    label="سجلات الآيات"
                    value={formatNumber(stats.summary.traceCount)}
                  />
                  <StatCard
                    label="سجلات مكتملة أو جزئية"
                    value={formatNumber(stats.summary.validatedTraceCount)}
                  />
                  <StatCard
                    label="متوسط مدة الجلسة المسجلة"
                    value={formatDuration(stats.summary.averageDurationSec)}
                  />
                </div>
              </section>

              <section className="grid min-w-0 gap-4 lg:grid-cols-2">
                <article className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
                  <h2 className="font-bold">
                    توزيع الأنشطة حسب الوضع
                  </h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    عدد الجلسات المسجلة لكل وضع تعلم.
                  </p>

                  <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-around">
                    <div
                      className="relative h-44 w-44 shrink-0 rounded-full"
                      role="img"
                      aria-label="توزيع الجلسات حسب وضع التعلم"
                      style={{ background: modeGradient }}
                    >
                      <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
                        <span className="text-3xl font-bold tabular-nums">
                          {formatNumber(modeTotal)}
                        </span>
                        <span className="mt-1 text-xs text-[var(--muted)]">
                          جلسة
                        </span>
                      </div>
                    </div>

                    <div className="grid w-full min-w-0 gap-2">
                      {modeItems.length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">
                          لا توجد أنشطة في هذه الفترة.
                        </p>
                      ) : (
                        modeItems.map((item) => (
                          <div
                            key={item.action}
                            className="flex min-w-0 items-center justify-between gap-3 text-sm"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: ACTION_META[item.action].color,
                                }}
                              />
                              <span className="truncate">
                                {ACTION_META[item.action].label}
                              </span>
                            </span>

                            <span className="shrink-0 font-semibold tabular-nums">
                              {formatNumber(item.activityCount)}
                              <span className="text-xs font-normal text-[var(--muted)]">
                                {" "}
                                (
                                {Math.round(
                                  (item.activityCount / modeTotal) * 100,
                                )}
                                %)
                              </span>
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </article>

                <article className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
                  <h2 className="font-bold">النشاط عبر الزمن</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    اختر عموداً لعرض تفاصيل الفترة.
                  </p>

                  {stats.timeline.length > 0 ? (
                    <div className="mt-4 flex min-w-0 items-end gap-2 overflow-x-auto pb-2">
                      {stats.timeline.map((item) => {
                        const height =
                          item.activityCount === 0
                            ? 2
                            : Math.max(
                                5,
                                (item.activityCount / timelineMax) * 112,
                              );

                        const selected = item.key === selectedTimelineKey;

                        return (
                          <button
                            key={item.key}
                            type="button"
                            title={`${formatPeriod(item.key)}: ${formatNumber(item.activityCount)} جلسة`}
                            aria-label={`${formatPeriod(item.key)}، ${formatNumber(item.activityCount)} جلسة، ${formatNumber(item.traceCount)} سجل آية`}
                            aria-pressed={selected}
                            onClick={() =>
                              setSelectedTimelineKey(
                                selected ? null : item.key,
                              )
                            }
                            className="flex min-w-9 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 hover:bg-[var(--surface)]"
                          >
                            <span className="text-xs tabular-nums">
                              {item.activityCount
                                ? formatNumber(item.activityCount)
                                : ""}
                            </span>

                            <span className="flex h-28 w-full items-end justify-center rounded-md bg-[var(--surface)] p-1">
                              <span
                                className="w-full rounded-sm transition-all"
                                style={{
                                  height: `${height}px`,
                                  backgroundColor: selected
                                    ? "var(--foreground)"
                                    : "#0d9488",
                                }}
                              />
                            </span>

                            <span className="max-w-16 truncate text-[10px] text-[var(--muted)]">
                              {item.key}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-[var(--muted)]">
                      لا توجد بيانات لهذه الفترة.
                    </p>
                  )}

                  {selectedTimeline ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[var(--surface)] p-3 text-center">
                      <div>
                        <p className="text-xs text-[var(--muted)]">الجلسات</p>
                        <p className="mt-1 font-bold tabular-nums">
                          {formatNumber(selectedTimeline.activityCount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">المدة</p>
                        <p className="mt-1 font-bold tabular-nums">
                          {formatDuration(selectedTimeline.durationSec)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[var(--muted)]">
                          سجلات الآيات
                        </p>
                        <p className="mt-1 font-bold tabular-nums">
                          {formatNumber(selectedTimeline.traceCount)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>
              </section>

              {groupBy === "day" ? (
                <section className="rounded-2xl border border-[var(--border)] p-4 sm:p-5">
                  <h2 className="font-bold">تقويم النشاط</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    كل مربع يمثل يوماً؛ يزداد اللون مع عدد الجلسات المسجلة.
                  </p>

                  <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {stats.timeline.map((item) => {
                      const intensity =
                        item.activityCount === 0
                          ? 0
                          : Math.min(
                              1,
                              0.25 +
                                (item.activityCount / timelineMax) * 0.75,
                            );

                      return (
                        <button
                          key={item.key}
                          type="button"
                          title={`${formatDate(item.key)}: ${formatNumber(item.activityCount)} جلسة`}
                          onClick={() => setSelectedTimelineKey(item.key)}
                          className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border border-[var(--border)] text-xs transition hover:scale-105"
                          style={{
                            backgroundColor:
                              intensity === 0
                                ? "var(--surface)"
                                : `rgba(13, 148, 136, ${intensity})`,
                            color:
                              intensity > 0.55 ? "white" : "var(--foreground)",
                          }}
                        >
                          <span>{item.key.slice(8)}</span>
                          {item.activityCount > 0 ? (
                            <span className="text-[10px]">
                              {formatNumber(item.activityCount)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              <section className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      التوزيع حسب أجزاء القرآن
                    </h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      عدد سجلات الآيات والآيات المميزة في كل قسم.
                    </p>
                  </div>

                  <div className="flex max-w-full flex-wrap gap-1.5">
                    {QURAN_DIMENSIONS.map((dimension) => (
                      <button
                        key={dimension.id}
                        type="button"
                        aria-pressed={quranDimension === dimension.id}
                        onClick={() => setQuranDimension(dimension.id)}
                        className={`min-h-9 rounded-lg border px-3 text-xs font-medium ${
                          quranDimension === dimension.id
                            ? "border-[var(--foreground)] bg-[var(--surface)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {dimension.label}
                      </button>
                    ))}
                  </div>
                </div>

                {quranItems.length === 0 ? (
                  <p className="mt-5 text-sm text-[var(--muted)]">
                    لا توجد سجلات قرآنية في هذا القسم خلال الفترة المحددة.
                  </p>
                ) : (
                  <div className="mt-5 max-h-96 space-y-3 overflow-y-auto pe-1">
                    {quranItems.map((item) => (
                      <div
                        key={item.key}
                        className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3"
                      >
                        <span className="text-sm font-semibold tabular-nums">
                          {formatNumber(item.key)}
                        </span>

                        <div className="min-w-0">
                          <div className="h-3 overflow-hidden rounded-full bg-[var(--surface)]">
                            <div
                              className="h-full rounded-full bg-teal-600"
                              style={{
                                width: `${(item.traceCount / quranMax) * 100}%`,
                              }}
                            />
                          </div>

                          <p className="mt-1 text-[10px] text-[var(--muted)]">
                            {formatNumber(item.uniqueAyahCount)} آية مميزة ·{" "}
                            {formatNumber(item.validatedUniqueAyahCount)} مكتملة أو جزئية
                          </p>
                        </div>

                        <span className="text-xs font-semibold tabular-nums">
                          {formatNumber(item.traceCount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                <p>
                  تُحسب الجلسات من سجلات النشاط، وتُحسب الآيات من سجلات التتبع.
                  الآية المميزة تُحتسب مرة واحدة في التغطية، حتى لو ظهرت في عدة جلسات.
                </p>

                <p className="mt-2">
                  المدة المعروضة هي المدة المسجلة للجلسات، وليست قياساً مستقلاً لوقت التركيز الفعلي.
                </p>

                {activeLearner ? (
                  <p className="mt-2">
                    المستخدم الحالي:{" "}
                    {activeLearner.name?.trim() ||
                      (activeLearner.childProfileId
                        ? "حساب طفل"
                        : "الحساب الرئيسي")}
                  </p>
                ) : null}
              </section>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
