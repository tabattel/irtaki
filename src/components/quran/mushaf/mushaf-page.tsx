"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  getAyahsByPage,
  getAyahsBySurah,
  getSurahs,
  type AyahDto,
} from "@/lib/api/quran";
import { getMushafPageLayout, type MushafPageLayout } from "@/lib/api/mushaf";

import { MushafLine } from "./mushaf-line";

type MushafPageProps = {
  mushafId: number;
  riwayaId: number;
  pageNumber: number;
  selectedAyahId?: number;
};

type InteractionMode = "idle" | "possible-tap" | "long-press" | "swipe";

type WordSelection = {
  key: string;
  surah: number;
  ayah: number;
  word: number;
};

type MenuState = null | {
  type: "ayah" | "word" | "selection" | "app-secondary";
  ayahId?: number;
};

type SecondaryMode =
  | "qiraa"
  | "listening"
  | "recitation"
  | "talqin"
  | "memorization"
  | "tathbit"
  | "review"
  | "tadabbur"
  | "khatma"
  | "tahajjud"
  | "progress";

const SECONDARY_MODES: Array<{
  id: SecondaryMode;
  label: string;
  icon: string;
}> = [
  { id: "qiraa", label: "القراءة", icon: "📖" },
  { id: "listening", label: "الاستماع", icon: "🎧" },
  { id: "recitation", label: "التلاوة", icon: "🎙️" },
  { id: "talqin", label: "التلقين", icon: "🗣️" },
  { id: "memorization", label: "الحفظ", icon: "🧠" },
  { id: "tathbit", label: "التثبيت", icon: "📌" },
  { id: "review", label: "المراجعة", icon: "🔄" },
  { id: "tadabbur", label: "التدبر", icon: "👓" },
  { id: "khatma", label: "الختمة", icon: "📿" },
  { id: "tahajjud", label: "التهجد", icon: "🌙" },
  { id: "progress", label: "المتابعة", icon: "📊" },
];

const TOTAL_PAGES = 604;
const LONG_PRESS_MS = 550;

const AUDIO_RECITER_STORAGE_KEY = "irtaki.audio.reciter";
const AUDIO_CONTINUATION_STORAGE_KEY = "irtaki.audio.continuation";
const AUDIO_RATE_STORAGE_KEY = "irtaki.audio.playback-rate";
const AUDIO_AUTOPLAY_NEXT_STORAGE_KEY = "irtaki.audio.autoplay-next";
const AUDIO_SETTINGS_STORAGE_KEY = "irtaki.audio.settings";
const AUDIO_LOOP_STORAGE_KEY = "irtaki.audio.loop";
const REPEAT_VALUES = ["1", "2", "3", "5", "n"] as const;
const SILENCE_VALUES = ["0", "0.5", "0.75", "1", "1.25", "1.5", "2"] as const;

type AudioLoop = {
  startSurah: number;
  startAyah: number;
  startPage: number;
  pass: number;
};

type AudioContinuation = {
  reciterId: string;
  surahNumber: number;
  ayahNumber: number;
  endSurahNumber: number;
  endAyahNumber: number;
  playbackRate: number;
};
const MOVE_THRESHOLD = 20;
const SWIPE_THRESHOLD = 50;

