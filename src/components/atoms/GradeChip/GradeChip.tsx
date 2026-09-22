// GradeChip: skill grade tag. Main A = strongest (emerald), B = mid (sky),
// C = developing (amber).
export function GradeChip({ grade }: { grade: string }) {
  const main = grade.charAt(0).toUpperCase();
  const cls =
    main === "A"
      ? "border-emerald-300 bg-emerald-100 text-emerald-900"
      : main === "B"
        ? "border-sky-300 bg-sky-100 text-sky-900"
        : "border-amber-300 bg-amber-100 text-amber-900";
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${cls}`}>
      {grade.toUpperCase()}
    </span>
  );
}
