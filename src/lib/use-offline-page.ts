"use client";

import { useEffect, useState } from "react";
import { getPageText } from "./mushaf-downloader";

export function useOfflinePage(pageNumber: number | null) {
  const [text, setText] = useState<string | null>(null);
  const [source, setSource] = useState<"cache" | "network" | "none">("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pageNumber === null) return;
    const page = pageNumber;
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const cached = await getPageText(page);
        if (cached && !cancelled) {
          setText(cached);
          setSource("cache");
          setLoading(false);
        }
      } catch {}

      if (navigator.onLine) {
        try {
          const res = await fetch(`/api/mushaf/page/${page}`);
          if (res.ok) {
            const fresh = await res.text();
            if (!cancelled) {
              setText(fresh);
              setSource("network");
              setLoading(false);
            }
          }
        } catch {}
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  return { text, source, loading };
}
