import {readStorage, writeStorage} from "./safe-storage";
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
    useRef,
    type FC,
    type ReactNode,
} from "react";
import {NavDropdown} from "react-bootstrap";
import {MoonStarsFill, SunFill} from "react-bootstrap-icons";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "bls-theme";

interface ThemeContextValue {
    theme: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getPreferredTheme(): ThemeMode {
    const stored = readStorage(STORAGE_KEY);
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
    const explicitPreference = useRef(readStorage(STORAGE_KEY) !== null);
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const initial = getPreferredTheme();
        applyTheme(initial);
        return initial;
    });

    useEffect(() => {
        applyTheme(theme);
        if (explicitPreference.current) writeStorage(STORAGE_KEY, theme);
    }, [theme]);

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            if (!explicitPreference.current) {
                setThemeState(e.matches ? "dark" : "light");
            }
        };
        media.addEventListener("change", handler);
        return () => { media.removeEventListener("change", handler); };
    }, []);

    const toggleTheme = useCallback(() => {
        explicitPreference.current = true;
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    }, []);

    const value = useMemo(
        () => ({theme, toggleTheme}),
        [theme, toggleTheme]
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
    const label = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    const icon = isDark ? <SunFill size={14} /> : <MoonStarsFill size={14} />;

    return (
        <NavDropdown.Item
            as="button"
            type="button"
            onClick={toggleTheme}
            aria-label={label}
            title={label}
        >
            <span className="d-inline-flex align-items-center gap-2">
                {icon}
                <span>{label}</span>
            </span>
        </NavDropdown.Item>
    );
};
