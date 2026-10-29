"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AccountActiveLearnerSwitcher } from "@/components/layout/account-active-learner-switcher";

type Learner = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

type GoalProgress = {
  progressPercent?: number;
};

type LearningGoal = {
  id: string;
  title: string;
  description?: string | null;
  action: string;
  quantity: number | string;
  unit: string;
  frequencyCount: number;
  frequencyPeriod: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  progress?: GoalProgress;
};

type GoalForm = {
  title: string;
  description: string;
  action: string;
  quantity: string;
  unit: string;
  frequencyCount: string;
  frequencyPeriod: string;
  startDate: string;
};

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";
const ACTIVE_LEARNER_EVENT = "irtaki:active-learner-changed";

const ACTIONS = [
  { value: "read", label: "القراءة" },
  { value: "listen", label: "الاستماع" },
  { value: "recite", label: "التلاوة" },
  { value: "memorize", label: "الحفظ" },
  { value: "revise", label: "المراجعة" },
  { value: "tajwid", label: "التجويد" },
  { value: "tadabbur", label: "التدبر" },
  { value: "talkin", label: "التلقين" },
  { value: "tathbit", label: "التثبيت" },
  { value: "qiraa", label: "القراءات" },
  { value: "khatma", label: "الختمة" },
  { value: "tahajjud", label: "التهجد" },
] as const;

const UNITS = [
  { value: "quran", label: "القرآن كاملاً" },
  { value: "surah", label: "سورة" },
  { value: "ayah", label: "آية" },
  { value: "page", label: "صفحة" },
  { value: "juz", label: "جزء" },
  { value: "hizb", label: "حزب" },
  { value: "nisf", label: "نصف حزب" },
  { value: "roboa", label: "ربع حزب" },
] as const;

const PERIODS = [
  { value: "day", label: "يوم" },
  { value: "week", label: "أسبوع" },
  { value: "month", label: "شهر" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  paused: "متوقف مؤقتاً",
  completed: "مكتمل",
  cancelled: "ملغى",
  archived: "مؤرشف",
};

function localDateValue(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readActiveLearnerId(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_LEARNER_KEY);
  } catch {
    return null;
  }
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("ar");
}

function formatNumber(value: unknown): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("ar")
    : "—";
}

