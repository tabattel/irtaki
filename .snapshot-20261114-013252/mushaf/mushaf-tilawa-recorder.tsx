"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AyahReference = {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
};

type PageMetadata = {
  lineNumbersByAyah: Record<string, number[]>;
  pageLineCount: number;
  pageNumber: number;
};

type RecorderCommand = {
  command: "activate" | "toggle" | "start" | "open-library";
  learnerId: string;
  ayahIds: number[];
  ayahs: AyahReference[];
  tracked: boolean;
  pageMetadata?: PageMetadata | null;
};

type CaptureContext = Omit<RecorderCommand, "command"> & {
  activityId: string | null;
  startedAt: string | null;
};

type RecorderStatus =
  | "idle"
  | "recording"
  | "paused"
  | "stopped"
  | "playing"
  | "playback-paused";

type StoredRecording = {
  id: string;
  learnerId: string;
  ayahs: AyahReference[];
  createdAt: string;
  durationMs: number;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
};

const DATABASE_NAME = "irtaki-tilawa-recordings";
const DATABASE_VERSION = 1;
const STORE_NAME = "recordings";
const PENDING_ACTIVITY_PREFIX = "irtaki.tilawa.pending.v1.";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction!.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      if (!store.indexNames.contains("learnerId")) {
        store.createIndex("learnerId", "learnerId", { unique: false });
      }

      if (!store.indexNames.contains("createdAt")) {
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("INDEXEDDB_OPEN_FAILED"));
    request.onblocked = () => reject(new Error("INDEXEDDB_BLOCKED"));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("INDEXEDDB_REQUEST_FAILED"));
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("INDEXEDDB_TRANSACTION_FAILED"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("INDEXEDDB_TRANSACTION_ABORTED"));
  });
}

async function saveRecording(recording: StoredRecording): Promise<void> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionResult(transaction);
    const request = transaction.objectStore(STORE_NAME).add(recording);

    await requestResult(request);
    await done;
  } finally {
    database.close();
  }
}

async function listRecordings(learnerId: string): Promise<StoredRecording[]> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionResult(transaction);
    const request = transaction
      .objectStore(STORE_NAME)
      .index("learnerId")
      .getAll(learnerId);

    const result = await requestResult(request);
    await done;

    return (result as StoredRecording[]).sort(
      (a, b) => b.createdAt.localeCompare(a.createdAt),
    );
  } finally {
    database.close();
  }
}

async function deleteRecording(
  id: string,
  learnerId: string,
): Promise<boolean> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionResult(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const existing = (await requestResult(store.get(id))) as
      | StoredRecording
      | undefined;

    const deleted = existing?.learnerId === learnerId;

    if (deleted) store.delete(id);

    await done;
    return deleted;
  } finally {
    database.close();
  }
}

function activeLearnerId(): string | null {
  try {
    return window.localStorage.getItem("irtaki.activeLearnerId");
  } catch {
    return null;
  }
}

