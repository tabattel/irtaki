"use client";

import { useEffect, useState } from "react";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
};

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";
const ACTIVE_LEARNER_EVENT = "irtaki:active-learner-changed";
const OWNER_NAME_CHANGED_EVENT = "irtaki:owner-name-changed";

export function AccountActiveLearnerSwitcher() {
  const [learners, setLearners] = useState<LearnerOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLearners() {
      try {
        const historyResponse = await fetch("/api/history", {
          cache: "no-store",
        });

        if (historyResponse.status === 401) {
          if (mounted) setUnauthenticated(true);
          return;
        }

        if (!historyResponse.ok) {
          throw new Error("USERS_UNAVAILABLE");
        }

        const [historyPayload, sessionResponse] = await Promise.all([
          historyResponse.json() as Promise<{
            learners?: LearnerOption[];
          }>,
          fetch("/api/auth/session", { cache: "no-store" }),
        ]);

        const sessionPayload = sessionResponse.ok
          ? ((await sessionResponse.json()) as {
              user?: SessionUser | null;
            })
          : {};

        const available = Array.isArray(historyPayload.learners)
          ? historyPayload.learners
          : [];

        const rawMain = available.find(
          (learner) => learner.childProfileId === null,
        );

        const ownerName =
          sessionPayload.user?.name?.trim() ||
          rawMain?.name?.trim() ||
          "اسم صاحب الحساب غير محدد";

        const displayLearners = available.map((learner) =>
          learner.childProfileId === null
            ? { ...learner, name: ownerName }
            : learner,
        );

        let rememberedId: string | null = null;
        try {
          rememberedId = window.localStorage.getItem(ACTIVE_LEARNER_KEY);
        } catch {
          // La sélection reste disponible en mémoire.
        }

        const mainLearner = displayLearners.find(
          (learner) => learner.childProfileId === null,
        );

        if (mainLearner) {
          try {
            window.localStorage.setItem("irtaki.mainLearnerId", mainLearner.id);
          } catch {
            // Le sélecteur reste utilisable sans stockage local.
          }
        }

        const current =
          displayLearners.find((learner) => learner.id === rememberedId) ??
          mainLearner ??
          displayLearners[0] ??
          null;

        if (!mounted) return;

        setLearners(displayLearners);
        setSelectedId(current?.id ?? null);
        setLoadError(false);
        setUnauthenticated(false);

        if (current) {
          try {
            window.localStorage.setItem(ACTIVE_LEARNER_KEY, current.id);
          } catch {
            // La sélection reste en mémoire.
          }

          window.dispatchEvent(
            new CustomEvent(ACTIVE_LEARNER_EVENT, {
              detail: current.id,
            }),
          );
        }
      } catch {
        if (mounted) setLoadError(true);
      }
    }

    const handleOwnerNameChanged = () => {
      void loadLearners();
    };

    window.addEventListener(OWNER_NAME_CHANGED_EVENT, handleOwnerNameChanged);
    void loadLearners();

    return () => {
      mounted = false;
      window.removeEventListener(
        OWNER_NAME_CHANGED_EVENT,
        handleOwnerNameChanged,
      );
    };
  }, []);

  function chooseLearner(id: string) {
    setSelectedId(id);

    try {
      window.localStorage.setItem(ACTIVE_LEARNER_KEY, id);
    } catch {
      // La sélection reste utilisable pendant la session.
    }

    window.dispatchEvent(new CustomEvent(ACTIVE_LEARNER_EVENT, { detail: id }));
  }

  function getName(learner: LearnerOption) {
    return (
      learner.name?.trim() ||
      (learner.childProfileId ? "حساب طفل" : "اسم صاحب الحساب غير محدد")
    );
  }

  return (
    <section
      className="min-w-0 space-y-2 border-t border-[var(--border)] pt-2"
      dir="rtl"
      aria-live="polite"
    >
      <h4 id="current-learner-heading" className="font-semibold">
        المستخدم الحالي
      </h4>

      {learners === null && !loadError && !unauthenticated && (
        <p className="text-[var(--muted)]">جارٍ تحميل المستخدمين...</p>
      )}

      {unauthenticated && (
        <p className="text-amber-700 dark:text-amber-300">
          ⚠️ يرجى تسجيل الدخول
        </p>
      )}

      {loadError && (
        <p className="text-[var(--muted)]">تعذّر تحميل بيانات المستخدمين</p>
      )}

      {learners !== null && learners.length === 0 && (
        <p className="text-[var(--muted)]">لا يوجد مستخدم مسجّل</p>
      )}

      {learners !== null && learners.length > 0 && (
        <select
          id="current-learner-select"
          aria-labelledby="current-learner-heading"
          value={selectedId ?? ""}
          onChange={(event) => chooseLearner(event.target.value)}
          className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--foreground)] sm:px-3 sm:py-2 sm:text-base"
        >
          {learners.map((learner) => (
            <option key={learner.id} value={learner.id}>
              {getName(learner)}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
