"use client";

import { useEffect, useRef, useState } from "react";

type LifecycleDetail = {
  action: "start" | "pause" | "resume" | "stop";
  sessionId: string;
  learnerId: string;
};

type MatchDetail = {
  sessionId: string;
  ayahId: number;
};

type CurrentActivity = {
  activityId: string;
  ayahId: number;
};

type Session = {
  sessionId: string;
  learnerId: string;
  current: CurrentActivity | null;
  queue: Promise<void>;
  closing: boolean;
};

const PENDING_PREFIX = "irtaki.ratil.pending.v1.";

function pendingKey(sessionId: string) {
  return `${PENDING_PREFIX}${sessionId}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "UNKNOWN_ERROR";
}

export function RatilLearningTracker() {
  const sessionsRef = useRef(new Map<string, Session>());
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    function reportError(error: unknown) {
      if (mounted) {
        setMessage(`تعذر حفظ متابعة رتّل: ${errorText(error)}`);
      }
    }

    function enqueue(session: Session, task: () => Promise<void>) {
      session.queue = session.queue
        .then(task)
        .catch(reportError);
    }

    async function startActivity(
      session: Session,
      ayahId: number,
    ): Promise<string> {
      const response = await fetch("/api/learning/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "start",
          learnerId: session.learnerId,
          action: "recite",
          ayahIds: [ayahId],
        }),
        cache: "no-store",
      });

      const result = (await response.json().catch(() => null)) as
        | { activityId?: unknown }
        | null;

      if (
        !response.ok ||
        !result ||
        typeof result.activityId !== "string" ||
        !result.activityId
      ) {
        throw new Error(`ACTIVITY_START_FAILED_${response.status}`);
      }

      return result.activityId;
    }

    async function finishActivity(
      session: Session,
      status: "completed" | "partial" | "failed",
    ) {
      const current = session.current;
      if (!current) return;

      const response = await fetch("/api/learning/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "finish",
          learnerId: session.learnerId,
          activityId: current.activityId,
          status,
          ayahIds: [current.ayahId],
        }),
        cache: "no-store",
      });

      if (!response.ok && response.status !== 409) {
        throw new Error(`ACTIVITY_FINISH_FAILED_${response.status}`);
      }

      session.current = null;

      try {
        window.sessionStorage.removeItem(pendingKey(session.sessionId));
      } catch {
        // Le suivi serveur reste prioritaire.
      }
    }

    function persistActivity(session: Session) {
      if (!session.current) return;

      try {
        window.sessionStorage.setItem(
          pendingKey(session.sessionId),
          JSON.stringify({
            learnerId: session.learnerId,
            activityId: session.current.activityId,
            ayahId: session.current.ayahId,
          }),
        );
      } catch {
        // Session serveur conservée même sans sessionStorage.
      }
    }

    function closeSession(
      sessionId: string,
      status: "partial" | "failed",
    ) {
      const session = sessionsRef.current.get(sessionId);

      if (!session || session.closing) return;

      session.closing = true;

      enqueue(session, async () => {
        try {
          await finishActivity(session, status);
        } finally {
          sessionsRef.current.delete(sessionId);
        }
      });
    }

    function handleLifecycle(event: Event) {
      const detail = (
        event as CustomEvent<LifecycleDetail>
      ).detail;

      if (
        !detail ||
        typeof detail.sessionId !== "string" ||
        typeof detail.learnerId !== "string"
      ) {
        return;
      }

      if (detail.action === "start") {
        sessionsRef.current.set(detail.sessionId, {
          sessionId: detail.sessionId,
          learnerId: detail.learnerId,
          current: null,
          queue: Promise.resolve(),
          closing: false,
        });

        return;
      }

      if (detail.action === "stop") {
        closeSession(detail.sessionId, "partial");
      }
    }

    function handleMatch(event: Event) {
      const detail = (
        event as CustomEvent<MatchDetail>
      ).detail;

      if (
        !detail ||
        typeof detail.sessionId !== "string" ||
        !Number.isSafeInteger(detail.ayahId) ||
        detail.ayahId <= 0
      ) {
        return;
      }

      const session = sessionsRef.current.get(detail.sessionId);

      if (!session || session.closing) return;

      enqueue(session, async () => {
        if (session.closing) return;

        if (session.current?.ayahId === detail.ayahId) {
          return;
        }

        if (session.current) {
          await finishActivity(session, "completed");
        }

        if (session.closing) return;

        const activityId = await startActivity(session, detail.ayahId);

        session.current = {
          activityId,
          ayahId: detail.ayahId,
        };

        persistActivity(session);

        // Si l'arrêt est arrivé pendant la création de l'activité,
        // on la clôture immédiatement comme partielle.
        if (session.closing) {
          await finishActivity(session, "partial");
        }

        if (mounted) setMessage("");
      });
    }

    function handleRecognitionStatus(event: Event) {
      const detail = (
        event as CustomEvent<{
          sessionId?: string;
          status?: string;
        }>
      ).detail;

      if (detail?.sessionId && detail.status === "error") {
        closeSession(detail.sessionId, "failed");
      }
    }

    async function recoverInterruptedActivities() {
      const keys: string[] = [];

      try {
        for (
          let i = 0;
          i < window.sessionStorage.length;
          i += 1
        ) {
          const key = window.sessionStorage.key(i);
          if (key?.startsWith(PENDING_PREFIX)) keys.push(key);
        }
      } catch {
        return;
      }

      for (const key of keys) {
        try {
          const raw = window.sessionStorage.getItem(key);
          if (!raw) continue;

          const pending = JSON.parse(raw) as {
            learnerId?: unknown;
            activityId?: unknown;
            ayahId?: unknown;
          };

          if (
            typeof pending.learnerId !== "string" ||
            typeof pending.activityId !== "string" ||
            typeof pending.ayahId !== "number" ||
            !Number.isInteger(pending.ayahId)
          ) {
            continue;
          }

          const response = await fetch("/api/learning/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: "finish",
              learnerId: pending.learnerId,
              activityId: pending.activityId,
              status: "failed",
              ayahIds: [pending.ayahId],
            }),
            cache: "no-store",
          });

          if (response.ok || response.status === 409) {
            window.sessionStorage.removeItem(key);
          }
        } catch {
          // Conserver l'entrée pour la prochaine tentative.
        }
      }
    }

    window.addEventListener(
      "irtaki:ratil-recognition",
      handleLifecycle,
    );

    window.addEventListener(
      "irtaki:ratil-ayah-match",
      handleMatch,
    );

    window.addEventListener(
      "irtaki:ratil-recognition-status",
      handleRecognitionStatus,
    );

    void recoverInterruptedActivities();

    return () => {
      mounted = false;

      window.removeEventListener(
        "irtaki:ratil-recognition",
        handleLifecycle,
      );

      window.removeEventListener(
        "irtaki:ratil-ayah-match",
        handleMatch,
      );

      window.removeEventListener(
        "irtaki:ratil-recognition-status",
        handleRecognitionStatus,
      );

      for (const session of sessionsRef.current.values()) {
        closeSession(session.sessionId, "partial");
      }
    };
  }, []);

  if (!message) return null;

  return (
    <p
      className="w-full rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-amber-700"
      role="status"
      aria-live="polite"
    >
      {message}
    </p>
  );
}
