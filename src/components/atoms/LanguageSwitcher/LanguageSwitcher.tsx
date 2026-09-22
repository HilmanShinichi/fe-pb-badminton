import { useI18n } from "../../../i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language selector"
      className={`inline-flex items-center rounded-xl border border-line bg-white/90 p-0.5 shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setLang("id")}
        aria-pressed={lang === "id"}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
          lang === "id"
            ? "bg-gradient-to-r from-pine to-emerald-800 text-white shadow-2xs"
            : "text-ink-soft hover:text-ink hover:bg-court/60"
        }`}
        title="Bahasa Indonesia"
      >
        <span>🇮🇩</span>
        <span className="tracking-tight">ID</span>
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
          lang === "en"
            ? "bg-gradient-to-r from-pine to-emerald-800 text-white shadow-2xs"
            : "text-ink-soft hover:text-ink hover:bg-court/60"
        }`}
        title="English"
      >
        <span>🇬🇧</span>
        <span className="tracking-tight">EN</span>
      </button>
    </div>
  );
}
