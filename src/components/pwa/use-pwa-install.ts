"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PwaInstallState =
  | "unsupported"
  | "available"
  | "installed"
  | "ios-manual"
  | "android-manual"
  | "unknown";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [state, setState] = useState<PwaInstallState>("unknown");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      setState("installed");
      return;
    }

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setState("available");
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setState("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev !== "unknown") return prev;
        if (isIOS) return "ios-manual";
        if (/android/i.test(ua)) return "android-manual";
        return "unsupported";
      });
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timeout);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const choice = (await deferredPrompt.userChoice) as {
        outcome: "accepted" | "dismissed";
      };
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        setState("installed");
        setIsInstalled(true);
      } else {
        setState("available");
      }
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, [deferredPrompt]);

  return { state, isInstalled, promptInstall };
}
