/*
 * Copyright (c) 2025. Bindul Bhowmik
 * Dark mode additions © 2026
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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

    // Keep in sync if the user changes OS preference and no explicit choice was stored
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

/** Navbar / header toggle button */
export const ThemeToggle: FC = () => {
    const {theme, toggleTheme} = useTheme();
    const isDark = theme === "dark";

    return (
        <Button
            variant="outline-light"
            size="sm"
            className="ms-lg-2 d-flex align-items-center gap-1"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
        >
            {isDark ? <SunFill size={16} /> : <MoonStarsFill size={16} />}
            <span className="d-none d-md-inline">{isDark ? "Light" : "Dark"}</span>
        </Button>
    );
};
