import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "IRTAKI — القرآن الكريم والتعلّم",
    template: "%s — IRTAKI",
  },
  description:
    "IRTAKI — plateforme de lecture, écoute et apprentissage du Coran.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
