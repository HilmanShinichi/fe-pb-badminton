import { useState } from "react";
import { useClubLogo, DEFAULT_LOGO } from "../../../hooks/useClubLogo";

export type ClubLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface ClubLogoProps {
  size?: ClubLogoSize;
  className?: string;
  editable?: boolean;
  onEdit?: () => void;
  showRing?: boolean;
  alt?: string;
}

const SIZE_MAP: Record<ClubLogoSize, { container: string; icon: string }> = {
  xs: { container: "h-6 w-6 min-w-6", icon: "h-3 w-3" },
  sm: { container: "h-8 w-8 min-w-8", icon: "h-3.5 w-3.5" },
  md: { container: "h-10 w-10 min-w-10", icon: "h-4 w-4" },
  lg: { container: "h-12 w-12 min-w-12", icon: "h-4.5 w-4.5" },
  xl: { container: "h-16 w-16 min-w-16", icon: "h-5 w-5" },
  "2xl": { container: "h-24 w-24 min-w-24", icon: "h-6 w-6" },
};

export function ClubLogo({
  size = "md",
  className = "",
  editable = false,
  onEdit,
  showRing = true,
  alt = "PB Kecebong Logo",
}: ClubLogoProps) {
  const { logoUrl } = useClubLogo();
  const [hasError, setHasError] = useState(false);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  const content = (
    <div
      className={`group relative shrink-0 overflow-hidden rounded-full bg-white shadow-xs transition-transform duration-200 ${
        showRing ? "ring-2 ring-lime/40" : ""
      } ${sizeConfig.container} ${editable ? "cursor-pointer hover:scale-105" : ""} ${className}`}
      onClick={editable ? onEdit : undefined}
      title={editable ? "Klik untuk ganti logo klub" : alt}
    >
      <img
        src={hasError ? DEFAULT_LOGO : logoUrl}
        alt={alt}
        onError={() => setHasError(true)}
        className="h-full w-full object-cover rounded-full"
      />
      {editable && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 backdrop-blur-2xs transition-opacity duration-200 group-hover:opacity-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-white ${sizeConfig.icon}`}
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      )}
    </div>
  );

  return content;
}
