"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/objectifs", label: "الأهداف", icon: "🎯" },
  { href: "/statistiques", label: "الإحصائيات", icon: "📊" },
  { href: "/historique", label: "السجل", icon: "📅" },
] as const;

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";
const ACTIVE_LEARNER_EVENT = "irtaki:active-learner-changed";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId?: string | null;
};

function readActiveLearner(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_LEARNER_KEY);
  } catch {
    return null;
  }
}

function displayName(learner: LearnerOption): string {
  return (
    learner.name?.trim() ||
    (learner.childProfileId ? "حساب طفل" : "الحساب الرئيسي")
  );
}

// Tailles unifiées (44px = cible tactile WCAG)
const PILL_CLASS_BASE =
  "inline-flex min-h-11 w-32 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm leading-none";
const PILL_ACTIVE =
  PILL_CLASS_BASE + " bg-emerald-600 font-bold text-white shadow-sm";
const PILL_INACTIVE =
  PILL_CLASS_BASE +
  " border border-[var(--border)] bg-[var(--background)] font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)]";

export function BackCloseNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [learners, setLearners] = useState<LearnerOption[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/history", { cache: "no-store" });
        if (!active) return;
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const payload = (await response.json()) as {
          learners?: LearnerOption[];
        };
        const list = Array.isArray(payload.learners) ? payload.learners : [];
        if (!active) return;
        setLearners(list);

        const stored = readActiveLearner();
        const valid =
          (stored && list.some((l) => l.id === stored) ? stored : null) ||
          list.find((l) => !l.childProfileId)?.id ||
          list[0]?.id ||
          "";
        setCurrentId(valid);
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  function changeLearner(id: string) {
    setCurrentId(id);
    try {
      window.localStorage.setItem(ACTIVE_LEARNER_KEY, id);
    } catch {
      // ignore
    }
    window.dispatchEvent(
      new CustomEvent(ACTIVE_LEARNER_EVENT, { detail: id }),
    );

    if (NAV_ITEMS.some((item) => pathname === item.href)) {
      window.location.reload();
    }
  }

  return (
    <div
      className="sticky top-2 z-40 mb-4 flex flex-nowrap items-center justify-between gap-2 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--background)]/95 p-2.5 backdrop-blur"
      dir="rtl"
    >
      <nav
        className="flex flex-nowrap gap-2"
        aria-label="التنقل بين المساحات"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={active ? PILL_ACTIVE : PILL_INACTIVE}
            >
              <span aria-hidden="true" className="text-base">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-nowrap items-center gap-2">
        {!loading && learners.length > 0 ? (
          <select
            value={currentId}
            onChange={(event) => changeLearner(event.target.value)}
            aria-label="اختيار المستخدم"
            className="min-h-11 w-32 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-sm font-semibold leading-none text-[var(--foreground)]"
          >
            {learners.map((learner) => (
              <option key={learner.id} value={learner.id}>
                {displayName(learner)}
              </option>
            ))}
          </select>
        ) : null}

        <button
          type="button"
          onClick={() => router.back()}
          aria-label="إغلاق والعودة"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-xl font-bold leading-none text-[var(--foreground)] transition hover:bg-[var(--surface)]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
