export function rupiah(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n < 0 ? "−" : "";
  return sign + "Rp" + Math.abs(Math.trunc(n)).toLocaleString("id-ID");
}

export function num(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Math.trunc(n).toLocaleString("id-ID");
}

export function rateBp(bp: number | null | undefined): string {
  if (bp === null || bp === undefined) return "—";
  return (bp / 10).toFixed(1) + "%";
}

export function dateId(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    PROFIT: "Profit",
    LOSS: "Loss",
    BREAK_EVEN: "Break-even",
    ACTIVE: "Active",
    DRAFT: "Draft",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    PRESENT: "Present",
    LISTED: "Listed",
    CONFIRMED: "Confirmed",
    ABSENT: "Absent",
    NO_SHOW: "No-show",
    PERIOD: "Period",
    DAILY_EVENT: "Daily/Event",
    PAID: "Paid",
    UNPAID: "Unpaid",
    DAILY: "Daily",
    GENERAL: "Both",
    SETTLED: "Settled",
    PENDING: "Pending",
    NO_BILLS: "No bills",
    PARTIALLY_PAID: "Partial",
    WAIVED: "Waived",
  };
  return map[s] ?? s;
}

export function statusClass(s: string): string {
  switch (s) {
    case "PROFIT":
    case "PRESENT":
    case "PAID":
    case "SETTLED":
    case "ACTIVE":
      return "bg-green-100 text-green-800 border-green-300";
    case "LOSS":
    case "NO_SHOW":
    case "ABSENT":
    case "CANCELLED":
      return "bg-red-100 text-red-800 border-red-300";
    case "BREAK_EVEN":
    case "LISTED":
    case "CONFIRMED":
    case "DRAFT":
    case "UNPAID":
    case "PENDING":
      return "bg-amber-100 text-amber-900 border-amber-300";
    default:
      return "bg-court text-ink border-line";
  }
}