function pendingActivityKey(learnerId: string): string {
  return `${PENDING_ACTIVITY_PREFIX}${learnerId}`;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatAyahReferences(ayahs: AyahReference[]): string {
  const groups = new Map<
    number,
    { name: string; numbers: number[] }
  >();

  for (const ayah of ayahs) {
    const group = groups.get(ayah.surahNumber) ?? {
      name: ayah.surahName,
      numbers: [],
    };

    group.numbers.push(ayah.ayahNumber);
    groups.set(ayah.surahNumber, group);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, group]) => {
      const numbers = [...new Set(group.numbers)].sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = numbers[0];
      let previous = numbers[0];

      for (const number of numbers.slice(1)) {
        if (number === previous + 1) {
          previous = number;
          continue;
        }

        ranges.push(
          start === previous ? String(start) : `${start}-${previous}`,
        );
        start = number;
        previous = number;
      }

      if (start !== undefined && previous !== undefined) {
        ranges.push(
          start === previous ? String(start) : `${start}-${previous}`,
        );
      }

      return `${group.name} · ${ranges.join("، ")}`;
    })
    .join(" ؛ ");
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function MushafTilawaRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryLearnerId, setLibraryLearnerId] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [message, setMessage] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(
    () => Array.from({ length: 32 }, () => 3),
  );
  const [activationReady, setActivationReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedRecordingId, setSavedRecordingId] = useState<string | null>(null);
  const [libraryPlayingId, setLibraryPlayingId] = useState<string | null>(null);
  const [libraryPlaybackPaused, setLibraryPlaybackPaused] = useState(false);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let animationFrame: number | null = null;
    let observer: MutationObserver | null = null;

    const attachToolbar = () => {
      const host = document.getElementById(
        "irtaki-tilawa-toolbar-slot",
      );

      if (!host) return false;

      animationFrame = window.requestAnimationFrame(() => {
        setToolbarHost(host);
      });

      observer?.disconnect();
      observer = null;

      return true;
    };

    if (!attachToolbar()) {
      observer = new MutationObserver(() => {
        attachToolbar();
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      observer?.disconnect();
    };
  }, []);

  const statusRef = useRef<RecorderStatus>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const captureRef = useRef<CaptureContext | null>(null);
  const pendingBlobRef = useRef<Blob | null>(null);
  const savedRecordingIdRef = useRef<string | null>(null);
  const activeSegmentStartedAtRef = useRef<number | null>(null);
  const accumulatedDurationRef = useRef(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const libraryAudioRef = useRef<HTMLAudioElement | null>(null);
  const libraryUrlRef = useRef<string | null>(null);
  const libraryOpenRef = useRef(false);
  const activationDetailRef = useRef<RecorderCommand | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const waveformLastUpdateRef = useRef(0);

  function updateStatus(next: RecorderStatus) {
    statusRef.current = next;
    setStatus(next);

    window.dispatchEvent(
      new CustomEvent("irtaki:tilawa-status", {
        detail: { status: next },
      }),
    );
  }

  async function refreshLibrary(learnerId: string) {
    const items = await listRecordings(learnerId);
    setLibraryLearnerId(learnerId);
    setRecordings(items);
  }

  function removePendingActivity(capture: CaptureContext) {
    if (!capture.activityId) return;

    try {
      const key = pendingActivityKey(capture.learnerId);
      const raw = window.sessionStorage.getItem(key);

      if (raw) {
        const pending = JSON.parse(raw) as { activityId?: unknown };
        if (pending.activityId === capture.activityId) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Le suivi audio reste prioritaire sur le nettoyage de session.
    }
  }

  async function finishTrackedActivity(
    capture: CaptureContext,
    finalStatus: "completed" | "failed" | "skipped",
  ) {
    if (!capture.tracked || !capture.activityId) return;

    const response = await fetch("/api/learning/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "finish",
        learnerId: capture.learnerId,
        activityId: capture.activityId,
        status: finalStatus,
        ayahIds: capture.ayahIds,
        ...(capture.pageMetadata
          ? {
              lineNumbersByAyah: capture.pageMetadata.lineNumbersByAyah,
              pageLineCount: capture.pageMetadata.pageLineCount,
              pageNumber: capture.pageMetadata.pageNumber,
            }
          : {}),
      }),
    });

    // HTTP 409 correspond notamment à une activité déjà clôturée.
    if (!response.ok && response.status !== 409) {
      throw new Error(`ACTIVITY_FINISH_FAILED_${response.status}`);
    }

    removePendingActivity(capture);
  }

  function stopWaveformAnimation() {
    if (waveformFrameRef.current !== null) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }
  }

  function stopWaveformVisualization(closeContext = false) {
    stopWaveformAnimation();

    if (!closeContext) return;

    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    analyserRef.current = null;

    const context = audioContextRef.current;
    audioContextRef.current = null;

    if (context && context.state !== "closed") {
      void context.close().catch(() => {});
    }
  }

  function startWaveformVisualization(stream: MediaStream) {
    try {
      if (
        !audioContextRef.current ||
        audioContextRef.current.state === "closed"
      ) {
        const context = new window.AudioContext();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;

        source.connect(analyser);

        audioContextRef.current = context;
        audioSourceRef.current = source;
        analyserRef.current = analyser;
      }

      const context = audioContextRef.current;
      const analyser = analyserRef.current;

      if (!context || !analyser || waveformFrameRef.current !== null) {
        return;
      }

      if (context.state === "suspended") {
        void context.resume().catch(() => {});
      }

      const samples = new Uint8Array(analyser.fftSize);

      const draw = (timestamp: number) => {
        const activeAnalyser = analyserRef.current;

        if (!activeAnalyser) {
          waveformFrameRef.current = null;
          return;
        }

        waveformFrameRef.current =
          window.requestAnimationFrame(draw);

        if (timestamp - waveformLastUpdateRef.current < 80) return;

        waveformLastUpdateRef.current = timestamp;
        activeAnalyser.getByteTimeDomainData(samples);

        const levels = Array.from({ length: 32 }, (_, index) => {
          const start = Math.floor(index * samples.length / 32);
          const end = Math.max(
            start + 1,
            Math.floor((index + 1) * samples.length / 32),
          );

          let total = 0;

          for (let i = start; i < end; i += 1) {
            total += Math.abs(samples[i] - 128);
          }

          const average = total / (end - start);

          return Math.max(3, Math.min(30, Math.round(average * 1.5)));
        });

        setWaveformLevels(levels);
      };

      waveformLastUpdateRef.current = 0;
      waveformFrameRef.current = window.requestAnimationFrame(draw);
    } catch {
      // La visualisation est facultative : elle ne doit pas interrompre
      // l'enregistrement si AudioContext n'est pas disponible.
    }
  }

  function releaseStream() {
    stopWaveformVisualization(true);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function releasePreview() {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function resetCapture() {
    releaseStream();
    releasePreview();
    recorderRef.current = null;
    captureRef.current = null;
    activationDetailRef.current = null;
    setActivationReady(false);
    pendingBlobRef.current = null;
    savedRecordingIdRef.current = null;
    setSavedRecordingId(null);
    setDurationMs(0);
    accumulatedDurationRef.current = 0;
    activeSegmentStartedAtRef.current = null;
    setBusy(false);
    setLibraryOpen(false);
    setMessage("");
    updateStatus("idle");
  }

  async function startRecording(detail: RecorderCommand) {
    if (statusRef.current !== "idle") return;

    setMessage("");

    if (!detail.learnerId) {
      setMessage("اختر المستخدم الحالي أولاً");
      return;
    }

    if (detail.ayahIds.length === 0 || detail.ayahs.length === 0) {
      setMessage("تعذر تحديد الآيات المرتبطة بالتسجيل");
      return;
    }

    let stream: MediaStream | null = null;
    let capture: CaptureContext | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("MICROPHONE_NOT_AVAILABLE");
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("MEDIA_RECORDER_NOT_SUPPORTED");
      }

      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];

      const supportedMime = mimeCandidates.find((mime) =>
        MediaRecorder.isTypeSupported(mime),
      );

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      let activityId: string | null = null;
      let startedAt: string | null = null;

      if (detail.tracked) {
        const response = await fetch("/api/learning/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "start",
            learnerId: detail.learnerId,
            action: "recite",
            ayahIds: detail.ayahIds,
            ...(detail.pageMetadata
              ? {
                  lineNumbersByAyah: detail.pageMetadata.lineNumbersByAyah,
                  pageLineCount: detail.pageMetadata.pageLineCount,
                  pageNumber: detail.pageMetadata.pageNumber,
                }
              : {}),
          }),
        });

        const result = (await response.json().catch(() => null)) as
          | { activityId?: unknown; startedAt?: unknown }
          | null;

        if (
          !response.ok ||
          !result ||
          typeof result.activityId !== "string" ||
          result.activityId.length === 0
        ) {
          throw new Error(`ACTIVITY_START_FAILED_${response.status}`);
        }

        activityId = result.activityId;
        startedAt =
          typeof result.startedAt === "string"
            ? result.startedAt
            : new Date().toISOString();
      }

      capture = {
        learnerId: detail.learnerId,
        ayahIds: detail.ayahIds,
        ayahs: detail.ayahs,
        tracked: detail.tracked,
        pageMetadata: detail.pageMetadata ?? null,
        activityId,
        startedAt,
      };

      captureRef.current = capture;

      if (capture.tracked && capture.activityId) {
        window.sessionStorage.setItem(
          pendingActivityKey(capture.learnerId),
          JSON.stringify({
            activityId: capture.activityId,
            learnerId: capture.learnerId,
            ayahIds: capture.ayahIds,
            pageMetadata: capture.pageMetadata,
            startedAt: capture.startedAt,
          }),
        );
      }

      chunksRef.current = [];
      pendingBlobRef.current = null;
      savedRecordingIdRef.current = null;
      setSavedRecordingId(null);
      accumulatedDurationRef.current = 0;
      activeSegmentStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setMessage("حدث خطأ أثناء التسجيل الصوتي");
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        releaseStream();
        recorderRef.current = null;
        setDurationMs(accumulatedDurationRef.current);

        if (blob.size === 0) {
          setMessage("التسجيل فارغ ولم يتم حفظه");
          const failedCapture = captureRef.current;

          if (failedCapture) {
            void finishTrackedActivity(failedCapture, "failed").catch(() => {
              setMessage("تعذر إغلاق نشاط التلاوة؛ سيُعاد التحقق لاحقاً");
            });
          }

          updateStatus("idle");
          return;
        }

        pendingBlobRef.current = blob;
        updateStatus("stopped");
      };

      recorderRef.current = recorder;
      recorder.start(250);
      setDurationMs(0);
      setWaveformLevels(Array.from({ length: 32 }, () => 3));
      startWaveformVisualization(stream);
      updateStatus("recording");
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;

      if (capture?.activityId) {
        try {
          await finishTrackedActivity(capture, "failed");
        } catch {
          // L'activité interrompue sera récupérée à la prochaine ouverture.
        }
      }

      const reason =
        error instanceof Error ? error.message : "UNKNOWN_RECORDING_ERROR";

      setMessage(
        reason.includes("NotAllowedError") ||
          reason.includes("Permission")
          ? "يجب السماح باستعمال الميكروفون"
          : reason.includes("NotFoundError")
            ? "لم يتم العثور على ميكروفون"
            : "تعذر بدء التسجيل الصوتي",
      );

      updateStatus("idle");
    }
  }

  function pauseRecording() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "recording") return;

    try {
      recorder.pause();
      stopWaveformAnimation();

      if (activeSegmentStartedAtRef.current !== null) {
        accumulatedDurationRef.current +=
          Date.now() - activeSegmentStartedAtRef.current;
        activeSegmentStartedAtRef.current = null;
      }

      setDurationMs(accumulatedDurationRef.current);
      updateStatus("paused");
    } catch {
      setMessage("تعذر إيقاف التسجيل مؤقتاً");
    }
  }

  function resumeRecording() {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state !== "paused") return;

    try {
      recorder.resume();
      activeSegmentStartedAtRef.current = Date.now();

      if (streamRef.current) {
        startWaveformVisualization(streamRef.current);
      }

      updateStatus("recording");
    } catch {
      setMessage("تعذر استئناف التسجيل");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;

    if (
      !recorder ||
      (recorder.state !== "recording" && recorder.state !== "paused")
    ) {
      return;
    }

    if (activeSegmentStartedAtRef.current !== null) {
      accumulatedDurationRef.current +=
        Date.now() - activeSegmentStartedAtRef.current;
      activeSegmentStartedAtRef.current = null;
    }

    try {
      recorder.stop();
      stopWaveformAnimation();
    } catch {
      setMessage("تعذر إيقاف التسجيل");
    }
  }

  function playPreview() {
    const blob = pendingBlobRef.current;
    if (!blob) return;

    releasePreview();

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    previewUrlRef.current = url;
    previewAudioRef.current = audio;

    audio.onended = () => {
      releasePreview();
      updateStatus("stopped");
    };

    audio.onerror = () => {
      releasePreview();
      updateStatus("stopped");
      setMessage("تعذر تشغيل التسجيل");
    };

    void audio
      .play()
      .then(() => updateStatus("playing"))
      .catch(() => {
        releasePreview();
        updateStatus("stopped");
        setMessage("تعذر تشغيل التسجيل");
      });
  }

  function toggleControl() {
    const current = statusRef.current;

    if (current === "recording") {
      pauseRecording();
      return;
    }

    if (current === "paused") {
      resumeRecording();
      return;
    }

    if (current === "stopped") {
      playPreview();
      return;
    }

    if (current === "playing") {
      previewAudioRef.current?.pause();
      updateStatus("playback-paused");
      return;
    }

    if (current === "playback-paused") {
      const audio = previewAudioRef.current;

      if (audio) {
        void audio
          .play()
          .then(() => updateStatus("playing"))
          .catch(() => setMessage("تعذر استئناف التشغيل"));
      }
    }
  }

  async function savePendingRecording() {
    if (busy) return;

    const capture = captureRef.current;
    const blob = pendingBlobRef.current;

    if (!capture || !blob) return;

    setBusy(true);
    setMessage("");

    try {
      if (!savedRecordingIdRef.current) {
        const recording: StoredRecording = {
          id: createId(),
          learnerId: capture.learnerId,
          ayahs: capture.ayahs,
          createdAt: new Date().toISOString(),
          durationMs: accumulatedDurationRef.current,
          mimeType: blob.type || "audio/webm",
          sizeBytes: blob.size,
          blob,
        };

        await saveRecording(recording);
        savedRecordingIdRef.current = recording.id;
        setSavedRecordingId(recording.id);
      }

      if (capture.tracked) {
        try {
          await finishTrackedActivity(capture, "completed");
        } catch {
          await refreshLibrary(capture.learnerId).catch(() => {});
          setMessage(
            "تم حفظ الصوت، لكن تعذر إغلاق نشاط التلاوة. اضغط إعادة المحاولة.",
          );
          return;
        }
      }

      resetCapture();
    } catch {
      setMessage("تعذر حفظ التسجيل في ذاكرة الجهاز");
    } finally {
      setBusy(false);
    }
  }

  async function retryTrackedActivity() {
    const capture = captureRef.current;
    if (!capture || !capture.tracked || !savedRecordingIdRef.current) return;

    setBusy(true);

    try {
      await finishTrackedActivity(capture, "completed");
      resetCapture();
    } catch {
      setMessage("تعذر تحديث نشاط التلاوة؛ لم يتم حذف التسجيل المحفوظ");
    } finally {
      setBusy(false);
    }
  }

  async function discardPendingRecording() {
    if (busy) return;

    if (recorderRef.current?.state === "recording" ||
        recorderRef.current?.state === "paused") {
      setMessage("أوقف التسجيل أولاً ثم احذفه");
      return;
    }

    const capture = captureRef.current;

    setBusy(true);

    try {
      if (capture) await finishTrackedActivity(capture, "skipped");
      resetCapture();
    } catch {
      setMessage("تعذر إغلاق النشاط؛ لم يتم حذف بيانات التسجيل");
    } finally {
      setBusy(false);
    }
  }

  async function loadLibrary(learnerId: string) {
    try {
      await refreshLibrary(learnerId);
    } catch {
      setMessage("تعذر قراءة التسجيلات المحفوظة");
    }
  }

  function openLibrary(learnerId: string) {
    if (!learnerId) {
      setMessage("اختر المستخدم الحالي أولاً");
      return;
    }

    libraryOpenRef.current = true;
    setLibraryOpen(true);
    void loadLibrary(learnerId);
  }

  function toggleLibraryPlayback(recording: StoredRecording) {
    if (
      libraryPlayingId === recording.id &&
      libraryAudioRef.current
    ) {
      if (libraryAudioRef.current.paused) {
        void libraryAudioRef.current.play().then(() => {
          setLibraryPlaybackPaused(false);
        });
      } else {
        libraryAudioRef.current.pause();
        setLibraryPlaybackPaused(true);
      }
      return;
    }

    libraryAudioRef.current?.pause();

    if (libraryUrlRef.current) {
      URL.revokeObjectURL(libraryUrlRef.current);
    }

    const url = URL.createObjectURL(recording.blob);
    const audio = new Audio(url);

    libraryUrlRef.current = url;
    libraryAudioRef.current = audio;
    setLibraryPlayingId(recording.id);
    setLibraryPlaybackPaused(false);

    audio.onended = () => {
      setLibraryPlayingId(null);
      setLibraryPlaybackPaused(false);

      if (libraryUrlRef.current) {
        URL.revokeObjectURL(libraryUrlRef.current);
        libraryUrlRef.current = null;
      }

      libraryAudioRef.current = null;
    };

    audio.onerror = () => {
      setLibraryPlayingId(null);
      setLibraryPlaybackPaused(false);
      setMessage("تعذر تشغيل التسجيل المحفوظ");
    };

    void audio.play().catch(() => {
      setMessage("تعذر تشغيل التسجيل المحفوظ");
      setLibraryPlayingId(null);
    });
  }

  function downloadRecording(recording: StoredRecording) {
    const url = URL.createObjectURL(recording.blob);
    const anchor = document.createElement("a");
    const extension = recording.mimeType.includes("mp4") ? "m4a" : "webm";

    anchor.href = url;
    anchor.download = `irtaki-tilawa-${recording.createdAt.slice(0, 10)}.${extension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function removeSavedRecording(recording: StoredRecording) {
    if (!window.confirm("حذف هذا التسجيل نهائياً من هذا الجهاز؟")) return;

    try {
      if (libraryPlayingId === recording.id) {
        libraryAudioRef.current?.pause();
        libraryAudioRef.current = null;
        setLibraryPlayingId(null);

        if (libraryUrlRef.current) {
          URL.revokeObjectURL(libraryUrlRef.current);
          libraryUrlRef.current = null;
        }
      }

      await deleteRecording(recording.id, recording.learnerId);
      await loadLibrary(recording.learnerId);
    } catch {
      setMessage("تعذر حذف التسجيل");
    }
  }

  function handleCommand(detail: RecorderCommand) {
    if (detail.command === "open-library") {
      openLibrary(detail.learnerId);
      return;
    }


    if (detail.command === "activate") {
      if (statusRef.current === "idle") {
        activationDetailRef.current = detail;
        setActivationReady(true);
      }
      return;
    }

    if (detail.command === "start") {
      if (statusRef.current === "idle") {
        activationDetailRef.current = detail;
        setActivationReady(true);
        void startRecording(detail);
      }
      return;
    }

    if (detail.command === "toggle") {
      if (statusRef.current === "idle") {
        activationDetailRef.current = detail;
        setActivationReady(true);
        void startRecording(detail);
      } else {
        toggleControl();
      }
      return;
    }
  }

  useEffect(() => {
    function handleCommandEvent(event: Event) {
      const detail = (event as CustomEvent<RecorderCommand>).detail;
      if (detail) handleCommand(detail);
    }

    window.addEventListener("irtaki:tilawa-command", handleCommandEvent);

    return () => {
      window.removeEventListener("irtaki:tilawa-command", handleCommandEvent);
    };
  }, []);

  useEffect(() => {
    libraryOpenRef.current = libraryOpen;
  }, [libraryOpen]);

  useEffect(() => {
    if (status !== "recording") return;

    const timer = window.setInterval(() => {
      const startedAt = activeSegmentStartedAtRef.current;

      if (startedAt !== null) {
        setDurationMs(
          accumulatedDurationRef.current + Date.now() - startedAt,
        );
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    function handleLearnerChange() {
      const learnerId = activeLearnerId();
      if (!learnerId) return;

      setLibraryLearnerId(learnerId);

      if (libraryOpenRef.current) {
        void loadLibrary(learnerId);
      }
    }

    window.addEventListener("irtaki:active-learner-changed", handleLearnerChange);
    window.addEventListener("storage", handleLearnerChange);

    return () => {
      window.removeEventListener(
        "irtaki:active-learner-changed",
        handleLearnerChange,
      );
      window.removeEventListener("storage", handleLearnerChange);
    };
  }, []);

  useEffect(() => {
    async function recoverInterruptedActivities() {
      const keys: string[] = [];

      try {
        for (let index = 0; index < window.sessionStorage.length; index += 1) {
          const key = window.sessionStorage.key(index);
          if (key?.startsWith(PENDING_ACTIVITY_PREFIX)) keys.push(key);
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
            ayahIds?: unknown;
            pageMetadata?: PageMetadata | null;
            startedAt?: unknown;
          };

          if (
            typeof pending.learnerId !== "string" ||
            typeof pending.activityId !== "string" ||
            !Array.isArray(pending.ayahIds) ||
            !pending.ayahIds.every(
              (id) => typeof id === "number" && Number.isInteger(id),
            )
          ) {
            continue;
          }

          const capture: CaptureContext = {
            learnerId: pending.learnerId,
            activityId: pending.activityId,
            ayahIds: pending.ayahIds as number[],
            ayahs: [],
            tracked: true,
            pageMetadata: pending.pageMetadata ?? null,
            startedAt:
              typeof pending.startedAt === "string"
                ? pending.startedAt
                : null,
          };

          await finishTrackedActivity(capture, "failed");
        } catch {
          // Garder l'entrée pour une prochaine tentative si le serveur est indisponible.
        }
      }
    }

    void recoverInterruptedActivities();
  }, []);

  useEffect(() => {
    return () => {
      const capture = captureRef.current;
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Le flux est fermé ci-dessous.
        }
      }

      releaseStream();
      previewAudioRef.current?.pause();
      libraryAudioRef.current?.pause();

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (libraryUrlRef.current) URL.revokeObjectURL(libraryUrlRef.current);

      if (capture?.activityId) {
        void finishTrackedActivity(capture, "failed").catch(() => {});
      }
    };
  }, []);

  const statusLabel: Record<RecorderStatus, string> = {
    idle: "جاهز — اضغط الميكروفون الأحمر لبدء التسجيل",
    recording: "جاري التسجيل",
    paused: "التسجيل متوقف مؤقتاً",
    stopped: "انتهى التسجيل — احفظه أو احذفه",
    playing: "تشغيل التسجيل",
    "playback-paused": "تشغيل التسجيل متوقف مؤقتاً",
  };

  const toolbarContent = (
    <>
      {/* Afficheur sonore miniature : chronomètre + forme d'onde */}
      <div
        className="inline-flex h-10 min-w-[5.75rem] select-none items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2"
        role="img"
        aria-label={`${statusLabel[status]} · ${formatDuration(durationMs)}`}
        title={statusLabel[status]}
      >
        <span
          dir="ltr"
          className="font-mono text-xs font-semibold tabular-nums"
        >
          {formatDuration(durationMs)}
        </span>

        <span className="flex h-6 w-7 items-center justify-center gap-px">
          {waveformLevels
            .filter((_, index) => index % 3 === 0)
            .slice(0, 10)
            .map((level, index) => (
              <span
                key={index}
                className={[
                  "w-[2px] shrink-0 rounded-full transition-[height] duration-75",
                  status === "recording"
                    ? "bg-rose-600"
                    : "bg-[var(--muted-foreground)]",
                ].join(" ")}
                style={{
                  height: `${Math.max(3, Math.min(level, 22))}px`,
                }}
              />
            ))}
        </span>

        {status === "recording" ? (
          <span
            className="h-2 w-2 animate-pulse rounded-full bg-rose-600"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {/* Micro réservé au contexte d'activation d'une activité suivie */}
      {status === "idle" && activationReady && (
        <button
          type="button"
          className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-rose-600 bg-rose-600 px-3 text-white"
          aria-label="بدء تسجيل التلاوة"
          title="بدء تسجيل التلاوة"
          onClick={() => {
            const detail = activationDetailRef.current;

            if (!detail) {
              setMessage("حدد الآيات أولاً");
              return;
            }

            void startRecording(detail);
          }}
        >
          🎙️
        </button>
      )}

      {/* Arrêt */}
      {(status === "recording" || status === "paused") && (
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm"
          aria-label="إيقاف التسجيل"
          title="إيقاف التسجيل"
          onClick={stopRecording}
        >
          ⏹
        </button>
      )}

      {/* Lecture / pause de la préécoute */}
      {(status === "stopped" ||
        status === "playing" ||
        status === "playback-paused") && (
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm"
          aria-label={
            status === "playing"
              ? "إيقاف تشغيل التسجيل مؤقتاً"
              : "تشغيل التسجيل"
          }
          title={
            status === "playing"
              ? "إيقاف التشغيل مؤقتاً"
              : "تشغيل التسجيل"
          }
          onClick={() => {
            if (status === "stopped") {
              playPreview();
            } else {
              toggleControl();
            }
          }}
        >
          {status === "playing" ? "⏸" : "▶"}
        </button>
      )}

      {/* Sauvegarde et suppression */}
      {status === "stopped" && !savedRecordingId && (
        <>
          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm"
            disabled={busy}
            aria-label="حفظ التسجيل"
            title="حفظ التسجيل"
            onClick={() => void savePendingRecording()}
          >
            {busy ? "…" : "💾"}
          </button>

          <button
            type="button"
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm"
            disabled={busy}
            aria-label="حذف التسجيل الحالي"
            title="حذف التسجيل الحالي"
            onClick={() => void discardPendingRecording()}
          >
            🗑
          </button>
        </>
      )}

      {/* Nouvelle tentative de clôture du suivi */}
      {status === "stopped" && savedRecordingId && (
        <button
          type="button"
          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-3 py-2 text-sm"
          disabled={busy}
          aria-label="إعادة محاولة تحديث النشاط"
          title="إعادة محاولة تحديث النشاط"
          onClick={() => void retryTrackedActivity()}
        >
          {busy ? "…" : "↻"}
        </button>
      )}

      {/* Bibliothèque */}
      <button
        type="button"
        className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm"
        aria-label="التسجيلات المحفوظة"
        aria-expanded={libraryOpen}
        title="التسجيلات المحفوظة"
        onClick={() => {
          const learnerId = activeLearnerId();

          if (!learnerId) {
            setMessage("اختر المستخدم الحالي أولاً");
            return;
          }

          setMessage("");
          setLibraryLearnerId(learnerId);

          setLibraryOpen((current) => {
            const next = !current;
            libraryOpenRef.current = next;

            if (next) void loadLibrary(learnerId);

            return next;
          });
        }}
      >
        📁 التسجيلات
      </button>

      {/* Messages */}
      {message ? (
        <p
          className="w-full basis-full rounded-lg border border-[var(--border)] p-2 text-xs"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      {/* Bibliothèque dépliée sous la même barre */}
      {libraryOpen && (
        <section
          className="max-h-64 w-full min-w-0 basis-full overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] p-3"
          aria-label="التسجيلات المحفوظة لهذا المتعلم"
        >
          <h3 className="mb-3 text-sm font-semibold">
            التسجيلات المحفوظة لهذا المتعلم
          </h3>

          {!libraryLearnerId ? (
            <p className="text-sm">لا يوجد متعلم محدد.</p>
          ) : recordings.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              لا توجد تسجيلات محفوظة لهذا المتعلم على هذا الجهاز.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recordings.map((recording) => (
                <article
                  key={recording.id}
                  className="flex min-w-0 flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="text-sm font-medium">
                    {formatAyahReferences(recording.ayahs)}
                  </div>

                  <div className="text-xs text-[var(--muted-foreground)]">
                    {new Intl.DateTimeFormat("ar", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(recording.createdAt))}
                    {" · "}
                    {formatDuration(recording.durationMs)}
                    {" · "}
                    {(recording.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-10 rounded-lg border px-3 py-2 text-sm"
                      aria-label={
                        libraryPlayingId === recording.id &&
                        !libraryPlaybackPaused
                          ? "إيقاف التسجيل المحفوظ مؤقتاً"
                          : "تشغيل التسجيل المحفوظ"
                      }
                      onClick={() => toggleLibraryPlayback(recording)}
                    >
                      {libraryPlayingId === recording.id &&
                      !libraryPlaybackPaused
                        ? "⏸ إيقاف"
                        : "▶ تشغيل"}
                    </button>

                    <button
                      type="button"
                      className="min-h-10 rounded-lg border px-3 py-2 text-sm"
                      aria-label="تنزيل التسجيل"
                      onClick={() => downloadRecording(recording)}
                    >
                      ⬇ تنزيل
                    </button>

                    <button
                      type="button"
                      className="min-h-10 rounded-lg border px-3 py-2 text-sm"
                      aria-label="حذف التسجيل المحفوظ"
                      onClick={() => void removeSavedRecording(recording)}
                    >
                      🗑 حذف
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );

  return toolbarHost ? createPortal(toolbarContent, toolbarHost) : null;
}

