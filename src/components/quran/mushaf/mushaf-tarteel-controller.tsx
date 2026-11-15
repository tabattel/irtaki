"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MushafTarteelTalkButton,
  type TarteelTalkState,
} from "./mushaf-tarteel-talk-button";

import { MushafTarteelRecognitionCapture } from "./mushaf-tarteel-recognition-capture";
import { MushafTarteelRecognitionClient } from "./mushaf-tarteel-recognition-client";

import { ErrorAlert } from "@/components/ui/error-alert";
type TarteelMode = "tarteel1" | "tarteel2";
type ControllerStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "recording"
  | "paused"
  | "stopping"
  | "stopped"
  | "error";

type LifecycleAction = "start" | "pause" | "resume" | "stop";

type LifecycleDetail = {
  sessionId: string;
  track: MediaStreamTrack;
  mode: TarteelMode;
  action: LifecycleAction;
};

type StatusDetail = {
  sessionId: string;
  mode: TarteelMode;
  status: "capturing" | "paused" | "stopped" | "error";
  message?: string;
};

type WebSocketStatusDetail = {
  sessionId: string;
  mode: TarteelMode;
  status: "connecting" | "ready" | "stopped" | "error";
  message?: string;
};

type RecognitionResult = {
  sessionId: string;
  mode: TarteelMode;
  sequence: number;
  text: string;
  final: boolean;
  audioSeconds: number | null;
  windowStartSeconds: number | null;
  inferenceSeconds: number | null;
};

type PcmDetail = {
  sessionId: string;
  mode: TarteelMode;
  sequence: number;
  sampleRate: number;
  samples: Float32Array;
};

type Props = {
  mode: TarteelMode | null;
  ayahsHidden: boolean;
  onToggleAyahsHidden: () => void;
};

function createSessionId(): string {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tarteel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function microphoneErrorMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String(error.name)
      : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "يرجى السماح باستخدام الميكروفون";
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "لم يتم العثور على ميكروفون";
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return "الميكروفون مستخدم من تطبيق آخر أو غير متاح";
  }

  return error instanceof Error
    ? error.message
    : "تعذر تشغيل الميكروفون";
}


function translateErrorMessage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // Codes TARTEEL_TICKET_HTTP_401 / 403 / 500
  if (/TARTEEL_TICKET_HTTP_401/i.test(s) || /HTTP[\s_]?401/i.test(s)) {
    return "تسجيل الدخول ضروري";
  }
  if (/TARTEEL_TICKET_HTTP_403/i.test(s) || /HTTP[\s_]?403/i.test(s)) {
    return "ليس لديك صلاحية للوصول";
  }
  if (/TARTEEL_TICKET_HTTP_404/i.test(s)) {
    return "الخدمة غير متاحة";
  }
  if (/TARTEEL_TICKET_HTTP_5\d\d/i.test(s)) {
    return "خطأ في الخادم، يرجى المحاولة لاحقاً";
  }
  if (/TARTEEL_TICKET_INVALID_RESPONSE/i.test(s)) {
    return "استجابة غير صالحة من الخادم";
  }
  return s;
}

function dispatchLifecycle(
  detail: LifecycleDetail,
) {
  window.dispatchEvent(
    new CustomEvent<LifecycleDetail>("irtaki:tarteel-recognition", {
      detail,
    }),
  );
}

function getLastFiveWords(text: string): string[] {
  return text.trim().split(/\s+/u).filter(Boolean).slice(-5);
}

function getAudioLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0;

  let sum = 0;

  for (let index = 0; index < samples.length; index += 1) {
    sum += samples[index] * samples[index];
  }

  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, rms * 5);
}

const INITIAL_LEVELS = Array.from({ length: 24 }, () => 0.04);

