"use client";

import { useState } from "react";

import { usePwaInstall } from "./use-pwa-install";

export function InstallButton() {
  const { state, isInstalled, promptInstall } = usePwaInstall();
  const [showIosHint, setShowIosHint] = useState(false);
  const [busy, setBusy] = useState(false);

  if (isInstalled) return null;
  if (state === "unsupported") return null;

  const handleClick = async () => {
    if (state === "available") {
      setBusy(true);
      await promptInstall();
      setBusy(false);
      return;
    }
    if (state === "ios-manual") {
      setShowIosHint(true);
      return;
    }
    if (state === "android-manual") {
      alert(
        "Si le bouton « Installer » n'apparaît pas en bas de l'écran :\n" +
        "1. Utilisez le menu ⋮ de Chrome\n" +
        "2. Choisissez « Installer l'application » ou « Ajouter à l'écran d'accueil »"
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title="تثبيت التطبيق — Installer l'application"
        aria-label="تثبيت التطبيق — Installer l'application"
        className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[var(--foreground)] transition hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 sm:h-11 sm:px-3"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        <span className="hidden text-xs font-medium sm:inline">
          تثبيت
        </span>
      </button>

      {showIosHint && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowIosHint(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--background)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="ios-install-title"
              className="text-base font-semibold text-[var(--foreground)]"
            >
              Installer IRTAKI sur iPhone / iPad
            </h2>
            <ol className="mt-4 space-y-3 text-sm text-[var(--foreground)]">
              <li className="flex gap-2">
                <span className="font-mono text-xs opacity-60">1.</span>
                <span>
                  Ouvrez Safari (cette page doit être dans <strong>Safari</strong>, pas Chrome).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs opacity-60">2.</span>
                <span>
                  Appuyez sur l&apos;icône <strong>Partager</strong> en bas de l&apos;écran.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs opacity-60">3.</span>
                <span>
                  Choisissez <strong>« Sur l&apos;écran d&apos;accueil »</strong> puis{" "}
                  <strong>Ajouter</strong>.
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHint(false)}
              className="mt-5 w-full rounded-xl border border-[var(--border)] py-2 text-sm font-medium hover:bg-[var(--surface)]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
