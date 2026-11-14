import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Filtre : exclut les assets lourds du precache initial
const shouldPrecache = (entry: PrecacheEntry | string): boolean => {
  const url = typeof entry === "string" ? entry : entry.url;
  if (url.startsWith("/icons/")) return false;
  if (url.endsWith(".map")) return false;
  if (url.includes("/_next/static/chunks/polyfills-")) return false;
  if (url.endsWith(".svg")) return false;
  return true;
};

const precacheEntries = (self.__SW_MANIFEST ?? []).filter(shouldPrecache);

const serwist = new Serwist({
  precacheEntries,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
