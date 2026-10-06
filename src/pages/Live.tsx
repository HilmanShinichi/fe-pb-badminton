import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePublicMatchEventQuery, usePublicMatchEventsQuery } from "../store/services";
import {
  CountProgressBar,
  Empty,
  ErrorBox,
  GenderChip,
  GradeChip,
  IconClock,
  IconPlay,
  IconShuttlecock,
  IconStopwatch,
  IconUsers,
  IconWhistle,
  Loading,
  RoundProgress,
} from "../components";
import { TeamPanel, fmtClock } from "./MatchMaker";
import { useI18n } from "../i18n";
import type { GenMatch } from "../types";

function livePill(status: string) {
  if (status === "PLAYING") return "bg-emerald-600 text-white";
  if (status === "ENDED") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-900";
}

function useTicker(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

function LiveCard({ m, nowMs }: { m: GenMatch; nowMs: number }) {
  const { t } = useI18n();
  const startMs = Date.parse(m.started_at ?? m.updated_at ?? m.created_at);
  const elapsed =
    m.status === "PLAYING"
      ? (nowMs - startMs) / 1000
      : m.status === "ENDED" && m.ended_at
        ? (Date.parse(m.ended_at) - startMs) / 1000
        : 0;
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 border-b border-line bg-court/30 px-3.5 py-2">
        <span className="shrink-0 whitespace-nowrap text-[11px] font-black uppercase text-pine">
          Round {m.round}{(m.wave ?? 1) > 1 ? ` · Gel. ${m.wave}` : ""}
        </span>
        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-2">
          {m.status !== "UPCOMING" && (
            <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-0.5 text-[11px] font-black tabular-nums">
              <IconStopwatch className="h-3 w-3 text-ink-soft shrink-0" />
              {fmtClock(elapsed)}
            </span>
          )}
          {m.court > 0 && (
            <span className="shrink-0 whitespace-nowrap text-xs font-extrabold text-ink-soft">Court {m.court}</span>
          )}
          <span className={`shrink-0 whitespace-nowrap inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${livePill(m.status)}`}>
            {m.status === "PLAYING" ? "Playing" : m.status === "ENDED" ? "Ended" : "Upcoming"}
          </span>
        </span>
      </div>
      <div className="flex items-stretch gap-2 p-3">
        <TeamPanel team={m.team1} align="left" />
        <div className="flex shrink-0 items-center justify-center px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-pine text-[11px] font-black text-paper">VS</span>
        </div>
        <TeamPanel team={m.team2} align="right" />
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-3.5 py-1.5 text-xs text-ink-faint">
        <span className="inline-flex items-center gap-1.5">
          <IconShuttlecock className="h-3.5 w-3.5 text-emerald-700" />
          <span>{m.shuttlecock_used ?? 0} shuttlecocks</span>
        </span>
        {m.referee && (
          <span className="inline-flex items-center gap-1.5 min-w-0" title={m.referee.name}>
            <span>·</span>
            <IconWhistle className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span className="font-bold text-ink-soft">{t("matchmaker.refereeLabel")}:</span>
            <span className="truncate max-w-[140px] sm:max-w-[180px]">{m.referee.name}</span>
          </span>
        )}
      </div>
    </article>
  );
}

