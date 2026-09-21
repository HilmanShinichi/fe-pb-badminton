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

export function dateId(iso: string | null | undefined, lang: "id" | "en" | string = "id"): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function dateDmy(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function statusLabel(s: string, lang: "id" | "en" | string = "id"): string {
  const mapEn: Record<string, string> = {
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
    NO_SHOW: "No-Show",
    PERIOD: "Period",
    DAILY_EVENT: "Open Play",
    PAID: "Paid",
    UNPAID: "Unpaid",
    DAILY: "Daily",
    GENERAL: "Both",
    SETTLED: "Settled",
    PENDING: "Pending",
    NO_BILLS: "No bills",
    PARTIALLY_PAID: "Partial",
    WAIVED: "Waived",
    ARCHIVED: "Archived",
  };

  const mapId: Record<string, string> = {
    PROFIT: "Surplus (Untung)",
    LOSS: "Defisit (Rugi)",
    BREAK_EVEN: "Impas",
    ACTIVE: "Aktif",
    DRAFT: "Draf",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
    PRESENT: "Hadir",
    LISTED: "Terdaftar",
    CONFIRMED: "Konfirmasi Hadir",
    ABSENT: "Tidak Hadir",
    NO_SHOW: "PHP / Mangkir",
    PERIOD: "Periode",
    DAILY_EVENT: "Mabar Umum",
    PAID: "Lunas",
    UNPAID: "Belum Bayar",
    DAILY: "Harian",
    GENERAL: "Keduanya",
    SETTLED: "Lunas",
    PENDING: "Tertunda",
    NO_BILLS: "Tanpa Tagihan",
    PARTIALLY_PAID: "Sebagian",
    WAIVED: "Digratiskan",
    ARCHIVED: "Diarsipkan",
  };

  const map = lang === "en" ? mapEn : mapId;
  return map[s] ?? mapEn[s] ?? s;
}

export function statusClass(s: string): string {
  switch (s) {
    case "PROFIT":
    case "PRESENT":
    case "PAID":
    case "SETTLED":
    case "ACTIVE":
      return "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-300";
    case "LOSS":
    case "NO_SHOW":
    case "ABSENT":
    case "CANCELLED":
      return "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-rose-300";
    case "BREAK_EVEN":
    case "LISTED":
    case "CONFIRMED":
    case "DRAFT":
    case "UNPAID":
    case "PENDING":
      return "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border-amber-300";
    default:
      return "bg-court text-ink border-line";
  }
}
