import { IconPlay, IconWhistle } from "../Icons/SportsIcons";

export interface CountProgressBarProps {
  /** Current count (e.g. 0, 1, 2, 3, 4, 5...) */
  value: number;
  /** Maximum count threshold, defaults to 5 */
  max?: number;
  /** Type of count: 'played' for matches played, 'refereed' for referee duties */
  kind: "played" | "refereed";
  /** Whether to show the icon badge next to the bar */
  showIcon?: boolean;
  /** Additional container classes */
  className?: string;
  /** Text label or tooltip override */
  label?: string;
}

export function CountProgressBar({
  value,
  max = 5,
  kind,
  showIcon = true,
  className = "",
  label,
}: CountProgressBarProps) {
  const isPlayed = kind === "played";
  const safeVal = Math.max(0, value ?? 0);
  const pct = Math.min(100, Math.round((safeVal / max) * 100));
  const isMaxReached = safeVal >= max;

  return (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      title={label ?? `${isPlayed ? "Bermain" : "Wasit"}: ${safeVal}/${max}`}
      aria-label={`${isPlayed ? "Played" : "Refereed"}: ${safeVal} of ${max}`}
    >
      {showIcon && (
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${
            isPlayed
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
              : "bg-amber-50 text-amber-700 border border-amber-200/60"
          }`}
        >
          {isPlayed ? (
            <IconPlay className="h-2.5 w-2.5" />
          ) : (
            <IconWhistle className="h-3 w-3" />
          )}
        </span>
      )}

      {/* 5-Unit Visual Progress Track */}
      <div className="relative h-2 w-16 sm:w-20 overflow-hidden rounded-full bg-slate-100 border border-slate-200/80">
        {/* Subtle 5-segment tick marks */}
        <div className="absolute inset-0 z-10 flex justify-between pointer-events-none px-[20%]">
          <span className="h-full w-px bg-white/60" />
          <span className="h-full w-px bg-white/60" />
          <span className="h-full w-px bg-white/60" />
        </div>

        {/* Fill Gradient */}
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isPlayed
              ? "bg-gradient-to-r from-pine via-emerald-500 to-emerald-400"
              : "bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Numeric count formatted as X/5 */}
      <div className="flex items-baseline tabular-nums text-xs font-black text-ink min-w-[28px] text-right">
        <span
          className={
            isMaxReached
              ? isPlayed
                ? "text-emerald-700 font-black"
                : "text-amber-700 font-black"
              : "text-ink font-extrabold"
          }
        >
          {safeVal}
        </span>
        <span className="text-[10px] font-semibold text-ink-faint">/{max}</span>
      </div>
    </div>
  );
}
