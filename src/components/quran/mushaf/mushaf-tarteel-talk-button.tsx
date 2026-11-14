"use client";

export type TarteelTalkState =
  | "idle"
  | "loading"
  | "listening"
  | "transcribing"
  | "error";

type Props = {
  state: TarteelTalkState;
  audioLevel: number;
  onStart: () => void;
  onStop: () => void;
  compact?: boolean;
};

function clampLevel(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

// Émeraude clair (level 0) → émeraude profond (level 1)
function levelColor(t: number): string {
  const r = Math.round(16 + (5 - 16) * t);
  const g = Math.round(185 + (100 - 185) * t);
  const b = Math.round(129 + (70 - 129) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function MushafTarteelTalkButton({
  state,
  audioLevel,
  onStart,
  onStop,
  compact = false,
}: Props) {
  const isActive = state === "listening" || state === "transcribing";
  const isError = state === "error";
  const isLoading = state === "loading";

  const level = clampLevel(audioLevel);
  const buttonSize = compact ? 40 : 48;
  const padding = compact ? 14 : 18;
  const containerSize = buttonSize + padding * 2;

  const bars = Array.from({ length: 8 }, (_, i) => {
    const sensitivity = 0.4 + (i / 7) * 0.6;
    return Math.max(2, Math.round(level * 14 * sensitivity) + 2);
  });

  const color = levelColor(level);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: containerSize, height: containerSize }}
    >
      {/* Ondes concentriques (uniquement en écoute) */}
      {isActive &&
        [2, 1, 0].map((ringIndex) => {
          const baseScale = 1 + ringIndex * 0.12;
          const scale = baseScale + level * (0.28 + ringIndex * 0.12);
          const opacity = 0.08 + level * (0.55 - ringIndex * 0.12);
          return (
            <span
              key={ringIndex}
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full transition-all duration-100"
              style={{
                width: buttonSize,
                height: buttonSize,
                transform: `scale(${scale})`,
                opacity,
                backgroundColor: color,
                filter: "blur(5px)",
              }}
            />
          );
        })}

      <button
        type="button"
        onClick={isActive ? onStop : onStart}
        disabled={isLoading}
        aria-label={
          isError
            ? "خطأ في التعرف"
            : isLoading
              ? "جاري التحضير"
              : isActive
                ? "إيقاف الترتيل"
                : "بدء الترتيل"
        }
        title={
          isError
            ? "خطأ"
            : isLoading
              ? "جاري التحضير"
              : isActive
                ? "إيقاف"
                : "بدء الترتيل"
        }
        className={`relative z-10 flex items-center justify-center rounded-full border-2 transition-colors ${
          isError
            ? "border-rose-500 bg-rose-500 text-white"
            : isActive
              ? "border-white/70 text-white"
              : "border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface)]"
        }`}
        style={{
          width: buttonSize,
          height: buttonSize,
          backgroundColor: isActive ? color : undefined,
          transitionProperty: "background-color, border-color",
          transitionDuration: "120ms",
        }}
      >
        {isLoading ? (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        ) : isError ? (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        ) : isActive ? (
          <div
            className="flex items-center justify-center"
            style={{ gap: 2 }}
            aria-hidden="true"
          >
            {bars.map((h, i) => (
              <span
                key={i}
                className="rounded-full bg-white transition-[height] duration-75"
                style={{ width: 2, height: h }}
              />
            ))}
          </div>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        )}
      </button>
    </div>
  );
}
