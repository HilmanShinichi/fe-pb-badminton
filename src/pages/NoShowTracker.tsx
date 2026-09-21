import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSelector } from "react-redux";
import {
  useDeleteNoShowIncidentMutation,
  useMabarListQuery,
  useNoShowTrackerQuery,
  usePeriodsQuery,
  usePlayersAllQuery,
  useSetAttendanceMutation,
  type NoShowTrackerIncident,
  type NoShowTrackerParams,
  type NoShowTrackerPlayer,
} from "../store/services";
import type { RootState } from "../store/store";
import { num, rateBp } from "../format";
import { useI18n } from "../i18n";
import { Badge, ErrorBox, Loading, PageHead } from "../ui";

type ScopeMode = "ALL" | "PERIOD" | "DAILY";
type PeriodSubMode = "FULL_PERIOD" | "PER_PERIOD";
type DailySubMode = "FULL_DAILY" | "PER_DAILY";
type ViewTab = "leaderboard" | "incidents";
type LeaderboardSort = "incidents" | "rate" | "recent" | "name";

export function NoShowTrackerPage() {
  const token = useSelector((s: RootState) => s.auth.token);
  const { t, dateFormatted, isId } = useI18n();

  // Time filter: 0 = all time, 3, 6, 9, 12 months
  const [months, setMonths] = useState<number>(6);

  // Scope filter
  const [scopeMode, setScopeMode] = useState<ScopeMode>("ALL");
  const [periodSubMode, setPeriodSubMode] = useState<PeriodSubMode>("FULL_PERIOD");
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [dailySubMode, setDailySubMode] = useState<DailySubMode>("FULL_DAILY");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NO_SHOW" | "CANCELLED">("ALL");

  // Tab: leaderboard vs incidents log
  const [viewTab, setViewTab] = useState<ViewTab>("leaderboard");

  // Sorting for leaderboard
  const [sortKey, setSortKey] = useState<LeaderboardSort>("incidents");

  // Search filter
  const [searchStr, setSearchStr] = useState("");

  // Manual entry modal
  const [modalOpen, setModalOpen] = useState(false);

  // Selected incident for delete/correction modal
  const [incidentToDelete, setIncidentToDelete] = useState<NoShowTrackerIncident | null>(null);

  // Notification feedback
  const [notice, setNotice] = useState<string>("");

  // Selected player for viewing their specific incidents modal/panel
  const [expandedPlayer, setExpandedPlayer] = useState<NoShowTrackerPlayer | null>(null);

  // Queries for options
  const periodsQuery = usePeriodsQuery();
  const periods = periodsQuery.data || [];

  const dailyQuery = useMabarListQuery("DAILY_EVENT");
  const dailySessions = dailyQuery.data || [];

  // Default dropdown selections
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

  const queryParams: NoShowTrackerParams = useMemo(() => {
    const p: NoShowTrackerParams = {};
    if (months > 0) p.months = months;
    if (statusFilter !== "ALL") p.status = statusFilter;

    if (scopeMode === "PERIOD") {
      if (periodSubMode === "PER_PERIOD" && selectedPeriodId) {
        p.scope = "PERIOD";
        p.period_id = selectedPeriodId;
      } else {
        p.scope = "PERIOD";
      }
    } else if (scopeMode === "DAILY") {
      if (dailySubMode === "PER_DAILY" && selectedSessionId) {
        p.scope = "DAILY_EVENT";
        p.session_id = selectedSessionId;
      } else {
        p.scope = "DAILY_EVENT";
      }
    } else {
      p.scope = "ALL";
    }
    return p;
  }, [months, statusFilter, scopeMode, periodSubMode, selectedPeriodId, dailySubMode, selectedSessionId]);

  const trackerQuery = useNoShowTrackerQuery(queryParams);

  const players = useMemo(() => trackerQuery.data?.players || [], [trackerQuery.data]);
  const incidents = useMemo(() => trackerQuery.data?.incidents || [], [trackerQuery.data]);

  const filteredPlayers = useMemo(() => {
    let list = players;
    if (searchStr.trim()) {
      const term = searchStr.toLowerCase();
      list = list.filter((p) => p.player_name.toLowerCase().includes(term));
    }
    const sorted = [...list];
    switch (sortKey) {
      case "rate":
        sorted.sort((a, b) => b.rate_bp - a.rate_bp || b.total_incidents - a.total_incidents);
        break;
      case "recent":
        sorted.sort((a, b) => (b.last_incident || "").localeCompare(a.last_incident || ""));
        break;
      case "name":
        sorted.sort((a, b) => a.player_name.localeCompare(b.player_name));
        break;
      case "incidents":
      default:
        sorted.sort((a, b) => b.total_incidents - a.total_incidents || b.no_show_count - a.no_show_count);
        break;
    }
    return sorted;
  }, [players, searchStr, sortKey]);

  const filteredIncidents = useMemo(() => {
    if (!searchStr.trim()) return incidents;
    const term = searchStr.toLowerCase();
    return incidents.filter(
      (it) =>
        it.player_name.toLowerCase().includes(term) ||
        it.venue_name.toLowerCase().includes(term) ||
        it.reason.toLowerCase().includes(term),
    );
  }, [incidents, searchStr]);

  // Auto-clear notice after 4 seconds
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  // Keep expandedPlayer synced with latest data after mutations
  useEffect(() => {
    if (expandedPlayer && trackerQuery.data?.players) {
      const p = trackerQuery.data.players.find((it) => it.player_id === expandedPlayer.player_id);
      if (p) {
        setExpandedPlayer(p);
      } else {
        setExpandedPlayer(null);
      }
    }
  }, [trackerQuery.data, expandedPlayer]);

  // Aggregated KPIs
  const totalIncidents = trackerQuery.data?.total_incidents ?? incidents.length;
  const totalPlayersRecorded = players.length;
  const topOffender = players[0];
  const totalNoShows = players.reduce((a, b) => a + b.no_show_count, 0);
  const totalCancelled = players.reduce((a, b) => a + b.cancelled_count, 0);

  const scopeSummaryText = useMemo(() => {
    if (scopeMode === "ALL") return t("noShow.scopeAll");
    if (scopeMode === "PERIOD") {
      if (periodSubMode === "FULL_PERIOD") return t("noShow.fullPeriod");
      const found = periods.find((p) => p.id === selectedPeriodId);
      return `${isId ? "Periode" : "Period"}: ${found?.name ?? t("noShow.selectPeriod")}`;
    }
    if (scopeMode === "DAILY") {
      if (dailySubMode === "FULL_DAILY") return t("noShow.fullDaily");
      const found = dailySessions.find((s) => s.id === selectedSessionId);
      return `${isId ? "Sesi" : "Session"}: ${found ? `${dateFormatted(found.date)} · ${found.venue_name || "GOR"}` : t("noShow.selectSession")}`;
    }
    return t("common.all");
  }, [scopeMode, periodSubMode, selectedPeriodId, periods, dailySubMode, selectedSessionId, dailySessions, t, dateFormatted, isId]);

  function csvHref(): string {
    const qs = new URLSearchParams();
    qs.set("format", "csv");
    if (token) qs.set("token", token);
    if (queryParams.months) qs.set("months", String(queryParams.months));
    if (queryParams.scope && queryParams.scope !== "ALL") qs.set("scope", queryParams.scope);
    if (queryParams.period_id) qs.set("period_id", queryParams.period_id);
    if (queryParams.session_id) qs.set("session_id", queryParams.session_id);
    if (queryParams.status && queryParams.status !== "ALL") qs.set("status", queryParams.status);
    return `/api/v1/reports/no-show-tracker?${qs.toString()}`;
  }

  return (
    <div className="space-y-5">
      <PageHead
        title={t("noShow.pageTitle")}
        sub={t("noShow.pageSubtitle")}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1d4d3b] to-[#143728] px-4 py-1.5 text-xs font-semibold text-white shadow-card shadow-pine/20 transition-all hover:opacity-95 cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t("noShow.btnRecordManual")}
            </button>
            <a
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-card transition-all hover:border-pine/40 hover:bg-court/80"
              href={csvHref()}
              onClick={(e) => {
                if (!token) e.preventDefault();
              }}
            >
              <svg className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("common.downloadCsv")}
            </a>
          </div>
        }
      />

      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notice}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Control Box */}
      <section aria-label="Filter Kontrol" className="rounded-xl border border-line bg-white p-4 shadow-card space-y-3.5">
        {/* Row 1: Months Threshold and Scope Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Months selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <svg className="h-4 w-4 text-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {isId ? "Rentang Waktu:" : "Time Range:"}
            </span>
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              {[
                { val: 0, label: t("noShow.monthsAll") },
                { val: 3, label: t("noShow.months3") },
                { val: 6, label: t("noShow.months6") },
                { val: 9, label: t("noShow.months9") },
                { val: 12, label: t("noShow.months12") },
              ].map(({ val, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonths(val)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    months === val ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Active summary badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pine/20 bg-court/50 px-3 py-1 text-xs font-medium text-pine">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-ink-soft">{t("noShow.filterScopeLabel")}</span>
            <span className="font-bold text-pine">{scopeSummaryText}</span>
          </div>
        </div>

        {/* Row 2: Scope Mode Switcher & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink">{isId ? "Tipe Sesi:" : "Session Scope:"}</span>
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setScopeMode("ALL")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "ALL" ? "bg-emerald-700 text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.scopeAll")}
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("PERIOD")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "PERIOD" ? "bg-emerald-700 text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.scopePeriod")}
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("DAILY")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  scopeMode === "DAILY" ? "bg-emerald-700 text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.scopeDaily")}
              </button>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink">{t("common.status")}:</span>
            <select
              aria-label="Filter Status Insiden"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "NO_SHOW" | "CANCELLED")}
              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink focus:border-pine focus:outline-none"
            >
              <option value="ALL">{t("noShow.statusAll")}</option>
              <option value="NO_SHOW">🔴 {t("noShow.statusNoShowOnly")}</option>
              <option value="CANCELLED">🟡 {t("noShow.statusCancelledOnly")}</option>
            </select>
          </div>
        </div>

        {/* Row 3: Sub-selector for Period or Daily if chosen */}
        {scopeMode === "PERIOD" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-xs">
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setPeriodSubMode("FULL_PERIOD")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  periodSubMode === "FULL_PERIOD" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.fullPeriod")}
              </button>
              <button
                type="button"
                onClick={() => setPeriodSubMode("PER_PERIOD")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  periodSubMode === "PER_PERIOD" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.perPeriod")}
              </button>
            </div>

            {periodSubMode === "PER_PERIOD" && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink-soft">{t("noShow.selectPeriod")}</span>
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

        {scopeMode === "DAILY" && (
          <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-3 text-xs">
            <div className="inline-flex rounded-lg border border-line bg-court/40 p-0.5">
              <button
                type="button"
                onClick={() => setDailySubMode("FULL_DAILY")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  dailySubMode === "FULL_DAILY" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.fullDaily")}
              </button>
              <button
                type="button"
                onClick={() => setDailySubMode("PER_DAILY")}
                className={`rounded-md px-3 py-1 font-semibold transition-all cursor-pointer ${
                  dailySubMode === "PER_DAILY" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {t("noShow.perDaily")}
              </button>
            </div>

            {dailySubMode === "PER_DAILY" && (
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink-soft">{t("noShow.selectSession")}</span>
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

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title={t("noShow.kpiTotalCases")}
          value={num(totalNoShows)}
          sub={isId ? `${num(totalIncidents)} total termasuk batal` : `${num(totalIncidents)} total including cancellations`}
          highlight="rose"
          badge={
            <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
              {t("status.NO_SHOW")}
            </span>
          }
        />
        <StatCard
          title={t("noShow.kpiCancelled")}
          value={num(totalCancelled)}
          sub={t("noShow.kpiCancelledSub")}
          highlight="pine"
        />
        <StatCard
          title={t("noShow.kpiAffectedPlayers")}
          value={num(totalPlayersRecorded)}
          sub={months > 0 ? (isId ? `Dalam ${months} bulan terakhir` : `Within the last ${months} months`) : (isId ? "Seluruh riwayat klub" : "All-time club history")}
        />
        <StatCard
          title={t("noShow.kpiTopOffender")}
          value={topOffender ? topOffender.player_name : "—"}
          sub={topOffender ? (isId ? `${topOffender.no_show_count}x PHP (${topOffender.total_incidents}x total)` : `${topOffender.no_show_count}x no-show (${topOffender.total_incidents}x total)`) : (isId ? "Tidak ada" : "None")}
          highlight={topOffender ? "rose" : "emerald"}
        />
      </div>

      {/* Main View Panel with Tabs */}
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
        {/* Panel Header & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-court/70 via-court/30 to-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewTab("leaderboard")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewTab === "leaderboard"
                  ? "bg-pine text-white shadow-2xs"
                  : "bg-white text-ink-soft border border-line hover:text-ink"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {t("noShow.tabLeaderboard")} ({players.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("incidents")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                viewTab === "incidents"
                  ? "bg-pine text-white shadow-2xs"
                  : "bg-white text-ink-soft border border-line hover:text-ink"
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {t("noShow.tabIncidentLog")} ({incidents.length})
            </button>
          </div>

          {/* Search bar */}
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
              value={searchStr}
              onChange={(e) => setSearchStr(e.target.value)}
              placeholder={t("noShow.searchPlaceholder")}
              className="w-full rounded-xl border border-line bg-white py-1.5 pl-9 pr-3 text-xs text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
            />
          </div>
        </div>

        {/* Content Area */}
        {trackerQuery.isFetching && !trackerQuery.data ? (
          <Loading />
        ) : trackerQuery.isError || !trackerQuery.data ? (
          <ErrorBox message={isId ? "Gagal memuat rekap no-show." : "Failed to load no-show tracker data."} onRetry={() => trackerQuery.refetch()} />
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-ink">{t("noShow.emptyIncidentsTitle")}</h3>
            <p className="mt-1 text-xs text-ink-soft">
              {months > 0
                ? t("noShow.emptyIncidentsMonths", { months })
                : t("noShow.emptyIncidentsAllTime")}
            </p>
          </div>
        ) : viewTab === "leaderboard" ? (
          /* =========================================================================
           * VIEW TAB 1: LEADERBOARD OF NO-SHOW OFFENDERS
           * ========================================================================= */
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th className="w-12">{t("noShow.colRank")}</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => setSortKey(sortKey === "name" ? "incidents" : "name")}
                      className="flex items-center gap-1 font-bold hover:text-pine transition-colors cursor-pointer"
                      title={isId ? "Urutkan berdasarkan Nama" : "Sort by Name"}
                    >
                      <span>{t("noShow.colPlayerName")}</span>
                      {sortKey === "name" && <span className="text-pine font-mono">↓</span>}
                    </button>
                  </th>
                  <th className="text-right">{t("noShow.colNoShow")}</th>
                  <th className="text-right">{t("noShow.colCancelled")}</th>
                  <th className="text-right">
                    <button
                      type="button"
                      onClick={() => setSortKey("incidents")}
                      className="inline-flex items-center gap-1 font-bold hover:text-pine transition-colors cursor-pointer ml-auto"
                      title={isId ? "Urutkan berdasarkan Total Insiden" : "Sort by Total Incidents"}
                    >
                      <span>{t("noShow.colTotalIncidents")}</span>
                      {sortKey === "incidents" && <span className="text-pine font-mono">↓</span>}
                    </button>
                  </th>
                  <th className="text-right">{t("noShow.colListedSessions")}</th>
                  <th className="text-right">
                    <button
                      type="button"
                      onClick={() => setSortKey(sortKey === "rate" ? "incidents" : "rate")}
                      className="inline-flex items-center gap-1 font-bold hover:text-pine transition-colors cursor-pointer ml-auto"
                      title={isId ? "Urutkan berdasarkan Persentase No-Show" : "Sort by No-Show Rate"}
                    >
                      <span>{t("noShow.colNoShowRate")}</span>
                      {sortKey === "rate" && <span className="text-pine font-mono">↓</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      onClick={() => setSortKey(sortKey === "recent" ? "incidents" : "recent")}
                      className="flex items-center gap-1 font-bold hover:text-pine transition-colors cursor-pointer"
                      title={isId ? "Urutkan berdasarkan Tanggal Terbaru" : "Sort by Most Recent Date"}
                    >
                      <span>{t("noShow.colLastTime")}</span>
                      {sortKey === "recent" && <span className="text-pine font-mono">↓</span>}
                    </button>
                  </th>
                  <th className="text-center w-28">{t("noShow.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-ink-soft italic bg-paper/30">
                      {t("noShow.emptySearchPlayer", { search: searchStr })}
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p, i) => (
                  <tr key={p.player_id} className="hover:bg-court/30">
                    <td>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0
                            ? "bg-rose-600 text-white shadow-2xs"
                            : i === 1
                            ? "bg-rose-100 text-rose-800"
                            : i === 2
                            ? "bg-amber-100 text-amber-900"
                            : "bg-court text-ink-soft"
                        }`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-ink">{p.player_name}</span>
                    </td>
                    <td className="text-right font-bold text-rose-700 tabular-nums">
                      {num(p.no_show_count)}
                    </td>
                    <td className="text-right text-amber-900 tabular-nums font-medium">
                      {num(p.cancelled_count)}
                    </td>
                    <td className="text-right font-bold text-ink tabular-nums">
                      {num(p.total_incidents)}
                    </td>
                    <td className="text-right tabular-nums text-ink-soft">
                      {num(p.total_listed)}
                    </td>
                    <td className="text-right font-mono text-xs tabular-nums font-semibold text-rose-800">
                      {rateBp(p.rate_bp)}
                    </td>
                    <td className="text-xs text-ink-soft">
                      {p.last_incident ? dateFormatted(p.last_incident) : "—"}
                    </td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => setExpandedPlayer(p)}
                        className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-semibold text-pine hover:bg-court/60 cursor-pointer"
                      >
                        {t("noShow.btnDetails")} ({p.incidents.length})
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        ) : (
          /* =========================================================================
           * VIEW TAB 2: INCIDENT LOG PER SESSION
           * ========================================================================= */
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th className="w-28">{t("common.date")}</th>
                  <th className="w-28">{t("noShow.colSessionType")}</th>
                  <th>{t("noShow.colSessionVenue")}</th>
                  <th>{t("common.player")}</th>
                  <th className="w-36">{t("common.status")}</th>
                  <th>{t("noShow.colAdminNotes")}</th>
                  <th className="w-24 text-right">{t("noShow.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-ink-soft italic bg-paper/30">
                      {t("noShow.emptySearchIncidents", { search: searchStr })}
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((it) => (
                  <tr key={it.attendance_id || `${it.session_id}-${it.player_id}`} className="hover:bg-court/30">
                    <td className="text-xs font-semibold tabular-nums text-ink">
                      {dateFormatted(it.session_date)}
                    </td>
                    <td>
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          it.session_type === "PERIOD"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {it.session_type === "PERIOD" ? t("status.PERIOD") : t("status.DAILY_EVENT")}
                      </span>
                    </td>
                    <td>
                      <p className="text-xs font-medium text-ink">
                        {it.period_name ? `${it.period_name} · ` : ""}
                        {it.venue_name || "GOR"}
                      </p>
                    </td>
                    <td className="font-semibold text-ink">{it.player_name}</td>
                    <td>
                      <Badge status={it.status} />
                    </td>
                    <td className="text-xs text-ink">
                      {it.reason ? (
                        <span className="italic text-ink-soft">"{it.reason}"</span>
                      ) : (
                        <span className="text-ink-faint italic">{isId ? "(Tanpa keterangan)" : "(No note provided)"}</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setIncidentToDelete(it)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
                        title={isId ? "Hapus atau koreksi catatan salah input" : "Delete or correct mistaken entry"}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>{t("common.delete")}</span>
                      </button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Details of specific player incidents */}
      {expandedPlayer && (
        <PlayerIncidentsModal
          player={expandedPlayer}
          onClose={() => setExpandedPlayer(null)}
          onDeleteIncident={(it) => setIncidentToDelete(it)}
        />
      )}

      {/* Modal: Manual Entry of No-Show / PHP */}
      {modalOpen && (
        <ManualEntryModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            setNotice(t("noShow.successSaved"));
            trackerQuery.refetch();
          }}
        />
      )}

      {/* Modal: Konfirmasi Hapus / Perbaiki Catatan (Notif Modal) */}
      {incidentToDelete && (
        <DeleteIncidentModal
          incident={incidentToDelete}
          onClose={() => setIncidentToDelete(null)}
          onDeleted={(msg) => {
            setNotice(msg);
            trackerQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

/* =========================================================================
 * SUBCOMPONENT: STAT CARD
 * ========================================================================= */

function StatCard({
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

/* =========================================================================
 * MODAL: PLAYER SPECIFIC INCIDENTS LIST
 * ========================================================================= */

function PlayerIncidentsModal({
  player,
  onClose,
  onDeleteIncident,
}: {
  player: NoShowTrackerPlayer;
  onClose: () => void;
  onDeleteIncident: (incident: NoShowTrackerIncident) => void;
}) {
  const { t, dateFormatted, isId } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-rose-50/60 via-court/40 to-white px-5 py-3.5">
          <div>
            <h3 className="text-sm font-bold text-ink">
              {t("noShow.playerModalTitle", { name: player.player_name })}
            </h3>
            <p className="text-xs text-ink-soft">
              {t("noShow.playerModalSubtitle", {
                total: player.total_incidents,
                noShow: player.no_show_count,
                cancelled: player.cancelled_count,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft hover:bg-court hover:text-ink cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2.5">
          {player.incidents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center text-xs text-ink-soft bg-paper/40">
              <svg className="w-8 h-8 text-emerald-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-semibold text-ink">{t("noShow.playerModalEmptyTitle")}</p>
              <p className="text-[11px] text-ink-soft mt-0.5">{t("noShow.playerModalEmptyDesc")}</p>
            </div>
          ) : (
            player.incidents.map((it, idx) => (
              <div
                key={it.attendance_id || `${it.session_id}-${idx}`}
                className="rounded-xl border border-line p-3 hover:border-pine/40 transition-all bg-paper/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink">{dateFormatted(it.session_date)}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        it.session_type === "PERIOD"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {it.session_type === "PERIOD" ? t("status.PERIOD") : t("status.DAILY_EVENT")}
                    </span>
                    <span className="text-xs text-ink-soft">
                      {it.period_name ? `${it.period_name} · ` : ""}
                      {it.venue_name || "GOR"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={it.status} />
                    <button
                      type="button"
                      onClick={() => onDeleteIncident(it)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors cursor-pointer"
                      title={isId ? "Hapus atau perbaiki catatan salah input" : "Delete or correct mistaken entry"}
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>{t("common.delete")}</span>
                    </button>
                  </div>
                </div>
                {it.reason ? (
                  <p className="mt-2 text-xs text-ink bg-white rounded-lg border border-line/70 p-2 italic">
                    {t("noShow.playerModalNotes", { reason: it.reason })}
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-ink-faint italic">{t("noShow.playerModalNoNotes")}</p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-line bg-court/30 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-line bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-court/80 cursor-pointer"
          >
            {t("noShow.btnClose")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
 * MODAL: QUICK MANUAL ENTRY OF NO-SHOW / PHP
 * ========================================================================= */

function ManualEntryModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t, dateFormatted } = useI18n();
  const [sessionScope, setSessionScope] = useState<"DAILY" | "PERIOD">("DAILY");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [status, setStatus] = useState<"NO_SHOW" | "CANCELLED">("NO_SHOW");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Queries for sessions and players
  const dailyQuery = useMabarListQuery("DAILY_EVENT");
  const dailySessions = dailyQuery.data || [];

  const periodSessionsQuery = useMabarListQuery("PERIOD");
  const periodSessions = periodSessionsQuery.data || [];

  const playersQuery = usePlayersAllQuery();
  const allPlayers = playersQuery.data || [];

  const availableSessions = sessionScope === "DAILY" ? dailySessions : periodSessions;

  const filteredSelectPlayers = useMemo(() => {
    if (!playerFilter.trim()) return allPlayers;
    const term = playerFilter.toLowerCase();
    return allPlayers.filter((p) => p.name.toLowerCase().includes(term));
  }, [allPlayers, playerFilter]);

  // Set default session on toggle
  useEffect(() => {
    if (availableSessions.length > 0) {
      setSelectedSessionId(availableSessions[0].id);
    } else {
      setSelectedSessionId("");
    }
  }, [sessionScope, availableSessions.length]);

  // Set default player and keep synced with filter
  useEffect(() => {
    if (filteredSelectPlayers.length > 0 && (!selectedPlayerId || !filteredSelectPlayers.some((p) => p.id === selectedPlayerId))) {
      setSelectedPlayerId(filteredSelectPlayers[0].id);
    }
  }, [filteredSelectPlayers, selectedPlayerId]);

  const [setAttendance] = useSetAttendanceMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSessionId) {
      setError(t("noShow.errorSelectSession"));
      return;
    }
    if (!selectedPlayerId) {
      setError(t("noShow.errorSelectPlayer"));
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await setAttendance({
        sessionId: selectedSessionId,
        players: [
          {
            player_id: selectedPlayerId,
            status,
            no_show_reason: reason.trim() || undefined,
          },
        ],
      }).unwrap();

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("noShow.errorSaveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-court/80 via-court/40 to-white px-5 py-3.5">
            <div>
              <h3 className="text-sm font-bold text-ink">{t("noShow.manualModalTitle")}</h3>
              <p className="text-xs text-ink-soft">{t("noShow.manualModalSubtitle")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-ink-soft hover:bg-court hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* 1. Tipe Sesi */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">{t("noShow.manualStepSessionType")}</label>
              <div className="inline-flex w-full rounded-xl border border-line bg-court/40 p-1">
                <button
                  type="button"
                  onClick={() => setSessionScope("DAILY")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    sessionScope === "DAILY" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t("noShow.manualDailyType")}
                </button>
                <button
                  type="button"
                  onClick={() => setSessionScope("PERIOD")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    sessionScope === "PERIOD" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t("noShow.manualPeriodType")}
                </button>
              </div>
            </div>

            {/* 2. Pilih Pertemuan Sesi */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">{t("noShow.manualStepSession")}</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white p-2 text-xs font-medium text-ink focus:border-pine focus:outline-none"
              >
                {availableSessions.length === 0 ? (
                  <option value="">{t("noShow.manualNoSessions")}</option>
                ) : (
                  availableSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {dateFormatted(s.date)} · {s.venue_name || "GOR"} {s.start_time ? `(${s.start_time.slice(0, 5)})` : ""}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 3. Pilih Pemain */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-ink">{t("noShow.manualStepPlayer")}</label>
                {allPlayers.length > 5 && (
                  <span className="text-[10px] text-ink-soft">
                    {t("noShow.manualPlayerCountText", {
                      count: filteredSelectPlayers.length,
                      total: allPlayers.length,
                    })}
                  </span>
                )}
              </div>
              {allPlayers.length > 5 && (
                <div className="mb-1.5">
                  <input
                    type="text"
                    placeholder={t("noShow.manualSearchPlayerPlaceholder")}
                    value={playerFilter}
                    onChange={(e) => setPlayerFilter(e.target.value)}
                    className="w-full rounded-lg border border-line bg-paper/50 px-2.5 py-1 text-xs text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none"
                  />
                </div>
              )}
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-white p-2 text-xs font-medium text-ink focus:border-pine focus:outline-none"
              >
                {filteredSelectPlayers.length === 0 ? (
                  <option value="">{t("noShow.manualNoPlayersMatched")}</option>
                ) : (
                  filteredSelectPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status === "ACTIVE" ? "" : `(${p.status})`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 4. Status */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">{t("noShow.manualStepStatus")}</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    status === "NO_SHOW"
                      ? "border-rose-300 bg-rose-50 text-rose-800"
                      : "border-line bg-white text-ink-soft hover:bg-court/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    checked={status === "NO_SHOW"}
                    onChange={() => setStatus("NO_SHOW")}
                    className="accent-rose-600"
                  />
                  <span>🔴 {t("status.NO_SHOW")}</span>
                </label>

                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    status === "CANCELLED"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-line bg-white text-ink-soft hover:bg-court/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    checked={status === "CANCELLED"}
                    onChange={() => setStatus("CANCELLED")}
                    className="accent-amber-600"
                  />
                  <span>🟡 {t("status.CANCELLED")}</span>
                </label>
              </div>
            </div>

            {/* 5. Alasan / Keterangan */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                {t("noShow.manualStepNotes")}{" "}
                <span className="text-ink-faint font-normal">({t("common.optional")})</span>
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("noShow.manualNotesPlaceholder")}
                className="w-full rounded-xl border border-line bg-white p-2.5 text-xs text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-line bg-court/30 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-line bg-white px-4 py-1.5 text-xs font-semibold text-ink hover:bg-court/80 cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedSessionId || !selectedPlayerId}
              className="rounded-xl bg-gradient-to-r from-rose-700 to-rose-900 px-4 py-1.5 text-xs font-semibold text-white shadow-card shadow-rose-900/20 hover:opacity-95 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? t("noShow.btnSavingRecord") : t("noShow.btnSaveRecord")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
 * MODAL: KONFIRMASI HAPUS / KOREKSI CATATAN (NOTIF MODAL)
 * ========================================================================= */

function DeleteIncidentModal({
  incident,
  onClose,
  onDeleted,
}: {
  incident: NoShowTrackerIncident;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const { t, dateFormatted, isId } = useI18n();
  const [deleteIncident, { isLoading }] = useDeleteNoShowIncidentMutation();
  const [restorePresent, setRestorePresent] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setError("");
    try {
      const res = await deleteIncident({
        attendanceId: incident.attendance_id,
        restorePresent,
      }).unwrap();

      const actionText =
        res.action === "restored_present"
          ? t("noShow.successRestoredPresent", { name: incident.player_name })
          : t("noShow.successDeletedFromSession", {
              name: incident.player_name,
              status: incident.status === "NO_SHOW" ? t("status.NO_SHOW") : t("status.CANCELLED"),
            });

      onDeleted(actionText);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("noShow.errorDeleteFailed"));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-rose-200 bg-gradient-to-r from-rose-50 via-white to-rose-50/50 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{t("noShow.deleteModalTitle")}</h3>
              <p className="text-[11px] text-ink-soft">{t("noShow.deleteModalSubtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-soft hover:bg-court hover:text-ink cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <p className="text-ink leading-relaxed">
            {t("noShow.deleteModalPrompt")}
          </p>

          <div className="rounded-xl border border-line bg-paper/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{t("common.player")}:</span>
              <span className="font-bold text-ink text-sm">{incident.player_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{isId ? "Sesi & Venue:" : "Session & Venue:"}</span>
              <span className="font-medium text-ink">
                {dateFormatted(incident.session_date)} · {incident.venue_name || "GOR"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft">{t("common.status")}:</span>
              <Badge status={incident.status} />
            </div>
            {incident.reason && (
              <div className="border-t border-line/60 pt-1.5 text-ink-soft">
                <span className="font-semibold text-ink">{t("common.notes")}: </span>
                <span className="italic text-ink">"{incident.reason}"</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <p className="font-semibold text-ink">{isId ? "Pilihan Tindakan:" : "Action Options:"}</p>
            <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 hover:border-pine/40 cursor-pointer bg-white transition-all">
              <input
                type="radio"
                name="delete_mode"
                checked={!restorePresent}
                onChange={() => setRestorePresent(false)}
                className="mt-0.5 text-pine focus:ring-pine"
              />
              <div>
                <p className="font-bold text-ink">{t("noShow.deleteOptionRemoveTitle")}</p>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  {t("noShow.deleteOptionRemoveDesc")}
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 rounded-xl border border-line p-3 hover:border-pine/40 cursor-pointer bg-white transition-all">
              <input
                type="radio"
                name="delete_mode"
                checked={restorePresent}
                onChange={() => setRestorePresent(true)}
                className="mt-0.5 text-pine focus:ring-pine"
              />
              <div>
                <p className="font-bold text-ink">{t("noShow.deleteOptionPresentTitle")}</p>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  {t("noShow.deleteOptionPresentDesc")}
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-court/30 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl border border-line bg-white px-4 py-2 text-xs font-semibold text-ink hover:bg-court/80 disabled:opacity-50 cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isLoading ? t("noShow.btnConfirmDeleting") : t("noShow.btnConfirmDelete")}
          </button>
        </div>
      </div>
    </div>
  );
}