export function MushafPage({
  mushafId,
  riwayaId,
  pageNumber,
  selectedAyahId: externalSelectedAyahId,
}: MushafPageProps) {
  const router = useRouter();

  const [ayahs, setAyahs] = useState<AyahDto[]>([]);
  const [layout, setLayout] = useState<MushafPageLayout | null>(null);
  const [surahs, setSurahs] = useState<Awaited<ReturnType<typeof getSurahs>>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAyahId, setSelectedAyahId] = useState<number | undefined>(
    externalSelectedAyahId,
  );

  const [selectedWords, setSelectedWords] = useState<Set<string>>(
    () => new Set(),
  );

  const [menu, setMenu] = useState<MenuState>(null);
  const [secondaryMode, setSecondaryMode] =
    useState<SecondaryMode>("listening");
  const secondaryModeRef = useRef<SecondaryMode>("listening");
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [reciterPickerOpen, setReciterPickerOpen] = useState(false);
  const [selectedReciter, setSelectedReciter] = useState(() => {
    if (typeof window === "undefined") {
      return "hafs-afassi";
    }

    return (
      window.localStorage.getItem(AUDIO_RECITER_STORAGE_KEY) ?? "hafs-afassi"
    );
  });
  const [audioStartSurah, setAudioStartSurah] = useState("");
  const [audioStartAyah, setAudioStartAyah] = useState("");
  const [audioEndSurah, setAudioEndSurah] = useState("114");
  const [audioEndAyah, setAudioEndAyah] = useState("6");
  const [audioStartSurahQuery, setAudioStartSurahQuery] = useState("");
  const [audioEndSurahQuery, setAudioEndSurahQuery] = useState("");
  const [audioStartSurahPickerOpen, setAudioStartSurahPickerOpen] =
    useState(false);
  const [audioEndSurahPickerOpen, setAudioEndSurahPickerOpen] = useState(false);
  const [audioStartSurahPickerQuery, setAudioStartSurahPickerQuery] =
    useState("");
  const [audioEndSurahPickerQuery, setAudioEndSurahPickerQuery] = useState("");
  const [audioStartPage, setAudioStartPage] = useState(String(pageNumber));
  const [audioEndPage, setAudioEndPage] = useState("604");
  const audioRangeUserModifiedRef = useRef(false);
  const modeSelectionContextRef = useRef<string | null>(null);
  const [ayahRepeatCount, setAyahRepeatCount] = useState("1");
  const [selectionRepeatCount, setSelectionRepeatCount] = useState("1");
  const [ayahRepeatOptionsOpen, setAyahRepeatOptionsOpen] = useState(false);
  const [selectionRepeatOptionsOpen, setSelectionRepeatOptionsOpen] =
    useState(false);
  const [silenceBeforeAyah, setSilenceBeforeAyah] = useState("0");
  const [silenceAfterAyah, setSilenceAfterAyah] = useState("0");
  const [silenceBeforeSelection, setSilenceBeforeSelection] = useState("0");
  const [silenceAfterSelection, setSilenceAfterSelection] = useState("0");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [secondaryMessage, setSecondaryMessage] = useState<string | null>(null);

  const interactionRef = useRef<{
    mode: InteractionMode;
    pointerId: number;
    startX: number;
    startY: number;
    currentKey?: string;
    timer?: ReturnType<typeof setTimeout>;
  }>({
    mode: "idle",
    pointerId: -1,
    startX: 0,
    startY: 0,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSourceKeyRef = useRef<string | null>(null);
  const audioContinuationHandledRef = useRef(false);
  const audioShouldContinueRef = useRef(false);
  const audioPlaybackCancelledRef = useRef(false);
  const silenceCancelRef = useRef<(() => void) | null>(null);
  const silenceDoneRef = useRef(false);
  const ayahPlayCountRef = useRef(1);
  const handleEndedRef = useRef<() => void>(() => {});
  const audioSettingsRef = useRef({
    ayahRepeat: "1",
    selectionRepeat: "1",
    silenceBeforeAyah: "0",
    silenceAfterAyah: "0",
    silenceBeforeSelection: "0",
    silenceAfterSelection: "0",
  });
  const [audioSettingsLoaded, setAudioSettingsLoaded] = useState(false);
  const selectionRepeatRemainingRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ayahData, layoutData, surahData] = await Promise.all([
          getAyahsByPage(pageNumber),
          getMushafPageLayout(mushafId, pageNumber),
          getSurahs(),
        ]);

        if (!cancelled) {
          setAyahs(ayahData);
          setLayout(layoutData);
          setSurahs(surahData);
          setSelectedAyahId(externalSelectedAyahId);
          setSelectedWords(new Set());
          setMenu(null);
        }
      } catch {
        if (!cancelled) {
          setAyahs([]);
          setLayout(null);
          setError("تعذر تحميل الصفحة.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mushafId, pageNumber]);

  // Restaurer le dernier mode avant de sauvegarder la position de page.
  useEffect(() => {
    const storageKey = `irtaki.mushaf.mode.${mushafId}.${riwayaId}`;
    let storedMode: string | null = null;

    try {
      storedMode = window.localStorage.getItem(storageKey);
    } catch {
      // Utiliser le mode par défaut si le stockage est indisponible.
    }

    const savedMode = SECONDARY_MODES.find(
      (candidate) => candidate.id === storedMode,
    )?.id;
    const initialMode: SecondaryMode = savedMode ?? "listening";

    secondaryModeRef.current = initialMode;
    setSecondaryMode(initialMode);

    if (!savedMode) {
      try {
        window.localStorage.setItem(storageKey, initialMode);
      } catch {
        // Le lecteur reste utilisable sans stockage local.
      }
    }
  }, [mushafId, riwayaId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `irtaki.mushaf.position.${mushafId}.${riwayaId}.${secondaryModeRef.current}`,
        String(pageNumber),
      );
    } catch {
      // Le lecteur reste utilisable si le stockage est indisponible.
    }
  }, [pageNumber, mushafId, riwayaId]);

  function navigatePage(delta: number) {
    const nextPage = Math.max(1, Math.min(TOTAL_PAGES, pageNumber + delta));

    if (nextPage === pageNumber) {
      return;
    }

    router.push(`/coran/${riwayaId}/page/${nextPage}`);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          navigatePage(1);
          break;

        case "ArrowRight":
          event.preventDefault();
          navigatePage(-1);
          break;

        case "ArrowUp":
          event.preventDefault();
          setMenu({
            type: "selection",
          });
          break;

        case "ArrowDown":
          event.preventDefault();
          setMenu({
            type: "ayah",
            ayahId: selectedAyahId,
          });
          break;

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [pageNumber, selectedAyahId]);

  function getWordFromPoint(x: number, y: number): WordSelection | null {
    const element = document.elementFromPoint(x, y);

    const word = element?.closest<HTMLElement>("[data-mushaf-word]");

    if (!word) {
      return null;
    }

    const key = word.dataset.wordKey;

    if (!key) {
      return null;
    }

    return {
      key,
      surah: Number(word.dataset.surahNumber),
      ayah: Number(word.dataset.ayahNumber),
      word: Number(word.dataset.wordNumber),
    };
  }

  function getAyahFromPoint(x: number, y: number): AyahDto | null {
    const element = document.elementFromPoint(x, y);

    const ayahElement = element?.closest<HTMLElement>("[data-mushaf-ayah]");

    if (!ayahElement) {
      return null;
    }

    const ayahId = Number(ayahElement.dataset.ayahId);

    return ayahs.find((ayah) => ayah.id === ayahId) ?? null;
  }

  /**
   * Sélectionne toute la plage située entre le premier
   * et le dernier mot dans l'ordre du Mushaf.
   */
  function getWordRange(firstKey: string, lastKey: string): Set<string> {
    const words = Array.from(
      document.querySelectorAll<HTMLElement>("[data-mushaf-word]"),
    );

    const firstIndex = words.findIndex(
      (word) => word.dataset.wordKey === firstKey,
    );

    const lastIndex = words.findIndex(
      (word) => word.dataset.wordKey === lastKey,
    );

    if (firstIndex === -1 || lastIndex === -1) {
      return new Set([firstKey, lastKey]);
    }

    const start = Math.min(firstIndex, lastIndex);

    const end = Math.max(firstIndex, lastIndex);

    return new Set(
      words
        .slice(start, end + 1)
        .map((word) => word.dataset.wordKey)
        .filter((key): key is string => Boolean(key)),
    );
  }

  function selectWord(word: WordSelection) {
    setSelectedWords(new Set([word.key]));
    setSelectedAyahId(undefined);
    setMenu({
      type: "word",
    });
  }

  function handleDoubleClick(event: ReactPointerEvent<HTMLElement>) {
    const word = getWordFromPoint(event.clientX, event.clientY);

    if (!word) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    selectWord(word);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) {
      return;
    }

    const word = getWordFromPoint(event.clientX, event.clientY);

    const ayah = getAyahFromPoint(event.clientX, event.clientY);

    if (!word && !ayah) {
      return;
    }

    const state = interactionRef.current;

    state.mode = "possible-tap";
    state.pointerId = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.currentKey = word?.key;

    /*
     * Appui long :
     * uniquement si le doigt reste suffisamment stable.
     */
    state.timer = setTimeout(() => {
      const current = interactionRef.current;

      if (current.mode !== "possible-tap" || !current.currentKey) {
        return;
      }

      const longWord = getWordFromPoint(current.startX, current.startY);

      if (!longWord) {
        return;
      }

      current.mode = "long-press";

      selectWord(longWord);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const state = interactionRef.current;

    if (state.pointerId !== event.pointerId || state.mode === "idle") {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    /*
     * APPUI LONG DEJA ACTIF
     *
     * Le premier mot reste le point de départ.
     * Tout déplacement vers un autre mot sélectionne
     * toute la plage entre les deux mots.
     */
    if (state.mode === "long-press") {
      const word = getWordFromPoint(event.clientX, event.clientY);

      if (word && state.currentKey) {
        const range = getWordRange(state.currentKey, word.key);

        setSelectedWords(range);
        setSelectedAyahId(undefined);
        setMenu({
          type: "selection",
        });
      }

      return;
    }

    /*
     * AVANT L'APPUI LONG
     *
     * Petit mouvement : toléré.
     * Grand mouvement : véritable swipe.
     *
     * Le seuil est volontairement supérieur à la tolérance
     * pour éviter qu'un mouvement naturel du doigt annule
     * immédiatement l'appui long.
     */
    if (state.mode === "possible-tap") {
      if (distance <= MOVE_THRESHOLD) {
        return;
      }

      if (state.timer) {
        clearTimeout(state.timer);
        state.timer = undefined;
      }

      if (distance >= SWIPE_THRESHOLD) {
        state.mode = "swipe";
      }
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const state = interactionRef.current;

    if (state.pointerId !== event.pointerId) {
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);

      state.timer = undefined;
    }

    /*
     * ----------------------------------------------------
     * DOUBLE CLIC
     * ----------------------------------------------------
     *
     * Le deuxième pointer-up porte normalement detail=2.
     * On donne alors priorité au mot.
     */
    if (event.detail >= 2 && state.currentKey) {
      const word = getWordFromPoint(event.clientX, event.clientY);

      if (word) {
        selectWord(word);
      }

      state.mode = "idle";
      state.pointerId = -1;
      state.currentKey = undefined;

      return;
    }

    /*
     * ----------------------------------------------------
     * APPUI COURT
     * ----------------------------------------------------
     */
    if (state.mode === "possible-tap") {
      const ayah = getAyahFromPoint(event.clientX, event.clientY);

      if (ayah) {
        setSelectedAyahId(ayah.id);

        setSelectedWords(new Set());

        setMenu({
          type: "ayah",
          ayahId: ayah.id,
        });
      }
    }

    /*
     * ----------------------------------------------------
     * SWIPE
     * ----------------------------------------------------
     */
    else if (state.mode === "swipe") {
      const dx = event.clientX - state.startX;

      const dy = event.clientY - state.startY;

      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
        state.mode = "idle";
        state.pointerId = -1;
        state.currentKey = undefined;

        return;
      }

      /*
       * HORIZONTAL
       *
       * gauche  = page suivante
       * droite  = page précédente
       */
      if (Math.abs(dx) >= Math.abs(dy)) {
        navigatePage(dx < 0 ? -1 : 1);
      }

      /*
       * VERTICAL
       *
       * haut = menu secondaire du Mushaf
       * bas  = géré globalement par AppShell
       *
       * IMPORTANT :
       * le menu vertical est indépendant de la sélection
       * courante (ayah / mot / plage de mots).
       *
       * Le contenu réel de ces menus sera implémenté
       * ultérieurement.
       */
      else {
        if (dy < 0) {
          setMenu({
            type: "app-secondary",
          });
        } else {
          setMenu(null);
        }
      }
    }

    state.mode = "idle";
    state.pointerId = -1;
    state.currentKey = undefined;
  }

  function handlePointerCancel() {
    const state = interactionRef.current;

    if (state.timer) {
      clearTimeout(state.timer);

      state.timer = undefined;
    }

    state.mode = "idle";
    state.pointerId = -1;
    state.currentKey = undefined;
  }

  function showSecondaryMessage(message: string) {
    setSecondaryMessage(message);

    window.setTimeout(() => {
      setSecondaryMessage((current) => (current === message ? null : current));
    }, 1600);
  }

  useEffect(() => {
    window.localStorage.setItem(AUDIO_RECITER_STORAGE_KEY, selectedReciter);
  }, [selectedReciter]);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(AUDIO_RATE_STORAGE_KEY));

    if (Number.isFinite(stored) && stored >= 0.25 && stored <= 4) {
      setPlaybackRate(stored);
    }
  }, []);

  function getCurrentAudioAyah() {
    if (ayahs.length === 0) {
      return undefined;
    }

    if (selectedAyahId !== undefined) {
      const selected = ayahs.find((ayah) => ayah.id === selectedAyahId);

      if (selected) {
        return selected;
      }
    }

    return ayahs[0];
  }

  function getAudioUrl(
    reciterId: string,
    surahNumber: number,
    ayahNumber: number,
  ) {
    return `/api/audio/${reciterId}/${surahNumber}/${ayahNumber}`;
  }

  function readAudioContinuation(): AudioContinuation | undefined {
    const raw = window.sessionStorage.getItem(AUDIO_CONTINUATION_STORAGE_KEY);

    if (!raw) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AudioContinuation>;

      if (
        typeof parsed.reciterId !== "string" ||
        typeof parsed.surahNumber !== "number" ||
        typeof parsed.ayahNumber !== "number" ||
        typeof parsed.endSurahNumber !== "number" ||
        typeof parsed.endAyahNumber !== "number" ||
        typeof parsed.playbackRate !== "number"
      ) {
        return undefined;
      }

      return {
        reciterId: parsed.reciterId,
        surahNumber: parsed.surahNumber,
        ayahNumber: parsed.ayahNumber,
        endSurahNumber: parsed.endSurahNumber,
        endAyahNumber: parsed.endAyahNumber,
        playbackRate: parsed.playbackRate,
      };
    } catch {
      return undefined;
    }
  }

  function writeAudioContinuation(continuation: AudioContinuation) {
    window.sessionStorage.setItem(
      AUDIO_CONTINUATION_STORAGE_KEY,
      JSON.stringify(continuation),
    );
  }

  function clearAudioContinuation() {
    window.sessionStorage.removeItem(AUDIO_CONTINUATION_STORAGE_KEY);
  }

  function isAudioEndReached(
    ayah: { surahNumber: number; number: number },
    continuation: AudioContinuation,
  ) {
    if (ayah.surahNumber > continuation.endSurahNumber) {
      return true;
    }

    if (
      ayah.surahNumber === continuation.endSurahNumber &&
      ayah.number >= continuation.endAyahNumber
    ) {
      return true;
    }

    return false;
  }

  function readAudioLoop(): AudioLoop | undefined {
    try {
      const raw = window.sessionStorage.getItem(AUDIO_LOOP_STORAGE_KEY);
      if (!raw) return undefined;
      const l = JSON.parse(raw) as Partial<AudioLoop>;
      if (
        typeof l.startSurah !== "number" ||
        typeof l.startAyah !== "number" ||
        typeof l.startPage !== "number" ||
        typeof l.pass !== "number"
      ) {
        return undefined;
      }
      return {
        startSurah: l.startSurah,
        startAyah: l.startAyah,
        startPage: l.startPage,
        pass: l.pass,
      };
    } catch {
      return undefined;
    }
  }

  function writeAudioLoop(loop: AudioLoop) {
    window.sessionStorage.setItem(AUDIO_LOOP_STORAGE_KEY, JSON.stringify(loop));
  }

  function clearAudioLoop() {
    window.sessionStorage.removeItem(AUDIO_LOOP_STORAGE_KEY);
  }

  function cancelSilence() {
    silenceCancelRef.current?.();
    silenceCancelRef.current = null;
    silenceDoneRef.current = false;
  }

  async function playCurrentAyah() {
    const audio = audioRef.current;
    const currentAyah = getCurrentAudioAyah();

    if (!audio || !currentAyah) {
      showSecondaryMessage("لا توجد آية للاستماع");
      return;
    }

    const sourceKey = [
      selectedReciter,
      currentAyah.surahNumber,
      currentAyah.number,
    ].join(":");

    if (audioSourceKeyRef.current !== sourceKey) {
      audio.src = getAudioUrl(
        selectedReciter,
        currentAyah.surahNumber,
        currentAyah.number,
      );
      audioSourceKeyRef.current = sourceKey;
      audio.load();
    }

    audio.playbackRate = playbackRate;

    try {
      await audio.play();
      setIsPlaying(true);
      showSecondaryMessage("تشغيل");
    } catch {
      setIsPlaying(false);
      showSecondaryMessage("تعذر تشغيل الصوت");
    }
  }

  function pausePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    window.sessionStorage.removeItem(AUDIO_AUTOPLAY_NEXT_STORAGE_KEY);
    cancelSilence();
    audio.pause();
    setIsPlaying(false);
    showSecondaryMessage("إيقاف");
  }

  function togglePlayback() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!audio.paused || silenceCancelRef.current) {
      pausePlayback();
      return;
    }

    void playCurrentAyah();
  }

  function toggleRepeat() {
    setRepeatEnabled((enabled) => {
      const next = !enabled;
      showSecondaryMessage(next ? "التكرار مفعّل" : "التكرار متوقف");
      return next;
    });
  }

  function cyclePlaybackRate() {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];

    setPlaybackRate(nextRate);

    if (audioRef.current) {
      window.localStorage.setItem(AUDIO_RATE_STORAGE_KEY, String(nextRate));
      audioRef.current.playbackRate = nextRate;
    }

    showSecondaryMessage(`السرعة ${nextRate}×`);
  }

  function navigateAyah(delta: number) {
    clearAudioContinuation();
    clearAudioLoop();
    cancelSilence();
    ayahPlayCountRef.current = 1;

    if (ayahs.length === 0) {
      return;
    }

    const currentIndex = selectedAyahId
      ? ayahs.findIndex((ayah) => ayah.id === selectedAyahId)
      : -1;

    const nextIndex =
      currentIndex === -1
        ? delta > 0
          ? 0
          : ayahs.length - 1
        : currentIndex + delta;

    if (nextIndex >= 0 && nextIndex < ayahs.length) {
      setSelectedAyahId(ayahs[nextIndex].id);
      showSecondaryMessage(delta > 0 ? "الآية التالية" : "الآية السابقة");
      return;
    }

    navigatePage(delta);
  }

  function getAudioSurahLabel(surah: (typeof surahs)[number]) {
    return (surah.translatedName || surah.name || surah.codedName || "")
      .trim()
      .replace(/^(surah|sourate)\\s+(de\\s+|of\\s+)?/i, "")
      .replace(/^سورة\\s*/u, "")
      .trim();
  }

  function resolveAudioSurah(value: string) {
    const query = value.trim();
    if (!query) return undefined;

    const numberPrefix = query.match(/^(\d+)\s*[-–—]/);
    const numericValue = numberPrefix ? numberPrefix[1] : query;
    if (/^\d+$/.test(numericValue)) {
      return surahs.find((surah) => surah.number === Number(numericValue));
    }

    const normalize = (text: string) =>
      text
        .replace(/^\d+\s*[-–—]\s*/, "")
        .replace(/^(surah|sourate)\s+(de\s+|of\s+)?/i, "")
        .replace(/^سورة\s*/u, "")
        .trim()
        .toLocaleLowerCase();

    const normalized = normalize(query);
    return surahs.find((surah) =>
      [
        surah.name,
        surah.codedName ?? "",
        surah.translatedName ?? "",
        getAudioSurahLabel(surah),
      ].some((name) => normalize(name) === normalized),
    );
  }

  function getFilteredAudioSurahs(query: string) {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) return surahs;

    return surahs.filter((surah) => {
      const number = String(surah.number);
      const labels = [
        number,
        `${number} - ${getAudioSurahLabel(surah)}`,
        surah.name,
        surah.codedName ?? "",
        surah.translatedName ?? "",
        getAudioSurahLabel(surah),
      ];

      return labels.some((label) =>
        label.toLocaleLowerCase().includes(normalizedQuery),
      );
    });
  }

  function changeAudioStartSurah(value: string) {
    audioRangeUserModifiedRef.current = true;
    setAudioStartSurahQuery(value);

    const surah = resolveAudioSurah(value);
    if (!surah) {
      setAudioStartSurah("");
      setAudioStartAyah("1");
      return;
    }

    setAudioStartSurah(String(surah.number));
    setAudioStartAyah("1");
    setAudioEndSurah(String(surah.number));
    setAudioEndAyah(String(surah.numberOfAyahs));
    setAudioEndSurahQuery(getAudioSurahLabel(surah));
  }

  function changeAudioEndSurah(value: string) {
    audioRangeUserModifiedRef.current = true;
    setAudioEndSurahQuery(value);

    const surah = resolveAudioSurah(value);
    if (!surah) {
      setAudioEndSurah("");
      setAudioEndAyah("");
      return;
    }

    setAudioEndSurah(String(surah.number));
    setAudioEndAyah(String(surah.numberOfAyahs));
    setAudioEndSurahQuery(getAudioSurahLabel(surah));
  }

  async function applyAudioPages(
    startPageValue = audioStartPage,
    endPageValue = audioEndPage,
  ) {
    const startPage = Number(startPageValue);
    const endPage = Number(endPageValue);

    if (
      !Number.isInteger(startPage) ||
      !Number.isInteger(endPage) ||
      startPage < 1 ||
      startPage > TOTAL_PAGES ||
      endPage > TOTAL_PAGES ||
      endPage < startPage
    ) {
      showSecondaryMessage("الرجاء التحقق من صفحات البداية والنهاية");
      return;
    }

    try {
      const [startAyahs, endAyahs] = await Promise.all([
        getAyahsByPage(startPage),
        getAyahsByPage(endPage),
      ]);

      const first = startAyahs[0];
      const last = endAyahs[endAyahs.length - 1];

      if (!first || !last) {
        showSecondaryMessage("تعذر تحميل آيات الصفحة المحددة");
        return;
      }

      const firstSurah = surahs.find(
        (surah) => surah.number === first.surahNumber,
      );
      const lastSurah = surahs.find(
        (surah) => surah.number === last.surahNumber,
      );

      if (!firstSurah || !lastSurah) {
        showSecondaryMessage("تعذر العثور على السورة");
        return;
      }

      audioRangeUserModifiedRef.current = true;
      setAudioStartSurah(String(first.surahNumber));
      setAudioStartAyah(String(first.number));
      setAudioStartSurahQuery(getAudioSurahLabel(firstSurah));
      setAudioEndSurah(String(last.surahNumber));
      setAudioEndAyah(String(last.number));
      setAudioEndSurahQuery(getAudioSurahLabel(lastSurah));
      showSecondaryMessage("تم تحديث نطاق القراءة حسب الصفحات");
    } catch {
      showSecondaryMessage("تعذر تحميل الصفحات المحددة");
    }
  }

  function validateAndStartAudio() {
    const startSurah = Number(audioStartSurah);
    const startAyah = Number(audioStartAyah);
    const endSurah = Number(audioEndSurah);
    const endAyah = Number(audioEndAyah);

    if (
      !Number.isInteger(startSurah) ||
      startSurah < 1 ||
      startSurah > 114 ||
      !Number.isInteger(startAyah) ||
      startAyah < 1 ||
      !Number.isInteger(endSurah) ||
      endSurah < 1 ||
      endSurah > 114 ||
      !Number.isInteger(endAyah) ||
      endAyah < 1
    ) {
      showSecondaryMessage("الرجاء التحقق من البداية والنهاية");
      return;
    }

    if (
      startSurah > endSurah ||
      (startSurah === endSurah && startAyah > endAyah)
    ) {
      showSecondaryMessage("البداية يجب أن تسبق النهاية");
      return;
    }

    const startSurahData = surahs.find((surah) => surah.number === startSurah);

    const endSurahData = surahs.find((surah) => surah.number === endSurah);

    if (!startSurahData || !endSurahData) {
      showSecondaryMessage("تعذر العثور على السورة");
      return;
    }

    if (
      startAyah > startSurahData.numberOfAyahs ||
      endAyah > endSurahData.numberOfAyahs
    ) {
      showSecondaryMessage("رقم الآية غير صحيح");
      return;
    }

    const continuation: AudioContinuation = {
      reciterId: selectedReciter,
      surahNumber: startSurah,
      ayahNumber: startAyah,
      endSurahNumber: endSurah,
      endAyahNumber: endAyah,
      playbackRate,
    };

    writeAudioContinuation(continuation);
    writeAudioLoop({
      startSurah,
      startAyah,
      startPage: startSurahData.firstPage,
      pass: 1,
    });
    cancelSilence();
    ayahPlayCountRef.current = 1;
    setMoreMenuOpen(false);
    setReciterPickerOpen(false);
    setModePickerOpen(false);
    setIsPlaying(true);

    if (startSurahData.firstPage === pageNumber) {
      const targetAyah = ayahs.find(
        (ayah) => ayah.surahNumber === startSurah && ayah.number === startAyah,
      );

      if (targetAyah) {
        setSelectedAyahId(targetAyah.id);
        window.setTimeout(() => {
          void playCurrentAyah();
        }, 0);
        return;
      }
    }

    router.push(`/coran/${riwayaId}/page/${startSurahData.firstPage}`);
  }

  async function startCurrentModeAtSelection() {
    if (secondaryMode === "listening") {
      return;
    }

    const startSurah = Number(audioStartSurah);
    const startAyah = Number(audioStartAyah);

    if (
      !Number.isInteger(startSurah) ||
      startSurah < 1 ||
      startSurah > 114 ||
      !Number.isInteger(startAyah) ||
      startAyah < 1
    ) {
      showSecondaryMessage("الرجاء تحديد آية بداية صحيحة");
      return;
    }

    const surahData = surahs.find((surah) => surah.number === startSurah);

    if (!surahData || startAyah > surahData.numberOfAyahs) {
      showSecondaryMessage("رقم الآية غير صحيح");
      return;
    }

    try {
      const surahAyahs = await getAyahsBySurah(startSurah);
      const targetAyah = surahAyahs.find((ayah) => ayah.number === startAyah);

      if (
        !targetAyah ||
        !Number.isInteger(targetAyah.pageNumber) ||
        targetAyah.pageNumber < 1 ||
        targetAyah.pageNumber > TOTAL_PAGES
      ) {
        showSecondaryMessage("تعذر العثور على الآية المحددة");
        return;
      }

      // Arrêter toute lecture éventuellement laissée active par un autre mode.
      // Cette action ne prépare ni ne démarre une nouvelle lecture audio.
      pausePlayback();

      setMoreMenuOpen(false);
      setModePickerOpen(false);
      setReciterPickerOpen(false);

      if (targetAyah.pageNumber === pageNumber) {
        setSelectedAyahId(targetAyah.id);

        window.setTimeout(() => {
          const element = document.querySelector<HTMLElement>(
            `[data-ayah-id="${targetAyah.id}"]`,
          );
          element?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 0);
      } else {
        router.push(
          `/coran/${riwayaId}/page/${targetAyah.pageNumber}?ayah=${targetAyah.id}`,
        );
      }

      showSecondaryMessage("تم الانتقال إلى بداية التحديد");
    } catch {
      showSecondaryMessage("تعذر الوصول إلى الآية المحددة");
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, unknown>;
        const pick = (
          value: unknown,
          allowed: readonly string[],
          fallback: string,
        ) =>
          typeof value === "string" && allowed.includes(value)
            ? value
            : fallback;
        const pickRepeat = (value: unknown): string => {
          if (value === "n") return "n";
          if (
            typeof value === "string" &&
            /^\d+$/.test(value) &&
            Number.isSafeInteger(Number(value)) &&
            Number(value) > 0
          ) {
            return value;
          }
          return "1";
        };
        setAyahRepeatCount(pickRepeat(saved.ayahRepeat));
        setSelectionRepeatCount(pickRepeat(saved.selectionRepeat));
        setSilenceBeforeAyah(
          pick(saved.silenceBeforeAyah, SILENCE_VALUES, "0"),
        );
        setSilenceAfterAyah(pick(saved.silenceAfterAyah, SILENCE_VALUES, "0"));
        setSilenceBeforeSelection(
          pick(saved.silenceBeforeSelection, SILENCE_VALUES, "0"),
        );
        setSilenceAfterSelection(
          pick(saved.silenceAfterSelection, SILENCE_VALUES, "0"),
        );
      }
    } catch {
      // réglages ignorés si illisibles
    }
    setAudioSettingsLoaded(true);
  }, []);

  useEffect(() => {
    audioSettingsRef.current = {
      ayahRepeat: ayahRepeatCount,
      selectionRepeat: selectionRepeatCount,
      silenceBeforeAyah,
      silenceAfterAyah,
      silenceBeforeSelection,
      silenceAfterSelection,
    };

    if (!audioSettingsLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        AUDIO_SETTINGS_STORAGE_KEY,
        JSON.stringify(audioSettingsRef.current),
      );
    } catch {
      // stockage indisponible
    }
  }, [
    audioSettingsLoaded,
    ayahRepeatCount,
    selectionRepeatCount,
    silenceBeforeAyah,
    silenceAfterAyah,
    silenceBeforeSelection,
    silenceAfterSelection,
  ]);

  useEffect(() => {
    return () => {
      silenceCancelRef.current?.();
      silenceCancelRef.current = null;
    };
  }, []);

  function getModePositionKey(mode: SecondaryMode) {
    return `irtaki.mushaf.position.${mushafId}.${riwayaId}.${mode}`;
  }

  function getModeSelectionKey(mode: SecondaryMode) {
    return `irtaki.mushaf.selection.${mushafId}.${riwayaId}.${mode}`;
  }

  function saveModeSelection(mode: SecondaryMode) {
    try {
      window.localStorage.setItem(
        getModeSelectionKey(mode),
        JSON.stringify({
          startSurah: audioStartSurah,
          startAyah: audioStartAyah,
          endSurah: audioEndSurah,
          endAyah: audioEndAyah,
          startSurahQuery: audioStartSurahQuery,
          endSurahQuery: audioEndSurahQuery,
          startPage: audioStartPage,
          endPage: audioEndPage,
          userModified: audioRangeUserModifiedRef.current,
        }),
      );
    } catch {
      // Le lecteur reste utilisable si le stockage est indisponible.
    }
  }

  function restoreModeSelection(mode: SecondaryMode, fallbackPage: number) {
    let saved: Record<string, unknown> = {};

    try {
      const raw = window.localStorage.getItem(getModeSelectionKey(mode));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          saved = parsed as Record<string, unknown>;
        }
      }
    } catch {
      // Utiliser les valeurs par défaut si le stockage est invalide.
    }

    const readString = (key: string, fallback: string) =>
      typeof saved[key] === "string" ? (saved[key] as string) : fallback;

    const safePage = Math.max(1, Math.min(TOTAL_PAGES, fallbackPage));

    setAudioStartSurah(readString("startSurah", ""));
    setAudioStartAyah(readString("startAyah", ""));
    setAudioEndSurah(readString("endSurah", "114"));
    setAudioEndAyah(readString("endAyah", "6"));
    setAudioStartSurahQuery(readString("startSurahQuery", ""));
    setAudioEndSurahQuery(readString("endSurahQuery", ""));
    setAudioStartPage(readString("startPage", String(safePage)));
    setAudioEndPage(readString("endPage", String(TOTAL_PAGES)));

    audioRangeUserModifiedRef.current = saved.userModified === true;

    // Ne pas restaurer les états temporaires des menus déroulants.
    setAudioStartSurahPickerOpen(false);
    setAudioEndSurahPickerOpen(false);
    setAudioStartSurahPickerQuery("");
    setAudioEndSurahPickerQuery("");
  }

  // Sauvegarder la sélection du mode actif lorsque ses valeurs changent.
  // Cet effet précède volontairement l'effet de chargement initial.
  useEffect(() => {
    const contextKey = `${mushafId}.${riwayaId}`;

    if (modeSelectionContextRef.current !== contextKey) {
      return;
    }

    saveModeSelection(secondaryMode);
  }, [
    secondaryMode,
    mushafId,
    riwayaId,
    audioStartSurah,
    audioStartAyah,
    audioEndSurah,
    audioEndAyah,
    audioStartSurahQuery,
    audioEndSurahQuery,
    audioStartPage,
    audioEndPage,
  ]);

  // Charger la sélection propre au contexte Mushaf/riwaya au montage.
  useEffect(() => {
    const contextKey = `${mushafId}.${riwayaId}`;

    restoreModeSelection(secondaryModeRef.current, pageNumber);
    modeSelectionContextRef.current = contextKey;
  }, [mushafId, riwayaId]);

  function selectSecondaryMode(mode: SecondaryMode) {
    try {
      window.localStorage.setItem(
        `irtaki.mushaf.mode.${mushafId}.${riwayaId}`,
        mode,
      );

      // Sauvegarder indépendamment la sélection et la position du mode quitté.
      saveModeSelection(secondaryModeRef.current);
      window.localStorage.setItem(
        getModePositionKey(secondaryModeRef.current),
        String(pageNumber),
      );

      // Restaurer la dernière position du mode demandé, si elle existe.
      const savedPage = Number(
        window.localStorage.getItem(getModePositionKey(mode)),
      );
      const targetPage =
        Number.isInteger(savedPage) &&
        savedPage >= 1 &&
        savedPage <= TOTAL_PAGES
          ? savedPage
          : pageNumber;

      // Recharger la sélection indépendante du mode choisi.
      restoreModeSelection(mode, targetPage);

      secondaryModeRef.current = mode;
      setSecondaryMode(mode);
      setModePickerOpen(false);
      setReciterPickerOpen(false);

      if (targetPage !== pageNumber) {
        router.push(`/coran/${riwayaId}/page/${targetPage}`);
      }
    } catch {
      // Si le stockage est indisponible, conserver la navigation normale.
      secondaryModeRef.current = mode;
      setSecondaryMode(mode);
      setModePickerOpen(false);
      setReciterPickerOpen(false);
    }

    showSecondaryMessage(
      SECONDARY_MODES.find((item) => item.id === mode)?.label ?? "",
    );
  }

  useEffect(() => {
    if (audioRangeUserModifiedRef.current || ayahs.length === 0) {
      return;
    }

    const firstAyah = ayahs[0];

    const initialSurah = surahs.find(
      (surah) => surah.number === firstAyah.surahNumber,
    );

    setAudioStartSurah(String(firstAyah.surahNumber));
    setAudioStartAyah(String(firstAyah.number));
    setAudioEndSurah(String(firstAyah.surahNumber));
    setAudioEndAyah(String(firstAyah.number));
    setAudioStartSurahQuery(
      initialSurah ? `${initialSurah.number} - ${initialSurah.name}` : "",
    );
    setAudioEndSurahQuery(
      initialSurah ? `${initialSurah.number} - ${initialSurah.name}` : "",
    );
    setAudioStartPage(String(pageNumber));
    setAudioEndPage(String(pageNumber));
  }, [ayahs, surahs, pageNumber]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.defaultPlaybackRate = playbackRate;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    function replayCurrentAyah() {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = 0;
      void el.play().catch(() => {
        setIsPlaying(false);
      });
    }

    function handleEnded() {
      const currentAyah = getCurrentAudioAyah();
      console.log("[AUDIO] ended", {
        page: pageNumber,
        ayah: currentAyah && [currentAyah.surahNumber, currentAyah.number],
        idx: currentAyah ? ayahs.findIndex((a) => a.id === currentAyah.id) : -1,
        total: ayahs.length,
        repeatEnabled,
        continuation: readAudioContinuation(),
      }); // DEBUG-AUDIO

      if (!currentAyah) {
        setIsPlaying(false);
        return;
      }

      const settings = audioSettingsRef.current;
      const rangeContinuation = readAudioContinuation();
      const atRangeEnd = rangeContinuation
        ? isAudioEndReached(currentAyah, rangeContinuation)
        : false;

      // Silence après l'ayah (ou après la plage), proportionnel à la durée réelle.
      if (!silenceDoneRef.current) {
        const el = audioRef.current;
        const duration = el && Number.isFinite(el.duration) ? el.duration : 0;
        const multiplier = Number(
          atRangeEnd
            ? settings.silenceAfterSelection
            : settings.silenceAfterAyah,
        );
        const seconds = duration * multiplier;

        if (seconds > 0) {
          const timer = window.setTimeout(() => {
            silenceCancelRef.current = null;
            silenceDoneRef.current = true;
            handleEndedRef.current();
          }, seconds * 1000);
          silenceCancelRef.current = () => window.clearTimeout(timer);
          return;
        }
      }
      silenceDoneRef.current = false;

      // Répétition d'ayah.
      const ayahTarget =
        settings.ayahRepeat === "n"
          ? Number.POSITIVE_INFINITY
          : Number(settings.ayahRepeat);

      if (ayahPlayCountRef.current < ayahTarget) {
        ayahPlayCountRef.current += 1;
        replayCurrentAyah();
        return;
      }
      ayahPlayCountRef.current = 1;

      // Répétition de la plage début/fin.
      if (rangeContinuation && atRangeEnd) {
        const selectionTarget =
          settings.selectionRepeat === "n"
            ? Number.POSITIVE_INFINITY
            : Number(settings.selectionRepeat);
        const loop = readAudioLoop();

        if (loop && loop.pass < selectionTarget) {
          writeAudioLoop({ ...loop, pass: loop.pass + 1 });
          writeAudioContinuation({
            ...rangeContinuation,
            surahNumber: loop.startSurah,
            ayahNumber: loop.startAyah,
          });

          const startAyahOnPage = ayahs.find(
            (ayah) =>
              ayah.surahNumber === loop.startSurah &&
              ayah.number === loop.startAyah,
          );

          if (startAyahOnPage) {
            if (startAyahOnPage.id === currentAyah.id) {
              replayCurrentAyah();
            } else {
              audioShouldContinueRef.current = true;
              setSelectedAyahId(startAyahOnPage.id);
            }
            return;
          }

          audioShouldContinueRef.current = true;
          router.push(`/coran/${riwayaId}/page/${loop.startPage}`);
          return;
        }
      }

      if (repeatEnabled) {
        const currentAudio = audioRef.current;

        if (!currentAudio) {
          return;
        }

        currentAudio.currentTime = 0;
        void currentAudio.play().catch(() => {
          setIsPlaying(false);
        });
        return;
      }

      const continuation = readAudioContinuation();

      if (continuation) {
        if (isAudioEndReached(currentAyah, continuation)) {
          clearAudioContinuation();
          setIsPlaying(false);
          showSecondaryMessage("انتهى الاستماع");
          return;
        }

        const currentIndex = ayahs.findIndex(
          (ayah) => ayah.id === currentAyah.id,
        );

        const nextAyah = ayahs[currentIndex + 1];

        if (nextAyah) {
          writeAudioContinuation({
            ...continuation,
            surahNumber: nextAyah.surahNumber,
            ayahNumber: nextAyah.number,
          });

          audioShouldContinueRef.current = true;
          setSelectedAyahId(nextAyah.id);
          return;
        }

        if (pageNumber < TOTAL_PAGES) {
          const nextPage = pageNumber + 1;
          console.log("[AUDIO] fetch next page", nextPage); // DEBUG-AUDIO

          void getAyahsByPage(nextPage)
            .then((nextPageAyahs) => {
              const firstAyah = nextPageAyahs[0];

              if (!firstAyah) {
                clearAudioContinuation();
                setIsPlaying(false);
                showSecondaryMessage("تعذر تحميل الآية التالية");
                return;
              }

              writeAudioContinuation({
                ...continuation,
                surahNumber: firstAyah.surahNumber,
                ayahNumber: firstAyah.number,
              });

              console.log(
                "[AUDIO] router.push",
                nextPage,
                firstAyah.surahNumber,
                firstAyah.number,
              ); // DEBUG-AUDIO
              audioShouldContinueRef.current = true;
              router.push(`/coran/${riwayaId}/page/${nextPage}`);
            })
            .catch((e) => {
              console.log("[AUDIO] fetch next FAILED", e); // DEBUG-AUDIO
              setIsPlaying(false);
              showSecondaryMessage("تعذر تحميل الصفحة التالية");
            });

          return;
        }

        clearAudioContinuation();
        setIsPlaying(false);
        showSecondaryMessage("انتهى الاستماع");
        return;
      }

      const currentIndex = ayahs.findIndex(
        (ayah) => ayah.id === currentAyah.id,
      );
      const nextAyah = ayahs[currentIndex + 1];

      if (nextAyah) {
        audioShouldContinueRef.current = true;
        setSelectedAyahId(nextAyah.id);
        return;
      }

      if (pageNumber < TOTAL_PAGES) {
        audioShouldContinueRef.current = true;
        window.sessionStorage.setItem(AUDIO_AUTOPLAY_NEXT_STORAGE_KEY, "1");
        router.push(`/coran/${riwayaId}/page/${pageNumber + 1}`);
        return;
      }

      setIsPlaying(false);
      showSecondaryMessage("انتهى الاستماع");
    }

    function handleError() {
      console.log(
        "[AUDIO] error event",
        audio?.error?.code,
        audio?.error?.message,
        audio?.src,
      ); // DEBUG-AUDIO
      setIsPlaying(false);
      showSecondaryMessage("تعذر تحميل الصوت");
    }

    console.log(
      "[AUDIO] listeners attached, page",
      pageNumber,
      "ayahs",
      ayahs.length,
    ); // DEBUG-AUDIO
    handleEndedRef.current = handleEnded;
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [repeatEnabled, ayahs, pageNumber, riwayaId, selectedAyahId]);

  useEffect(() => {
    const audio = audioRef.current;
    const continuation = readAudioContinuation();

    const continuationAyah =
      continuation?.reciterId === selectedReciter
        ? ayahs.find(
            (ayah) =>
              ayah.surahNumber === continuation.surahNumber &&
              ayah.number === continuation.ayahNumber,
          )
        : undefined;

    // Priorité à l'ayah de continuation, même si la sélection React
    // n'a pas encore été mise à jour après le changement de page.
    const currentAyah = continuationAyah ?? getCurrentAudioAyah();

    if (!audio || !currentAyah) {
      return;
    }

    const sourceKey = [
      selectedReciter,
      currentAyah.surahNumber,
      currentAyah.number,
    ].join(":");

    const isContinuationTarget = continuationAyah !== undefined;

    console.log("[AUDIO] source effect", {
      sourceKey,
      same: audioSourceKeyRef.current === sourceKey,
      paused: audio.paused,
      isContinuationTarget,
      shouldContinue: audioShouldContinueRef.current,
    }); // DEBUG-AUDIO
    if (audioSourceKeyRef.current === sourceKey) {
      if (isContinuationTarget && audio.paused && !silenceCancelRef.current) {
        audio.playbackRate = playbackRate;
        void audio.play().then(
          () => setIsPlaying(true),
          () => {
            setIsPlaying(false);
            showSecondaryMessage("تعذر تشغيل الصوت");
          },
        );
      }
      return;
    }

    const autoplayNext =
      window.sessionStorage.getItem(AUDIO_AUTOPLAY_NEXT_STORAGE_KEY) === "1";

    window.sessionStorage.removeItem(AUDIO_AUTOPLAY_NEXT_STORAGE_KEY);

    const shouldResume =
      audioShouldContinueRef.current ||
      autoplayNext ||
      !audio.paused ||
      isContinuationTarget;

    audioShouldContinueRef.current = false;
    cancelSilence();
    ayahPlayCountRef.current = 1;
    audio.pause();
    audio.src = getAudioUrl(
      selectedReciter,
      currentAyah.surahNumber,
      currentAyah.number,
    );
    audioSourceKeyRef.current = sourceKey;
    audio.defaultPlaybackRate = playbackRate;
    audio.playbackRate = playbackRate;
    audio.load();

    if (shouldResume) {
      const startPlayback = () => {
        void audio.play().then(
          () => setIsPlaying(true),
          (err) => {
            console.log("[AUDIO] play() rejected", err?.name, err?.message); // DEBUG-AUDIO
            setIsPlaying(false);
            showSecondaryMessage("تعذر تشغيل الصوت");
          },
        );
      };

      const loop = readAudioLoop();
      const isRangeStart = Boolean(
        readAudioContinuation() &&
        loop &&
        loop.startSurah === currentAyah.surahNumber &&
        loop.startAyah === currentAyah.number,
      );
      const beforeMultiplier = Number(
        isRangeStart
          ? audioSettingsRef.current.silenceBeforeSelection
          : audioSettingsRef.current.silenceBeforeAyah,
      );

      if (beforeMultiplier > 0) {
        const onMetadata = () => {
          const seconds = Number.isFinite(audio.duration)
            ? audio.duration * beforeMultiplier
            : 0;
          const timer = window.setTimeout(() => {
            silenceCancelRef.current = null;
            startPlayback();
          }, seconds * 1000);
          silenceCancelRef.current = () => window.clearTimeout(timer);
        };
        audio.addEventListener("loadedmetadata", onMetadata, { once: true });
        silenceCancelRef.current = () =>
          audio.removeEventListener("loadedmetadata", onMetadata);
      } else {
        startPlayback();
      }
    }
  }, [selectedAyahId, selectedReciter, pageNumber, ayahs, playbackRate]);

  useEffect(() => {
    if (ayahs.length === 0) {
      return;
    }

    const continuation = readAudioContinuation();

    if (!continuation) {
      return;
    }

    const targetAyah = ayahs.find(
      (ayah) =>
        ayah.surahNumber === continuation.surahNumber &&
        ayah.number === continuation.ayahNumber,
    );

    if (!targetAyah) {
      return;
    }

    audioShouldContinueRef.current = true;
    setSelectedAyahId(targetAyah.id);
  }, [ayahs, pageNumber]);

  if (pageNumber < 1 || pageNumber > TOTAL_PAGES) {
    return (
      <p className="rounded-lg border border-[var(--border)] p-6 text-center">
        Page invalide.
      </p>
    );
  }

  if (loading || !layout) {
    return (
      <div
        className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] p-8 text-center"
        dir="rtl"
      >
        Chargement de la page {pageNumber}…
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="mx-auto max-w-3xl rounded-xl border border-[var(--border)] p-6 text-center"
      >
        {error}
      </p>
    );
  }

  const surahNames = new Map(surahs.map((surah) => [surah.number, surah.name]));

  return (
    <article
      className="mx-auto max-w-3xl touch-none rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 select-none sm:p-8"
      dir="rtl"
      data-mushaf-page={pageNumber}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
    >
      <audio ref={audioRef} preload="metadata" className="hidden" />
      <header className="mb-6 flex items-center justify-between text-sm text-[var(--muted)]">
        <span>مصحف حفص</span>
        <span>
          صفحة {pageNumber} / {TOTAL_PAGES}
        </span>
      </header>

      <div className="space-y-1" data-mushaf-lines={layout.lines.length}>
        {layout.lines.map((line) => (
          <MushafLine
            key={line.line}
            line={line}
            ayahs={ayahs}
            surahNames={surahNames}
            selectedAyahId={selectedAyahId}
            selectedWords={selectedWords}
          />
        ))}
      </div>

      {menu ? (
        <div
          className={[
            "fixed inset-x-0 z-50 mx-auto w-fit rounded-xl border",
            "border-[var(--border)] bg-[var(--background)] px-5 py-3",
            "shadow-lg",
            menu.type === "ayah"
              ? "top-4"
              : menu.type === "app-secondary"
                ? "bottom-4"
                : menu.type === "word"
                  ? "bottom-4"
                  : "bottom-4",
          ].join(" ")}
          dir="rtl"
          role="dialog"
          aria-label={
            menu.type === "ayah"
              ? "قائمة الآية"
              : menu.type === "word"
                ? "قائمة الكلمة"
                : menu.type === "selection"
                  ? "قائمة التحديد"
                  : "القائمة الثانوية للتطبيق"
          }
        >
          {menu.type === "ayah" && (
            <div className="flex flex-col gap-3">
              <div className="font-semibold">قائمة الآية</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border px-3 py-2">
                  قراءة
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  استماع
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  تكرار
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  حفظ
                </button>
              </div>
            </div>
          )}

          {menu.type === "word" && (
            <div className="flex flex-col gap-3">
              <div className="font-semibold">قائمة الكلمة</div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border px-3 py-2">
                  معنى الكلمة
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  تفسير
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  استماع
                </button>
              </div>
            </div>
          )}

          {menu.type === "app-secondary" && (
            <div className="flex max-w-[min(100vw-2rem,56rem)] flex-col gap-3">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border bg-[var(--foreground)] px-3 py-2 text-sm text-[var(--background)]"
                  aria-expanded={modePickerOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setModePickerOpen((open) => !open);
                    setReciterPickerOpen(false);
                  }}
                >
                  {
                    SECONDARY_MODES.find((mode) => mode.id === secondaryMode)
                      ?.icon
                  }{" "}
                  {
                    SECONDARY_MODES.find((mode) => mode.id === secondaryMode)
                      ?.label
                  }
                </button>

                {secondaryMode === "listening" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="السابق"
                      onClick={() => navigateAyah(-1)}
                    >
                      ⏮
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label={isPlaying ? "إيقاف" : "تشغيل"}
                      aria-pressed={isPlaying}
                      onClick={togglePlayback}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="التالي"
                      onClick={() => navigateAyah(1)}
                    >
                      ⏭
                    </button>

                    <button
                      type="button"
                      className={
                        repeatEnabled
                          ? "rounded-lg border bg-[var(--foreground)] px-3 py-2 text-[var(--background)]"
                          : "rounded-lg border px-3 py-2"
                      }
                      aria-label="التكرار"
                      aria-pressed={repeatEnabled}
                      onClick={toggleRepeat}
                    >
                      🔁
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-sm"
                      aria-label="سرعة التشغيل"
                      onClick={cyclePlaybackRate}
                    >
                      {playbackRate}×
                    </button>

                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2 text-sm"
                      aria-label="اختيار القارئ"
                      aria-expanded={reciterPickerOpen}
                      onClick={() => {
                        setReciterPickerOpen((open) => !open);
                        setModePickerOpen(false);
                      }}
                    >
                      🎙️ القارئ
                    </button>
                  </>
                )}

                {secondaryMode === "recitation" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="التسجيل"
                      onClick={() => showSecondaryMessage("التسجيل")}
                    >
                      🎙️
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="تشغيل المرجع"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                  </>
                )}

                {secondaryMode === "memorization" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="إظهار وإخفاء"
                      onClick={() => showSecondaryMessage("إظهار وإخفاء")}
                    >
                      👁
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="السابق"
                      onClick={() => navigateAyah(-1)}
                    >
                      ⏮
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="التالي"
                      onClick={() => navigateAyah(1)}
                    >
                      ⏭
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="استماع"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                  </>
                )}

                {secondaryMode === "review" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="مستوى المراجعة"
                      onClick={() => showSecondaryMessage("مستوى المراجعة")}
                    >
                      ⭐
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="تمييز"
                      onClick={() => showSecondaryMessage("تمييز")}
                    >
                      🖍️
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="إظهار وإخفاء"
                      onClick={() => showSecondaryMessage("إظهار وإخفاء")}
                    >
                      👁
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="استماع"
                      onClick={togglePlayback}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                  </>
                )}

                {secondaryMode === "tadabbur" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="تمييز"
                      onClick={() => showSecondaryMessage("تمييز")}
                    >
                      🖍️
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="اللون"
                      onClick={() => showSecondaryMessage("اختيار اللون")}
                    >
                      🎨
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="ملاحظة"
                      onClick={() => showSecondaryMessage("إضافة ملاحظة")}
                    >
                      📝
                    </button>
                  </>
                )}

                {secondaryMode === "progress" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="الأهداف"
                      onClick={() => showSecondaryMessage("الأهداف")}
                    >
                      🎯
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="الأنشطة"
                      onClick={() => showSecondaryMessage("الأنشطة")}
                    >
                      📋
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="السجل"
                      onClick={() => showSecondaryMessage("السجل")}
                    >
                      🕘
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      aria-label="التقدم"
                      onClick={() => showSecondaryMessage("التقدم")}
                    >
                      📈
                    </button>
                  </>
                )}

                {secondaryMode !== "listening" && (
                  <button
                    type="button"
                    className="rounded-lg border bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--background)]"
                    aria-label="البدء من أول آية في التحديد"
                    onClick={() => {
                      void startCurrentModeAtSelection();
                    }}
                  >
                    ▶ ابدأ
                  </button>
                )}

                <button
                  type="button"
                  className={
                    moreMenuOpen
                      ? "rounded-lg border bg-[var(--foreground)] px-3 py-2 text-[var(--background)]"
                      : "rounded-lg border px-3 py-2"
                  }
                  aria-label="المزيد من الخيارات"
                  aria-expanded={moreMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => {
                    setMoreMenuOpen((open) => !open);
                    setModePickerOpen(false);
                    setReciterPickerOpen(false);
                  }}
                >
                  ⋮
                </button>
              </div>

              {moreMenuOpen && (
                <div
                  className="flex max-h-[75dvh] min-w-[min(92vw,42rem)] flex-col gap-3 overflow-y-auto overscroll-contain border-t border-[var(--border)] pt-3"
                  role="menu"
                  aria-label="تحديد"
                >
                  <div className="text-center text-sm font-semibold">تحديد</div>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3 text-sm font-semibold">
                        البداية
                      </div>
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                        الصفحة
                        <input
                          type="number"
                          min="1"
                          max={TOTAL_PAGES}
                          value={audioStartPage}
                          onChange={(event) =>
                            setAudioStartPage(event.target.value)
                          }
                          onBlur={() => {
                            setAudioEndPage(audioStartPage);
                            void applyAudioPages(
                              audioStartPage,
                              audioStartPage,
                            );
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                      </label>
                      <label className="relative flex min-w-0 flex-col gap-1 text-xs">
                        السورة
                        <input
                          role="combobox"
                          aria-label="سورة البداية"
                          aria-expanded={audioStartSurahPickerOpen}
                          aria-controls="audio-start-surah-options"
                          autoComplete="off"
                          value={audioStartSurahQuery}
                          placeholder="اسم أو رقم"
                          onFocus={() => {
                            setAudioStartSurahPickerQuery("");
                            setAudioStartSurahPickerOpen(true);
                          }}
                          onClick={() => {
                            if (!audioStartSurahPickerOpen) {
                              setAudioStartSurahPickerQuery("");
                              setAudioStartSurahPickerOpen(true);
                            }
                          }}
                          onBlur={() => setAudioStartSurahPickerOpen(false)}
                          onChange={(event) => {
                            setAudioStartSurahPickerQuery(event.target.value);
                            setAudioStartSurahPickerOpen(true);
                            changeAudioStartSurah(event.target.value);
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                        {audioStartSurahPickerOpen && (
                          <div
                            id="audio-start-surah-options"
                            role="listbox"
                            aria-label="اختيار سورة البداية"
                            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-white text-gray-900 shadow-lg dark:bg-gray-900 dark:text-white"
                          >
                            {getFilteredAudioSurahs(
                              audioStartSurahPickerQuery,
                            ).map((surah) => (
                              <button
                                key={surah.number}
                                type="button"
                                role="option"
                                aria-selected={
                                  Number(audioStartSurah) === surah.number
                                }
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  changeAudioStartSurah(
                                    `${surah.number} - ${getAudioSurahLabel(surah)}`,
                                  );
                                  setAudioStartSurahPickerQuery("");
                                  setAudioStartSurahPickerOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {surah.number} - {getAudioSurahLabel(surah)}
                              </button>
                            ))}
                            {getFilteredAudioSurahs(audioStartSurahPickerQuery)
                              .length === 0 && (
                              <div className="px-3 py-2 text-sm">
                                لا توجد سورة مطابقة
                              </div>
                            )}
                          </div>
                        )}
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                        الآية
                        <input
                          type="number"
                          min="1"
                          max={
                            surahs.find(
                              (surah) =>
                                surah.number === Number(audioStartSurah),
                            )?.numberOfAyahs ?? 1
                          }
                          value={audioStartAyah}
                          onChange={(event) => {
                            audioRangeUserModifiedRef.current = true;
                            setAudioStartAyah(event.target.value);
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-3 text-sm font-semibold">
                        النهاية
                      </div>
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                        الصفحة
                        <input
                          type="number"
                          min="1"
                          max={TOTAL_PAGES}
                          value={audioEndPage}
                          onChange={(event) =>
                            setAudioEndPage(event.target.value)
                          }
                          onBlur={() => {
                            void applyAudioPages(audioStartPage, audioEndPage);
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                      </label>
                      <label className="relative flex min-w-0 flex-col gap-1 text-xs">
                        السورة
                        <input
                          role="combobox"
                          aria-label="سورة النهاية"
                          aria-expanded={audioEndSurahPickerOpen}
                          aria-controls="audio-end-surah-options"
                          autoComplete="off"
                          value={
                            audioEndSurahPickerOpen
                              ? audioEndSurahPickerQuery
                              : audioEndSurahQuery
                          }
                          placeholder="اسم أو رقم"
                          onFocus={() => {
                            setAudioEndSurahPickerQuery("");
                            setAudioEndSurahPickerOpen(true);
                          }}
                          onClick={() => {
                            if (!audioEndSurahPickerOpen) {
                              setAudioEndSurahPickerQuery("");
                              setAudioEndSurahPickerOpen(true);
                            }
                          }}
                          onBlur={() => setAudioEndSurahPickerOpen(false)}
                          onChange={(event) => {
                            setAudioEndSurahPickerQuery(event.target.value);
                            setAudioEndSurahPickerOpen(true);
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                        {audioEndSurahPickerOpen && (
                          <div
                            id="audio-end-surah-options"
                            role="listbox"
                            aria-label="اختيار سورة النهاية"
                            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-white text-gray-900 shadow-lg dark:bg-gray-900 dark:text-white"
                          >
                            {getFilteredAudioSurahs(
                              audioEndSurahPickerQuery,
                            ).map((surah) => (
                              <button
                                key={surah.number}
                                type="button"
                                role="option"
                                aria-selected={
                                  Number(audioEndSurah) === surah.number
                                }
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  changeAudioEndSurah(
                                    `${surah.number} - ${getAudioSurahLabel(surah)}`,
                                  );
                                  setAudioEndSurahPickerQuery("");
                                  setAudioEndSurahPickerOpen(false);
                                }}
                                className="block w-full px-3 py-2 text-right text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                {surah.number} - {getAudioSurahLabel(surah)}
                              </button>
                            ))}
                            {getFilteredAudioSurahs(audioEndSurahPickerQuery)
                              .length === 0 && (
                              <div className="px-3 py-2 text-sm">
                                لا توجد سورة مطابقة
                              </div>
                            )}
                          </div>
                        )}
                      </label>
                      <label className="flex min-w-0 flex-col gap-1 text-xs">
                        الآية
                        <input
                          type="number"
                          min="1"
                          max={
                            surahs.find(
                              (surah) => surah.number === Number(audioEndSurah),
                            )?.numberOfAyahs ?? 1
                          }
                          value={audioEndAyah}
                          onChange={(event) => {
                            audioRangeUserModifiedRef.current = true;
                            setAudioEndAyah(event.target.value);
                          }}
                          className="w-full min-w-0 rounded-lg border bg-transparent px-2 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void applyAudioPages()}
                        className="rounded-lg border px-3 py-2 text-sm font-semibold"
                      >
                        تطبيق نطاق الصفحات
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const startSurah = Number(audioStartSurah);
                          const startAyah = Number(audioStartAyah);
                          const endSurah = Number(audioEndSurah);
                          const endAyah = Number(audioEndAyah);

                          const startSurahData = surahs.find(
                            (surah) => surah.number === startSurah,
                          );
                          const endSurahData = surahs.find(
                            (surah) => surah.number === endSurah,
                          );

                          if (
                            !startSurahData ||
                            !endSurahData ||
                            !Number.isInteger(startAyah) ||
                            !Number.isInteger(endAyah) ||
                            startAyah < 1 ||
                            endAyah < 1 ||
                            startAyah > startSurahData.numberOfAyahs ||
                            endAyah > endSurahData.numberOfAyahs
                          ) {
                            showSecondaryMessage(
                              "الرجاء التحقق من السورة ورقم الآية",
                            );
                            return;
                          }

                          if (
                            startSurah > endSurah ||
                            (startSurah === endSurah && startAyah > endAyah)
                          ) {
                            showSecondaryMessage("البداية يجب أن تسبق النهاية");
                            return;
                          }

                          audioRangeUserModifiedRef.current = true;
                          setAudioStartPage(String(startSurahData.firstPage));
                          setAudioEndPage(String(endSurahData.firstPage));
                          showSecondaryMessage("تم تطبيق نطاق الآيات");
                        }}
                        className="rounded-lg border px-3 py-2 text-sm font-semibold"
                      >
                        تطبيق نطاق الآيات
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {moreMenuOpen && secondaryMode === "listening" && (
                <div
                  className="flex max-h-[75dvh] min-w-[min(92vw,42rem)] flex-col gap-3 overflow-y-auto overscroll-contain border-t border-[var(--border)] pt-3"
                  role="menu"
                  aria-label="إعدادات الاستماع"
                >
                  <div className="text-center text-sm font-semibold">
                    إعدادات الاستماع
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <fieldset className="rounded-lg border p-3">
                      <legend className="px-1 text-sm font-semibold">
                        تكرار الآية
                      </legend>

                      <div className="relative mt-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            ayahRepeatCount === "n" ? "∞" : ayahRepeatCount
                          }
                          aria-label="عدد تكرار الآية"
                          aria-expanded={ayahRepeatOptionsOpen}
                          onFocus={(event) => {
                            setAyahRepeatOptionsOpen(true);
                            event.currentTarget.select();
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (/^\d*$/.test(value)) {
                              setAyahRepeatCount(value);
                            }
                          }}
                          onBlur={() => {
                            if (
                              !ayahRepeatCount ||
                              !Number.isSafeInteger(Number(ayahRepeatCount)) ||
                              Number(ayahRepeatCount) < 1
                            ) {
                              setAyahRepeatCount("1");
                            }
                            setAyahRepeatOptionsOpen(false);
                          }}
                          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                        />

                        {ayahRepeatOptionsOpen && (
                          <div className="absolute inset-x-0 top-full z-20 mt-1 grid grid-cols-5 gap-1 rounded-lg border bg-[var(--background)] p-2 shadow-lg">
                            {REPEAT_VALUES.map((value) => (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={ayahRepeatCount === value}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setAyahRepeatCount(value);
                                  setAyahRepeatOptionsOpen(false);
                                }}
                                className={
                                  ayahRepeatCount === value
                                    ? "rounded-md border bg-[var(--foreground)] px-2 py-2 text-sm text-[var(--background)]"
                                    : "rounded-md border px-2 py-2 text-sm"
                                }
                              >
                                {value === "n" ? "∞" : value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </fieldset>

                    <fieldset className="rounded-lg border p-3">
                      <legend className="px-1 text-sm font-semibold">
                        تكرار التحديد
                      </legend>

                      <div className="relative mt-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            selectionRepeatCount === "n"
                              ? "∞"
                              : selectionRepeatCount
                          }
                          aria-label="عدد تكرار التحديد"
                          aria-expanded={selectionRepeatOptionsOpen}
                          onFocus={(event) => {
                            setSelectionRepeatOptionsOpen(true);
                            event.currentTarget.select();
                          }}
                          onChange={(event) => {
                            const value = event.target.value;
                            if (/^\d*$/.test(value)) {
                              setSelectionRepeatCount(value);
                            }
                          }}
                          onBlur={() => {
                            if (
                              !selectionRepeatCount ||
                              !Number.isSafeInteger(
                                Number(selectionRepeatCount),
                              ) ||
                              Number(selectionRepeatCount) < 1
                            ) {
                              setSelectionRepeatCount("1");
                            }
                            setSelectionRepeatOptionsOpen(false);
                          }}
                          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
                        />

                        {selectionRepeatOptionsOpen && (
                          <div className="absolute inset-x-0 top-full z-20 mt-1 grid grid-cols-5 gap-1 rounded-lg border bg-[var(--background)] p-2 shadow-lg">
                            {REPEAT_VALUES.map((value) => (
                              <button
                                key={value}
                                type="button"
                                aria-pressed={selectionRepeatCount === value}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setSelectionRepeatCount(value);
                                  setSelectionRepeatOptionsOpen(false);
                                }}
                                className={
                                  selectionRepeatCount === value
                                    ? "rounded-md border bg-[var(--foreground)] px-2 py-2 text-sm text-[var(--background)]"
                                    : "rounded-md border px-2 py-2 text-sm"
                                }
                              >
                                {value === "n" ? "∞" : value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </fieldset>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {
                        title: "الصمت قبل الآية",
                        value: silenceBeforeAyah,
                        setValue: setSilenceBeforeAyah,
                      },
                      {
                        title: "الصمت بعد الآية",
                        value: silenceAfterAyah,
                        setValue: setSilenceAfterAyah,
                      },
                      {
                        title: "الصمت قبل التحديد",
                        value: silenceBeforeSelection,
                        setValue: setSilenceBeforeSelection,
                      },
                      {
                        title: "الصمت بعد التحديد",
                        value: silenceAfterSelection,
                        setValue: setSilenceAfterSelection,
                      },
                    ].map((item) => (
                      <details
                        key={item.title}
                        className="group min-w-0 rounded-lg border"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-1 px-2 py-3 text-xs">
                          <span className="min-w-0 truncate">{item.title}</span>
                          <span className="shrink-0 font-semibold">
                            {item.value}×⌄
                          </span>
                        </summary>
                        <div className="flex flex-wrap gap-1 border-t p-2">
                          {SILENCE_VALUES.map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={
                                item.value === value
                                  ? "rounded-md border bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)]"
                                  : "rounded-md border px-2 py-1 text-xs"
                              }
                              aria-pressed={item.value === value}
                              onClick={() => item.setValue(value)}
                            >
                              {value}×
                            </button>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 rounded-lg border p-3">
                    <div className="text-sm font-semibold">القارئ</div>

                    <select
                      value={selectedReciter}
                      onChange={(event) =>
                        setSelectedReciter(event.target.value)
                      }
                      className="rounded-lg border bg-transparent px-3 py-2 text-sm"
                      aria-label="اختيار القارئ"
                    >
                      <option value="hafs-afassi">العفاسي</option>
                      <option value="hafs-abdelbasset">عبد الباسط</option>
                      <option value="hafs-soudais">السديس</option>
                      <option value="hafs-houssari">الحصري</option>
                      <option value="hafs-chatir">أبو شاطر</option>
                      <option value="hafs-djebril">جبريل</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-lg border bg-[var(--foreground)] px-4 py-3 font-semibold text-[var(--background)]"
                    onClick={validateAndStartAudio}
                  >
                    ✓ اعتماد التحديد وبدء القراءة
                  </button>
                </div>
              )}

              {modePickerOpen && (
                <div
                  className="grid grid-cols-2 justify-center gap-2 border-t border-[var(--border)] pt-3 sm:grid-cols-5"
                  role="menu"
                >
                  {SECONDARY_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={secondaryMode === mode.id}
                      className={
                        secondaryMode === mode.id
                          ? "rounded-lg border bg-[var(--foreground)] px-3 py-2 text-sm text-[var(--background)]"
                          : "rounded-lg border px-3 py-2 text-sm"
                      }
                      onClick={() => selectSecondaryMode(mode.id)}
                    >
                      {mode.icon} {mode.label}
                    </button>
                  ))}
                </div>
              )}

              {reciterPickerOpen && secondaryMode === "listening" && (
                <div
                  className="flex flex-wrap justify-center gap-2 border-t border-[var(--border)] pt-3"
                  role="menu"
                  aria-label="اختيار القارئ"
                >
                  {[
                    ["hafs-afassi", "العفاسي"],
                    ["hafs-abdelbasset", "عبد الباسط"],
                    ["hafs-soudais", "السديس"],
                    ["hafs-houssari", "الحصري"],
                    ["hafs-chatir", "أبو شاطر"],
                    ["hafs-djebril", "جبريل"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selectedReciter === id}
                      className={
                        selectedReciter === id
                          ? "rounded-lg border bg-[var(--foreground)] px-3 py-2 text-sm text-[var(--background)]"
                          : "rounded-lg border px-3 py-2 text-sm"
                      }
                      onClick={() => {
                        setSelectedReciter(id);
                        setReciterPickerOpen(false);
                        showSecondaryMessage(`القارئ: ${label}`);
                      }}
                    >
                      🎙️ {label}
                    </button>
                  ))}
                </div>
              )}

              {secondaryMessage && (
                <div
                  className="text-center text-xs font-medium"
                  role="status"
                  aria-live="polite"
                >
                  ✓ {secondaryMessage}
                </div>
              )}

              <div className="text-center text-xs text-[var(--muted)]">
                تغيير الوضع يحافظ على الصفحة والتحديد والسياق الحالي.
              </div>
            </div>
          )}

          {menu.type === "selection" && (
            <div className="flex flex-col gap-3">
              <div className="font-semibold">تحديد الكلمات</div>

              <div className="text-sm text-[var(--muted)]">
                {selectedWords.size}{" "}
                {selectedWords.size === 1 ? "كلمة محددة" : "كلمات محددة"}
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg border px-3 py-2">
                  استماع
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  تكرار
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  ترجمة
                </button>
                <button type="button" className="rounded-lg border px-3 py-2">
                  تفسير
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </article>
  );
}
