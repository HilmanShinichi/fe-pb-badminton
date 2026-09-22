import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../../i18n";

const pill = "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-150";

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
  const base = "rounded-lg px-3.5 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50 active:scale-[0.99]";
  const styles =
    variant === "primary"
      ? "bg-gradient-to-r from-[#1d4d3b] to-[#143728] hover:from-[#143728] hover:to-[#0f2a1e] text-paper shadow-2xs hover:shadow-xs"
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
  return (
    <Link to={to} className={`${pill} bg-gradient-to-r from-pine to-pine-deep text-paper hover:brightness-110 shadow-2xs`}>
      {label ?? (isId ? "Buka" : "Open")}
    </Link>
  );
}
