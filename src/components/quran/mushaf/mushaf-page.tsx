"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { getAyahsByPage, getSurahs, type AyahDto } from "@/lib/api/quran";
import { getMushafPageLayout, type MushafPageLayout } from "@/lib/api/mushaf";

import { MushafLine } from "./mushaf-line";

type MushafPageProps = {
  mushafId: number;
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
  type: "ayah" | "word" | "selection" | "app-main" | "app-secondary";
  ayahId?: number;
};

const TOTAL_PAGES = 604;
const LONG_PRESS_MS = 550;
const MOVE_THRESHOLD = 20;
const SWIPE_THRESHOLD = 50;

export function MushafPage({
  mushafId,
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

  useEffect(() => {
    setSelectedAyahId(externalSelectedAyahId);
  }, [externalSelectedAyahId]);

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

  function navigatePage(delta: number) {
    const nextPage = Math.max(1, Math.min(TOTAL_PAGES, pageNumber + delta));

    if (nextPage === pageNumber) {
      return;
    }

    router.push(`/coran/page/${nextPage}`);
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
       * haut = menu secondaire de l'application IRTAKI
       * bas  = menu principal de l'application IRTAKI
       *
       * IMPORTANT :
       * le menu vertical est indépendant de la sélection
       * courante (ayah / mot / plage de mots).
       *
       * Le contenu réel de ces menus sera implémenté
       * ultérieurement.
       */
      else {
        setMenu({
          type: dy < 0 ? "app-secondary" : "app-main",
        });
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
              : menu.type === "app-main"
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
                  : menu.type === "app-main"
                    ? "القائمة الرئيسية للتطبيق"
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

          {menu.type === "app-main" && (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">القائمة الرئيسية للتطبيق</div>
              <div className="text-sm text-[var(--muted)]">
                قائمة التطبيق الرئيسية — سيتم تجهيز المحتوى لاحقًا.
              </div>
            </div>
          )}

          {menu.type === "app-secondary" && (
            <div className="flex flex-col gap-2">
              <div className="font-semibold">القائمة الثانوية للتطبيق</div>
              <div className="text-sm text-[var(--muted)]">
                قائمة التطبيق الثانوية — سيتم تجهيز المحتوى لاحقًا.
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
