"use client";

import { useEffect, useState } from "react";

type LearnerOption = {
  id: string;
  name: string | null;
  childProfileId: string | null;
};

const ACTIVE_LEARNER_KEY = "irtaki.activeLearnerId";

export function MushafLearnerIndicator() {
  const [learners, setLearners] = useState<LearnerOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [unauthenticated, setUnauthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadLearners() {
      try {
        const response = await fetch("/api/history", {
          cache: "no-store",
        });

        if (response.status === 401) {
          if (mounted) {
            setUnauthenticated(true);
            setLearners([]);
            setSelectedId(null);
          }
          return;
        }

        if (!response.ok) {
          throw new Error("USERS_UNAVAILABLE");
        }

        const payload = (await response.json()) as {
          learners?: LearnerOption[];
        };

        const available = Array.isArray(payload.learners)
          ? payload.learners
          : [];

        let rememberedId: string | null = null;

        try {
          rememberedId = window.localStorage.getItem(ACTIVE_LEARNER_KEY);
        } catch {
          // L'affichage reste utilisable si le stockage local est indisponible.
        }

        const mainLearner = available.find(
          (learner) => learner.childProfileId === null,
        );

        if (mainLearner) {
          try {
            window.localStorage.setItem("irtaki.mainLearnerId", mainLearner.id);
          } catch {
            // Le choix reste utilisable pendant la session.
          }
        }

        const current =
          available.find((learner) => learner.id === rememberedId) ??
          mainLearner ??
          available[0] ??
          null;

        if (current) {
          try {
            window.localStorage.setItem(ACTIVE_LEARNER_KEY, current.id);
          } catch {
            // Le choix reste utilisable pendant la session.
          }
        }

        if (mounted) {
          setLearners(available);
          setSelectedId(current?.id ?? null);

          if (current) {
            window.dispatchEvent(
              new CustomEvent("irtaki:active-learner-changed", {
                detail: current.id,
              }),
            );
          }
        }
      } catch {
        if (mounted) {
          setLoadError(true);
          setLearners([]);
          setSelectedId(null);
        }
      }
    }

    function syncActiveLearner(event: Event) {
      let nextId =
        event instanceof CustomEvent && typeof event.detail === "string"
          ? event.detail
          : null;

      if (!nextId) {
        try {
          nextId = window.localStorage.getItem(ACTIVE_LEARNER_KEY);
        } catch {
          // Conserver la sélection actuelle si le stockage est indisponible.
        }
      }

      if (nextId) setSelectedId(nextId);
    }

    window.addEventListener("irtaki:active-learner-changed", syncActiveLearner);
    window.addEventListener("storage", syncActiveLearner);

    void loadLearners();

    return () => {
      mounted = false;
      window.removeEventListener(
        "irtaki:active-learner-changed",
        syncActiveLearner,
      );
      window.removeEventListener("storage", syncActiveLearner);
    };
  }, []);

  const selectedLearner = learners?.find(
    (learner) => learner.id === selectedId,
  );

  const displayName =
    selectedLearner?.name?.trim() ||
    (selectedLearner?.childProfileId ? "متعلم" : "الحساب الرئيسي");

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm"
      dir="rtl"
      aria-live="polite"
    >
      {learners === null ? (
        <span className="text-[var(--muted)]">جارٍ تحميل المستخدم...</span>
      ) : unauthenticated ? (
        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
          <span
            aria-hidden="true"
            className="text-amber-600 dark:text-amber-400"
          >
            ⚠️
          </span>
          <span>يرجى تسجيل الدخول</span>
        </span>
      ) : loadError ? (
        <span className="text-[var(--muted)]">
          تعذّر تحميل بيانات المستخدمين
        </span>
      ) : learners.length === 0 ? (
        <span className="font-semibold text-amber-700 dark:text-amber-300">
          <span aria-hidden="true">⚠️ </span>
          لا يوجد مستخدم مسجّل
        </span>
      ) : (
        <>
          <span className="font-semibold text-green-600" aria-hidden="true">
            ✓
          </span>
          <span className="font-semibold">{displayName}</span>
        </>
      )}
    </div>
  );
}
