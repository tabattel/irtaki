"use client";

import { useOffline } from "next/offline";

export default function Loading() {
  const isOffline = useOffline();

  return (
    <div className="flex min-h-[50vh] items-center justify-center text-center">
      <div>
        <div className="mb-4 text-2xl">📖</div>
        <p className="text-[var(--foreground)]">
          {isOffline
            ? "Hors connexion — En attente du réseau pour charger cette page…"
            : "Chargement de la page…"}
        </p>
      </div>
    </div>
  );
}
