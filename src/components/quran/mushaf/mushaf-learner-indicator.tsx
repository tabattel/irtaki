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

        const current =
          available.find((learner) => learner.id === rememberedId) ??
          available.find((learner) => learner.childProfileId === null) ??
          available[0] ??
          null;

        if (mounted) {
          setLearners(available);
          setSelectedId(current?.id ?? null);
        }
      } catch {
        if (mounted) {
          setLoadError(true);
          setLearners([]);
          setSelectedId(null);
        }
      }
    }

    void loadLearners();

    return () => {
      mounted = false;
    };
  }, []);

  function selectLearner(id: string) {
    setSelectedId(id);

    try {
      window.localStorage.setItem(ACTIVE_LEARNER_KEY, id);
    } catch {
      // La sélection reste active dans l'interface jusqu'au rechargement.
    }
  }

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
        <span className="text-[var(--muted)]">
          يرجى تسجيل الدخول لعرض المستخدم الحالي
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
          <label
            htmlFor="irtaki-current-learner"
            className="text-[var(--muted)]"
          >
            المستخدم الحالي:
          </label>
          <span className="font-semibold text-green-600" aria-hidden="true">
            ✓
          </span>
          {learners.length === 1 ? (
            <span className="font-semibold">{displayName}</span>
          ) : (
            <select
              id="irtaki-current-learner"
              className="max-w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 font-semibold"
              value={selectedId ?? ""}
              onChange={(event) => selectLearner(event.target.value)}
            >
              {learners.map((learner) => (
                <option key={learner.id} value={learner.id}>
                  {learner.name?.trim() ||
                    (learner.childProfileId ? "متعلم" : "الحساب الرئيسي")}
                </option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
}
