"use client";

export type TarteelTalkState =
  | "idle"
  | "loading"
  | "listening"
  | "transcribing"
  | "paused"
  | "error";

type Props = {
  state: TarteelTalkState;
  audioLevel: number;
  onToggle: () => void;
  onStop: () => void;
  compact?: boolean;
};

function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function MushafTarteelTalkButton({
  state,
  audioLevel,
  onToggle,
  onStop,
  compact = false,
}: Props) {
  const isActive = state === "listening" || state === "transcribing";
  const isPaused = state === "paused";
  const isError = state === "error";
  const isLoading = state === "loading";
  const canStop = isActive || isPaused;

  const level = clampLevel(audioLevel);
  const buttonSize = compact ? 42 : 50;
  const stopSize = compact ? 30 : 34;
  const containerSize = buttonSize + (compact ? 12 : 16);

  const bars = Array.from({ length: 7 }, (_, index) => {
    const sensitivity = 0.55 + (index / 6) * 0.65;
    const height = isActive
      ? Math.max(3, 4 + level * 19 * sensitivity)
      : 4;

    return Math.round(height);
  });

  const talkColor = isPaused ? "#D97706" : "#16834A";

  const actionLabel = isLoading
    ? "جاري التحضير"
    : isError
      ? "إعادة محاولة الترتيل"
      : isActive
        ? "إيقاف مؤقت"
        : isPaused
          ? "متابعة الترتيل"
          : "بدء الترتيل";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {isActive && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full transition-all duration-150"
            style={{
              width: buttonSize,
              height: buttonSize,
              transform: `scale(${1.12 + level * 0.2})`,
              opacity: 0.12 + level * 0.2,
              backgroundColor: talkColor,
              filter: "blur(7px)",
            }}
          />
        )}

        <button
          type="button"
          onClick={onToggle}
          disabled={isLoading}
          aria-label={actionLabel}
          title={actionLabel}
          aria-pressed={isActive}
          className="relative z-10 flex items-center justify-center rounded-full border-2 text-white transition-all duration-200 disabled:cursor-wait disabled:opacity-60"
          style={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: isActive || isPaused || isError
              ? isError ? "#DC2626" : talkColor
              : "var(--background)",
            color: isActive || isPaused || isError
              ? "#FFFFFF"
              : "var(--foreground)",
            borderColor: isActive || isPaused
              ? "rgba(255,255,255,0.75)"
              : isError
                ? "#DC2626"
                : "var(--border)",
            boxShadow: isActive
              ? `0 0 ${5 + level * 13}px ${talkColor}55`
              : "none",
          }}
        >
          {isLoading ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 animate-spin"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            </svg>
          ) : isError ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M12 8v5" />
              <path d="M12 17h.01" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          ) : isActive ? (
            <div
              className="flex items-center justify-center"
              style={{ gap: 2 }}
              aria-hidden="true"
            >
              {bars.map((height, index) => (
                <span
                  key={index}
                  className="rounded-full bg-white transition-[height] duration-100"
                  style={{ width: 2.5, height }}
                />
              ))}
            </div>
          ) : isPaused ? (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5.5v13l10-6.5z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="12" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
            </svg>
          )}
        </button>
      </div>

      {canStop && (
        <button
          type="button"
          onClick={onStop}
          aria-label="إنهاء جلسة الترتيل"
          title="إنهاء الجلسة"
          className="flex shrink-0 items-center justify-center rounded-full border border-red-500 bg-red-600 text-white transition-colors hover:bg-red-700"
          style={{ width: stopSize, height: stopSize }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="6" y="6" width="12" height="12" rx="1.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
