"use client";

import type { ReactNode } from "react";
import { AppMainMenu } from "./app-main-menu";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <AppMainMenu />

      <main className="mx-auto w-full max-w-7xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
