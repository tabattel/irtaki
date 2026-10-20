"use client";

import { createContext, useContext } from "react";

type MainMenuContextValue = {
  openMainMenu: () => void;
  closeMainMenu: () => void;
};

const MainMenuContext = createContext<MainMenuContextValue | null>(null);

export function MainMenuProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: MainMenuContextValue;
}) {
  return (
    <MainMenuContext.Provider value={value}>
      {children}
    </MainMenuContext.Provider>
  );
}

export function useMainMenu() {
  const context = useContext(MainMenuContext);

  if (!context) {
    throw new Error("useMainMenu must be used inside MainMenuProvider");
  }

  return context;
}
