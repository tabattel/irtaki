"use client";

import { useEffect, useRef, useState } from "react";

import { searchQuran } from "@/lib/api/search";

import { MushafTartilRecognitionCapture } from "./mushaf-tartil-recognition-capture";
import { MushafTartilRecognitionClient } from "./mushaf-tartil-recognition-client";
import {
  MushafTarteelTalkButton,
  type TarteelTalkState,
} from "./mushaf-tarteel-talk-button";

type TartilAyahReference = {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
};

type SurahAyahCount = {
  surahNumber: number;
  numberOfAyahs: number;
};

type TartilCaptureContext = {
  learnerId: string;
  ayahIds: number[];
  ayahs: TartilAyahReference[];
  surahAyahCounts: SurahAyahCount[];
};

type Props = {
  resolveContext: () => TartilCaptureContext | null;
  ayahsHidden: boolean;
  onToggleAyahsHidden: () => void;
  onSessionReset: () => void;
  onAyahSkipped: (ayah: {
    surahNumber: number;
    ayahNumber: number;
  }) => void;
};

type LifecycleAction = "start" | "pause" | "resume" | "stop";

type SessionDetail = {
  sessionId: string;
  track: MediaStreamTrack;
  learnerId: string;
  ayahIds: number[];
  ayahs: TartilAyahReference[];
  surahAyahCounts: SurahAyahCount[];
  tracked: false;
};

type LifecycleDetail = SessionDetail & {
  action: LifecycleAction;
};

type ControllerStatus =
  | "idle"
  | "requesting"
  | "capturing"
  | "pausing"
  | "paused"
  | "resuming"
  | "stopping"
  | "stopped"
  | "error";

type RecognitionStatusDetail = {
  sessionId: string;
  status: "capturing" | "paused" | "stopped" | "error";
  message?: string;
};

type RecognitionResult = {
  sessionId: string;
  sequence: number;
  startSeconds: number;
  endSeconds: number;
  isFinal: boolean;
  transcription: string;
};

type RecognitionError = {
  sessionId: string;
  sequence: number;
  message: string;
};

type MatchedAyah = {
  ayahId: number;
  pageNumber: number;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  text: string;
};

type CandidateState = {
  ayah: MatchedAyah;
  consecutive: number;
  lastSequence: number;
};

type PendingContinuityJump = {
  fromAyah: MatchedAyah;
  lastAyah: MatchedAyah;
  lastSequence: number;
  consecutiveSegments: number;
};

function getCanonicalAyahPosition(
  ayah: Pick<MatchedAyah, "surahNumber" | "ayahNumber">,
  counts: SurahAyahCount[],
): number | null {
  let position = 0;

  for (const item of counts) {
    if (item.surahNumber === ayah.surahNumber) {
      if (
        !Number.isInteger(ayah.ayahNumber) ||
        ayah.ayahNumber < 1 ||
        ayah.ayahNumber > item.numberOfAyahs
      ) {
        return null;
      }

      return position + ayah.ayahNumber;
    }

    position += item.numberOfAyahs;
  }

  return null;
}

function getCanonicalAyahAtPosition(
  targetPosition: number,
  counts: SurahAyahCount[],
): { surahNumber: number; ayahNumber: number } | null {
  if (!Number.isInteger(targetPosition) || targetPosition < 1) {
    return null;
  }

  let position = 0;

  for (const item of counts) {
    const nextPosition = position + item.numberOfAyahs;

    if (targetPosition > position && targetPosition <= nextPosition) {
      return {
        surahNumber: item.surahNumber,
        ayahNumber: targetPosition - position,
      };
    }

    position = nextPosition;
  }

  return null;
}

function normalizeTranscriptToken(token: string): string {
  return token
    .normalize("NFC")
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu, "")
    .replace(/ـ/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ا")
    .replace(/ئ/gu, "ء")
    .replace(/ؤ/gu, "و");
}

