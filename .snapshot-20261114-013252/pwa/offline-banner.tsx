"use client";

import { useOffline } from "next/offline";

export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-[#0d4f43] px-4 py-2 text-sm text-white shadow-lg" role="status">
      📡 Hors connexion — En attente du réseau…
    </div>
  );
}
