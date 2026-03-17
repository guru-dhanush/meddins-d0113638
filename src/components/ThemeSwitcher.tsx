import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme();

    const options = [
        { value: "light" as const, icon: Sun, label: "Light" },
        { value: "system" as const, icon: Monitor, label: "System" },
        { value: "dark" as const, icon: Moon, label: "Dark" },
    ];

    return (
        <div className="flex gap-0.5 rounded-full border border-border bg-muted/50 p-1">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    aria-label={`${label} theme`}
                    onClick={() => setTheme(value)}
                    className={`flex items-center justify-center h-7 w-7 rounded-full transition-all ${theme === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                >
                    <Icon className="h-4 w-4" />
                </button>
            ))}
        </div>
    );
}
