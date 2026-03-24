import { createContext, useContext, useState, ReactNode } from "react";

interface ExplorationModeContextType {
  explorationEnabled: boolean;
  setExplorationEnabled: (enabled: boolean) => void;
}

const ExplorationModeContext = createContext<ExplorationModeContextType>({
  explorationEnabled: false,
  setExplorationEnabled: () => {},
});

export const useExplorationMode = () => useContext(ExplorationModeContext);

export const ExplorationModeProvider = ({ children }: { children: ReactNode }) => {
  const [explorationEnabled, setExplorationEnabledState] = useState<boolean>(() => {
    return localStorage.getItem("exploration-mode") === "true";
  });

  const setExplorationEnabled = (enabled: boolean) => {
    setExplorationEnabledState(enabled);
    localStorage.setItem("exploration-mode", String(enabled));
  };

  return (
    <ExplorationModeContext.Provider value={{ explorationEnabled, setExplorationEnabled }}>
      {children}
    </ExplorationModeContext.Provider>
  );
};
