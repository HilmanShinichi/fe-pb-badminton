import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import type { ThemeColors, ThemeName } from "./types";
import { themes } from "./themes";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "pb_theme";

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return "20 21 24";
  return `${(num >> 16) & 255} ${(num >> 8) & 255} ${num & 255}`;
}

function applyThemeToDom(theme: ThemeName) {
  const root = document.documentElement;
  const colors: ThemeColors = themes[theme];
  (Object.entries(colors) as Array<[keyof ThemeColors, string]>).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });

  // Expose space-separated RGB channels so Tailwind alpha modifiers (e.g. bg-paper/90)
  // adapt dynamically across every theme.
  const rgbMap: Record<string, string> = {
    "--rgb-pine": colors.primary,
    "--rgb-pine-deep": colors.primaryDeep,
    "--rgb-court": colors.surfaceAlt,
    "--rgb-lime": colors.accent,
    "--rgb-lime-deep": colors.accentDeep,
    "--rgb-paper": colors.surface,
    "--rgb-ink": colors.text,
    "--rgb-ink-soft": colors.textSoft,
    "--rgb-ink-faint": colors.textFaint,
    "--rgb-line": colors.border,
    "--rgb-card": colors.cardBg,
    "--rgb-track": colors.trackBg,
    "--rgb-link": colors.linkAccent,
  };
  Object.entries(rgbMap).forEach(([cssVar, hex]) => {
    root.style.setProperty(cssVar, hexToRgbTriplet(hex));
  });

  root.setAttribute("data-theme", theme);

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute("content", theme === "green" ? "#0d4722" : colors.surface);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "green" || saved === "light" || saved === "modern") return saved;
    } catch {
      // ignore storage errors
    }
    return "modern";
  });

  function setTheme(newTheme: ThemeName) {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // ignore storage errors
    }
  }

  useLayoutEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "modern",
      setTheme: () => {},
    };
  }
  return ctx;
}
