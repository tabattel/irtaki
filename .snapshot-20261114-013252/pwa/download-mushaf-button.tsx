"use client";

import { useState } from "react";
import { downloadAllPages } from "@/lib/mushaf-downloader";

export function DownloadMushafButton({ variant = "compact" }: { variant?: "compact" | "row" } = {}) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    if (downloading) return;
    if (!confirm("Télécharger tout le texte du mushaf (604 pages) ? Cela peut prendre quelques minutes.")) return;
    setDownloading(true);
    setProgress(0);
    try {
      await downloadAllPages((done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      alert("✅ Texte du mushaf téléchargé avec succès !");
    } catch (err) {
      alert("❌ Erreur lors du téléchargement. Vérifiez votre connexion.");
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  if (downloading) {
    return (
      <span
        className={
          variant === "row"
            ? "flex h-12 w-full items-center justify-center rounded-lg border border-[var(--jannah-gold)]/40 px-4 text-sm font-semibold text-[var(--jannah-green)]"
            : "flex h-9 items-center rounded-lg px-2 text-xs text-[var(--foreground)]"
        }
      >
        {progress}%
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      title="Télécharger le texte du mushaf"
      className={
        variant === "row"
          ? "flex h-12 w-full items-center gap-2 rounded-lg border border-transparent px-4 text-right text-base text-[var(--foreground)] transition hover:border-[var(--jannah-gold)]/60 hover:bg-[var(--jannah-cream)]"
          : "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[var(--foreground)] transition hover:bg-[var(--surface)]"
      }
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" />
      </svg>
      <span className="hidden text-xs font-medium sm:inline">تحميل</span>
    </button>
  );
}
