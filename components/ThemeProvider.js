"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LAYOUT_COOKIE, THEME_COOKIE, readCookie, writeCookie } from "@/lib/theme";

// App-wide theme state as React context (A1 feedback: theme handling was
// spread across utility functions and direct DOM writes in the settings
// page). Any component can now read or change the preferences with
// useTheme(); this provider is the single place that persists them to
// cookies and mirrors them onto <html>.
//
// The inline THEME_INIT_SCRIPT in app/layout.js still applies the saved
// theme before hydration so the page never flashes the wrong colours;
// this provider takes over once React is running.

const ThemeContext = createContext(null);

export const THEME_OPTIONS = ["light", "dark", "system"];
export const LAYOUT_OPTIONS = ["comfortable", "compact"];

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Cookies only exist in the browser; on the server render the defaults
// are used (nothing the provider renders depends on them).
function initialPreference(name, options, fallback) {
  if (typeof document === "undefined") return fallback;
  const value = readCookie(name);
  return options.includes(value) ? value : fallback;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => initialPreference(THEME_COOKIE, THEME_OPTIONS, "system"));
  const [layout, setLayoutState] = useState(() =>
    initialPreference(LAYOUT_COOKIE, LAYOUT_OPTIONS, "comfortable")
  );
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && systemPrefersDark()
  );

  // Track the OS setting so "system" follows it live (e.g. when the OS
  // switches to dark mode at sunset) instead of only on page load.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const resolvedTheme = theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-layout", layout);
  }, [layout]);

  const setTheme = useCallback((value) => {
    if (!THEME_OPTIONS.includes(value)) return;
    writeCookie(THEME_COOKIE, value);
    setThemeState(value);
    // Apply immediately for the current OS setting; the effect above
    // keeps it in sync afterwards.
    setSystemDark(systemPrefersDark());
  }, []);

  const setLayout = useCallback((value) => {
    if (!LAYOUT_OPTIONS.includes(value)) return;
    writeCookie(LAYOUT_COOKIE, value);
    setLayoutState(value);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, layout, setLayout }),
    [theme, resolvedTheme, setTheme, layout, setLayout]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme() must be used inside <ThemeProvider>");
  return context;
}
