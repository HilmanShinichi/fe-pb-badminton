import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  useMabarListQuery,
  usePeriodsQuery,
  useReportAttendanceQuery,
  useReportFinancialQuery,
  useReportInactiveQuery,
  useReportNoShowQuery,
  useReportPlayerUsageQuery,
  useReportShuttlecockQuery,
  type ReportFilterParams,
} from "../store/services";
import { num, rateBp, rupiah } from "../format";
import { useI18n } from "../i18n";
import { Empty, ErrorBox, Loading, PageHead, IconCrown3D, IconMedalSilver3D, IconMedalBronze3D, getPlayerInitials } from "../ui";
import { downloadAuthedCsv } from "../utils/download";

type Tab = "attendance" | "noshow" | "shuttlecock" | "usage" | "financial" | "inactive";

type ScopeMode = "ALL" | "PERIOD" | "DAILY";
type PeriodSubMode = "FULL_PERIOD" | "PER_PERIOD";
type DailySubMode = "FULL_DAILY" | "PER_DAILY";

const TAB_ICONS: Record<Tab, ReactNode> = {
  attendance: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  noshow: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  shuttlecock: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  usage: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  financial: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  inactive: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

export function ReportsPage() {
  const { t, dateFormatted, isId } = useI18n();
  const [tab, setTab] = useState<Tab>("attendance");
  const [months, setMonths] = useState(3);
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");

  // Scope filter state
  const [scopeMode, setScopeMode] = useState<ScopeMode>("ALL");
  const [periodSubMode, setPeriodSubMode] = useState<PeriodSubMode>("FULL_PERIOD");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [dailySubMode, setDailySubMode] = useState<DailySubMode>("FULL_DAILY");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  const periodsQuery = usePeriodsQuery();
  const periods = periodsQuery.data || [];

  const dailyQuery = useMabarListQuery("DAILY_EVENT");
  const dailySessions = dailyQuery.data || [];

  // Default selection when options load
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p) => p.status === "ACTIVE") || periods[0];
      setSelectedPeriodId(active.id);
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    if (dailySessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(dailySessions[0].id);
    }
  }, [dailySessions, selectedSessionId]);

  const reportFilter: ReportFilterParams = useMemo(() => {
    if (scopeMode === "PERIOD") {
      if (periodSubMode === "PER_PERIOD" && selectedPeriodId) {
        return { scope: "PERIOD", period_id: selectedPeriodId };
      }
      return { scope: "PERIOD" };
    }
    if (scopeMode === "DAILY") {
      if (dailySubMode === "PER_DAILY" && selectedSessionId) {
        return { scope: "DAILY_EVENT", session_id: selectedSessionId };
      }
      return { scope: "DAILY_EVENT" };
    }
    return { scope: "ALL" };
  }, [scopeMode, periodSubMode, selectedPeriodId, dailySubMode, selectedSessionId]);

  const scopeSummaryText = useMemo(() => {
    if (scopeMode === "ALL") return t("reports.activeFilterAll");
    if (scopeMode === "PERIOD") {
      if (periodSubMode === "FULL_PERIOD") return t("reports.filterFullPeriod");
      const found = periods.find((p) => p.id === selectedPeriodId);
      return `${isId ? "Periode" : "Period"}: ${found?.name ?? t("reports.selectPeriodPrompt")}`;
    }
    if (scopeMode === "DAILY") {
      if (dailySubMode === "FULL_DAILY") return t("reports.filterFullDaily");
      const found = dailySessions.find((s) => s.id === selectedSessionId);
      return `${isId ? "Sesi" : "Session"}: ${found ? `${dateFormatted(found.date)} · ${found.venue_name || "GOR"}` : t("reports.selectDailyPrompt")}`;
    }
    return t("reports.activeFilterAll");
  }, [scopeMode, periodSubMode, selectedPeriodId, periods, dailySubMode, selectedSessionId, dailySessions, t, dateFormatted, isId]);

  const tabsConfig: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    { key: "attendance", label: t("reports.tabAttendance"), icon: TAB_ICONS.attendance },
    { key: "noshow", label: t("reports.tabNoShow"), icon: TAB_ICONS.noshow },
    { key: "shuttlecock", label: t("reports.tabShuttlecock"), icon: TAB_ICONS.shuttlecock },
    { key: "usage", label: t("reports.tabUsage"), icon: TAB_ICONS.usage },
    { key: "financial", label: t("reports.tabFinancial"), icon: TAB_ICONS.financial },
    { key: "inactive", label: t("reports.tabInactive"), icon: TAB_ICONS.inactive },
  ];

  return (
    <div className="space-y-5">
      <PageHead
        title={t("reports.pageTitle")}
        sub={t("reports.pageSubtitle")}
        right={
          <button
            type="button"
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-card transition-all hover:border-pine/40 hover:bg-court/80 disabled:opacity-50"
            onClick={async () => {
              setDlError("");
              setDownloading(true);
              try {
                await downloadAuthedCsv(csvPath(tab, months, reportFilter), `report-${tab}.csv`);
              } catch (e) {
                setDlError(e instanceof Error ? e.message : t("common.downloadFailed"));
              } finally {
                setDownloading(false);
              }
            }}
          >
            <svg className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? t("common.downloading") : t("reports.btnDownloadCsv")}
          </button>
        }
      />
      {dlError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
          {dlError}
        </p>
      )}

      {/* Scope Filter Panel */}
      <section aria-label="Scope Filter" className="rounded-xl border border-line bg-white p-3.5 shadow-card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <svg className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              {t("reports.scopeFilterLabel")}
            </span>
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setScopeMode("ALL")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "ALL"
                    ? "bg-pine text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.scopeAll")}
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("PERIOD")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "PERIOD"
                    ? "bg-pine text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.scopePeriod")}
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("DAILY")}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "DAILY"
                    ? "bg-pine text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.scopeDaily")}
              </button>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-court/50 px-3 py-1 text-xs font-medium text-pine">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-ink-soft">{t("reports.activeFilterPrefix")}</span>
            <span className="font-bold text-pine">{scopeSummaryText}</span>
          </div>
        </div>

        {/* Sub-selector when PERIOD is chosen */}
        {scopeMode === "PERIOD" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-xs">
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setPeriodSubMode("FULL_PERIOD")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  periodSubMode === "FULL_PERIOD"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.filterFullPeriod")}
              </button>
              <button
                type="button"
                onClick={() => setPeriodSubMode("PER_PERIOD")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  periodSubMode === "PER_PERIOD"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.filterPerPeriod")}
              </button>
            </div>

            {periodSubMode === "PER_PERIOD" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-soft">{t("reports.selectPeriodPrompt")}</span>
                <select
                  aria-label="Pilih Periode"
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink focus:border-pine focus:outline-none"
                >
                  {periods.length === 0 ? (
                    <option value="">{isId ? "(Belum ada periode)" : "(No periods available)"}</option>
                  ) : (
                    periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.status === "ACTIVE" ? `· [${t("status.ACTIVE")}]` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Sub-selector when DAILY is chosen */}
        {scopeMode === "DAILY" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-xs">
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setDailySubMode("FULL_DAILY")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  dailySubMode === "FULL_DAILY"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.filterFullDaily")}
              </button>
              <button
                type="button"
                onClick={() => setDailySubMode("PER_DAILY")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  dailySubMode === "PER_DAILY"
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("reports.filterPerDaily")}
              </button>
            </div>

            {dailySubMode === "PER_DAILY" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink-soft">{t("reports.selectDailyPrompt")}</span>
                <select
                  aria-label="Pilih Sesi Pertemuan"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink focus:border-pine focus:outline-none max-w-xs"
                >
                  {dailySessions.length === 0 ? (
                    <option value="">{isId ? "(Belum ada sesi daily)" : "(No daily sessions available)"}</option>
                  ) : (
                    dailySessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {dateFormatted(s.date)} · {s.venue_name || "GOR"} {s.start_time ? `(${s.start_time.slice(0, 5)})` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Tab Selector */}
      <div role="tablist" aria-label="Report type" className="flex flex-wrap items-center gap-1.5 border-b border-line pb-3">
        {tabsConfig.map(({ key, label, icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? "bg-gradient-to-r from-pine to-[#184232] text-white shadow-card shadow-pine/15"
                  : "border border-line/80 bg-white text-ink-soft hover:bg-court/60 hover:text-ink"
              }`}
            >
              <span className={active ? "text-emerald-300" : "text-ink-faint"}>{icon}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {tab === "attendance" && <AttendanceReport filter={reportFilter} months={months} onMonths={setMonths} />}
      {tab === "noshow" && <NoShowReport filter={reportFilter} />}
      {tab === "shuttlecock" && <ShuttlecockReport filter={reportFilter} />}
      {tab === "usage" && <UsageReport filter={reportFilter} />}
      {tab === "financial" && <FinancialReport filter={reportFilter} />}
      {tab === "inactive" && <InactiveReport months={months} onMonths={setMonths} />}
    </div>
  );
}

function csvPath(tab: Tab, months: number, filter: ReportFilterParams): string {
  const qs = new URLSearchParams();
  if (filter.scope && filter.scope !== "ALL") qs.set("scope", filter.scope);
  if (filter.period_id) qs.set("period_id", filter.period_id);
  if (filter.session_id) qs.set("session_id", filter.session_id);

  switch (tab) {
    case "attendance": {
      qs.set("format", "csv");
      if (months > 0) qs.set("months", String(months));
      return `/api/v1/reports/attendance?${qs.toString()}`;
    }
    case "noshow": {
      qs.set("format", "csv");
      return `/api/v1/reports/no-show?${qs.toString()}`;
    }
    case "shuttlecock": {
      qs.set("format", "csv");
      return `/api/v1/reports/shuttlecock?${qs.toString()}`;
    }
    case "usage": {
      qs.set("format", "csv");
      return `/api/v1/reports/player-usage?${qs.toString()}`;
    }
    case "financial": {
      qs.set("format", "csv");
      return `/api/v1/reports/financial?${qs.toString()}`;
    }
    case "inactive": {
      qs.set("months", String(months));
      return `/api/v1/reports/inactive-members?${qs.toString()}`;
    }
  }
}

/* =========================================================================
 * SUBCOMPONENTS FOR CLEAN KPI CARDS & VISUAL METERS
 * ========================================================================= */

function MetricCard({
  title,
  value,
  sub,
  highlight,
  badge,
}: {
  title: string;
  value: ReactNode;
  sub?: string;
  highlight?: "emerald" | "rose" | "pine";
  badge?: ReactNode;
}) {
  const borderTone =
    highlight === "emerald"
      ? "border-emerald-200 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40"
      : highlight === "rose"
      ? "border-rose-200 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40"
      : highlight === "pine"
      ? "border-pine/20 bg-gradient-to-br from-white via-court/40 to-court/60"
      : "border-line bg-white";

  const valColor =
    highlight === "emerald"
      ? "text-emerald-700"
      : highlight === "rose"
      ? "text-rose-700"
      : "text-ink";

  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 shadow-card ${borderTone}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{title}</p>
        {badge}
      </div>
      <div className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${valColor}`}>{value}</div>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </div>
  );
}

function SearchFilter({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[200px] max-w-xs flex-1">
      <svg
        className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-faint"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-white py-1.5 pl-9 pr-3 text-xs text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
      />
    </div>
  );
}

/* =========================================================================
 * 1. ATTENDANCE REPORT
 * ========================================================================= */

function AttendanceReport({
  filter,
  months,
  onMonths,
}: {
  filter: ReportFilterParams;
  months: number;
  onMonths: (m: number) => void;
}) {
  const { t, isId } = useI18n();
  const [qStr, setQStr] = useState("");
  const [podiumCategory, setPodiumCategory] = useState<"MOST_PRESENT" | "FASTEST_ARRIVAL">("MOST_PRESENT");

  const queryFilter = useMemo<ReportFilterParams>(() => {
    return {
      ...filter,
      months: months > 0 ? months : undefined,
    };
  }, [filter, months]);

  const q = useReportAttendanceQuery(queryFilter);

  const data = useMemo(() => {
    if (!q.data) return [];
    return q.data;
  }, [q.data]);

  const filtered = useMemo(() => {
    if (!qStr.trim()) return data;
    const term = qStr.toLowerCase();
    return data.filter((r) => String(r.player ?? "").toLowerCase().includes(term));
  }, [data, qStr]);

  // Top 3 players based on selected podium category
  const top3 = useMemo(() => {
    if (!data || data.length === 0) return [];
    const valid = [...data].filter((r) => Number(r.present || 0) > 0);

    if (podiumCategory === "FASTEST_ARRIVAL") {
      return valid
        .sort((a, b) => {
          const fDiff = Number(b.fastest || 0) - Number(a.fastest || 0);
          if (fDiff !== 0) return fDiff;
          const tDiff = Number(b.top3_arrival || 0) - Number(a.top3_arrival || 0);
          if (tDiff !== 0) return tDiff;
          return Number(b.present || 0) - Number(a.present || 0);
        })
        .slice(0, 3);
    }

    // Default: MOST_PRESENT
    // Tiebreaker: kalau kehadiran sama → fastest #1 terbanyak menang → lalu top3_arrival → lalu attendance rate
    return valid
      .sort((a, b) => {
        const pDiff = Number(b.present || 0) - Number(a.present || 0);
        if (pDiff !== 0) return pDiff;
        // Tiebreaker 1: paling sering jadi orang pertama absen (arrival #1)
        const fDiff = Number(b.fastest || 0) - Number(a.fastest || 0);
        if (fDiff !== 0) return fDiff;
        // Tiebreaker 2: paling sering masuk top 3 kedatangan
        const t3Diff = Number(b.top3_arrival || 0) - Number(a.top3_arrival || 0);
        if (t3Diff !== 0) return t3Diff;
        // Tiebreaker 3: attendance rate (lebih konsisten hadir)
        const aListed = Number(a.listed || 0);
        const bListed = Number(b.listed || 0);
        const aRate = aListed > 0 ? Number(a.present || 0) / aListed : 0;
        const bRate = bListed > 0 ? Number(b.present || 0) / bListed : 0;
        return bRate - aRate;
      })
      .slice(0, 3);
  }, [data, podiumCategory]);

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    top3.forEach((r, idx) => {
      map.set(String(r.player), idx + 1);
    });
    return map;
  }, [top3]);

  const first = top3[0] ?? null;
  const second = top3[1] ?? null;
  const third = top3[2] ?? null;

  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan presensi." : "Could not load attendance report."} onRetry={() => q.refetch()} />;

  // Aggregated Stats
  const totalListed = data.reduce((acc, r) => acc + Number(r.listed || 0), 0);
  const totalPresent = data.reduce((acc, r) => acc + Number(r.present || 0), 0);
  const totalCancelled = data.reduce((acc, r) => acc + Number(r.cancelled || 0), 0);
  const totalNoShow = data.reduce((acc, r) => acc + Number(r.no_show || 0), 0);
  const totalFastest = data.reduce((acc, r) => acc + Number(r.fastest || 0), 0);
  const overallRate = totalListed > 0 ? ((totalPresent / totalListed) * 100).toFixed(1) + "%" : "0%";
  const noShowRate = totalListed > 0 ? ((totalNoShow / totalListed) * 100).toFixed(1) + "%" : "0%";

  return (
    <div className="space-y-5">
      {/* Top 3 Attendance & Fastest Arrival 3D Podium */}
      <div className="overflow-hidden rounded-3xl border border-line/70 bg-gradient-to-b from-slate-50/70 via-white to-amber-50/20 p-4 sm:p-6 shadow-card">
        {/* Header with Title, Category Switcher & Range Filter Buttons */}
        <div className="mb-5 flex flex-col gap-3.5 border-b border-line/60 pb-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-court/80 p-1.5 shadow-2xs border border-line">
                <img src="/favicon.svg" alt="" className="h-full w-full object-contain" />
              </span>
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-ink-soft">
                  {podiumCategory === "MOST_PRESENT"
                    ? (isId ? "Podium Kehadiran Terbanyak" : "Top Attendance Podium")
                    : (isId ? "Podium Absen Tercepat" : "Fastest Check-in Podium")}
                </h2>
                <p className="text-xs text-ink-faint">
                  {podiumCategory === "MOST_PRESENT"
                    ? (isId
                        ? "3 pemain dengan jumlah kehadiran (presensi) tertinggi dalam rentang waktu"
                        : "Top 3 players with the highest attendance count in the range")
                    : (isId
                        ? "3 pemain yang paling sering tiba & absen paling awal di lapangan"
                        : "Top 3 players who most frequently checked in earliest at the venue")}
                </p>
              </div>
            </div>

            {/* Category Toggle: Kehadiran Terbanyak vs Absen Tercepat */}
            <div className="flex items-center gap-1 self-start sm:self-auto rounded-xl bg-court/60 p-0.5 border border-line">
              <button
                type="button"
                onClick={() => setPodiumCategory("MOST_PRESENT")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  podiumCategory === "MOST_PRESENT"
                    ? "bg-pine text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {isId ? "Kehadiran Terbanyak" : "Most Present"}
              </button>
              <button
                type="button"
                onClick={() => setPodiumCategory("FASTEST_ARRIVAL")}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  podiumCategory === "FASTEST_ARRIVAL"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {isId ? "⚡ Absen Tercepat" : "⚡ Fastest Arrival"}
              </button>
            </div>
          </div>

          {/* Range Buttons: 3 Bulan, 6 Bulan, 9 Bulan, Semua Waktu */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line/40">
            <span className="text-[11px] font-semibold text-ink-faint">
              {isId ? "Rentang Waktu Laporan:" : "Report Date Range:"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { val: 3, label: isId ? "3 Bulan Terakhir" : "Last 3 Months" },
                { val: 6, label: isId ? "6 Bulan Terakhir" : "Last 6 Months" },
                { val: 9, label: isId ? "9 Bulan Terakhir" : "Last 9 Months" },
                { val: 0, label: isId ? "Semua Waktu" : "All Time" },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onMonths(opt.val)}
                  className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                    months === opt.val
                      ? "bg-pine text-white shadow-2xs"
                      : "border border-line bg-white text-ink-soft hover:border-pine/40 hover:bg-court/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Podium Stage */}
        <div className="mx-auto flex max-w-xl items-end justify-center gap-2 sm:gap-4 pt-4">
          {/* 2nd Place (Silver) */}
          <div className="flex flex-1 flex-col items-center">
            {/* Medal & Avatar */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="mb-1 transition-transform hover:scale-105">
                <IconMedalSilver3D className="h-11 w-11 sm:h-13 sm:w-13 drop-shadow-sm" />
              </div>
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-200 font-black text-slate-700 shadow-sm text-sm sm:text-base">
                {second ? getPlayerInitials(String(second.player)) : "—"}
              </div>
            </div>

            {/* Player Info */}
            <div className="mb-2 text-center w-full px-1">
              <p className="truncate text-xs sm:text-sm font-bold text-ink" title={second ? String(second.player) : undefined}>
                {second ? String(second.player) : (isId ? "Menunggu data" : "Waiting for data")}
              </p>
              {second && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                    podiumCategory === "FASTEST_ARRIVAL"
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-slate-100 border-slate-300 text-slate-800"
                  }`}>
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `⚡ ${num(Number(second.fastest || 0))}x ${isId ? "Tercepat" : "Fastest"}`
                      : `${num(Number(second.present || 0))}x ${isId ? "Hadir" : "Present"}`}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `${num(Number(second.present || 0))}x hadir · ${Number(second.top3_arrival || 0)}x 3 terawal`
                      : (Number(second.fastest || 0) > 0 ? `⚡ ${second.fastest}x tercepat` : `${Math.round((Number(second.present || 0) / Number(second.listed || 1)) * 100)}% presensi`)}
                  </span>
                </div>
              )}
            </div>

            {/* Pedestal Block */}
            <div className="flex h-20 sm:h-24 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-slate-300 bg-gradient-to-b from-slate-200/90 via-slate-100 to-slate-50/40 pt-2 shadow-sm">
              <span className="text-2xl sm:text-3xl font-black text-slate-600/90 tracking-tight">2</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                {isId ? "Kedua" : "2nd Place"}
              </span>
            </div>
          </div>

          {/* 1st Place (Gold) - Elevated Center */}
          <div className="flex flex-1 flex-col items-center -mt-6">
            {/* 3D Crown & Avatar */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="mb-1 transition-transform hover:scale-105">
                <IconCrown3D className="h-14 w-14 sm:h-18 sm:w-18 drop-shadow-md" />
              </div>
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 font-black text-amber-950 shadow-md text-base sm:text-lg">
                {first ? getPlayerInitials(String(first.player)) : "—"}
              </div>
            </div>

            {/* Player Info */}
            <div className="mb-2 text-center w-full px-1">
              <p className="truncate text-sm sm:text-base font-extrabold text-ink" title={first ? String(first.player) : undefined}>
                {first ? String(first.player) : (isId ? "Menunggu data" : "Waiting for data")}
              </p>
              {first && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className="inline-block rounded-full bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `⚡ ${num(Number(first.fastest || 0))}x ${isId ? "Tercepat" : "Fastest"}`
                      : `${num(Number(first.present || 0))}x ${isId ? "Hadir" : "Present"}`}
                  </span>
                  <span className="text-[10px] text-amber-800/80 font-medium">
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `${num(Number(first.present || 0))}x hadir · ${Number(first.top3_arrival || 0)}x 3 terawal`
                      : (Number(first.fastest || 0) > 0 ? `⚡ ${first.fastest}x tercepat` : `${Math.round((Number(first.present || 0) / Number(first.listed || 1)) * 100)}% presensi`)}
                  </span>
                </div>
              )}
            </div>

            {/* Pedestal Block */}
            <div className="flex h-28 sm:h-34 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-amber-400 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-50/50 pt-3 shadow-md">
              <span className="text-3xl sm:text-4xl font-black text-amber-800 tracking-tight">1</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
                {isId ? "Terawal" : "1st Place"}
              </span>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="flex flex-1 flex-col items-center">
            {/* Medal & Avatar */}
            <div className="relative mb-2 flex flex-col items-center">
              <div className="mb-1 transition-transform hover:scale-105">
                <IconMedalBronze3D className="h-11 w-11 sm:h-13 sm:w-13 drop-shadow-sm" />
              </div>
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-amber-700/40 bg-gradient-to-br from-white via-orange-100 to-amber-200/80 font-black text-amber-950 shadow-sm text-sm sm:text-base">
                {third ? getPlayerInitials(String(third.player)) : "—"}
              </div>
            </div>

            {/* Player Info */}
            <div className="mb-2 text-center w-full px-1">
              <p className="truncate text-xs sm:text-sm font-bold text-ink" title={third ? String(third.player) : undefined}>
                {third ? String(third.player) : (isId ? "Menunggu data" : "Waiting for data")}
              </p>
              {third && (
                <div className="mt-1 flex flex-col items-center gap-0.5">
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                    podiumCategory === "FASTEST_ARRIVAL"
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-orange-50 border-orange-200 text-amber-800"
                  }`}>
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `⚡ ${num(Number(third.fastest || 0))}x ${isId ? "Tercepat" : "Fastest"}`
                      : `${num(Number(third.present || 0))}x ${isId ? "Hadir" : "Present"}`}
                  </span>
                  <span className="text-[10px] text-ink-faint">
                    {podiumCategory === "FASTEST_ARRIVAL"
                      ? `${num(Number(third.present || 0))}x hadir · ${Number(third.top3_arrival || 0)}x 3 terawal`
                      : (Number(third.fastest || 0) > 0 ? `⚡ ${third.fastest}x tercepat` : `${Math.round((Number(third.present || 0) / Number(third.listed || 1)) * 100)}% presensi`)}
                  </span>
                </div>
              )}
            </div>

            {/* Pedestal Block */}
            <div className="flex h-16 sm:h-20 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-amber-300 bg-gradient-to-b from-orange-200/80 via-amber-100/70 to-amber-50/30 pt-2 shadow-sm">
              <span className="text-xl sm:text-2xl font-black text-amber-900/80 tracking-tight">3</span>
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800/80">
                {isId ? "Ketiga" : "3rd Place"}
              </span>
            </div>
          </div>
        </div>

        {/* Stage Base Baseline */}
        <div className="mx-auto h-1.5 w-full max-w-xl rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>

      {data.length === 0 ? (
        <Empty text={isId ? `Tidak ada data presensi pada rentang ${months > 0 ? `${months} bulan terakhir` : "ini"}.` : t("reports.emptyData")} />
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              title={t("reports.kpiOverallAttendance")}
              value={overallRate}
              sub={isId ? `${num(totalPresent)} dari ${num(totalListed)} hadir` : `${num(totalPresent)} of ${num(totalListed)} attended`}
              highlight="emerald"
              badge={
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                  {t("status.PRESENT")}
                </span>
              }
            />
            <MetricCard
              title={isId ? "Total Absen Tercepat" : "Fastest Check-ins"}
              value={num(totalFastest)}
              sub={isId ? `${data.length} pemain aktif tercatat` : `${data.length} active players tracked`}
              highlight="pine"
              badge={
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  ⚡ Rank #1
                </span>
              }
            />
            <MetricCard
              title={t("reports.kpiCancellations")}
              value={num(totalCancelled)}
              sub={totalListed > 0 ? (isId ? `${((totalCancelled / totalListed) * 100).toFixed(1)}% dari terdaftar` : `${((totalCancelled / totalListed) * 100).toFixed(1)}% of registered`) : "0%"}
            />
            <MetricCard
              title={t("reports.kpiNoShowRate")}
              value={noShowRate}
              sub={isId ? `${num(totalNoShow)} ketidakhadiran tanpa kabar` : `${num(totalNoShow)} unexcused absences`}
              highlight={totalNoShow > 0 ? "rose" : undefined}
              badge={
                totalNoShow > 0 ? (
                  <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                    {t("status.NO_SHOW")}
                  </span>
                ) : undefined
              }
            />
          </div>

          {/* Data Table with Search, Fastest Arrival & Visual Bars */}
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-court/60 via-court/30 to-white px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-ink">{isId ? "Rincian Presensi & Kecepatan Hadir" : "Player Attendance & Arrival Breakdown"}</h3>
                <p className="text-xs text-ink-soft">{isId ? "Riwayat presensi detail dengan frekuensi absen tercepat" : "Detailed attendance history with fastest check-in frequency"}</p>
              </div>
              <SearchFilter value={qStr} onChange={setQStr} placeholder={t("reports.searchPlayerPlaceholder")} />
            </div>

            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("common.player")}</th>
                    <th className="text-right">{t("status.LISTED")}</th>
                    <th className="text-right">{t("status.PRESENT")}</th>
                    <th className="text-right">{isId ? "Absen Tercepat" : "Fastest #1"}</th>
                    <th className="text-right">{t("status.CANCELLED")}</th>
                    <th className="text-right">{t("status.NO_SHOW")}</th>
                    <th className="w-48 text-left">{isId ? "Rasio Pemenuhan" : "Fulfillment Bar"}</th>
                    <th className="text-right">{t("reports.kpiNoShowRate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const listed = Number(r.listed || 0);
                    const present = Number(r.present || 0);
                    const fastest = Number(r.fastest || 0);
                    const cancelled = Number(r.cancelled || 0);
                    const noShow = Number(r.no_show || 0);
                    const pPct = listed > 0 ? (present / listed) * 100 : 0;
                    const cPct = listed > 0 ? (cancelled / listed) * 100 : 0;
                    const nPct = listed > 0 ? (noShow / listed) * 100 : 0;
                    const rank = rankMap.get(String(r.player));

                    return (
                      <tr key={String(r.player)} className="hover:bg-court/30">
                        <td className="font-semibold text-ink">
                          {rank === 1 ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-amber-950">
                              <IconCrown3D className="h-4 w-4 shrink-0" />
                              <span>{String(r.player)}</span>
                              <span className="rounded-full bg-amber-100 border border-amber-300/80 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 shadow-2xs">#1</span>
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                              <IconMedalSilver3D className="h-3.5 w-3.5 shrink-0" />
                              <span>{String(r.player)}</span>
                              <span className="rounded-full bg-slate-100 border border-slate-300 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 shadow-2xs">#2</span>
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-amber-950">
                              <IconMedalBronze3D className="h-3.5 w-3.5 shrink-0" />
                              <span>{String(r.player)}</span>
                              <span className="rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 shadow-2xs">#3</span>
                            </span>
                          ) : (
                            <span className="font-semibold text-ink">{String(r.player)}</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums">{num(listed)}</td>
                        <td className="text-right font-medium text-emerald-700 tabular-nums">{num(present)}</td>
                        <td className="text-right tabular-nums">
                          {fastest > 0 ? (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-300/80 px-1.5 py-0.5 text-xs font-bold text-amber-900">
                              ⚡ {num(fastest)}×
                            </span>
                          ) : (
                            <span className="text-xs text-ink-faint">0×</span>
                          )}
                        </td>
                        <td className="text-right tabular-nums text-ink-soft">{num(cancelled)}</td>
                        <td className={`text-right tabular-nums ${noShow > 0 ? "font-bold text-rose-700" : "text-ink-soft"}`}>
                          {num(noShow)}
                        </td>
                        <td>
                          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line/60">
                            <div
                              style={{ width: `${pPct}%` }}
                              title={`Present: ${present} (${pPct.toFixed(0)}%)`}
                              className="bg-emerald-500 transition-all"
                            />
                            <div
                              style={{ width: `${cPct}%` }}
                              title={`Cancelled: ${cancelled} (${cPct.toFixed(0)}%)`}
                              className="bg-amber-400 transition-all"
                            />
                            <div
                              style={{ width: `${nPct}%` }}
                              title={`No-show: ${noShow} (${nPct.toFixed(0)}%)`}
                              className="bg-rose-500 transition-all"
                            />
                          </div>
                        </td>
                        <td className="text-right font-mono text-xs tabular-nums text-ink">
                          {rateBp(Number(r.no_show_rate_bp))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================================
 * 2. NO-SHOW REPORT
 * ========================================================================= */

function NoShowReport({ filter }: { filter: ReportFilterParams }) {
  const { t, isId } = useI18n();
  const q = useReportNoShowQuery(filter);
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan no-show." : "Could not load report."} onRetry={() => q.refetch()} />;
  if (q.data.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-center shadow-card">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-bold text-emerald-900">{t("reports.noShowCleanTitle")}</h3>
        <p className="mt-1 text-xs text-emerald-700">{t("reports.noShowCleanDesc")}</p>
      </div>
    );
  }

  const totalNoShows = q.data.reduce((acc, r) => acc + Number(r.no_show || 0), 0);
  const maxNoShow = Math.max(...q.data.map((r) => Number(r.no_show || 0)));

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          title={t("reports.kpiNoShowCases")}
          value={num(totalNoShows)}
          sub={isId ? "Total mangkir tanpa kabar dari semua pemain" : "Total missed sessions across all players"}
          highlight="rose"
        />
        <MetricCard
          title={t("reports.kpiPlayersAffected")}
          value={q.data.length}
          sub={isId ? "Pemain dengan minimal 1x mangkir" : "Players with at least 1 no-show"}
        />
        <MetricCard
          title={t("reports.kpiMaxNoShowRecord")}
          value={num(maxNoShow)}
          sub={isId ? "Jumlah tertinggi pada satu pemain" : "Worst single offender count"}
          highlight="rose"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line bg-gradient-to-r from-rose-50/50 via-court/20 to-white px-4 py-3">
          <h3 className="text-sm font-bold text-rose-950">{isId ? "Peringkat Kasus No-Show" : "No-Show Leaderboard"}</h3>
          <p className="text-xs text-ink-soft">{isId ? "Diurutkan dari frekuensi mangkir terbanyak" : "Sorted by no-show frequency (highest impact first)"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>{t("common.player")}</th>
                <th className="text-right">{t("status.LISTED")}</th>
                <th className="text-right">{t("status.PRESENT")}</th>
                <th className="text-right">{t("status.NO_SHOW")}</th>
                <th className="w-40">{isId ? "Intensitas" : "Intensity"}</th>
                <th className="text-right">{isId ? "Rate" : "Rate"}</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((r, i) => {
                const noShow = Number(r.no_show || 0);
                const pct = maxNoShow > 0 ? (noShow / maxNoShow) * 100 : 0;
                return (
                  <tr key={String(r.player)} className="hover:bg-rose-50/20">
                    <td>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-rose-600 text-white"
                            : i === 1
                            ? "bg-rose-100 text-rose-800"
                            : "bg-court text-ink"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="font-semibold text-ink">{String(r.player)}</td>
                    <td className="text-right tabular-nums">{Number(r.listed)}</td>
                    <td className="text-right tabular-nums">{Number(r.present)}</td>
                    <td className="text-right font-bold text-rose-700 tabular-nums">{noShow}</td>
                    <td>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
                        <div style={{ width: `${pct}%` }} className="h-full bg-rose-500 rounded-full" />
                      </div>
                    </td>
                    <td className="text-right font-mono text-xs tabular-nums text-rose-800">
                      {rateBp(Number(r.no_show_rate_bp))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 3. SHUTTLECOCK USAGE REPORT
 * ========================================================================= */

function ShuttlecockReport({ filter }: { filter: ReportFilterParams }) {
  const { t, isId } = useI18n();
  const [qStr, setQStr] = useState("");
  const q = useReportShuttlecockQuery(filter);

  const data = useMemo(() => q.data || [], [q.data]);

  const filtered = useMemo(() => {
    if (!qStr.trim()) return data;
    const term = qStr.toLowerCase();
    return data.filter((r) => String(r.player ?? "").toLowerCase().includes(term));
  }, [data, qStr]);

  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan kok." : "Could not load report."} onRetry={() => q.refetch()} />;
  if (data.length === 0) return <Empty text={t("reports.emptyData")} />;

  const totalShuttles = data.reduce((acc, r) => acc + Number(r.shuttlecock_usage || 0), 0);
  const totalMatches = data.reduce((acc, r) => acc + Number(r.matches || 0), 0);
  const avgPerMatch = totalMatches > 0 ? (totalShuttles / totalMatches).toFixed(2) : "—";
  const maxUsage = Math.max(...data.map((r) => Number(r.shuttlecock_usage || 0)), 1);
  const topPlayer = data[0];

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          title={t("reports.kpiTotalCocksUsed")}
          value={num(totalShuttles)}
          sub={isId ? "Total konsumsi kok pertandingan" : "Aggregated player match consumption"}
          highlight="pine"
        />
        <MetricCard
          title={t("reports.kpiMatchesPlayed")}
          value={num(totalMatches)}
          sub={isId ? "Jumlah partisipasi game pemain" : "Sum of player game participation"}
        />
        <MetricCard
          title={t("reports.kpiAvgCocksPerMatch")}
          value={avgPerMatch}
          sub={isId ? "Intensitas pemakaian kok rata-rata" : "Overall consumption intensity"}
          highlight="emerald"
        />
        <MetricCard
          title={t("reports.kpiTopCockConsumer")}
          value={topPlayer ? String(topPlayer.player) : "—"}
          sub={topPlayer ? (isId ? `${num(Number(topPlayer.shuttlecock_usage))} kok` : `${num(Number(topPlayer.shuttlecock_usage))} shuttles`) : ""}
          highlight="pine"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-court/60 via-court/30 to-white px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-ink">{isId ? "Peringkat Konsumsi Kok" : "Shuttlecock Consumption Ranking"}</h3>
            <p className="text-xs text-ink-soft">{isId ? "Kontribusi pemakaian kok per pemain" : "Individual player contribution to shuttlecock wear"}</p>
          </div>
          <SearchFilter value={qStr} onChange={setQStr} placeholder={t("reports.searchPlayerPlaceholder")} />
        </div>

        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>{t("common.player")}</th>
                <th className="text-right">{isId ? "Game" : "Matches"}</th>
                <th className="w-48">{isId ? "Grafik Pemakaian" : "Usage Bar"}</th>
                <th className="text-right">{isId ? "Kok Terpakai" : "Player Shuttles"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const usage = Number(r.shuttlecock_usage || 0);
                const pct = (usage / maxUsage) * 100;
                return (
                  <tr key={String(r.player)} className="hover:bg-court/30">
                    <td>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-amber-400 text-ink shadow-2xs"
                            : i === 1
                            ? "bg-slate-200 text-slate-800"
                            : i === 2
                            ? "bg-amber-100 text-amber-900"
                            : "bg-court text-ink-soft"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="font-semibold text-ink">{String(r.player)}</td>
                    <td className="text-right tabular-nums">{num(Number(r.matches))}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-pine"
                          />
                        </div>
                        <span className="w-8 text-right font-mono text-[10px] text-ink-faint">{pct.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="text-right font-bold text-pine tabular-nums">{num(usage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 4. PLAYER USAGE REPORT
 * ========================================================================= */

function UsageReport({ filter }: { filter: ReportFilterParams }) {
  const { t, isId } = useI18n();
  const [qStr, setQStr] = useState("");
  const q = useReportPlayerUsageQuery(filter);

  const data = useMemo(() => q.data || [], [q.data]);

  const filtered = useMemo(() => {
    if (!qStr.trim()) return data;
    const term = qStr.toLowerCase();
    return data.filter((r) => String(r.player ?? "").toLowerCase().includes(term));
  }, [data, qStr]);

  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan aktivitas." : "Could not load report."} onRetry={() => q.refetch()} />;
  if (data.length === 0) return <Empty text={t("reports.emptyData")} />;

  const totalPresent = data.reduce((acc, r) => acc + Number(r.present || 0), 0);
  const totalMatches = data.reduce((acc, r) => acc + Number(r.matches || 0), 0);
  const totalShuttles = data.reduce((acc, r) => acc + Number(r.shuttlecock_usage || 0), 0);
  const maxMatches = Math.max(...data.map((r) => Number(r.matches || 0)), 1);

  return (
    <div className="space-y-4">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard title={t("reports.kpiActivePlayers")} value={data.length} sub={isId ? "Pemain dengan riwayat aktivitas tercatat" : "Players with recorded activity"} highlight="pine" />
        <MetricCard title={t("reports.kpiTotalAttendances")} value={num(totalPresent)} sub={isId ? "Total kedatangan sesi" : "Sum of session check-ins"} />
        <MetricCard title={t("reports.kpiTotalMatches")} value={num(totalMatches)} sub={isId ? "Total game dimainkan" : "Total games played"} highlight="emerald" />
        <MetricCard title={t("reports.kpiTotalShuttlecocks")} value={num(totalShuttles)} sub={isId ? "Kok yang terpakai" : "Shuttlecocks used"} />
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-court/60 via-court/30 to-white px-4 py-3">
          <div>
            <h3 className="text-sm font-bold text-ink">{isId ? "Aktivitas Roster Lengkap" : "Comprehensive Activity Roster"}</h3>
            <p className="text-xs text-ink-soft">{isId ? "Presensi, frekuensi game, dan pemakaian kok" : "Attendance, game frequency, and shuttle usage"}</p>
          </div>
          <SearchFilter value={qStr} onChange={setQStr} placeholder={t("reports.searchPlayerPlaceholder")} />
        </div>

        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>{t("common.player")}</th>
                <th className="text-right">{t("status.PRESENT")}</th>
                <th className="text-right">{isId ? "Game" : "Matches"}</th>
                <th className="w-36">{isId ? "Porsi Game" : "Match Share"}</th>
                <th className="text-right">{isId ? "Kok Terpakai" : "Player Shuttles"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const matches = Number(r.matches || 0);
                const pct = (matches / maxMatches) * 100;
                return (
                  <tr key={String(r.player)} className="hover:bg-court/30">
                    <td className="font-semibold text-ink">{String(r.player)}</td>
                    <td className="text-right tabular-nums text-emerald-700 font-medium">{num(Number(r.present))}</td>
                    <td className="text-right tabular-nums font-semibold">{num(matches)}</td>
                    <td>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-line/60">
                        <div style={{ width: `${pct}%` }} className="h-full rounded-full bg-pine" />
                      </div>
                    </td>
                    <td className="text-right font-semibold tabular-nums text-ink">{num(Number(r.shuttlecock_usage))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 5. FINANCIAL REPORT
 * ========================================================================= */

function FinancialReport({ filter }: { filter: ReportFilterParams }) {
  const { t, isId } = useI18n();
  const q = useReportFinancialQuery(filter);
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan keuangan." : "Could not load financial report."} onRetry={() => q.refetch()} />;

  const { total_revenue, total_expense, cash_flow, revenue_by_source, expense_by_category } = q.data;

  const isNetPositive = cash_flow >= 0;
  const marginPct = total_revenue > 0 ? ((cash_flow / total_revenue) * 100).toFixed(1) + "%" : "0%";

  const revEntries = Object.entries(revenue_by_source).sort((a, b) => b[1] - a[1]);
  const expEntries = Object.entries(expense_by_category).sort((a, b) => b[1] - a[1]);

  const rows: Array<[string, string, number]> = [
    ...revEntries.map(([k, v]): [string, string, number] => ["Revenue", k, v]),
    ...expEntries.map(([k, v]): [string, string, number] => ["Expense", k, v]),
  ];

  return (
    <div className="space-y-5">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          title={t("reports.kpiTotalRevenue")}
          value={rupiah(total_revenue)}
          sub={isId ? "Semua pemasukan kas diterima" : "All inflows received"}
          highlight="emerald"
        />
        <MetricCard
          title={t("reports.kpiTotalExpense")}
          value={rupiah(total_expense)}
          sub={isId ? "Biaya sewa lapangan & operasional kok" : "All court & shuttle expenses"}
          highlight="rose"
        />
        <MetricCard
          title={t("reports.kpiNetCashFlow")}
          value={rupiah(cash_flow)}
          sub={isNetPositive ? (isId ? "Surplus kas operasional" : "Surplus operational fund") : (isId ? "Defisit kas operasional" : "Operating deficit")}
          highlight={isNetPositive ? "emerald" : "rose"}
          badge={
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                isNetPositive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              {isNetPositive ? (isId ? "SURPLUS (UNTUNG)" : "SURPLUS") : (isId ? "DEFISIT (RUGI)" : "DEFICIT")}
            </span>
          }
        />
        <MetricCard
          title={t("reports.kpiOperatingMargin")}
          value={marginPct}
          sub={isId ? "Margin bersih terhadap omzet" : "Net margin on revenue"}
          highlight={isNetPositive ? "emerald" : "rose"}
        />
      </div>

      {/* Visual Proportion Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Breakdown Card */}
        <div className="rounded-xl border border-emerald-200/80 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800">{t("reports.revenueBreakdownTitle")}</h3>
            <span className="font-mono text-xs font-bold text-emerald-700">{rupiah(total_revenue)}</span>
          </div>
          <div className="mt-3 space-y-3">
            {revEntries.length === 0 ? (
              <p className="py-2 text-xs text-ink-faint">{isId ? "Belum ada pemasukan tercatat." : "No revenue recorded."}</p>
            ) : (
              revEntries.map(([cat, amt]) => {
                const pct = total_revenue > 0 ? (amt / total_revenue) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">{cat.replace(/_/g, " ")}</span>
                      <span className="tabular-nums font-semibold text-ink">
                        {rupiah(amt)}{" "}
                        <span className="text-[10px] font-normal text-ink-faint">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expense Breakdown Card */}
        <div className="rounded-xl border border-rose-200/80 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">{t("reports.expenseBreakdownTitle")}</h3>
            <span className="font-mono text-xs font-bold text-rose-700">{rupiah(total_expense)}</span>
          </div>
          <div className="mt-3 space-y-3">
            {expEntries.length === 0 ? (
              <p className="py-2 text-xs text-ink-faint">{isId ? "Belum ada pengeluaran tercatat." : "No expense recorded."}</p>
            ) : (
              expEntries.map(([cat, amt]) => {
                const pct = total_expense > 0 ? (amt / total_expense) * 100 : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">{cat.replace(/_/g, " ")}</span>
                      <span className="tabular-nums font-semibold text-ink">
                        {rupiah(amt)}{" "}
                        <span className="text-[10px] font-normal text-ink-faint">({pct.toFixed(0)}%)</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-rose-50">
                      <div
                        style={{ width: `${pct}%` }}
                        className="h-full rounded-full bg-rose-500 transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Detailed Ledger Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line bg-gradient-to-r from-court/60 via-court/30 to-white px-4 py-3">
          <h3 className="text-sm font-bold text-ink">{t("reports.cashLedgerTitle")}</h3>
          <p className="text-xs text-ink-soft">{isId ? "Ringkasan pembukuan per pos keuangan" : "Raw itemized accounting summary"}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th className="w-28">{t("common.type")}</th>
                <th>{isId ? "Kategori" : "Category"}</th>
                <th className="text-right">{t("common.amount")}</th>
                <th className="text-right">{isId ? "Porsi" : "Share"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([kind, cat, amt]) => {
                const denom = kind === "Revenue" ? total_revenue : total_expense;
                const pct = denom > 0 ? ((amt / denom) * 100).toFixed(1) + "%" : "0%";
                return (
                  <tr key={`${kind}-${cat}`} className="hover:bg-court/30">
                    <td>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          kind === "Revenue" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {kind === "Revenue" ? (isId ? "Pemasukan" : "Inflow") : (isId ? "Pengeluaran" : "Outflow")}
                      </span>
                    </td>
                    <td className="font-medium text-ink">{cat.replace(/_/g, " ")}</td>
                    <td
                      className={`text-right font-semibold tabular-nums ${
                        kind === "Revenue" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {rupiah(amt)}
                    </td>
                    <td className="text-right font-mono text-xs tabular-nums text-ink-faint">{pct}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * 6. INACTIVE MEMBERS REPORT
 * ========================================================================= */

function InactiveReport({ months, onMonths }: { months: number; onMonths: (n: number) => void }) {
  const { t, dateFormatted, isId } = useI18n();
  const [qStr, setQStr] = useState("");
  const q = useReportInactiveQuery(months);

  const players = useMemo(() => q.data?.players || [], [q.data]);

  const filtered = useMemo(() => {
    if (!qStr.trim()) return players;
    const term = qStr.toLowerCase();
    return players.filter((r) => String(r.player ?? "").toLowerCase().includes(term));
  }, [players, qStr]);

  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message={isId ? "Gagal memuat laporan member nonaktif." : "Could not load report."} onRetry={() => q.refetch()} />;

  const totalInactive = players.length;
  const avgDays = totalInactive > 0 ? Math.round(players.reduce((a, r) => a + Number(r.days_inactive || 0), 0) / totalInactive) : 0;
  const maxInactive = totalInactive > 0 ? Math.max(...players.map((r) => Number(r.days_inactive || 0))) : 0;

  return (
    <div className="space-y-4">
      {/* Filter and Configuration Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-3.5 shadow-card">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">{isId ? "Batas Waktu Nonaktif:" : "Inactivity Threshold:"}</span>
          <div className="inline-flex rounded-lg border border-line bg-court/50 p-0.5">
            {[3, 6, 9, 12].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMonths(m)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  months === m ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {m} {isId ? "Bulan" : "Months"}
              </button>
            ))}
          </div>
        </div>
        <SearchFilter value={qStr} onChange={setQStr} placeholder={isId ? "Cari nama pemain nonaktif..." : "Filter inactive player..."} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          title={t("reports.kpiInactiveMembers")}
          value={totalInactive}
          sub={isId ? `Tidak hadir dalam > ${months} bulan` : `No attendance in > ${months} months`}
          highlight={totalInactive > 0 ? "rose" : "emerald"}
        />
        <MetricCard
          title={t("reports.kpiAvgDaysAbsent")}
          value={totalInactive > 0 ? `${avgDays} ${isId ? "hari" : "days"}` : "—"}
          sub={isId ? "Rata-rata durasi absen" : "Average absence duration"}
        />
        <MetricCard
          title={t("reports.kpiLongestAbsence")}
          value={totalInactive > 0 ? `${maxInactive} ${isId ? "hari" : "days"}` : "—"}
          sub={isId ? "Absen terlama tercatat" : "Maximum recorded lapse"}
          highlight={totalInactive > 0 ? "rose" : undefined}
        />
      </div>

      {players.length === 0 ? (
        <Empty text={isId ? `Tidak ada pemain aktif yang absen lebih dari ${months} bulan. Retensi hebat!` : `No active players have been absent for more than ${months} months. Great retention!`} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line bg-gradient-to-r from-court/60 via-court/30 to-white px-4 py-3">
            <h3 className="text-sm font-bold text-ink">{isId ? "Daftar Pemain Nonaktif" : "Inactive Player Roster"}</h3>
            <p className="text-xs text-ink-soft">{isId ? "Pemain yang perlu ditinjau atau dikonfirmasi status keaktifannya" : "Players requiring follow-up or membership status review"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("common.player")}</th>
                  <th>{isId ? "Terakhir Hadir" : "Last Present"}</th>
                  <th className="text-right">{isId ? "Total Hadir Dulu" : "Past Total Present"}</th>
                  <th className="text-right">{isId ? "Lama Nonaktif" : "Days Inactive"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const days = Number(r.days_inactive || 0);
                  return (
                    <tr key={String(r.player)} className="hover:bg-court/30">
                      <td className="font-semibold text-ink">{String(r.player)}</td>
                      <td className="text-xs text-ink-soft">{dateFormatted(String(r.last_present))}</td>
                      <td className="text-right font-medium tabular-nums">{num(Number(r.total_present))}</td>
                      <td className="text-right">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                            days > 180 ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {num(days)} {isId ? "hari" : "days"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
