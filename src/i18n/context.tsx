import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Language, TranslationSchema } from "./types";
import { id } from "./id";
import { en } from "./en";

const dictionaries: Record<Language, TranslationSchema> = { id, en };

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dateFormatted: (iso: string | null | undefined) => string;
  isId: boolean;
  isEn: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "pb_lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "id" || saved === "en") return saved;
    } catch {
      // ignore
    }
    return "id";
  });

  function setLang(newLang: Language) {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // ignore
    }
  }

  // Synchronize document lang attribute
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function t(path: string, vars?: Record<string, string | number>): string {
    const dict = dictionaries[lang] || dictionaries.id;
    const fallbackDict = dictionaries.id;

    function resolve(obj: unknown, p: string): string | undefined {
      const parts = p.split(".");
      let current: any = obj;
      for (const part of parts) {
        if (!current || typeof current !== "object") return undefined;
        current = current[part];
      }
      return typeof current === "string" ? current : undefined;
    }

    let result = resolve(dict, path) ?? resolve(fallbackDict, path) ?? path;

    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }

    return result;
  }

  function dateFormatted(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t,
        dateFormatted,
        isId: lang === "id",
        isEn: lang === "en",
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      lang: "id",
      setLang: () => {},
      t: (p) => p,
      dateFormatted: (iso) => iso || "—",
      isId: true,
      isEn: false,
    };
  }
  return ctx;
}
