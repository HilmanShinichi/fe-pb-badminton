// Round progress against the event's planned match limit. Shared by the
// Match Maker detail and the public live pages so both read the same scale.
// With max = 0 the event has no limit, so only the count is shown (no bar to
// fill against a number that does not exist).
export function RoundProgress({
  rounds,
  maxRounds,
  label,
  unlimitedLabel,
  className = "",
}: {
  rounds: number;
  maxRounds: number;
  label: string;
  unlimitedLabel: string;
  className?: string;
}) {
  const max = maxRounds > 0 ? maxRounds : 0;
  const pct = max > 0 ? Math.min(100, Math.round((rounds / max) * 100)) : 0;
  const done = max > 0 && rounds >= max;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-bold text-ink">{label}</span>
        <span className={`text-xs font-black tabular-nums ${done ? "text-pine" : "text-ink-soft"}`}>
          {max > 0 ? `${rounds}/${max}` : unlimitedLabel}
        </span>
      </div>
      {max > 0 && (
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-court/50"
          role="progressbar"
          aria-valuenow={rounds}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label}
        >
          <div className="h-full rounded-full bg-pine transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
