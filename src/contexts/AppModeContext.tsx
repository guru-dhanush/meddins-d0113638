import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type AppMode = "all" | "care" | "community";

interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const AppModeContext = createContext<AppModeContextType>({
  mode: "all",
  setMode: () => {},
});

export const useAppMode = () => useContext(AppModeContext);

export const AppModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<AppMode>(() => {
    const stored = localStorage.getItem("app-mode");
    return (stored as AppMode) || "all";
  });

  const setMode = (newMode: AppMode) => {
    setModeState(newMode);
    localStorage.setItem("app-mode", newMode);
  };

  return (
    <AppModeContext.Provider value={{ mode, setMode }}>
      {children}
    </AppModeContext.Provider>
  );
};
