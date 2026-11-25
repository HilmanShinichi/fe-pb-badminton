import { useI18n } from "../../../i18n";
import { useTheme } from "../../../theme";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const { theme } = useTheme();
  const isModern = theme === "modern";

  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center p-1 transition-colors ${
        isModern
          ? "rounded-full bg-[var(--theme-trackBg)] border border-line/70"
          : "rounded-xl border border-line bg-white/90 shadow-2xs"
      } ${className}`}
    >
      {(["id", "en"] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            title={code === "id" ? "Bahasa Indonesia" : "English"}
            className={`flex items-center justify-center px-2.5 py-1.5 text-xs font-bold uppercase tracking-tight transition-all cursor-pointer ${
              isModern
                ? active
                  ? "rounded-full bg-white text-ink shadow-xs"
                  : "rounded-full text-ink-soft hover:text-ink"
                : active
                  ? "rounded-lg bg-[var(--theme-ctaBg)] text-[var(--theme-ctaText)] shadow-2xs"
                  : "rounded-lg text-ink-soft hover:text-ink hover:bg-court/60"
            }`}
          >
            {code.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
