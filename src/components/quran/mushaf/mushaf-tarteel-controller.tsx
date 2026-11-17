"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveTarteelRecordingLocally } from "./mushaf-tilawa-recorder";
import { createPortal } from "react-dom";
import {
  MushafTarteelTalkButton,
  type TarteelTalkState,
} from "./mushaf-tarteel-talk-button";

import { MushafTarteelRecognitionCapture } from "./mushaf-tarteel-recognition-capture";
import { MushafTarteelRecognitionClient } from "./mushaf-tarteel-recognition-client";

import { ErrorAlert } from "@/components/ui/error-alert";
import {
  MushafTarteel2StartDialog,
  type Tarteel2Selection,
} from "./mushaf-tarteel2-start-dialog";
import {
  TARIQ_KEY_PREFIX,
  WAJH_KEY_PREFIX,
} from "@/application/recitation/tariq-selection";
type TarteelMode = "tarteel1" | "tarteel2";
type DetectedAyah = {
  id: number;
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  text: string;
};
type EditableRange = {
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
};
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
  riwayaId?: number;
  tariqId?: number | null;
  wajhId?: number | null;
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
  mushafId: number;
  ayahsHidden: boolean;
  onToggleAyahsHidden: () => void;
  riwayaId: number;
  readPreference: (key: string) => string | null;
  writePreference: (key: string, value: string) => void;
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
  mushafId,
  ayahsHidden,
  onToggleAyahsHidden,
  riwayaId,
  readPreference,
  writePreference,
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
  const confirmedTranscriptRef = useRef<string[]>([]);
  const latestTranscriptRef = useRef("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordedDurationRef = useRef(0);
  const [pendingAudio, setPendingAudio] = useState<{
    blob: Blob;
    durationMs: number;
    transcript: string;
    clientSessionId: string;
  } | null>(null);
  const [canonicalAyahs, setCanonicalAyahs] = useState<
    Array<{ id: number; number: number; surahNumber: number; text: string }>
  >([]);
  const detectedAyahsRef = useRef<DetectedAyah[]>([]);
  const [detectedAyahs, setDetectedAyahs] = useState<DetectedAyah[]>([]);
  const [editableRange, setEditableRange] = useState<EditableRange | null>(null);
  const [savingTarteelAudio, setSavingTarteelAudio] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [surahNames, setSurahNames] = useState<Record<number, string>>({});
  const savedLocalRecordingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingAudio || canonicalAyahs.length > 0) return;

    const controller = new AbortController();
    fetch("/api/ayahs/catalog", {
      signal: controller.signal,
      cache: "force-cache",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("QURAN_CATALOG_LOAD_FAILED");
        return (await response.json()) as unknown;
      })
      .then((payload) => {
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("data" in payload) ||
          !Array.isArray(payload.data)
        ) {
          throw new Error("INVALID_QURAN_CATALOG");
        }

        const rows = payload.data.flatMap((value) => {
          if (typeof value !== "object" || value === null) return [];
          const row = value as Record<string, unknown>;
          if (
            typeof row.id !== "number" ||
            typeof row.number !== "number" ||
            typeof row.surahNumber !== "number" ||
            typeof row.text !== "string"
          ) {
            return [];
          }
          return [{
            id: row.id,
            number: row.number,
            surahNumber: row.surahNumber,
            text: row.text,
          }];
        });

        if (rows.length === 0) throw new Error("EMPTY_QURAN_CATALOG");
        setCanonicalAyahs(rows);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setSaveError("تعذر تحميل نص القرآن لتصحيح نطاق الآيات");
      });

    return () => controller.abort();
  }, [pendingAudio, canonicalAyahs.length]);


  const [status, setStatus] = useState<ControllerStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [transcriptHidden, setTranscriptHidden] = useState(false);
  const [levels, setLevels] = useState<number[]>(INITIAL_LEVELS);
  const [showTarteel2Dialog, setShowTarteel2Dialog] = useState(false);
  const [dialogPortalRoot, setDialogPortalRoot] = useState<HTMLElement | null>(null);
  const tarteel2SelectionRef = useRef<Tarteel2Selection | null>(null);

  useEffect(() => {
    setDialogPortalRoot(document.body);
  }, []);

  useEffect(() => {
    function handleDetectedAyahs(event: Event) {
      const detail = (
        event as CustomEvent<{
          sessionId: string;
          mode: TarteelMode;
          ayahs: DetectedAyah[];
        }>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== sessionIdRef.current ||
        detail.mode !== sessionModeRef.current ||
        !Array.isArray(detail.ayahs)
      ) return;

      const next = new Map(detectedAyahsRef.current.map((ayah) => [ayah.id, ayah]));
      for (const ayah of detail.ayahs) {
        if (
          Number.isInteger(ayah?.id) &&
          Number.isInteger(ayah?.surahNumber) &&
          Number.isInteger(ayah?.ayahNumber) &&
          typeof ayah?.surahName === "string" &&
          typeof ayah?.text === "string" &&
          ayah.text.trim().length > 0
        ) next.set(ayah.id, ayah);
      }

      detectedAyahsRef.current = [...next.values()].sort(
        (a, b) => a.surahNumber - b.surahNumber || a.ayahNumber - b.ayahNumber,
      );
    }

    window.addEventListener("irtaki:tarteel-detected-ayahs", handleDetectedAyahs);
    return () =>
      window.removeEventListener("irtaki:tarteel-detected-ayahs", handleDetectedAyahs);
  }, []);

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
          : status === "paused"
            ? "paused"
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

      if (recordingStartedAtRef.current !== null) {
        recordedDurationRef.current += Date.now() - recordingStartedAtRef.current;
        recordingStartedAtRef.current = null;
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();

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
      recordedChunksRef.current = [];
      savedLocalRecordingIdRef.current = null;
      confirmedTranscriptRef.current = [];
      latestTranscriptRef.current = "";
      lastResultSequenceRef.current = -1;
      recordedDurationRef.current = 0;
      detectedAyahsRef.current = [];
      setDetectedAyahs([]);
      setEditableRange(null);
      setSaveError(null);
      recordingStartedAtRef.current = Date.now();
      setPendingAudio(null);

      try {
        const mimeType = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
        ].find((type) => MediaRecorder.isTypeSupported(type));
        const recorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) recordedChunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          mediaRecorderRef.current = null;
          if (blob.size > 0) {
            const ayahs = detectedAyahsRef.current;
            setDetectedAyahs(ayahs);
            setEditableRange({
              startSurah: ayahs[0]?.surahNumber ?? 1,
              startAyah: ayahs[0]?.ayahNumber ?? 1,
              endSurah: ayahs[ayahs.length - 1]?.surahNumber ?? 1,
              endAyah: ayahs[ayahs.length - 1]?.ayahNumber ?? 1,
            });
            setPendingAudio({
              blob,
              durationMs: recordedDurationRef.current,
              transcript:
                confirmedTranscriptRef.current.length > 0
                  ? confirmedTranscriptRef.current.join(" ")
                  : latestTranscriptRef.current,
              clientSessionId: sessionId,
            });
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      } catch {
        recordingStartedAtRef.current = null;
        setMessage("تعذر تسجيل الصوت على هذا المتصفح");
      }
      sessionIdRef.current = sessionId;
      sessionModeRef.current = selectedMode;

      setStatus("connecting");

      const selection =
        selectedMode === "tarteel2"
          ? tarteel2SelectionRef.current
          : null;

      dispatchLifecycle({
        sessionId,
        track,
        mode: selectedMode,
        action: "start",
        ...(selection
          ? {
              riwayaId: selection.riwayaId,
              tariqId: selection.tariqId,
              wajhId: selection.wajhId,
            }
          : {}),
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
      if (mode === "tarteel2") {
        setShowTarteel2Dialog(true);
        return;
      }

      void startSession();
      return;
    }

    const sessionId = sessionIdRef.current;
    const sessionMode = sessionModeRef.current;
    const track = trackRef.current;

    if (!sessionId || !sessionMode || !track) return;

    if (status === "recording") {
      if (recordingStartedAtRef.current !== null) {
        recordedDurationRef.current += Date.now() - recordingStartedAtRef.current;
        recordingStartedAtRef.current = null;
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
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
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
        recordingStartedAtRef.current = Date.now();
      }
      setStatus("connecting");
      dispatchLifecycle({
        sessionId,
        track,
        mode: sessionMode,
        action: "resume",
      });
    }
  }, [mode, startSession, status]);

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
      latestTranscriptRef.current = detail.text.trim();

      // Ignorer les résultats invalides ou reçus dans le désordre.
      if (
        !Number.isInteger(detail.sequence) ||
        detail.sequence <= lastResultSequenceRef.current
      ) {
        return;
      }

      lastResultSequenceRef.current = detail.sequence;
      if (detail.final && detail.text.trim()) {
        confirmedTranscriptRef.current.push(detail.text.trim());
      }

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

    if (mode !== "tarteel2") {
      setShowTarteel2Dialog(false);
      tarteel2SelectionRef.current = null;
    }

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

  async function confirmSaveTarteelAudio() {
    if (!pendingAudio || !editableRange || savingTarteelAudio) return;

    const startPosition =
      editableRange.startSurah * 1000 + editableRange.startAyah;
    const endPosition =
      editableRange.endSurah * 1000 + editableRange.endAyah;

    if (
      editableRange.startSurah < 1 ||
      editableRange.startSurah > 114 ||
      editableRange.endSurah < 1 ||
      editableRange.endSurah > 114 ||
      editableRange.startAyah < 1 ||
      editableRange.endAyah < 1 ||
      startPosition > endPosition
    ) {
      setSaveError("تحقق من نطاق السورة والآية");
      return;
    }

    const selected = canonicalAyahs.filter((ayah) => {
      const position = ayah.surahNumber * 1000 + ayah.number;
      return position >= startPosition && position <= endPosition;
    });
    const ayahIds = [...new Set(selected.map((ayah) => ayah.id))];

    if (selected.length === 0) {
      setSaveError("لا توجد آيات مكتشفة داخل هذا النطاق");
      return;
    }

    let learnerId: string | null = null;
    try {
      learnerId = window.localStorage.getItem("irtaki.activeLearnerId");
    } catch {
      // Le profil actif peut être indisponible sur cet appareil.
    }
    if (!learnerId) {
      setSaveError("اختر المتعلم الحالي أولاً");
      return;
    }

    setSavingTarteelAudio(true);
    setSaveError(null);
    setPendingAudio(null);
    setEditableRange(null);
    try {
      if (!savedLocalRecordingIdRef.current) {
        savedLocalRecordingIdRef.current = await saveTarteelRecordingLocally({
          learnerId,
          mushafId,
          mode: mode ?? "tarteel1",
          riwayaId,
          tariqId: tarteel2SelectionRef.current?.tariqId ?? null,
          wajhId: tarteel2SelectionRef.current?.wajhId ?? null,
          ayahs: selected.map((ayah) => ({
          surahNumber: ayah.surahNumber,
          ayahNumber: ayah.number,
          surahName:
            detectedAyahs.find((detected) => detected.id === ayah.id)?.surahName ??
            `سورة ${ayah.surahNumber}`,
        })),
          durationMs: pendingAudio.durationMs,
          blob: pendingAudio.blob,
        });
      }

      let serverNotice = "";
      const transcript = pendingAudio.transcript.trim();

      if (!transcript) {
        serverNotice = "";
      } else {
        const form = new FormData();
        const audioFile = new File(
          [pendingAudio.blob],
          "tarteel-recording",
          { type: pendingAudio.blob.type || "audio/webm" },
        );
        form.set("audio", audioFile);
        form.set("learnerId", learnerId);
        form.set("mushafId", String(mushafId));
        form.set("mode", mode ?? "tarteel1");
        form.set("riwayaId", String(riwayaId));
        form.set("durationMs", String(pendingAudio.durationMs));
        form.set("transcript", transcript);
        form.set("clientSessionId", pendingAudio.clientSessionId);
        form.set(
          "ayahs",
          JSON.stringify(selected.map((ayah) => ({ id: ayah.id }))),
        );

        const tariqId = tarteel2SelectionRef.current?.tariqId;
        const wajhId = tarteel2SelectionRef.current?.wajhId;
        if (tariqId !== null && tariqId !== undefined) {
          form.set("tariqId", String(tariqId));
        }
        if (wajhId !== null && wajhId !== undefined) {
          form.set("wajhId", String(wajhId));
        }

        const uploadResponse = await fetch("/api/recitations", {
          method: "POST",
          body: form,
        });
        const uploadResult = (await uploadResponse.json().catch(() => null)) as
          | {
              stored?: unknown;
              werPercent?: unknown;
              grade?: unknown;
              error?: unknown;
              diagnosticCode?: unknown;
            }
          | null;

        if (!uploadResponse.ok) {
          const code =
            typeof uploadResult?.error === "string"
              ? uploadResult.error
              : String(uploadResponse.status);
          const diagnostic =
            typeof uploadResult?.diagnosticCode === "string"
              ? ` · ${uploadResult.diagnosticCode}`
              : "";
          setMessage(
            `تعذر رفع التسجيل (${code}${diagnostic})؛ بقي محفوظاً على الجهاز.`,
          );
          return;
        }

        if (uploadResult?.stored === true) {
          const wer =
            typeof uploadResult.werPercent === "number"
              ? ` · WER ${uploadResult.werPercent.toFixed(1)}٪`
              : "";
          const grade =
            typeof uploadResult.grade === "string"
              ? ` · ${uploadResult.grade}`
              : "";
          serverNotice = "";
        } else {
          serverNotice = "";
        }
      }

      if (ayahIds.length === 0) {
        setMessage("تم حفظ الصوت محلياً، لكن لا توجد آيات مؤكدة لإضافتها إلى سجل التعلم");
        return;
      }

      const activityResponse = await fetch("/api/learning/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "complete",
          learnerId,
          action: mode ?? "tarteel1",
          riwayaId,
          ayahIds,
        }),
      });

      if (!activityResponse.ok) {
        setMessage("تم حفظ الصوت محلياً، لكن تعذر تحديث سجل التعلم.");
        return;
      }

      savedLocalRecordingIdRef.current = null;
      setPendingAudio(null);
      setDetectedAyahs([]);
      detectedAyahsRef.current = [];
      setEditableRange(null);
      setMessage(serverNotice);
    } catch (error) {
      console.error("[TARTEEL] save workflow failed:", error);
      const reason = error instanceof Error ? error.message : String(error);
      setMessage(`تعذر الحفظ: ${reason.slice(0, 180)}`);
    } finally {
      setSavingTarteelAudio(false);
    }
  }


  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/surahs", { signal: controller.signal, cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error("SURAH_NAMES_LOAD_FAILED");
        return (await response.json()) as unknown;
      })
      .then((payload) => {
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("data" in payload) ||
          !Array.isArray(payload.data)
        ) return;

        const names: Record<number, string> = {};
        for (const value of payload.data) {
          if (typeof value !== "object" || value === null) continue;
          const row = value as Record<string, unknown>;
          if (typeof row.number === "number" && typeof row.name === "string") {
            names[row.number] = row.name;
          }
        }
        setSurahNames(names);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
      });

    return () => controller.abort();
  }, []);

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

      {showTarteel2Dialog &&
        mode === "tarteel2" &&
        dialogPortalRoot &&
        createPortal(
          <MushafTarteel2StartDialog
            riwayaId={riwayaId}
            readPreference={readPreference}
            onCancel={() => setShowTarteel2Dialog(false)}
            onConfirm={(selection) => {
              tarteel2SelectionRef.current = selection;

              if (selection.tariqId !== null) {
                writePreference(
                  `${TARIQ_KEY_PREFIX}${selection.riwayaId}`,
                  String(selection.tariqId),
                );

                if (selection.wajhId !== null) {
                  writePreference(
                    `${WAJH_KEY_PREFIX}${selection.tariqId}`,
                    String(selection.wajhId),
                  );
                }
              }

              setShowTarteel2Dialog(false);
              void startSession();
            }}
          />,
          dialogPortalRoot,
        )}

      {pendingAudio && editableRange && dialogPortalRoot &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="tarteel-save-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--background)] p-5 shadow-xl"
              dir="rtl"
            >
              <h2 id="tarteel-save-title" className="text-lg font-bold">
                تأكيد حفظ تسجيل الترتيل
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                راجع نطاق التلاوة المكتشف وعدّله قبل الحفظ على جهاز المتعلم.
              </p>
              <div className="mt-4 space-y-4">
                <fieldset className="rounded-lg border p-3">
                  <legend className="px-1 font-semibold">البداية</legend>
                  <label className="block text-sm">
                    أول آية — {surahNames[editableRange.startSurah] ?? ""}

                    <input
                      type="number"
                      min={1}
                      max={canonicalAyahs
                        .filter((item) => item.surahNumber === editableRange.startSurah)
                        .reduce((maximum, item) => Math.max(maximum, item.number), 1)}
                      className="mt-1 w-full rounded-lg border bg-transparent p-2"
                      value={editableRange.startAyah}
                      disabled={canonicalAyahs.length === 0}
                      onChange={(event) => {
                        const ayah = Number(event.target.value);
                        setEditableRange((range) =>
                          range ? { ...range, startAyah: ayah } : range,
                        );
                      }}
                    />

                  </label>

                  <p className="mt-2 text-sm">
                    {(
                      canonicalAyahs.find((ayah) =>
                        ayah.surahNumber === editableRange.startSurah &&
                        ayah.number === editableRange.startAyah
                      )?.text ??
                      detectedAyahs.find((ayah) =>
                        ayah.surahNumber === editableRange.startSurah &&
                        ayah.ayahNumber === editableRange.startAyah
                      )?.text
                    )?.split(/\s+/u).slice(0, 5).join(" ") ?? "لا يوجد نص لهذه الآية"}
                  </p>

                </fieldset>

                <fieldset className="rounded-lg border p-3">
                  <legend className="px-1 font-semibold">النهاية</legend>
                  <label className="block text-sm">
                    آخر آية — {surahNames[editableRange.endSurah] ?? ""}

                    <input
                      type="number"
                      min={1}
                      max={canonicalAyahs
                        .filter((item) => item.surahNumber === editableRange.endSurah)
                        .reduce((maximum, item) => Math.max(maximum, item.number), 1)}
                      className="mt-1 w-full rounded-lg border bg-transparent p-2"
                      value={editableRange.endAyah}
                      disabled={canonicalAyahs.length === 0}
                      onChange={(event) => {
                        const ayah = Number(event.target.value);
                        setEditableRange((range) =>
                          range ? { ...range, endAyah: ayah } : range,
                        );
                      }}
                    />

                  </label>

                  <p className="mt-2 text-sm">
                    {(
                      canonicalAyahs.find((ayah) =>
                        ayah.surahNumber === editableRange.endSurah &&
                        ayah.number === editableRange.endAyah
                      )?.text ??
                      detectedAyahs.find((ayah) =>
                        ayah.surahNumber === editableRange.endSurah &&
                        ayah.ayahNumber === editableRange.endAyah
                      )?.text
                    )?.split(/\s+/u).slice(-5).join(" ") ?? "لا يوجد نص لهذه الآية"}
                  </p>

                </fieldset>
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">
                عدد الآيات في النطاق: {Math.max(0, editableRange.endAyah - editableRange.startAyah + 1)}
              </p>
              {saveError && (
                <p role="alert" className="mt-3 text-sm text-rose-600">{saveError}</p>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-lg border px-3"
                  disabled={savingTarteelAudio}
                  onClick={() => {
                    setPendingAudio(null);
                    setEditableRange(null);
                    setSaveError(null);
                  }}
                >
                  حذف التسجيل
                </button>
                <button
                  type="button"
                  className="min-h-10 flex-1 rounded-lg bg-[var(--foreground)] px-3 text-[var(--background)]"
                  disabled={savingTarteelAudio || canonicalAyahs.length === 0}
                  onClick={() => void confirmSaveTarteelAudio()}
                >
                  {savingTarteelAudio ? "جارٍ الحفظ..." : "تأكيد الحفظ"}
                </button>
              </div>
            </section>
          </div>,
          dialogPortalRoot,
        )}

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
            onToggle={toggleRecording}
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
