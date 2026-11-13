"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProdHost =
      window.location.hostname === "irtaki.com" ||
      window.location.hostname === "www.irtaki.com";
    if (process.env.NODE_ENV !== "production" && !isProdHost && window.location.hostname !== "localhost") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.info("[PWA] SW enregistré :", reg.scope))
        .catch((err) => console.warn("[PWA] Échec SW :", err));
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}
