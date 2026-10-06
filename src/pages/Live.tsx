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
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 transition-colors"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <IconClock className="h-3 w-3" />
            </span>
            <span>
              {isId ? "Kehadiran" : "Arrival"}
              {(detail.data.counts ?? []).length > 0 ? `: ${checkedInCount}/${detail.data.counts.length}` : ""}
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

  // Top 3 individual slots
  const first = top3.find((c) => c.arrival === 1) || (checkedIn.length > 0 && checkedIn[0].arrival <= 3 ? checkedIn[0] : null);
  const second = top3.find((c) => c.arrival === 2) || (checkedIn.length > 1 && checkedIn[1].arrival <= 3 ? checkedIn[1] : null);
  const third = top3.find((c) => c.arrival === 3) || (checkedIn.length > 2 && checkedIn[2].arrival <= 3 ? checkedIn[2] : null);

  // Filtered rows for display
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
      {/* Breadcrumb */}
      <p className="mb-1 text-xs uppercase tracking-wide text-ink-faint">
        <Link className="underline hover:text-pine" to="/live">Live</Link>
        {" · "}
        <Link className="underline hover:text-pine" to={id ? `/live/${id}` : "/live"}>Event</Link>
        {" · "}
        <span>{isId ? "Hanya baca" : "Read-only"}</span>
      </p>

      {/* Header */}
      <h1 className="flex items-center gap-2 text-xl font-black">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <IconClock className="h-3.5 w-3.5" />
        </span>
        <span>
          {isId ? "Urutan Kehadiran" : "Arrival Order"} · {detail.data?.event.name ?? "…"}
        </span>
      </h1>
      <p className="mb-4 text-sm text-ink-soft">
        {isId ? "Berdasarkan urutan check-in kedatangan · Pembaruan otomatis setiap 10 detik" : "Check-in order · Auto-refreshes every 10s"}
      </p>

      {detail.isFetching && !detail.data ? (
        <Loading />
      ) : detail.isError || !detail.data ? (
        <ErrorBox message={isId ? "Acara tidak ditemukan atau belum dibuka untuk publik." : "Event not found or not public."} onRetry={() => detail.refetch()} />
      ) : (
        <>
          {/* 4 Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <span className="text-xs font-semibold text-ink-soft">{isId ? "Total Hadir" : "Total Arrived"}</span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-ink">{checkedIn.length}</span>
                <span className="text-xs text-ink-faint">/ {counts.length}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {counts.length > 0 ? Math.round((checkedIn.length / counts.length) * 100) : 0}% {isId ? "kehadiran" : "rate"}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <span className="text-xs font-semibold text-ink-soft">{isId ? "3 Terawal" : "First 3"}</span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-ink">{top3.length}</span>
                <span className="text-xs text-ink-faint">/ 3</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {isId ? "Urutan 1–3" : "Order 1–3"}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <span className="text-xs font-semibold text-ink-soft">{isId ? "Tepat Waktu" : "On Time"}</span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black tabular-nums text-ink">{onTime.length}</span>
                <span className="text-xs text-ink-faint">{isId ? "orang" : "players"}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {isId ? "Urutan 4–9" : "Order 4–9"}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <span className="text-xs font-semibold text-ink-soft">{isId ? "Terlambat" : "Late"}</span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className={`text-2xl font-black tabular-nums ${late.length > 0 ? "text-rose-700" : "text-ink"}`}>
                  {late.length}
                </span>
                <span className="text-xs text-ink-faint">{isId ? "orang" : "players"}</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-ink-soft">
                {isId ? "Urutan 10 ke atas" : "Order 10 and above"}
              </p>
            </div>
          </div>

          {/* 3 Terawal Section */}
          {checkedIn.length > 0 && (
            <div className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {isId ? "3 Kedatangan Terawal" : "First 3 Arrivals"}
                  </h2>
                  <p className="text-xs text-ink-faint">
                    {isId ? "Pemain yang tiba paling awal di lapangan" : "Players who arrived earliest at the venue"}
                  </p>
                </div>
                <span className="rounded-md border border-line bg-court/40 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                  {top3.length} / 3
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Posisi 1 */}
                <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/40 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-900 font-black text-sm">
                    1
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink" title={first?.name}>
                      {first ? first.name : (isId ? "Menunggu pemain" : "Waiting for player")}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {first?.grade && <GradeChip grade={first.grade} />}
                      <span className="text-[11px] font-semibold text-amber-800">
                        {isId ? "Urutan 1 (Terawal)" : "Order 1 (Earliest)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Posisi 2 */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-800 font-black text-sm">
                    2
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink" title={second?.name}>
                      {second ? second.name : (isId ? "Menunggu pemain" : "Waiting for player")}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {second?.grade && <GradeChip grade={second.grade} />}
                      <span className="text-[11px] font-medium text-slate-600">
                        {isId ? "Urutan 2" : "Order 2"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Posisi 3 */}
                <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-soft font-black text-sm">
                    3
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink" title={third?.name}>
                      {third ? third.name : (isId ? "Menunggu pemain" : "Waiting for player")}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {third?.grade && <GradeChip grade={third.grade} />}
                      <span className="text-[11px] font-medium text-ink-soft">
                        {isId ? "Urutan 3" : "Order 3"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terlambat (Urutan 10+) Section */}
          {late.length > 0 && (
            <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/60 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-rose-950">
                      {isId ? "Pemain Terlambat (Urutan 10 Ke Atas)" : "Late Arrivals (Order 10+)"}
                    </h3>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                      {late.length} {isId ? "orang" : "players"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-rose-700">
                    {isId
                      ? "Daftar pemain yang hadir pada urutan ke-10 atau lebih lambat."
                      : "Players who arrived at order 10 or later."}
                  </p>
                </div>
                {filterTab !== "LATE" && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("LATE")}
                    className="self-start sm:self-auto rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-50 cursor-pointer transition-colors"
                  >
                    {isId ? "Tampilkan yang terlambat" : "Show late players"}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {late.map((p) => (
                  <div
                    key={p.player_id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs text-rose-950"
                  >
                    <span className="font-bold text-rose-700">#{p.arrival}</span>
                    <span className="font-medium">{p.name}</span>
                    {p.grade && <GradeChip grade={p.grade} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs & Search */}
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterTab("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === "ALL"
                    ? "bg-pine text-white"
                    : "bg-white text-ink-soft border border-line hover:border-pine/40"
                }`}
              >
                {isId ? "Semua" : "All"} ({counts.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("TOP3")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === "TOP3"
                    ? "bg-pine text-white"
                    : "bg-white text-ink-soft border border-line hover:border-pine/40"
                }`}
              >
                {isId ? "3 Terawal" : "First 3"} ({top3.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("ON_TIME")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === "ON_TIME"
                    ? "bg-pine text-white"
                    : "bg-white text-ink-soft border border-line hover:border-pine/40"
                }`}
              >
                {isId ? "Tepat Waktu (4–9)" : "On Time (4–9)"} ({onTime.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab("LATE")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  filterTab === "LATE"
                    ? "bg-rose-700 text-white"
                    : "bg-white text-ink-soft border border-line hover:border-rose-300"
                }`}
              >
                {isId ? "Terlambat (10+)" : "Late (10+)"} ({late.length})
              </button>
              {notCheckedIn.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("ABSENT")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                    filterTab === "ABSENT"
                      ? "bg-slate-700 text-white"
                      : "bg-white text-ink-soft border border-line hover:border-slate-400"
                  }`}
                >
                  {isId ? "Belum Hadir" : "Not Checked In"} ({notCheckedIn.length})
                </button>
              )}
            </div>

            <div className="relative min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isId ? "Cari nama pemain..." : "Search player..."}
                className="w-full rounded-xl border border-line bg-white py-1.5 px-3 text-xs font-medium text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
              />
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

          {/* Table */}
          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
              <Empty text={isId ? "Tidak ada pemain yang sesuai kriteria." : "No players match criteria."} />
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <table className="data">
                <thead>
                  <tr>
                    <th className="w-12 text-center">{isId ? "No" : "No"}</th>
                    <th>{isId ? "Pemain" : "Player"}</th>
                    <th>{isId ? "Keterangan" : "Status"}</th>
                    <th className="text-right">{isId ? "Urutan Hadir" : "Arrival Order"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((p, i) => {
                    const isArrived = (p.arrival ?? 0) > 0;
                    const arrivalNum = p.arrival ?? 0;
                    const isTop1 = arrivalNum === 1;
                    const isTopEarly = arrivalNum >= 1 && arrivalNum <= 3;
                    const isOnTime = arrivalNum >= 4 && arrivalNum <= 9;
                    const isLatePlayer = arrivalNum >= 10;

                    return (
                      <tr
                        key={p.player_id}
                        className={
                          isTop1
                            ? "bg-amber-50/40"
                            : isLatePlayer
                              ? "bg-rose-50/30"
                              : !isArrived
                                ? "opacity-60"
                                : undefined
                        }
                      >
                        <td className="text-center tabular-nums text-ink-faint">{i + 1}</td>
                        <td className="font-medium">
                          <span className="text-ink">{p.name}</span>
                          {p.grade && <span className="ml-2"><GradeChip grade={p.grade} /></span>}
                          {p.gender && <span className="ml-1"><GenderChip gender={p.gender} /></span>}
                        </td>
                        <td>
                          {isTop1 ? (
                            <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                              {isId ? "Terawal (Urutan 1)" : "Earliest (Order 1)"}
                            </span>
                          ) : isTopEarly ? (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                              {isId ? `3 Terawal (Urutan ${arrivalNum})` : `First 3 (Order ${arrivalNum})`}
                            </span>
                          ) : isOnTime ? (
                            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              {isId ? "Tepat Waktu" : "On Time"}
                            </span>
                          ) : isLatePlayer ? (
                            <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800">
                              {isId ? `Terlambat (Urutan ${arrivalNum})` : `Late (Order ${arrivalNum})`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                              {isId ? "Belum Hadir" : "Not Checked In"}
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          {isArrived ? (
                            <span
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md px-2 text-xs font-bold tabular-nums ${
                                isTop1
                                  ? "bg-amber-100 text-amber-950 border border-amber-300"
                                  : isLatePlayer
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-slate-100 text-ink"
                              }`}
                            >
                              {isId ? `Urutan #${arrivalNum}` : `Order #${arrivalNum}`}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Bottom Back Button */}
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate(id ? `/live/${id}` : "/live")}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40 transition-colors cursor-pointer"
            >
              ← {isId ? "Kembali ke Jadwal" : "Back to Schedule"}
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