function labelFor(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function fieldClass(): string {
  return [
    "block w-full min-w-0 rounded-xl border border-[var(--border)]",
    "bg-[var(--background)] px-3 py-3 text-base",
    "text-[var(--foreground)] outline-none",
    "focus-visible:ring-2 focus-visible:ring-[var(--foreground)]",
  ].join(" ");
}

function buttonClass(): string {
  return [
    "inline-flex min-h-11 items-center justify-center rounded-xl",
    "bg-[var(--foreground)] px-4 py-3 text-sm font-semibold",
    "text-[var(--background)] transition hover:opacity-85",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" ");
}

const EMPTY_FORM: GoalForm = {
  title: "",
  description: "",
  action: "read",
  quantity: "2",
  unit: "page",
  frequencyCount: "1",
  frequencyPeriod: "day",
  startDate: "",
};

export default function ObjectivesPage() {
  const [authState, setAuthState] = useState<
    "loading" | "authenticated" | "guest" | "error"
  >("loading");
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<GoalForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setForm((current) =>
      current.startDate
        ? current
        : { ...current, startDate: localDateValue() },
    );
  }, []);

  useEffect(() => {
    let alive = true;

    function handleActiveLearner(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        setLearnerId(detail);
      } else {
        setLearnerId(readActiveLearnerId());
      }
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === ACTIVE_LEARNER_KEY || event.key === null) {
        setLearnerId(readActiveLearnerId());
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

        const historyPayload = (await historyResponse.json()) as {
          learners?: Learner[];
        };

        const available = Array.isArray(historyPayload.learners)
          ? historyPayload.learners.filter(
              (item) =>
                item &&
                typeof item.id === "string" &&
                item.id.length > 0,
            )
          : [];

        if (!alive) return;

        setLearners(available);
        setAuthState("authenticated");

        const rememberedId = readActiveLearnerId();
        const current =
          available.find((item) => item.id === rememberedId) ??
          available.find((item) => item.childProfileId === null) ??
          available[0] ??
          null;

        setLearnerId(current?.id ?? null);
      } catch (error) {
        if (!alive) return;
        setAuthState("error");
        setPageError(
          error instanceof Error
            ? error.message
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

  useEffect(() => {
    if (authState !== "authenticated" || !learnerId) {
      setGoals([]);
      setGoalsLoading(false);
      setGoalsError(null);
      return;
    }

    const controller = new AbortController();
    const selectedLearnerId = learnerId;

    async function loadGoals() {
      setGoalsLoading(true);
      setGoalsError(null);

      try {
        const response = await fetch(
          `/api/learning/goals?learnerId=${encodeURIComponent(selectedLearnerId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (response.status === 401) {
          setAuthState("guest");
          setGoals([]);
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          goals?: LearningGoal[];
        } | null;

        if (!response.ok) {
          throw new Error(
            payload?.error === "LEARNER_NOT_FOUND"
              ? "هذا المستخدم غير موجود ضمن الحساب الحالي. اختر مستخدماً آخر."
              : "تعذر تحميل الأهداف. يرجى المحاولة مجدداً.",
          );
        }

        setGoals(Array.isArray(payload?.goals) ? payload.goals : []);
      } catch (error) {
        if (controller.signal.aborted) return;
        setGoalsError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل الأهداف.",
        );
      } finally {
        if (!controller.signal.aborted) setGoalsLoading(false);
      }
    }

    void loadGoals();

    return () => controller.abort();
  }, [authState, learnerId, refreshKey]);

  async function createGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!learnerId) {
      setFormError("اختر المستخدم الحالي أولاً.");
      return;
    }

    const quantity = Number(form.quantity);
    const frequencyCount = Number(form.frequencyCount);

    if (
      !form.title.trim() ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(frequencyCount) ||
      frequencyCount <= 0 ||
      !form.startDate
    ) {
      setFormError("يرجى التحقق من العنوان والكمية والتكرار وتاريخ البداية.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/learning/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          learnerId,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          action: form.action,
          quantity,
          unit: form.unit,
          frequencyCount,
          frequencyPeriod: form.frequencyPeriod,
          startDate: form.startDate,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        goal?: LearningGoal;
      } | null;

      if (response.status === 401) {
        setAuthState("guest");
        return;
      }

      if (!response.ok) {
        const messages: Record<string, string> = {
          INVALID_REQUEST: "البيانات المدخلة غير صالحة. يرجى مراجعتها.",
          LEARNER_NOT_FOUND: "المستخدم الحالي غير مرتبط بهذا الحساب.",
          PARENT_GOAL_NOT_FOUND: "الهدف الرئيسي المحدد غير موجود.",
        };
        throw new Error(
          messages[payload?.error ?? ""] ??
            "لم يتم حفظ الهدف. يرجى التحقق من البيانات والمحاولة مجدداً.",
        );
      }

      setForm({ ...EMPTY_FORM, startDate: localDateValue() });
      setFormOpen(false);
      setSuccessMessage("تم إنشاء الهدف بنجاح.");
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "تعذر حفظ الهدف.",
      );
    } finally {
      setSaving(false);
    }
  }

  const activeLearner = learners.find((item) => item.id === learnerId);

  return (
    <main
      dir="rtl"
      className="mx-auto min-h-[60vh] w-full max-w-4xl min-w-0 px-3 py-5 sm:px-5 sm:py-8"
    >
      <header className="mb-6 flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 text-sm text-[var(--muted)]">إيرتاكي · المتابعة الشخصية</p>
          <h1 className="text-2xl font-bold sm:text-3xl">الأهداف</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            خطّط للقراءة والحفظ والمراجعة، وتابع تقدمك الفعلي.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
            onClick={() => {
              const requestedReturnTo = new URLSearchParams(
                window.location.search,
              ).get("returnTo");
              const returnTo = requestedReturnTo?.startsWith("/coran/")
                ? requestedReturnTo
                : "/coran/10/page/605";

              window.location.assign(returnTo);
            }}
          >
            ↩ العودة إلى المصحف
          </button>

          {authState === "authenticated" && learnerId ? (
            <button
              type="button"
              className={buttonClass()}
              onClick={() => {
                setFormOpen((current) => !current);
                setFormError(null);
              }}
            >
              {formOpen ? "إلغاء" : "+ هدف جديد"}
            </button>
          ) : null}
        </div>
      </header>

      {authState === "loading" ? (
        <section
          className="rounded-2xl border border-[var(--border)] p-5"
          aria-live="polite"
        >
          جارٍ التحقق من الحساب...
        </section>
      ) : null}

      {authState === "error" ? (
        <section className="space-y-3 rounded-2xl border border-[var(--border)] p-5">
          <p role="alert">{pageError ?? "تعذر تحميل بيانات الحساب."}</p>
          <button
            type="button"
            className={buttonClass()}
            onClick={() => window.location.reload()}
          >
            إعادة المحاولة
          </button>
        </section>
      ) : null}

      {authState === "guest" ? (
        <section className="space-y-3 rounded-2xl border border-[var(--border)] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">تابع أهدافك الشخصية</h2>
          <p className="text-sm leading-7 text-[var(--muted)]">
            تحتاج الأهداف والتقدم الشخصي إلى تسجيل الدخول حتى تُحفظ البيانات
            ضمن حسابك. تبقى القراءة والاستماع والميزات العامة للقرآن متاحة دون
            تسجيل الدخول.
          </p>
          <p className="text-sm leading-7">
            لتسجيل الدخول أو إنشاء حساب، افتح القائمة الرئيسية ثم قسم الحساب.
          </p>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold"
          >
            العودة إلى الرئيسية
          </Link>
        </section>
      ) : null}

      {authState === "authenticated" ? (
        <div className="space-y-5">
          <section className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
            <h2 className="mb-3 text-base font-semibold">المستخدم الحالي</h2>
            <AccountActiveLearnerSwitcher />
            {activeLearner ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                الأهداف المعروضة تخص:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {activeLearner.name?.trim() ||
                    (activeLearner.childProfileId
                      ? "حساب طفل"
                      : "صاحب الحساب الرئيسي")}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                لا يوجد مستخدم مرتبط بهذا الحساب بعد. أنشئ أو اربط ملف مستخدم
                من قسم الحساب، ثم عد إلى هذه الصفحة.
              </p>
            )}
          </section>

          {formOpen && learnerId ? (
            <section className="min-w-0 rounded-2xl border border-[var(--border)] p-4 sm:p-5">
              <h2 className="mb-4 text-lg font-semibold">إنشاء هدف</h2>

              <form onSubmit={createGoal} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="goal-title" className="block text-sm font-medium">
                    عنوان الهدف
                  </label>
                  <input
                    id="goal-title"
                    className={fieldClass()}
                    maxLength={200}
                    required
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="مثال: قراءة صفحتين يومياً"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="goal-description" className="block text-sm font-medium">
                    الوصف (اختياري)
                  </label>
                  <textarea
                    id="goal-description"
                    className={fieldClass()}
                    rows={2}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="أضف تفاصيل تساعدك على الالتزام بالهدف."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-action" className="block text-sm font-medium">
                      النشاط
                    </label>
                    <select
                      id="goal-action"
                      className={fieldClass()}
                      value={form.action}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, action: event.target.value }))
                      }
                    >
                      {ACTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-unit" className="block text-sm font-medium">
                      وحدة القياس
                    </label>
                    <select
                      id="goal-unit"
                      className={fieldClass()}
                      value={form.unit}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, unit: event.target.value }))
                      }
                    >
                      {UNITS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-quantity" className="block text-sm font-medium">
                      الكمية المطلوبة
                    </label>
                    <input
                      id="goal-quantity"
                      type="number"
                      className={fieldClass()}
                      min="0.01"
                      step="any"
                      required
                      value={form.quantity}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, quantity: event.target.value }))
                      }
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-frequency-count" className="block text-sm font-medium">
                      عدد مرات التكرار
                    </label>
                    <input
                      id="goal-frequency-count"
                      type="number"
                      className={fieldClass()}
                      min="1"
                      step="1"
                      required
                      value={form.frequencyCount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          frequencyCount: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-period" className="block text-sm font-medium">
                      فترة التكرار
                    </label>
                    <select
                      id="goal-period"
                      className={fieldClass()}
                      value={form.frequencyPeriod}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          frequencyPeriod: event.target.value,
                        }))
                      }
                    >
                      {PERIODS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="goal-start-date" className="block text-sm font-medium">
                      تاريخ البداية
                    </label>
                    <input
                      id="goal-start-date"
                      type="date"
                      className={fieldClass()}
                      required
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {formError ? (
                  <p className="text-sm leading-6 text-red-600 dark:text-red-400" role="alert">
                    {formError}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    className={buttonClass()}
                    disabled={saving}
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ الهدف"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
                    disabled={saving}
                    onClick={() => {
                      setFormOpen(false);
                      setFormError(null);
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {successMessage ? (
            <p
              role="status"
              className="rounded-xl border border-[var(--border)] p-3 text-sm"
            >
              {successMessage}
            </p>
          ) : null}

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">أهداف المستخدم الحالي</h2>
              <button
                type="button"
                className="min-h-10 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                disabled={!learnerId || goalsLoading}
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                تحديث
              </button>
            </div>

            {!learnerId ? (
              <div className="rounded-2xl border border-[var(--border)] p-4 text-sm leading-7 text-[var(--muted)]">
                اختر المستخدم الحالي من القسم أعلاه لعرض أهدافه.
              </div>
            ) : null}

            {goalsLoading ? (
              <div className="rounded-2xl border border-[var(--border)] p-4 text-sm" aria-live="polite">
                جارٍ تحميل الأهداف والتقدم الفعلي...
              </div>
            ) : null}

            {goalsError ? (
              <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4">
                <p role="alert" className="text-sm leading-6">
                  {goalsError}
                </p>
                <button
                  type="button"
                  className="min-h-10 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : null}

            {!goalsLoading && !goalsError && learnerId && goals.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] p-5 sm:p-6">
                <h3 className="font-semibold">لا توجد أهداف بعد</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  أنشئ هدفك الأول لتبدأ تنظيم القراءة أو الاستماع أو الحفظ
                  والمراجعة. ستظهر النسبة بعد تسجيل أنشطة فعلية مرتبطة بالهدف.
                </p>
                {!formOpen ? (
                  <button
                    type="button"
                    className={`${buttonClass()} mt-4`}
                    onClick={() => setFormOpen(true)}
                  >
                    إنشاء أول هدف
                  </button>
                ) : null}
              </div>
            ) : null}

            {!goalsLoading && !goalsError
              ? goals.map((goal) => {
                  const rawPercent = Number(goal.progress?.progressPercent ?? 0);
                  const percent = Number.isFinite(rawPercent)
                    ? Math.max(0, Math.min(100, Math.round(rawPercent)))
                    : 0;
                  const quantity = formatNumber(goal.quantity);
                  const status =
                    STATUS_LABELS[goal.status] ?? goal.status;

                  return (
                    <article
                      key={goal.id}
                      className="min-w-0 space-y-3 rounded-2xl border border-[var(--border)] p-4 sm:p-5"
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="break-words text-base font-semibold">
                            {goal.title}
                          </h3>
                          {goal.description ? (
                            <p className="mt-1 break-words text-sm leading-6 text-[var(--muted)]">
                              {goal.description}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1 text-xs">
                          {status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <p>
                          <span className="text-[var(--muted)]">النشاط: </span>
                          {labelFor(ACTIONS, goal.action)}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">الهدف: </span>
                          {quantity} {labelFor(UNITS, goal.unit)}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">التكرار: </span>
                          {formatNumber(goal.frequencyCount)}{" "}
                          {labelFor(PERIODS, goal.frequencyPeriod)}
                        </p>
                        <p>
                          <span className="text-[var(--muted)]">البداية: </span>
                          {formatDate(goal.startDate)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span>التقدم المسجل</span>
                          <span className="font-semibold" dir="ltr">
                            {percent}%
                          </span>
                        </div>
                        <div
                          className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface)]"
                          role="progressbar"
                          aria-label={`نسبة التقدم: ${goal.title}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percent}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--foreground)] transition-[width]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <p className="text-xs leading-5 text-[var(--muted)]">
                          تُحسب النسبة من سجلات التقدم الفعلية؛ اختيار آيات
                          في المصحف وحده لا يُعد إنجازاً للهدف.
                        </p>
                      </div>
                    </article>
                  );
                })
              : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