export function MushafTarteelController({
  mode,
  ayahsHidden,
  onToggleAyahsHidden,
}: Props) {
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionModeRef = useRef<TarteelMode | null>(null);
  const startInProgressRef = useRef(false);
  const startAttemptRef = useRef(0);
  const startModeRef = useRef<TarteelMode | null>(null);
  const mountedRef = useRef(false);
  const modeRef = useRef(mode);
  const lastResultSequenceRef = useRef(-1);

  const [status, setStatus] = useState<ControllerStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptHidden, setTranscriptHidden] = useState(false);
  const [levels, setLevels] = useState<number[]>(INITIAL_LEVELS);

  // Slot portail : barre Tarteel inline avec Tarteel X et ⋮
  const [inlineSlot, setInlineSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tryFind = () => {
      const el = document.getElementById("irtaki-tarteel-inline-slot");
      if (el) {
        if (!cancelled) setInlineSlot(el);
        return;
      }
      if (!cancelled) requestAnimationFrame(tryFind);
    };
    tryFind();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mapping vers le bouton talk
  const talkState: TarteelTalkState =
    status === "error"
      ? "error"
      : status === "requesting" ||
          status === "connecting" ||
          status === "stopping"
        ? "loading"
        : status === "recording"
          ? "listening"
          : "idle";

  const audioLevel =
    levels.length > 0
      ? levels.reduce((sum, v) => sum + v, 0) / levels.length
      : 0;

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
  }, []);

  const stopSession = useCallback(() => {
    const sessionId = sessionIdRef.current;
    const sessionMode = sessionModeRef.current;
    const track = trackRef.current;

    if (!sessionId || !sessionMode) {
      if (startInProgressRef.current) {
        startAttemptRef.current += 1;
        startInProgressRef.current = false;
        startModeRef.current = null;
      }

      releaseMicrophone();
      setStatus("idle");
      return;
    }

    if (status !== "stopping") {
      setStatus("stopping");

      if (track) {
        dispatchLifecycle({
          sessionId,
          track,
          mode: sessionMode,
          action: "stop",
        });
      }
    }

    releaseMicrophone();
  }, [releaseMicrophone, status]);

  const startSession = useCallback(async () => {
    const selectedMode = modeRef.current;

    if (
      !selectedMode ||
      startInProgressRef.current ||
      sessionIdRef.current ||
      status === "requesting" ||
      status === "connecting" ||
      status === "recording" ||
      status === "paused" ||
      status === "stopping"
    ) {
      return;
    }

    // Verrou synchrone : protège le démarrage avant le prochain rendu React.
    startInProgressRef.current = true;
    const attemptId = ++startAttemptRef.current;
    startModeRef.current = selectedMode;

    setMessage(null);
    setTranscript("");
    setLevels(INITIAL_LEVELS);
    setStatus("requesting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("الميكروفون غير مدعوم في هذا المتصفح");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Une demande annulée ou devenue obsolète ne doit jamais créer de session.
      if (
        !mountedRef.current ||
        modeRef.current !== selectedMode ||
        startAttemptRef.current !== attemptId
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const track = stream.getAudioTracks()[0];

      if (!track || track.readyState !== "live") {
        stream.getTracks().forEach((item) => item.stop());
        throw new Error("الميكروفون غير متاح");
      }

      const sessionId = createSessionId();

      streamRef.current = stream;
      trackRef.current = track;
      sessionIdRef.current = sessionId;
      sessionModeRef.current = selectedMode;

      setStatus("connecting");

      dispatchLifecycle({
        sessionId,
        track,
        mode: selectedMode,
        action: "start",
      });
    } catch (error) {
      // Une ancienne tentative ne doit pas modifier l'état d'une nouvelle.
      if (startAttemptRef.current !== attemptId) return;

      releaseMicrophone();

      if (!mountedRef.current) return;

      sessionIdRef.current = null;
      sessionModeRef.current = null;
      setStatus("error");
      setMessage(microphoneErrorMessage(error));
    } finally {
      // Seule la tentative encore propriétaire du verrou peut le libérer.
      if (startAttemptRef.current === attemptId) {
        startInProgressRef.current = false;
        startModeRef.current = null;
      }
    }
  }, [releaseMicrophone, status]);

  const toggleRecording = useCallback(() => {
    if (status === "idle" || status === "stopped" || status === "error") {
      void startSession();
      return;
    }

    const sessionId = sessionIdRef.current;
    const sessionMode = sessionModeRef.current;
    const track = trackRef.current;

    if (!sessionId || !sessionMode || !track) return;

    if (status === "recording") {
      setStatus("paused");
      dispatchLifecycle({
        sessionId,
        track,
        mode: sessionMode,
        action: "pause",
      });
      return;
    }

    if (status === "paused") {
      setStatus("connecting");
      dispatchLifecycle({
        sessionId,
        track,
        mode: sessionMode,
        action: "resume",
      });
    }
  }, [startSession, status]);

  useEffect(() => {
    mountedRef.current = true;

    function handleCaptureStatus(event: Event) {
      const detail = (event as CustomEvent<StatusDetail>).detail;

      if (!detail || detail.sessionId !== sessionIdRef.current) return;

      if (detail.status === "capturing") {
        lastResultSequenceRef.current = -1;
        setStatus("recording");
      } else if (detail.status === "paused") {
        setStatus("paused");
      } else if (detail.status === "stopped") {
        releaseMicrophone();
        sessionIdRef.current = null;
        sessionModeRef.current = null;
        setStatus("stopped");
      } else {
        releaseMicrophone();
        sessionIdRef.current = null;
        sessionModeRef.current = null;
        setStatus("error");
        setMessage(detail.message ?? "تعذر تشغيل التقاط الصوت");
      }
    }

    function handleWebSocketStatus(event: Event) {
      const detail = (
        event as CustomEvent<WebSocketStatusDetail>
      ).detail;

      if (!detail || detail.sessionId !== sessionIdRef.current) return;

      if (detail.status === "connecting") {
        setStatus((current) =>
          current === "paused" ? current : "connecting",
        );
      } else if (detail.status === "ready") {
        setStatus((current) =>
          current === "paused" ? current : "recording",
        );
      } else if (detail.status === "stopped") {
        // Le statut stopped de la capture confirme la fin complète.
      } else {
        releaseMicrophone();
        sessionIdRef.current = null;
        sessionModeRef.current = null;
        setStatus("error");
        setMessage(detail.message ?? "Erreur de connexion au serveur Tarteel");
      }
    }

    function handleResult(event: Event) {
      const detail = (
        event as CustomEvent<RecognitionResult>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== sessionIdRef.current ||
        detail.mode !== sessionModeRef.current
      ) {
        return;
      }

      // Afficher immédiatement les hypothèses, même provisoires.
      setTranscript(detail.text);

      // Ignorer les résultats invalides ou reçus dans le désordre.
      if (
        !Number.isInteger(detail.sequence) ||
        detail.sequence <= lastResultSequenceRef.current
      ) {
        return;
      }

      lastResultSequenceRef.current = detail.sequence;

      // Transmettre chaque hypothèse valide au suivi mot par mot.
      window.dispatchEvent(
        new CustomEvent("irtaki:tarteel-live-result", {
          detail,
        }),
      );

      // Conserver également l'événement final existant.
      if (detail.final) {
        window.dispatchEvent(
          new CustomEvent("irtaki:tarteel-confirmed-result", {
            detail,
          }),
        );
      }
    }

    function handlePcm(event: Event) {
      const detail = (event as CustomEvent<PcmDetail>).detail;

      if (
        !detail ||
        detail.sessionId !== sessionIdRef.current ||
        detail.mode !== sessionModeRef.current
      ) {
        return;
      }

      const level = getAudioLevel(detail.samples);

      setLevels((previous) => [
        ...previous.slice(1),
        Math.max(0.04, level),
      ]);
    }

    window.addEventListener(
      "irtaki:tarteel-recognition-status",
      handleCaptureStatus,
    );
    window.addEventListener(
      "irtaki:tarteel-websocket-status",
      handleWebSocketStatus,
    );
    window.addEventListener("irtaki:tarteel-result", handleResult);
    window.addEventListener("irtaki:tarteel-pcm", handlePcm);

    return () => {
      mountedRef.current = false;

      startAttemptRef.current += 1;
      startInProgressRef.current = false;
      startModeRef.current = null;

      window.removeEventListener(
        "irtaki:tarteel-recognition-status",
        handleCaptureStatus,
      );
      window.removeEventListener(
        "irtaki:tarteel-websocket-status",
        handleWebSocketStatus,
      );
      window.removeEventListener("irtaki:tarteel-result", handleResult);
      window.removeEventListener("irtaki:tarteel-pcm", handlePcm);

      const sessionId = sessionIdRef.current;
      const sessionMode = sessionModeRef.current;
      const track = trackRef.current;

      if (sessionId && sessionMode && track) {
        dispatchLifecycle({
          sessionId,
          track,
          mode: sessionMode,
          action: "stop",
        });
      }

      releaseMicrophone();
      sessionIdRef.current = null;
      sessionModeRef.current = null;
    };
  }, [releaseMicrophone]);

  useEffect(() => {
    modeRef.current = mode;

    if (
      startInProgressRef.current &&
      startModeRef.current !== mode
    ) {
      startAttemptRef.current += 1;
      startInProgressRef.current = false;
      startModeRef.current = null;
    }

    if (
      sessionIdRef.current &&
      sessionModeRef.current !== mode
    ) {
      stopSession();
    }
  }, [mode, stopSession]);

  const visible = mode !== null;
  const lastWords = getLastFiveWords(transcript);

  const statusLabels: Record<ControllerStatus, string> = {
    idle: "جاهز",
    requesting: "جاري تفعيل الميكروفون",
    connecting: "جاري الاتصال",
    recording: "التعرف يعمل",
    paused: "متوقف مؤقتاً",
    stopping: "جاري الإنهاء",
    stopped: "انتهت الجلسة",
    error: "حدث خطأ",
  };

  const isBusy =
    status === "requesting" ||
    status === "connecting" ||
    status === "recording" ||
    status === "paused" ||
    status === "stopping";

  const buttonLabel =
    status === "recording"
      ? "⏸ إيقاف مؤقت"
      : status === "paused"
        ? "▶ استئناف"
        : status === "requesting" || status === "connecting"
          ? "جاري التشغيل..."
          : "🎙 بدء الترتيل";

  if (!visible) {
    return (
      <>
        <MushafTarteelRecognitionCapture />
        <MushafTarteelRecognitionClient />
      </>
    );
  }

  return (
    <>
      <MushafTarteelRecognitionCapture />
      <MushafTarteelRecognitionClient />

      {inlineSlot
        ? createPortal(
            <div
          className="flex min-w-0 items-center gap-1.5 overflow-x-auto"
          role="toolbar"
          aria-label="أدوات الترتيل المباشر"
        >
          <button
            type="button"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              ayahsHidden
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : ""
            }`}
            aria-label={ayahsHidden ? "إظهار آيات الصفحة" : "إخفاء آيات الصفحة"}
            aria-pressed={ayahsHidden}
            title={ayahsHidden ? "إظهار آيات الصفحة" : "إخفاء آيات الصفحة"}
            onClick={onToggleAyahsHidden}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
              {ayahsHidden ? (
                <path d="M3 3l18 18" />
              ) : (
                <circle cx="12" cy="12" r="3" />
              )}
            </svg>
          </button>

          <MushafTarteelTalkButton
            state={talkState}
            audioLevel={audioLevel}
            onStart={startSession}
            onStop={stopSession}
            compact
          />

          {!transcriptHidden && (
            <div
              className="flex h-10 min-w-40 max-w-72 shrink-0 items-center overflow-hidden rounded-lg border px-3"
              dir="rtl"
              aria-live="polite"
              aria-label="آخر خمس كلمات متعرف عليها"
            >
              {lastWords.length > 0 ? (
                <span className="truncate text-sm">
                  {lastWords.join(" ")}
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">
                  الكلمات المتعرف عليها ستظهر هنا
                </span>
              )}
            </div>
          )}
        </div>,
            inlineSlot
          )
        : null}

      {translateErrorMessage(message) && typeof document !== "undefined"
        ? createPortal(
            <div
              role="alert"
              aria-live="assertive"
              className="pointer-events-none fixed inset-x-0 top-0 z-[9999] flex justify-center px-3 pt-3"
            >
              <div className="pointer-events-auto w-full max-w-xl">
                <ErrorAlert
                  message={translateErrorMessage(message)}
                  onDismiss={() => setMessage(null)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
