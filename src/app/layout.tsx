import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import { OfflineBanner } from "@/components/pwa/offline-banner";

export const metadata: Metadata = {
  title: {
    default: "IRTAKI — القرآن الكريم",
    template: "%s — IRTAKI",
  },
  description:
    "IRTAKI — plateforme de lecture, écoute et apprentissage du Coran.",
  manifest: "/manifest.webmanifest",
  applicationName: "IRTAKI",
  appleWebApp: {
    capable: true,
    title: "IRTAKI",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0d4f43",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
        <RegisterServiceWorker />
        <OfflineBanner />
      </body>
    </html>
  );
}