function extractArabicWords(text: string): string[] {
  return text
    .normalize("NFC")
    .replace(/[^\p{Script_Extensions=Arabic}\p{M}\s]/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > 0);
}

function mergeTranscriptWords(
  previous: string[],
  incoming: string[],
): string[] {
  let overlap = 0;
  const maximum = Math.min(8, previous.length, incoming.length);

  for (let size = maximum; size >= 2; size -= 1) {
    const left = previous
      .slice(-size)
      .map(normalizeTranscriptToken)
      .join("|");

    const right = incoming
      .slice(0, size)
      .map(normalizeTranscriptToken)
      .join("|");

    if (left === right) {
      overlap = size;
      break;
    }
  }

  return [...previous, ...incoming.slice(overlap)].slice(-24);
}

function newSessionId(): string {
  return typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `tartil-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

  return "تعذر تشغيل الميكروفون";
}

export function MushafTartilController({
  resolveContext,
  ayahsHidden,
  onToggleAyahsHidden,
  onSessionReset,
  onAyahSkipped,
}: Props) {
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<SessionDetail | null>(null);
  const displaySessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);

  const [status, setStatus] = useState<ControllerStatus>("idle");
  const [audioLevel, setAudioLevel] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [segments, setSegments] = useState<RecognitionResult[]>([]);
  const [transcript, setTranscript] = useState("");
  const [matchedAyah, setMatchedAyah] = useState<MatchedAyah | null>(null);
  const [matchHint, setMatchHint] = useState<string | null>(null);

  const transcriptWordsRef = useRef<string[]>([]);
  const lastSequenceRef = useRef(-1);
  const candidateRef = useRef<CandidateState | null>(null);
  const lastMatchedAyahIdRef = useRef<number | null>(null);
  const lastAcceptedAyahRef = useRef<MatchedAyah | null>(null);
  const pendingContinuityJumpRef =
    useRef<PendingContinuityJump | null>(null);
  const continuityStoppedRef = useRef(false);
  const searchQueueRef = useRef<Promise<void>>(Promise.resolve());

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function dispatchLifecycle(action: LifecycleAction) {
    const session = sessionRef.current;
    if (!session) return;

    window.dispatchEvent(
      new CustomEvent<LifecycleDetail>("irtaki:tartil-recognition", {
        detail: {
          ...session,
          action,
        },
      }),
    );
  }

  async function startRecognition() {
    if (status === "requesting" || sessionRef.current) return;

    const context = resolveContext();
    if (!context) return;

    setMessage(null);
    setSegments([]);
    setTranscript("");
    setMatchedAyah(null);
    setMatchHint(null);

    transcriptWordsRef.current = [];
    lastSequenceRef.current = -1;
    candidateRef.current = null;
    lastMatchedAyahIdRef.current = null;
    lastAcceptedAyahRef.current = null;
    pendingContinuityJumpRef.current = null;
    continuityStoppedRef.current = false;
    searchQueueRef.current = Promise.resolve();

    setStatus("requesting");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("MICROPHONE_API_UNAVAILABLE");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const track = stream.getAudioTracks()[0];

      if (!track || track.readyState !== "live") {
        stream.getTracks().forEach((item) => item.stop());
        throw new Error("MICROPHONE_TRACK_NOT_AVAILABLE");
      }

      onSessionReset();

      const sessionId = newSessionId();

      const session: SessionDetail = {
        sessionId,
        track,
        learnerId: context.learnerId,
        ayahIds: context.ayahIds,
        ayahs: context.ayahs,
        surahAyahCounts: context.surahAyahCounts,
        tracked: false,
      };

      streamRef.current = stream;
      sessionRef.current = session;
      displaySessionIdRef.current = sessionId;

      window.dispatchEvent(
        new CustomEvent<LifecycleDetail>("irtaki:tartil-recognition", {
          detail: {
            ...session,
            action: "start",
          },
        }),
      );
    } catch (error) {
      if (!mountedRef.current) return;

      releaseStream();
      sessionRef.current = null;
      setStatus("error");
      setMessage(
        error instanceof Error && error.message === "MICROPHONE_API_UNAVAILABLE"
          ? "الميكروفون غير مدعوم في هذا المتصفح"
          : microphoneErrorMessage(error),
      );
    }
  }

  function pauseRecognition() {
    if (status !== "capturing" || !sessionRef.current) return;

    setStatus("pausing");
    dispatchLifecycle("pause");
  }

  function resumeRecognition() {
    if (status !== "paused" || !sessionRef.current) return;

    setStatus("resuming");
    dispatchLifecycle("resume");
  }

  function stopRecognition() {
    if (!sessionRef.current) return;

    setStatus("stopping");
    dispatchLifecycle("stop");
    releaseStream();
  }

  useEffect(() => {
    mountedRef.current = true;

    function handleAudioLevel(event: Event) {
      const detail = (
        event as CustomEvent<{ sessionId: string; level: number }>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      setAudioLevel(
        Number.isFinite(detail.level)
          ? Math.min(1, Math.max(0, detail.level))
          : 0,
      );
    }

    function handleStatus(event: Event) {
      const detail = (
        event as CustomEvent<RecognitionStatusDetail>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      if (detail.status === "capturing") {
        setStatus("capturing");
        return;
      }

      if (detail.status === "paused") {
        setAudioLevel(0);
        setStatus("paused");
        return;
      }

      if (detail.status === "stopped") {
        sessionRef.current = null;
        releaseStream();
        setAudioLevel(0);
        setStatus("stopped");
        return;
      }

      sessionRef.current = null;
      releaseStream();
      setAudioLevel(0);
      setStatus("error");
      setMessage(detail.message ?? "تعذر تشغيل التعرف الصوتي");
    }

    async function identifyRecitedAyah(
      detail: RecognitionResult,
    ): Promise<void> {
      if (
        !mountedRef.current ||
        continuityStoppedRef.current ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      if (detail.sequence <= lastSequenceRef.current) {
        return;
      }

      // Une rupture interrompt la fusion, mais ne supprime pas
      // la dernière ayah affichée dans le Mushaf.
      if (
        lastSequenceRef.current >= 0 &&
        detail.sequence > lastSequenceRef.current + 1
      ) {
        transcriptWordsRef.current = [];
        candidateRef.current = null;
        pendingContinuityJumpRef.current = null;
      }

      lastSequenceRef.current = detail.sequence;

      const incoming = extractArabicWords(detail.transcription);
      if (incoming.length === 0) return;

      // Fusion exclusivement destinée à l'affichage.
      const merged = mergeTranscriptWords(
        transcriptWordsRef.current,
        incoming,
      );

      transcriptWordsRef.current = merged;
      setTranscript(merged.join(" "));

      // On travaille sur le segment courant pour ne pas réutiliser
      // indéfiniment une ancienne phrase.
      const searchWords = incoming.slice(-8);

      const previousCandidate = candidateRef.current;
      const previousSurah = previousCandidate?.ayah.surahNumber;

      let candidate: MatchedAyah | null = null;
      let matchedWordCount = 0;
      let ambiguous = false;
      let candidateOffset = -1;

      // Première étape : rechercher toutes les séquences de trois mots.
      const threeWordWindows = [];

      for (
        let offset = 0;
        offset <= searchWords.length - 3;
        offset += 1
      ) {
        threeWordWindows.push({
          offset,
          query: searchWords.slice(offset, offset + 3).join(" "),
        });
      }

      const threeWordResponses = await Promise.all(
        threeWordWindows.map(async (item) => ({
          ...item,
          response: await searchQuran(item.query, "partial"),
        })),
      );

      if (
        !mountedRef.current ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      // Le premier candidat est provisoire.
      // En cas d'ambiguïté, on privilégie la sourate déjà retenue,
      // sinon le premier résultat retourné par la recherche.
      for (const item of threeWordResponses) {
        const candidates = new Map<number, MatchedAyah>();

        for (const result of item.response.results) {
          if (
            result.source !== "ayah" ||
            typeof result.ayahId !== "number" ||
            typeof result.pageNumber !== "number" ||
            typeof result.surahNumber !== "number" ||
            typeof result.ayahNumber !== "number" ||
            !Number.isInteger(result.ayahId) ||
            !Number.isInteger(result.pageNumber) ||
            !Number.isInteger(result.surahNumber) ||
            !Number.isInteger(result.ayahNumber)
          ) {
            continue;
          }

          candidates.set(result.ayahId, {
            ayahId: result.ayahId,
            pageNumber: result.pageNumber,
            surahNumber: result.surahNumber,
            surahName: result.surahName,
            ayahNumber: result.ayahNumber,
            text: result.text,
          });
        }

        const values = [...candidates.values()];

        if (values.length === 0) continue;

        ambiguous = values.length > 1;

        candidate =
          values.find((item) => item.surahNumber === previousSurah) ??
          values[0];

        matchedWordCount = 3;
        candidateOffset = item.offset;
        break;
      }

      // Deuxième étape : ajouter le quatrième puis le cinquième mot
      // au même passage pour confirmer ou corriger la sourate.
      if (candidate) {
        for (const length of [4, 5]) {
          if (candidateOffset + length > searchWords.length) {
            continue;
          }

          const query = searchWords
            .slice(candidateOffset, candidateOffset + length)
            .join(" ");

          const response = await searchQuran(query, "partial");

          if (
            !mountedRef.current ||
            detail.sessionId !== displaySessionIdRef.current
          ) {
            return;
          }

          const candidates = new Map<number, MatchedAyah>();

          for (const result of response.results) {
            if (
              result.source !== "ayah" ||
              typeof result.ayahId !== "number" ||
              typeof result.pageNumber !== "number" ||
              typeof result.surahNumber !== "number" ||
              typeof result.ayahNumber !== "number" ||
              !Number.isInteger(result.ayahId) ||
              !Number.isInteger(result.pageNumber) ||
              !Number.isInteger(result.surahNumber) ||
              !Number.isInteger(result.ayahNumber)
            ) {
              continue;
            }

            candidates.set(result.ayahId, {
              ayahId: result.ayahId,
              pageNumber: result.pageNumber,
              surahNumber: result.surahNumber,
              surahName: result.surahName,
              ayahNumber: result.ayahNumber,
              text: result.text,
            });
          }

          const values = [...candidates.values()];

          if (values.length === 0) continue;

          ambiguous = values.length > 1;

          // Même sourate : on conserve cette sourate et on affine l'ayah.
          // Autre sourate : on corrige vers le nouveau résultat.
          candidate =
            values.find(
              (item) => item.surahNumber === candidate!.surahNumber,
            ) ?? values[0];

          matchedWordCount = length;
        }
      }

      // Si aucun groupe de trois mots ne correspond, essayer
      // les fenêtres de quatre puis cinq mots à toutes les positions.
      if (!candidate) {
        for (const length of [4, 5]) {
          const windows = [];

          for (
            let offset = 0;
            offset <= searchWords.length - length;
            offset += 1
          ) {
            windows.push({
              offset,
              query: searchWords.slice(offset, offset + length).join(" "),
            });
          }

          const responses = await Promise.all(
            windows.map(async (item) => ({
              ...item,
              response: await searchQuran(item.query, "partial"),
            })),
          );

          if (
            !mountedRef.current ||
            detail.sessionId !== displaySessionIdRef.current
          ) {
            return;
          }

          for (const item of responses) {
            const candidates = new Map<number, MatchedAyah>();

            for (const result of item.response.results) {
              if (
                result.source !== "ayah" ||
                typeof result.ayahId !== "number" ||
                typeof result.pageNumber !== "number" ||
                typeof result.surahNumber !== "number" ||
                typeof result.ayahNumber !== "number" ||
                !Number.isInteger(result.ayahId) ||
                !Number.isInteger(result.pageNumber) ||
                !Number.isInteger(result.surahNumber) ||
                !Number.isInteger(result.ayahNumber)
              ) {
                continue;
              }

              candidates.set(result.ayahId, {
                ayahId: result.ayahId,
                pageNumber: result.pageNumber,
                surahNumber: result.surahNumber,
                surahName: result.surahName,
                ayahNumber: result.ayahNumber,
                text: result.text,
              });
            }

            const values = [...candidates.values()];

            if (values.length === 0) continue;

            ambiguous = values.length > 1;

            candidate =
              values.find(
                (item) => item.surahNumber === previousSurah,
              ) ?? values[0];

            matchedWordCount = length;
            break;
          }

          if (candidate) break;
        }
      }

      // Une absence de correspondance ne supprime jamais
      // la dernière orientation valide.
      if (!candidate) {
        if (lastMatchedAyahIdRef.current === null) {
          setMatchHint(
            ambiguous
              ? "توجد آيات متشابهة، تابع التلاوة لتحديد الآية بدقة"
              : "جاري البحث عن الآية المطابقة...",
          );
        }

        return;
      }

      const acceptedAyah = lastAcceptedAyahRef.current;

      if (acceptedAyah && acceptedAyah.ayahId !== candidate.ayahId) {
        const counts = sessionRef.current?.surahAyahCounts ?? [];
        const acceptedPosition = getCanonicalAyahPosition(
          acceptedAyah,
          counts,
        );
        const candidatePosition = getCanonicalAyahPosition(
          candidate,
          counts,
        );

        if (
          acceptedPosition !== null &&
          candidatePosition !== null &&
          candidatePosition > acceptedPosition + 1
        ) {
          // Une recherche ambiguë ne doit jamais provoquer un arrêt
          // ou une déclaration de saut.
          if (ambiguous) {
            pendingContinuityJumpRef.current = null;
            setMatchHint(
              "توجد آيات متشابهة، تابع التلاوة لتحديد الآية بدقة",
            );
            return;
          }

          const pending = pendingContinuityJumpRef.current;
          const pendingPosition = pending
            ? getCanonicalAyahPosition(pending.lastAyah, counts)
            : null;

          const continuesPendingJump =
            pending !== null &&
            pending.fromAyah.ayahId === acceptedAyah.ayahId &&
            detail.sequence === pending.lastSequence + 1 &&
            pendingPosition !== null &&
            candidatePosition >= pendingPosition;

          const consecutiveSegments = continuesPendingJump
            ? pending.consecutiveSegments + 1
            : 1;

          pendingContinuityJumpRef.current = {
            fromAyah: acceptedAyah,
            lastAyah: candidate,
            lastSequence: detail.sequence,
            consecutiveSegments,
          };

          candidateRef.current = {
            ayah: candidate,
            consecutive: consecutiveSegments,
            lastSequence: detail.sequence,
          };

          // Deux segments successifs doivent confirmer le déplacement.
          if (consecutiveSegments < 2) {
            setMatchHint("جاري التحقق من تسلسل الآيات...");
            return;
          }

          const skippedCount = candidatePosition - acceptedPosition - 1;

          if (skippedCount === 1) {
            const skippedAyah = getCanonicalAyahAtPosition(
              acceptedPosition + 1,
              counts,
            );

            if (!skippedAyah) {
              continuityStoppedRef.current = true;
              pendingContinuityJumpRef.current = null;
              setMessage("تعذر تحديد الآية المتجاوزة، تم إيقاف الترتيل");
              stopRecognition();
              return;
            }

            onAyahSkipped(skippedAyah);
          } else {
            continuityStoppedRef.current = true;
            pendingContinuityJumpRef.current = null;
            setMatchHint("تم إيقاف الترتيل بسبب تجاوز آيتين أو أكثر");
            setMessage("تم إيقاف التعرف الصوتي بسبب تجاوز آيتين أو أكثر");
            stopRecognition();
            return;
          }
        } else {
          // Ayah suivante, répétition ou retour en arrière :
          // aucun saut à signaler.
          pendingContinuityJumpRef.current = null;
        }
      } else {
        pendingContinuityJumpRef.current = null;
      }

      const previous = candidateRef.current;

      const consecutive =
        previous?.ayah.ayahId === candidate.ayahId &&
        detail.sequence === previous.lastSequence + 1
          ? previous.consecutive + 1
          : 1;

      candidateRef.current = {
        ayah: candidate,
        consecutive,
        lastSequence: detail.sequence,
      };

      lastAcceptedAyahRef.current = candidate;

      setMatchedAyah(candidate);
      setMatchHint(
        matchedWordCount === 3
          ? "تم تحديد الآية مبدئياً"
          : "تم تأكيد الآية",
      );

      if (lastMatchedAyahIdRef.current === candidate.ayahId) {
        return;
      }

      lastMatchedAyahIdRef.current = candidate.ayahId;

      window.dispatchEvent(
        new CustomEvent("irtaki:tartil-ayah-match", {
          detail: {
            sessionId: detail.sessionId,
            ayahId: candidate.ayahId,
            pageNumber: candidate.pageNumber,
            surahNumber: candidate.surahNumber,
            ayahNumber: candidate.ayahNumber,
          },
        }),
      );
    }

    function handleResult(event: Event) {
      const detail = (
        event as CustomEvent<RecognitionResult>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      // Une réponse réussie efface une ancienne erreur 503.
      setMessage(null);
      setSegments((current) => [...current, detail].slice(-12));

      // Recherche séquentielle : les segments gardent leur ordre.
      searchQueueRef.current = searchQueueRef.current
        .then(() => identifyRecitedAyah(detail))
        .catch((error: unknown) => {

          if (!mountedRef.current) return;

          setMatchHint("تعذر البحث عن الآية");
          setMessage(
            error instanceof Error
              ? `تعذر البحث عن الآية: ${error.message}`
              : "تعذر البحث عن الآية",
          );
        });
    }

    function handleRecognitionError(event: Event) {
      const detail = (
        event as CustomEvent<RecognitionError>
      ).detail;

      if (
        !detail ||
        detail.sessionId !== displaySessionIdRef.current
      ) {
        return;
      }

      setMessage(
        `تعذر تحليل المقطع ${detail.sequence + 1}: ${detail.message}`,
      );
    }

    window.addEventListener(
      "irtaki:tartil-audio-level",
      handleAudioLevel,
    );
    window.addEventListener(
      "irtaki:tartil-recognition-status",
      handleStatus,
    );
    window.addEventListener(
      "irtaki:tartil-recognition-result",
      handleResult,
    );
    window.addEventListener(
      "irtaki:tartil-recognition-error",
      handleRecognitionError,
    );

    return () => {
      mountedRef.current = false;

      window.removeEventListener(
        "irtaki:tartil-audio-level",
        handleAudioLevel,
      );
      window.removeEventListener(
        "irtaki:tartil-recognition-status",
        handleStatus,
      );
      window.removeEventListener(
        "irtaki:tartil-recognition-result",
        handleResult,
      );
      window.removeEventListener(
        "irtaki:tartil-recognition-error",
        handleRecognitionError,
      );

      if (sessionRef.current) {
        dispatchLifecycle("stop");
      }

      releaseStream();
      sessionRef.current = null;
    };
  }, []);

  const activeSession = [
    "capturing",
    "pausing",
    "paused",
    "resuming",
    "stopping",
  ].includes(status);

  const statusLabel: Record<ControllerStatus, string> = {
    idle: "جاهز للتعرف على التلاوة",
    requesting: "جاري تفعيل الميكروفون...",
    capturing: "التعرف الصوتي يعمل",
    pausing: "جاري الإيقاف المؤقت...",
    paused: "التعرف متوقف مؤقتاً",
    resuming: "جاري استئناف التعرف...",
    stopping: "جاري إنهاء الجلسة...",
    stopped: "انتهت جلسة التعرف",
    error: "تعذر تشغيل التعرف",
  };

  const talkState: TarteelTalkState =
    status === "error"
      ? "error"
      : status === "requesting" ||
          status === "pausing" ||
          status === "resuming" ||
          status === "stopping"
        ? "loading"
        : status === "capturing"
          ? "listening"
          : status === "paused"
            ? "paused"
            : "idle";

  function toggleTalk() {
    if (
      status === "idle" ||
      status === "stopped" ||
      status === "error"
    ) {
      void startRecognition();
      return;
    }

    if (status === "capturing") {
      pauseRecognition();
      return;
    }

    if (status === "paused") {
      resumeRecognition();
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <MushafTartilRecognitionCapture />
      <MushafTartilRecognitionClient />

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <MushafTarteelTalkButton
          state={talkState}
          audioLevel={audioLevel}
          onToggle={toggleTalk}
          onStop={stopRecognition}
        />

        <span
          className="text-xs text-[var(--muted)]"
          role="status"
          aria-live="polite"
        >
          {statusLabel[status]}
        </span>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg border"
          aria-label={ayahsHidden ? "إظهار آيات الصفحة" : "إخفاء آيات الصفحة"}
          title={ayahsHidden ? "إظهار آيات الصفحة" : "إخفاء آيات الصفحة"}
          aria-pressed={ayahsHidden}
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
            {!ayahsHidden && <circle cx="12" cy="12" r="3" />}
            {ayahsHidden && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>

      {message && (
        <p className="text-sm text-rose-600" role="alert">
          {message}
        </p>
      )}

      <div
        id="irtaki-tartil-recognition-text"
        className="flex min-w-0 flex-col gap-2"
      >
      {transcript && (
        <div className="min-w-0 rounded-lg border p-3">
          <div className="mb-1 text-xs font-semibold text-[var(--muted)]">
            النص المتعرف عليه
          </div>
          <p className="text-right text-base leading-8" dir="rtl">
            {transcript}
          </p>
        </div>
      )}

      {matchedAyah && (
        <div
          className="rounded-lg border border-[var(--border)] p-3"
          role="status"
          aria-live="polite"
        >
          <div className="text-xs text-[var(--muted)]">
            الآية المحددة في المصحف
          </div>
          <div className="mt-1 font-semibold" dir="rtl">
            سورة {matchedAyah.surahName} — الآية {matchedAyah.ayahNumber}
          </div>
          <p className="mt-2 text-right text-base leading-8" dir="rtl">
            {matchedAyah.text}
          </p>
        </div>
      )}

      {!matchedAyah && matchHint && segments.length > 0 && (
        <p
          className="text-sm text-[var(--muted)]"
          role="status"
          aria-live="polite"
        >
          {matchHint}
        </p>
      )}

      {segments.length > 0 && (
        <section
          className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
          aria-label="نتائج التعرف الصوتي"
        >
          <div className="text-sm font-semibold">
            مقاطع التعرف الصوتي
          </div>

          <p className="text-xs text-[var(--muted)]">
            تعرض النتائج حسب المقاطع الصوتية. قد تتكرر بعض الكلمات بين المقاطع المتداخلة.
          </p>

          <ol className="flex max-h-48 min-w-0 flex-col gap-2 overflow-y-auto">
            {segments.map((segment) => (
              <li
                key={`${segment.sessionId}:${segment.sequence}`}
                className="rounded-md bg-[var(--muted-background)] p-2"
              >
                <div className="mb-1 text-xs text-[var(--muted)]">
                  المقطع {segment.sequence + 1}
                </div>
                <p className="text-right text-base leading-8" dir="rtl">
                  {segment.transcription || "—"}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
      </div>
    </div>
  );
}