export function LiveIndexPage() {
  const events = usePublicMatchEventsQuery(undefined, { pollingInterval: 15000 });
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-black">Live matches</h1>
      <p className="mb-4 text-sm text-ink-soft">Public view. Read-only, refreshes automatically.</p>
      {events.isFetching && !events.data ? (
        <Loading />
      ) : events.isError ? (
        <ErrorBox message="Could not load events." onRetry={() => events.refetch()} />
      ) : (events.data ?? []).length === 0 ? (
        <Empty text="No public events right now." />
      ) : (
        <div className="space-y-2">
          {(events.data ?? []).map((ev) => (
            <Link key={ev.id} to={`/live/${ev.id}`} className="block rounded-xl border border-line bg-white p-3 shadow-card hover:border-pine/40">
              <span className="font-bold">{ev.name}</span>
              <span className="block text-xs text-ink-soft">{ev.matches} matches</span>
              <RoundProgress
                rounds={ev.rounds}
                maxRounds={ev.max_rounds}
                label={`${ev.rounds} round${ev.rounds === 1 ? "" : "s"}`}
                unlimitedLabel={`${ev.rounds} rounds · no limit`}
                className="mt-2"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveEventPage() {
  const { id } = useParams<{ id: string }>();
  const { isId } = useI18n();
  const detail = usePublicMatchEventQuery(id ?? "", { skip: !id, pollingInterval: 10000 });
  const anyPlaying = (detail.data?.matches ?? []).some((m) => m.status === "PLAYING");
  const nowMs = useTicker(anyPlaying);

  const grouped = useMemo(() => {
    const map = new Map<number, GenMatch[]>();
    for (const m of detail.data?.matches ?? []) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [detail.data]);

  const checkedInCount = (detail.data?.counts ?? []).filter((c) => (c.arrival ?? 0) > 0).length;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-faint">
        <Link className="underline" to="/live">Live</Link> · read-only
      </p>
      <h1 className="text-xl font-black">{detail.data?.event.name ?? "Match event"}</h1>
      <p className="text-sm text-ink-soft">
        {detail.data ? `${detail.data.matches.length} matches · auto-refreshes` : "Loading…"}
      </p>
      {detail.data && (
        <RoundProgress
          rounds={grouped.length ? grouped[grouped.length - 1][0] : 0}
          maxRounds={detail.data.event.max_rounds ?? 0}
          label="Rounds played"
          unlimitedLabel={`${grouped.length ? grouped[grouped.length - 1][0] : 0} rounds · no limit`}
          className="mb-4 max-w-sm"
        />
      )}
      {detail.data && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            to={`/live/${id}/played`}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
              <IconPlay className="h-2.5 w-2.5" />
            </span>
            <span>Played: {(detail.data.matches ?? []).filter((m) => m.status === "PLAYING" || m.status === "ENDED").length}</span>
          </Link>
          <Link
            to={`/live/${id}/refereed`}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-50 text-amber-700">
              <IconWhistle className="h-3 w-3" />
            </span>
            <span>Refereed: {detail.data.counts.reduce((a, c) => a + (c.refereed ?? 0), 0)}</span>
          </Link>
          <Link
            to={`/live/${id}/arrival`}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2 text-sm font-bold text-amber-950 shadow-card hover:bg-amber-100 hover:border-amber-400 transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-white text-xs shadow-xs">
              🏆
            </span>
            <span>
              {isId ? "Rank Kehadiran (Top 3 & Telat)" : "Arrival Ranking (Top 3 & Late)"}
              {(detail.data.counts ?? []).length > 0 ? ` · ${checkedInCount}/${detail.data.counts.length}` : ""}
            </span>
          </Link>
        </div>
      )}
      {detail.isFetching && !detail.data ? (
        <Loading />
      ) : detail.isError || !detail.data ? (
        <ErrorBox message="Event not found or not public." onRetry={() => detail.refetch()} />
      ) : grouped.length === 0 ? (
        <Empty text="No matches yet." />
      ) : (
        grouped.map(([round, matches]) => (
          <section key={round} className="mb-5">
            <h2 className="mb-2 text-sm font-bold">Round {round}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((m) => (
                <LiveCard key={m.id} m={m} nowMs={nowMs} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function LiveCountsPage({ kind }: { kind: "played" | "refereed" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Always refetch on mount so Back lands on fresh numbers.
  const detail = usePublicMatchEventQuery(id ?? "", {
    skip: !id,
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });
  const isPlayed = kind === "played";
  const countScale = (detail.data?.event.max_rounds ?? 0) > 0 ? (detail.data?.event.max_rounds ?? 0) : 5;
  const rows = useMemo(() => {
    const list = [...(detail.data?.counts ?? [])];
    list.sort((a, b) =>
      isPlayed ? b.played - a.played || a.name.localeCompare(b.name) : (b.refereed ?? 0) - (a.refereed ?? 0) || a.name.localeCompare(b.name),
    );
    return list;
  }, [detail.data, isPlayed]);

  return (
    <div className="mx-auto max-w-3xl p-4">
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-faint">
        <Link className="underline" to="/live">Live</Link>
        {" · "}
        <Link className="underline" to={id ? `/live/${id}` : "/live"}>Event</Link>
        {" · read-only"}
      </p>
      <h1 className="flex items-center gap-2 text-xl font-black">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            isPlayed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {isPlayed ? <IconPlay className="h-3.5 w-3.5" /> : <IconWhistle className="h-4 w-4" />}
        </span>
        <span>
          {isPlayed ? "Played" : "Refereed"} · {detail.data?.event.name ?? "…"}
        </span>
      </h1>
      <p className="mb-4 text-sm text-ink-soft">Ended + playing matches only · auto-refreshes</p>
      {detail.isFetching && !detail.data ? (
        <Loading />
      ) : detail.isError || !detail.data ? (
        <ErrorBox message="Event not found or not public." onRetry={() => detail.refetch()} />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <table className="data">
              <thead>
                <tr>
                  <th className="w-12">No</th>
                  <th>Player</th>
                  <th className="text-right">
                    {`${isPlayed ? "Played" : "Refereed"} (Max ${countScale > 0 ? countScale : 5})`}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.player_id}>
                    <td className="tabular-nums text-ink-faint">{i + 1}</td>
                    <td className="font-medium">
                      {c.name}
                      {c.grade ? <span className="ml-2 text-xs text-ink-faint">{c.grade}</span> : null}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end">
                        <CountProgressBar
                          value={isPlayed ? c.played : (c.refereed ?? 0)}
                          max={countScale}
                          kind={kind}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => navigate(id ? `/live/${id}` : "/live")}
            className="mt-4 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 cursor-pointer"
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );
}

export function LivePlayedPage() {
  return <LiveCountsPage kind="played" />;
}

export function LiveRefereedPage() {
  return <LiveCountsPage kind="refereed" />;
}

function getPlayerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LiveArrivalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isId } = useI18n();
  const [filterTab, setFilterTab] = useState<"ALL" | "TOP3" | "ON_TIME" | "LATE" | "ABSENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const detail = usePublicMatchEventQuery(id ?? "", {
    skip: !id,
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
  });

  const counts = useMemo(() => detail.data?.counts ?? [], [detail.data]);

  // Checked-in players sorted ascending by arrival sequence number
  const checkedIn = useMemo(() => {
    return counts
      .filter((c) => (c.arrival ?? 0) > 0)
      .sort((a, b) => a.arrival - b.arrival || a.name.localeCompare(b.name));
  }, [counts]);

  // Players not yet checked in
  const notCheckedIn = useMemo(() => {
    return counts
      .filter((c) => (c.arrival ?? 0) <= 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [counts]);

  // Group subsets
  const top3 = useMemo(() => checkedIn.filter((c) => c.arrival >= 1 && c.arrival <= 3), [checkedIn]);
  const onTime = useMemo(() => checkedIn.filter((c) => c.arrival >= 4 && c.arrival <= 9), [checkedIn]);
  const late = useMemo(() => checkedIn.filter((c) => c.arrival >= 10), [checkedIn]);

  // Top 3 individual slots for the visual podium
  const first = top3.find((c) => c.arrival === 1) || (checkedIn.length > 0 && checkedIn[0].arrival <= 3 ? checkedIn[0] : null);
  const second = top3.find((c) => c.arrival === 2) || (checkedIn.length > 1 && checkedIn[1].arrival <= 3 ? checkedIn[1] : null);
  const third = top3.find((c) => c.arrival === 3) || (checkedIn.length > 2 && checkedIn[2].arrival <= 3 ? checkedIn[2] : null);

  // Filtered rows for the leaderboard list
  const filteredRows = useMemo(() => {
    let base: typeof counts;
    if (filterTab === "TOP3") base = top3;
    else if (filterTab === "ON_TIME") base = onTime;
    else if (filterTab === "LATE") base = late;
    else if (filterTab === "ABSENT") base = notCheckedIn;
    else base = [...checkedIn, ...notCheckedIn];

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter((p) => p.name.toLowerCase().includes(q) || (p.grade && p.grade.toLowerCase().includes(q)));
  }, [filterTab, top3, onTime, late, notCheckedIn, checkedIn, searchQuery]);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      {/* Breadcrumb & Navigation */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-ink-faint">
          <Link className="underline hover:text-pine" to="/live">Live</Link>
          {" · "}
          <Link className="underline hover:text-pine" to={id ? `/live/${id}` : "/live"}>Event</Link>
          {" · "}
          <span className="font-bold text-ink-soft">{isId ? "Rank Kehadiran" : "Arrival Ranking"}</span>
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live 10s</span>
        </span>
      </div>

      {/* Header Title */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-black text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-lg shadow-sm">
              🏆
            </span>
            <span>{isId ? "Klasemen Kehadiran" : "Arrival Leaderboard"}</span>
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {detail.data?.event.name ? (
              <span className="font-semibold text-ink">{detail.data.event.name}</span>
            ) : "…"}{" "}
            · {isId ? "Urutan absen & kedatangan pemain di lapangan" : "Check-in order of arrival at the court"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(id ? `/live/${id}` : "/live")}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink shadow-card hover:border-pine/40 transition-colors cursor-pointer"
        >
          ← {isId ? "Kembali ke Jadwal" : "Back to Schedule"}
        </button>
      </div>

      {detail.isFetching && !detail.data ? (
        <Loading />
      ) : detail.isError || !detail.data ? (
        <ErrorBox message={isId ? "Event tidak ditemukan atau belum publik." : "Event not found or not public."} onRetry={() => detail.refetch()} />
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            {/* Card 1: Total Hadir */}
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-soft">{isId ? "Total Hadir" : "Checked In"}</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 text-xs">
                  <IconUsers className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-ink">{checkedIn.length}</span>
                <span className="text-xs font-bold text-ink-faint">/ {counts.length}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                {counts.length > 0 ? Math.round((checkedIn.length / counts.length) * 100) : 0}% {isId ? "kehadiran" : "rate"}
              </div>
            </div>

            {/* Card 2: Top 3 Terawal */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">{isId ? "Top 3 Terawal" : "Top 3 Early"}</span>
                <span className="text-sm">🥇</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-amber-950">{top3.length}</span>
                <span className="text-xs font-bold text-amber-800/70">/ 3</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-amber-800">
                {isId ? "Podium Terdisiplin" : "Discipline Podium"}
              </div>
            </div>

            {/* Card 3: Tepat Waktu (4-9) */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">{isId ? "Tepat Waktu" : "On Time"}</span>
                <span className="text-sm">✅</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-emerald-950">{onTime.length}</span>
                <span className="text-xs font-bold text-emerald-800/70">{isId ? "pemain" : "players"}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                {isId ? "Urutan 4–9 (Aman)" : "Order 4–9 (Safe)"}
              </div>
            </div>

            {/* Card 4: Zona Telat (10+) */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">{isId ? "Zona Telat" : "Late Zone"}</span>
                <span className="text-sm">🚨</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-rose-950">{late.length}</span>
                <span className="text-xs font-bold text-rose-800/70">{isId ? "pemain" : "players"}</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-rose-700">
                {isId ? "Urutan 10+ (Kena Sanksi)" : "Order 10+ (Penalty)"}
              </div>
            </div>
          </div>

          {/* Top 3 Early Bird Podium */}
          {checkedIn.length > 0 && (
            <div className="mb-6 rounded-3xl border border-amber-200/80 bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 p-4 sm:p-6 shadow-card">
              <div className="mb-4 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900 uppercase tracking-wider">
                  <span>👑</span>
                  <span>{isId ? "Podium Terawal Datang" : "Early Bird Podium"}</span>
                </span>
                <h2 className="mt-1 text-base sm:text-lg font-black text-ink">
                  {isId ? "Top 3 Kehadiran Terawal" : "Top 3 Earliest Arrivals"}
                </h2>
                <p className="text-xs text-ink-soft">
                  {isId
                    ? "Pemain paling rajin yang datang lebih awal untuk pemanasan lapangan!"
                    : "The most punctual players who arrived early to warm up!"}
                </p>
              </div>

              <div className="grid grid-cols-3 items-end gap-2 sm:gap-4 max-w-xl mx-auto pt-3">
                {/* 2nd Place (Silver - Left) */}
                <div className="flex flex-col items-center">
                  {second ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative mb-2">
                        <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-200 via-slate-100 to-white border-2 border-slate-300 shadow-sm text-xs sm:text-base font-black text-slate-700">
                          {getPlayerInitials(second.name)}
                        </div>
                        <span className="absolute -bottom-2 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-xs text-white shadow-xs font-black">
                          🥈
                        </span>
                      </div>
                      <div className="text-center w-full px-1">
                        <p className="truncate text-xs sm:text-sm font-black text-slate-800" title={second.name}>
                          {second.name}
                        </p>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {second.grade && <GradeChip grade={second.grade} />}
                        </div>
                      </div>
                      <div className="mt-2.5 w-full rounded-t-2xl bg-gradient-to-b from-slate-200 to-slate-300 p-2 sm:p-2.5 text-center shadow-inner h-20 sm:h-24 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-slate-700">
                          #2 Runner-Up
                        </span>
                        <div className="rounded-xl bg-white/80 py-0.5 px-1 sm:px-1.5 text-[10px] sm:text-xs font-black text-slate-800 shadow-2xs">
                          {isId ? "Urutan #2" : "Arrival #2"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-32 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/40 p-2 text-center text-ink-faint">
                      <span className="text-xl opacity-40">🥈</span>
                      <span className="mt-1 text-[10px] font-bold">{isId ? "Menunggu #2" : "Waiting #2"}</span>
                    </div>
                  )}
                </div>

                {/* 1st Place (Gold - Center, elevated) */}
                <div className="flex flex-col items-center -mt-3 sm:-mt-4">
                  {first ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative mb-2">
                        <span className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 text-xl sm:text-2xl animate-bounce">
                          👑
                        </span>
                        <div className="flex h-14 w-14 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-100 border-2 border-amber-400 shadow-md ring-4 ring-amber-300/40 text-sm sm:text-lg font-black text-amber-950">
                          {getPlayerInitials(first.name)}
                        </div>
                        <span className="absolute -bottom-2 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-amber-500 text-xs sm:text-sm text-white shadow-xs font-black">
                          🥇
                        </span>
                      </div>
                      <div className="text-center w-full px-1">
                        <p className="truncate text-xs sm:text-base font-black text-amber-950" title={first.name}>
                          {first.name}
                        </p>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {first.grade && <GradeChip grade={first.grade} />}
                          <span className="hidden sm:inline-block rounded bg-amber-200/80 px-1 py-0.2 text-[9px] font-black text-amber-900">
                            MVP
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 w-full rounded-t-2xl bg-gradient-to-b from-amber-400 to-amber-500 p-2 sm:p-3 text-center shadow-inner h-28 sm:h-32 flex flex-col justify-between">
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-950">
                          #1 Terawal
                        </span>
                        <div className="rounded-xl bg-white/90 py-1 px-1.5 text-xs font-black text-amber-950 shadow-2xs">
                          {isId ? "Urutan #1" : "Arrival #1"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-40 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-white/40 p-2 text-center text-ink-faint">
                      <span className="text-2xl opacity-40">🥇</span>
                      <span className="mt-1 text-[10px] font-bold">{isId ? "Menunggu #1" : "Waiting #1"}</span>
                    </div>
                  )}
                </div>

                {/* 3rd Place (Bronze - Right) */}
                <div className="flex flex-col items-center">
                  {third ? (
                    <div className="w-full flex flex-col items-center">
                      <div className="relative mb-2">
                        <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-200/60 via-orange-100 to-white border-2 border-amber-700/30 shadow-sm text-xs sm:text-base font-black text-amber-900">
                          {getPlayerInitials(third.name)}
                        </div>
                        <span className="absolute -bottom-2 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs text-white shadow-xs font-black">
                          🥉
                        </span>
                      </div>
                      <div className="text-center w-full px-1">
                        <p className="truncate text-xs sm:text-sm font-black text-amber-900" title={third.name}>
                          {third.name}
                        </p>
                        <div className="mt-0.5 flex items-center justify-center gap-1">
                          {third.grade && <GradeChip grade={third.grade} />}
                        </div>
                      </div>
                      <div className="mt-2.5 w-full rounded-t-2xl bg-gradient-to-b from-amber-200/80 to-amber-300/80 p-2 sm:p-2 text-center shadow-inner h-16 sm:h-20 flex flex-col justify-between">
                        <span className="text-[9px] sm:text-xs font-black uppercase tracking-wider text-amber-950">
                          #3 Podium
                        </span>
                        <div className="rounded-xl bg-white/80 py-0.5 px-1 sm:px-1.5 text-[10px] sm:text-xs font-black text-amber-950 shadow-2xs">
                          {isId ? "Urutan #3" : "Arrival #3"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-28 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200/60 bg-white/40 p-2 text-center text-ink-faint">
                      <span className="text-xl opacity-40">🥉</span>
                      <span className="mt-1 text-[10px] font-bold">{isId ? "Menunggu #3" : "Waiting #3"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Zona Telat (10+) Warning Banner */}
          {late.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-3xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-red-50 to-orange-50 p-4 sm:p-5 shadow-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-rose-200/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-red-600 text-white shadow-md text-xl animate-pulse">
                    🚨
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-rose-950">
                        {isId ? "Zona Telat (Urutan 10 Ke Atas)" : "Late Arrivals Zone (Order 10+)"}
                      </h3>
                      <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-black text-white shadow-2xs">
                        {late.length} {isId ? "Pemain Telat" : "Late Players"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-rose-800 font-medium">
                      {isId
                        ? "⏰ Datang urutan 10 ke atas: Siap-siap traktir shuttlecock, denda kas, atau pemanasan push-up 10x! 💪"
                        : "⏰ Arrived 10th or later: Prepare for penalty denda or push-up warm-up! 💪"}
                    </p>
                  </div>
                </div>
                {filterTab !== "LATE" && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("LATE")}
                    className="shrink-0 rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-black text-rose-700 shadow-2xs hover:bg-rose-100 hover:border-rose-400 transition-colors cursor-pointer"
                  >
                    {isId ? "Filter Hanya Yang Telat →" : "Filter Late Only →"}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {late.map((p) => (
                  <div
                    key={p.player_id}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white/95 px-3 py-1.5 text-xs font-bold text-rose-950 shadow-2xs"
                  >
                    <span className="flex h-5 items-center justify-center rounded-md bg-rose-100 px-1.5 text-[10px] font-black text-rose-700">
                      #{p.arrival}
                    </span>
                    <span>{p.name}</span>
                    {p.grade && <GradeChip grade={p.grade} />}
                    <span className="text-[10px] text-rose-600 font-bold">⏰ Telat</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs & Search Controls */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  filterTab === "ALL"
                    ? "bg-pine text-white shadow-sm"
                    : "bg-white text-ink-soft border border-line hover:border-pine/40"
                }`}
              >
                {isId ? "Semua" : "All"} ({counts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("TOP3")}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  filterTab === "TOP3"
                    ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                    : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-50"
                }`}
              >
                🥇 {isId ? "Top 3 Terawal" : "Top 3 Early"} ({top3.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("ON_TIME")}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  filterTab === "ON_TIME"
                    ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                    : "bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                }`}
              >
                ✅ {isId ? "Tepat Waktu 4–9" : "On-Time 4–9"} ({onTime.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("LATE")}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                  filterTab === "LATE"
                    ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                    : "bg-white text-rose-900 border border-rose-200 hover:bg-rose-50"
                }`}
              >
                🚨 {isId ? "Telat 10+" : "Late 10+"} ({late.length})
              </button>
              {notCheckedIn.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("ABSENT")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                    filterTab === "ABSENT"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  ⏳ {isId ? "Belum Hadir" : "Not Checked In"} ({notCheckedIn.length})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isId ? "Cari nama pemain..." : "Search player name..."}
                className="w-full rounded-xl border border-line bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint text-xs">
                🔍
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Leaderboard Cards List */}
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
              <Empty text={isId ? "Tidak ada pemain yang sesuai kriteria filter." : "No players match the filter criteria."} />
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRows.map((p) => {
                const isArrived = (p.arrival ?? 0) > 0;
                const arrivalNum = p.arrival ?? 0;
                const isTop1 = arrivalNum === 1;
                const isTop2 = arrivalNum === 2;
                const isTop3 = arrivalNum === 3;
                const isOnTime = arrivalNum >= 4 && arrivalNum <= 9;
                const isLatePlayer = arrivalNum >= 10;

                return (
                  <div
                    key={p.player_id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-card ${
                      isTop1
                        ? "border-amber-300 bg-gradient-to-r from-amber-50/90 via-amber-50/30 to-white hover:border-amber-400 hover:shadow-md ring-1 ring-amber-300/60"
                        : isTop2
                          ? "border-slate-300 bg-gradient-to-r from-slate-50/90 via-slate-50/30 to-white hover:border-slate-400"
                          : isTop3
                            ? "border-amber-600/25 bg-gradient-to-r from-orange-50/70 via-amber-50/20 to-white hover:border-amber-600/40"
                            : isOnTime
                              ? "border-line bg-white hover:border-emerald-300 hover:bg-emerald-50/20"
                              : isLatePlayer
                                ? "border-rose-300 bg-gradient-to-r from-rose-50/90 via-rose-50/30 to-white hover:border-rose-400 ring-1 ring-rose-200"
                                : "border-line/70 bg-slate-50/50 opacity-75 hover:opacity-100"
                    }`}
                  >
                    {/* Left: Rank Badge + Avatar + Name + Subtitle */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <div className="shrink-0 flex items-center justify-center">
                        {isTop1 ? (
                          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-black text-sm sm:text-base shadow-sm ring-2 ring-amber-300">
                            🥇 1
                          </span>
                        ) : isTop2 ? (
                          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-500 to-slate-400 text-white font-black text-xs sm:text-sm shadow-sm ring-2 ring-slate-300">
                            🥈 2
                          </span>
                        ) : isTop3 ? (
                          <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-700 to-amber-600 text-white font-black text-xs sm:text-sm shadow-sm ring-2 ring-amber-600/40">
                            🥉 3
                          </span>
                        ) : isOnTime ? (
                          <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs sm:text-sm border border-emerald-200">
                            #{arrivalNum}
                          </span>
                        ) : isLatePlayer ? (
                          <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white font-black text-xs sm:text-sm shadow-xs animate-pulse ring-2 ring-rose-300">
                            #{arrivalNum}
                          </span>
                        ) : (
                          <span className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200">
                            —
                          </span>
                        )}
                      </div>

                      {/* Player Avatar */}
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                          isTop1
                            ? "bg-amber-100 text-amber-900 border-2 border-amber-300"
                            : isTop2
                              ? "bg-slate-100 text-slate-800 border-2 border-slate-300"
                              : isTop3
                                ? "bg-orange-100 text-orange-900 border-2 border-amber-600/30"
                                : isOnTime
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : isLatePlayer
                                    ? "bg-rose-100 text-rose-900 border-2 border-rose-300"
                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {getPlayerInitials(p.name)}
                      </div>

                      {/* Name and Tags */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-black text-sm sm:text-base text-ink truncate" title={p.name}>
                            {p.name}
                          </span>
                          {p.grade && <GradeChip grade={p.grade} />}
                          {p.gender && <GenderChip gender={p.gender} />}
                        </div>

                        {/* Status Label */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {isTop1 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                              👑 {isId ? "Top 1 Paling Awal (MVP Disiplin)" : "Top 1 Earliest (MVP Discipline)"}
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-800 border border-slate-300">
                              🥈 {isId ? "Top 2 Runner-Up Terawal" : "Top 2 Runner-Up"}
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-900 border border-orange-200">
                              🥉 {isId ? "Top 3 Terawal (Podium)" : "Top 3 Bronze"}
                            </span>
                          ) : isOnTime ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                              ✅ {isId ? "Tepat Waktu (Disiplin)" : "On Time"}
                            </span>
                          ) : isLatePlayer ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-900 border border-rose-300 animate-pulse">
                              🚨 {isId ? `Telat (Urutan #${arrivalNum}) · Denda / Push-up ⏰` : `Late (Order #${arrivalNum}) · Penalty ⏰`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200">
                              ⏳ {isId ? "Belum Check-in" : "Not Checked In"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Arrival Sequence Order Chip */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-line/60 pt-2 sm:pt-0">
                      {isArrived ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-ink-soft sm:hidden">
                            {isId ? "Kehadiran:" : "Arrival:"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-black tabular-nums shadow-2xs ${
                              isTop1
                                ? "bg-amber-400 text-amber-950 ring-1 ring-amber-300"
                                : isTop2
                                  ? "bg-slate-200 text-slate-900"
                                  : isTop3
                                    ? "bg-amber-200 text-amber-950"
                                    : isOnTime
                                      ? "bg-emerald-100 text-emerald-900"
                                      : "bg-rose-100 text-rose-900 border border-rose-300 font-black"
                            }`}
                          >
                            <IconClock className="h-3 w-3 shrink-0" />
                            <span>{isId ? `Urutan ke-${arrivalNum}` : `Arrival #${arrivalNum}`}</span>
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          {isId ? "Belum Hadir" : "Not Checked In"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Back Button */}
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(id ? `/live/${id}` : "/live")}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 transition-colors cursor-pointer"
            >
              ← {isId ? "Kembali ke Jadwal Pertandingan" : "Back to Match Schedule"}
            </button>
            <span className="text-xs text-ink-faint">
              {detail.data ? `${counts.length} ${isId ? "pemain terdaftar" : "registered players"}` : ""}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
