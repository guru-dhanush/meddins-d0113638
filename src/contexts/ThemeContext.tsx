import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "system",
    setTheme: () => { },
    resolvedTheme: "dark",
});

export const useTheme = () => useContext(ThemeContext);

function getSystemTheme(): "dark" | "light" {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === "undefined") return "system";
        return (localStorage.getItem("theme") as Theme) || "system";
    });

    const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

    const setTheme = (t: Theme) => {
        setThemeState(t);
        localStorage.setItem("theme", t);
    };

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolvedTheme);
    }, [resolvedTheme]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== "system") return;
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            const root = document.documentElement;
            root.classList.remove("light", "dark");
            root.classList.add(getSystemTheme());
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
