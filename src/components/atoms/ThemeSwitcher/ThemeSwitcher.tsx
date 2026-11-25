import type { ReactNode } from "react";
import { useTheme, type ThemeName } from "../../../theme";

const THEME_OPTIONS: Array<{ id: ThemeName; label: string; title: string; icon: ReactNode }> = [
  {
    id: "modern",
    label: "Metro",
    title: "Metro Light Theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="4" />
        <path d="M7 9h10M7 14h4" />
      </svg>
    ),
  },
  {
    id: "green",
    label: "Green",
    title: "Club Green Theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  {
    id: "light",
    label: "Light",
    title: "Indigo Light Theme",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
  },
];

export function ThemeSwitcher({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isModern = theme === "modern";

  return (
    <div
      role="group"
      aria-label="Theme selector"
      className={`inline-flex items-center p-1 transition-colors ${
        isModern
          ? "rounded-full bg-[var(--theme-trackBg)] border border-line/70"
          : "rounded-xl border border-line bg-white/95 shadow-2xs"
      } ${className}`}
    >
      {THEME_OPTIONS.map((opt) => {
        const active = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-pressed={active}
            title={opt.title}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              compact ? "px-2.5 py-1.5" : "px-3 py-1.5"
            } ${
              isModern
                ? active
                  ? "rounded-full bg-white text-ink shadow-xs"
                  : "rounded-full text-ink-soft hover:text-ink"
                : active
                  ? "rounded-lg bg-[var(--theme-ctaBg)] text-[var(--theme-ctaText)] shadow-2xs"
                  : "rounded-lg text-[var(--theme-textSoft)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-surfaceAlt)]"
            }`}
          >
            {opt.icon}
            <span className={compact ? "hidden sm:inline tracking-tight" : "tracking-tight"}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
