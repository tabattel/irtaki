"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";

import { AppMainMenu } from "./app-main-menu";
import { MainMenuProvider } from "./main-menu-context";

type AppShellProps = {
  children: ReactNode;
};

type SwipeStart = {
  x: number;
  y: number;
  pointerId: number;
};

const SWIPE_THRESHOLD = 50;

export function AppShell({ children }: AppShellProps) {
  const [mainMenuOpen, setMainMenuOpen] = useState(false);
  const swipeStart = useRef<SwipeStart | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") {
      return;
    }

    swipeStart.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;

    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    swipeStart.current = null;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    if (Math.abs(dy) < SWIPE_THRESHOLD || Math.abs(dy) <= Math.abs(dx)) {
      return;
    }

    if (dy > 0) {
      setMainMenuOpen(true);
    }
  }

  function handlePointerCancel() {
    swipeStart.current = null;
  }

  return (
    <MainMenuProvider
      value={{
        openMainMenu: () => setMainMenuOpen(true),
        closeMainMenu: () => setMainMenuOpen(false),
      }}
    >
      <div
        className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <AppMainMenu open={mainMenuOpen} onOpenChange={setMainMenuOpen} />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </MainMenuProvider>
  );
}
