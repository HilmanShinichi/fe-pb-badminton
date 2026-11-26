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

const GMT7_OFFSET_MS = 7 * 60 * 60 * 1000;

export function utcIsoToGmt7Input(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const gmt7 = new Date(d.getTime() + GMT7_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${gmt7.getUTCFullYear()}-${pad(gmt7.getUTCMonth() + 1)}-${pad(gmt7.getUTCDate())}T${pad(gmt7.getUTCHours())}:${pad(gmt7.getUTCMinutes())}`;
}

export function gmt7InputToUtcIso(val: string | null | undefined): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const d = new Date(`${withSeconds}+07:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatGmt7DateTime(iso: string | null | undefined, lang: "id" | "en" | string = "id"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const datePart = d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return lang === "en" ? `${datePart}, ${timePart} GMT+7` : `${datePart}, ${timePart} WIB (GMT+7)`;
}

function formatCompactFee(n: number | null | undefined, fallback: string): string {
  if (n === null || n === undefined || n <= 0) return fallback;
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000}k`;
  return rupiah(n);
}

function formatLongDateId(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export function buildRegistrationNotesTemplate(opts: {
  start_date?: string;
  end_date?: string;
  number_of_sessions?: number;
  max_members?: number | null;
  member_contribution?: number;
  non_member_fee?: number;
}): string {
  const sessions = opts.number_of_sessions && opts.number_of_sessions > 0 ? opts.number_of_sessions : 5;
  const startLong = formatLongDateId(opts.start_date);
  const endLong = formatLongDateId(opts.end_date);
  const periodLine =
    startLong && endLong
      ? `Periode ${startLong} - ${endLong}`
      : "Periode [Tanggal Mulai] - [Tanggal Selesai]";
  const maxMembers = opts.max_members && opts.max_members > 0 ? opts.max_members : 20;
  const memberKok = formatCompactFee(opts.member_contribution, "10k");
  const nonMemberFee = formatCompactFee(opts.non_member_fee, "25k");

  return [
    `Open member untuk ${sessions}x pertemuan setiap Sabtu`,
    periodLine,
    "",
    "Lapangan 1",
    "Setiap hari Sabtu jam 13:00 - 16:00",
    "",
    "Lapangan 2",
    "Setiap hari Sabtu jam 13:00 - 16:00",
    "",
    "Lapangan 3",
    "Setiap hari Sabtu jam 13:00 - 16:00",
    "",
    `Max member ${maxMembers} orang`,
    `Setiap pertemuan iuran kok ${memberKok}`,
    `Untuk yang tidak ikut member setiap pertemuan biaya ${nonMemberFee} include kok`,
  ].join("\n");
}

function parseTimestampMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  // Format: "2026-11-27 12:00:00+00" needs to become "2026-11-27T12:00:00+00:00"
  let normalized = iso
    .replace(" ", "T")  // Replace space with T
    .replace(/([+-])(\d{2})$/, "$1$2:00");  // Add colon to timezone offset (+00 → +00:00)
  
  const ms = Date.parse(normalized);
  return Number.isNaN(ms) ? 0 : ms;
}

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function calculateCountdown(targetIso: string | null | undefined, nowMs?: number): CountdownTime {
  if (!targetIso) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const targetMs = parseTimestampMs(targetIso);
  const currentMs = nowMs ?? Date.now();
  const diffMs = Math.max(0, targetMs - currentMs);
  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: diffMs <= 0,
  };
}

export function buildMabarShareListTemplate(opts: {
  date: string | null | undefined;
  participants: Array<{ player_name: string; listed_at?: string }>;
  waitingList?: Array<{ player_name: string; listed_at?: string }>;
  lang?: "id" | "en" | string;
}): string {
  const isEn = opts.lang === "en";
  const formattedDate = dateId(opts.date, isEn ? "en" : "id");

  const sortedParticipants = [...opts.participants].sort(
    (a, b) => parseTimestampMs(a.listed_at) - parseTimestampMs(b.listed_at),
  );
  const sortedWaiting = [...(opts.waitingList ?? [])].sort(
    (a, b) => parseTimestampMs(a.listed_at) - parseTimestampMs(b.listed_at),
  );

  const lines: string[] = [
    "===========================================",
    isEn
      ? `List for the joint play session (mabar) on ${formattedDate}`
      : `List mabar tanggal ${formattedDate}`,
    isEn
      ? `Total participants: ${sortedParticipants.length}`
      : `Total peserta: ${sortedParticipants.length}`,
    "",
  ];

  if (sortedParticipants.length === 0) {
    lines.push(isEn ? "(No participants yet)" : "(Belum ada peserta)");
  } else {
    sortedParticipants.forEach((p, idx) => {
      lines.push(`${idx + 1}. ${p.player_name}`);
    });
  }

  if (sortedWaiting.length > 0) {
    lines.push("");
    lines.push(isEn ? "Waiting List:" : "Waiting List:");
    sortedWaiting.forEach((w, idx) => {
      lines.push(`${idx + 1}. ${w.player_name}`);
    });
  }

  lines.push("");
  lines.push("============================================");

  return lines.join("\n");
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
    NOT_LISTED: "Not Listed",
    ABSENT: "Absent",
    NO_SHOW: "No-Show",
    WAITING: "Waiting List",
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
    NOT_LISTED: "Tidak Hadir",
    ABSENT: "Tidak Hadir",
    NO_SHOW: "PHP / Mangkir",
    WAITING: "Daftar Tunggu",
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
      return "bg-gradient-to-r from-lime-50 to-lime-50 text-lime-deep border-line";
    case "LOSS":
    case "NO_SHOW":
    case "ABSENT":
    case "CANCELLED":
      return "bg-gradient-to-r from-rose-50 to-red-50 text-rose border-rose-300";
    case "BREAK_EVEN":
    case "LISTED":
    case "CONFIRMED":
    case "NOT_LISTED":
    case "DRAFT":
    case "UNPAID":
    case "PENDING":
    case "WAITING":
      return "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-900 border-amber-300";
    default:
      return "bg-court text-ink border-line";
  }
}
