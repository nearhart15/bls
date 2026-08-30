/*
 * Theme provider + modern toggle © 2026
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type FC,
    type ReactNode,
} from "react";
import {Button} from "react-bootstrap";
import {MoonStarsFill, SunFill} from "react-bootstrap-icons";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "bls-theme";

interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
        return stored;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    }
    return "light";
}

function applyTheme(mode: ThemeMode) {
    document.documentElement.setAttribute("data-bs-theme", mode);
}

export const ThemeProvider: FC<{children: ReactNode}> = ({children}) => {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const initial = getPreferredTheme();
        applyTheme(initial);
        return initial;
    });

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setThemeState(e.matches ? "dark" : "light");
            }
        };
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

    const setTheme = useCallback((mode: ThemeMode) => {
        setThemeState(mode);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    const value = useMemo(
        () => ({theme, toggleTheme, setTheme}),
        [theme, toggleTheme, setTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return ctx;
}

export const ThemeToggle: FC = () => {
    const {theme, toggleTheme} = useTheme();
    const isDark = theme === "dark";

    return (
        <Button
            className="bls-theme-btn d-flex align-items-center gap-1 ms-lg-2"
            size="sm"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
        >
            {isDark ? <SunFill size={14} /> : <MoonStarsFill size={14} />}
            <span className="d-none d-md-inline">{isDark ? "Light" : "Dark"}</span>
        </Button>
    );
};
