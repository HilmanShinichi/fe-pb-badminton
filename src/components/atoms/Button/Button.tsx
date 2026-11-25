import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../../i18n";
import { useTheme } from "../../../theme";

const pill = "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150";

export function Btn({
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "plain" | "danger";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { theme } = useTheme();
  const isModern = theme === "modern";
  const base = `${
    isModern ? "rounded-xl px-4 py-2.5 min-h-[40px]" : "rounded-lg px-3.5 py-2"
  } text-sm font-semibold transition-all duration-150 disabled:opacity-50 active:scale-[0.99]`;
  const styles =
    variant === "primary"
      ? "bg-[var(--theme-ctaBg)] hover:bg-[var(--theme-ctaBgHover)] text-[var(--theme-ctaText)] shadow-2xs hover:shadow-xs"
      : variant === "danger"
        ? "border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300 shadow-2xs"
        : "border border-line bg-white text-ink hover:bg-court/50 shadow-2xs";
  return (
    <button type="button" className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function DeleteRowButton({ onClick, label }: { onClick: () => void; label?: string }) {
  const { isId } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${pill} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50`}
    >
      {label ?? (isId ? "Hapus" : "Delete")}
    </button>
  );
}

export function OpenLink({ to, label }: { to: string; label?: string }) {
  const { isId } = useI18n();
  const { theme } = useTheme();
  const isModern = theme === "modern";
  return (
    <Link
      to={to}
      className={`${
        isModern
          ? "rounded-xl px-3.5 py-1.5 text-xs font-semibold bg-[var(--theme-ctaBg)] hover:bg-[var(--theme-ctaBgHover)] text-[var(--theme-ctaText)]"
          : `${pill} bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primaryDeep)] text-[var(--theme-ctaText)] hover:brightness-110`
      } inline-flex items-center justify-center shadow-2xs transition-all duration-150`}
    >
      {label ?? (isId ? "Buka" : "Open")}
    </Link>
  );
}
