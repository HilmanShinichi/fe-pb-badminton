// GradeChip: skill grade tag. Main A = strongest (lime), B = mid (sky),
// C = developing (amber).
export function GradeChip({ grade }: { grade: string }) {
  const main = grade.charAt(0).toUpperCase();
  const cls =
    main === "A"
      ? "border-line bg-paper text-lime-deep"
      : main === "B"
        ? "border-sky-300 bg-sky-100 text-sky-900"
        : "border-amber-300 bg-amber-100 text-amber-900";
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] sm:text-xs font-bold tabular-nums ${cls}`}>
      {grade.toUpperCase()}
    </span>
  );
}
