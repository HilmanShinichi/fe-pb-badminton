import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePublicMatchEventQuery, usePublicMatchEventsQuery } from "../store/services";
import {
  CountProgressBar,
  Empty,
  ErrorBox,
  GenderChip,
  GradeChip,
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
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-court/70 p-0.5">
              <img src="/favicon.svg" alt="" className="h-3.5 w-3.5 object-contain" />
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

function getPlayerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * 3D-styled vector Crown with realistic gold bevels, metallic depth, pearls, and embedded gemstones.
 */
function IconCrown3D({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="crownGoldMain" x1="8" y1="12" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="18%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <linearGradient id="crownInnerGold" x1="16" y1="20" x2="48" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="crownPeakGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
        <linearGradient id="crownBaseGrad" x1="10" y1="46" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#eab308" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#854d0e" />
        </linearGradient>
        <radialGradient id="crownJewelRuby" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="60%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id="crownJewelEmerald" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="60%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
        <filter id="crownDropShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" floodColor="#451a03" floodOpacity="0.32" />
        </filter>
      </defs>

      <g filter="url(#crownDropShadow)">
        {/* Crown 3D Inner Cavity */}
        <ellipse cx="32" cy="46" rx="20" ry="3.5" fill="url(#crownInnerGold)" opacity="0.9" />
        <path d="M17 44 L22 28 L32 36 L42 28 L47 44 Z" fill="url(#crownInnerGold)" opacity="0.75" />

        {/* Front Peaks */}
        <path d="M32 14 L39 46 H25 Z" fill="url(#crownGoldMain)" />
        <path d="M20 20 L27 46 H13 Z" fill="url(#crownGoldMain)" />
        <path d="M44 20 L51 46 H37 Z" fill="url(#crownGoldMain)" />
        <path d="M10 26 L16 47 H9 L8 28 Z" fill="url(#crownGoldMain)" />
        <path d="M54 26 L56 28 L55 47 H48 Z" fill="url(#crownGoldMain)" />

        {/* Facet Highlights */}
        <path d="M32 14 L33 46 H31 Z" fill="#fffbeb" opacity="0.85" />
        <path d="M32 14 L39 46 L32 46 Z" fill="#b45309" opacity="0.25" />
        <path d="M20 20 L24 46 H20 Z" fill="#fffbeb" opacity="0.6" />
        <path d="M44 20 L44 46 H41 Z" fill="#fffbeb" opacity="0.6" />

        {/* 3D Curved Base Band */}
        <path
          d="M10 46 C10 46 20 49 32 49 C44 49 54 46 54 46 L54 51 C54 51 44 54 32 54 C20 54 10 51 10 51 Z"
          fill="url(#crownBaseGrad)"
          stroke="#78350f"
          strokeWidth="0.8"
        />
        <path
          d="M10 46 C18 48.5 32 49.5 54 46"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Pearl Sphere Tips */}
        <circle cx="32" cy="14" r="3.2" fill="url(#crownPeakGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="31.2" cy="13" r="1" fill="#ffffff" />
        <circle cx="20" cy="20" r="2.7" fill="url(#crownPeakGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="19.4" cy="19.2" r="0.8" fill="#ffffff" />
        <circle cx="44" cy="20" r="2.7" fill="url(#crownPeakGrad)" stroke="#78350f" strokeWidth="0.8" />
        <circle cx="43.4" cy="19.2" r="0.8" fill="#ffffff" />
        <circle cx="9" cy="27" r="2.2" fill="url(#crownPeakGrad)" stroke="#78350f" strokeWidth="0.6" />
        <circle cx="55" cy="27" r="2.2" fill="url(#crownPeakGrad)" stroke="#78350f" strokeWidth="0.6" />

        {/* Gemstones on Base Band */}
        <circle cx="32" cy="50.2" r="2.5" fill="url(#crownJewelRuby)" stroke="#450a0a" strokeWidth="0.5" />
        <circle cx="31.3" cy="49.5" r="0.8" fill="#ffffff" opacity="0.8" />
        <circle cx="21" cy="48.8" r="2" fill="url(#crownJewelEmerald)" stroke="#064e3b" strokeWidth="0.5" />
        <circle cx="20.4" cy="48.3" r="0.6" fill="#ffffff" opacity="0.8" />
        <circle cx="43" cy="48.8" r="2" fill="url(#crownJewelEmerald)" stroke="#064e3b" strokeWidth="0.5" />
        <circle cx="42.4" cy="48.3" r="0.6" fill="#ffffff" opacity="0.8" />
      </g>
    </svg>
  );
}

/**
 * 3D-styled Silver Medal vector badge with beveled metallic sheen.
 */
function IconMedalSilver3D({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="silverRimGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#cbd5e1" />
          <stop offset="70%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id="silverFaceGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#silverRimGrad)" stroke="#64748b" strokeWidth="1" />
      <circle cx="24" cy="24" r="17" fill="url(#silverFaceGrad)" stroke="#ffffff" strokeWidth="0.8" />
      <path d="M12 18 C15 11 25 10 33 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <text x="24" y="30" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="sans-serif" fill="#334155">
        2
      </text>
    </svg>
  );
}

/**
 * 3D-styled Bronze Medal vector badge with rich warm copper-gold metallic sheen.
 */
function IconMedalBronze3D({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="bronzeRimGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="35%" stopColor="#ea580c" />
          <stop offset="70%" stopColor="#9a3412" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id="bronzeFaceGrad" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#ffedd5" />
          <stop offset="50%" stopColor="#fdba74" />
          <stop offset="100%" stopColor="#c2410c" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="url(#bronzeRimGrad)" stroke="#7c2d12" strokeWidth="1" />
      <circle cx="24" cy="24" r="17" fill="url(#bronzeFaceGrad)" stroke="#fed7aa" strokeWidth="0.8" />
      <path d="M12 18 C15 11 25 10 33 13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      <text x="24" y="30" textAnchor="middle" fontSize="17" fontWeight="900" fontFamily="sans-serif" fill="#431407">
        3
      </text>
    </svg>
  );
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
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-1 shadow-card">
          <img src="/favicon.svg" alt="" className="h-full w-full object-contain" />
        </span>
        <h1 className="text-xl font-black text-ink">
          {isId ? "Urutan Kehadiran" : "Arrival Order"} · {detail.data?.event.name ?? "…"}
        </h1>
      </div>
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

          {/* 3 Terawal Section - Modern Clean 3D Podium */}
          {checkedIn.length > 0 && (
            <div className="mb-6 overflow-hidden rounded-3xl border border-line/70 bg-gradient-to-b from-slate-50/70 via-white to-amber-50/20 p-4 sm:p-6 shadow-card">
              <div className="mb-5 flex items-center justify-between border-b border-line/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-court/80 p-1 shadow-2xs">
                    <img src="/favicon.svg" alt="" className="h-full w-full object-contain" />
                  </span>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-ink-soft">
                      {isId ? "Podium 3 Kedatangan Terawal" : "Top 3 Earliest Arrivals Podium"}
                    </h2>
                    <p className="text-xs text-ink-faint">
                      {isId ? "Pemain yang hadir paling awal di lapangan" : "Players who arrived earliest at the venue"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-bold text-ink-soft shadow-2xs">
                  {top3.length} / 3 {isId ? "hadir" : "arrived"}
                </span>
              </div>

              {/* Podium Stage */}
              <div className="mx-auto flex max-w-xl items-end justify-center gap-2 sm:gap-4 pt-4">
                {/* 2nd Place (Silver) */}
                <div className="flex flex-1 flex-col items-center">
                  {/* Medal & Avatar */}
                  <div className="relative mb-2 flex flex-col items-center">
                    <div className="mb-1 transition-transform hover:scale-105">
                      <IconMedalSilver3D className="h-8 w-8 sm:h-9 sm:w-9 drop-shadow-sm" />
                    </div>
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-slate-300 bg-gradient-to-br from-white via-slate-100 to-slate-200 font-black text-slate-700 shadow-sm text-sm sm:text-base">
                      {second ? getPlayerInitials(second.name) : "—"}
                    </div>
                  </div>

                  {/* Player Name & Grade */}
                  <div className="mb-2 text-center w-full px-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-ink" title={second?.name}>
                      {second ? second.name : (isId ? "Menunggu" : "Waiting")}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      {second?.grade && <GradeChip grade={second.grade} />}
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {isId ? "Urutan 2" : "Order 2"}
                    </span>
                  </div>

                  {/* Pedestal Block */}
                  <div className="flex h-20 sm:h-24 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-slate-300 bg-gradient-to-b from-slate-200/90 via-slate-100 to-slate-50/40 pt-2 shadow-sm">
                    <span className="text-2xl sm:text-3xl font-black text-slate-600/90 tracking-tight">2</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                      {isId ? "Kedua" : "2nd"}
                    </span>
                  </div>
                </div>

                {/* 1st Place (Gold) - Elevated Center */}
                <div className="flex flex-1 flex-col items-center -mt-6">
                  {/* 3D Crown & Avatar */}
                  <div className="relative mb-2 flex flex-col items-center">
                    <div className="mb-1 transition-transform hover:scale-105">
                      <IconCrown3D className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-md" />
                    </div>
                    <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-amber-400 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 font-black text-amber-950 shadow-md text-base sm:text-lg">
                      {first ? getPlayerInitials(first.name) : "—"}
                    </div>
                  </div>

                  {/* Player Name & Grade */}
                  <div className="mb-2 text-center w-full px-1">
                    <p className="truncate text-sm sm:text-base font-extrabold text-ink" title={first?.name}>
                      {first ? first.name : (isId ? "Menunggu" : "Waiting")}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      {first?.grade && <GradeChip grade={first.grade} />}
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-amber-100 border border-amber-300/80 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-amber-900 shadow-2xs">
                      {isId ? "Urutan 1 · Terawal" : "Order 1 · Earliest"}
                    </span>
                  </div>

                  {/* Pedestal Block */}
                  <div className="flex h-28 sm:h-32 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-amber-400 bg-gradient-to-b from-amber-200 via-amber-100 to-amber-50/50 pt-3 shadow-md">
                    <span className="text-3xl sm:text-4xl font-black text-amber-800 tracking-tight">1</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">
                      {isId ? "Terawal" : "Earliest"}
                    </span>
                  </div>
                </div>

                {/* 3rd Place (Bronze) */}
                <div className="flex flex-1 flex-col items-center">
                  {/* Medal & Avatar */}
                  <div className="relative mb-2 flex flex-col items-center">
                    <div className="mb-1 transition-transform hover:scale-105">
                      <IconMedalBronze3D className="h-8 w-8 sm:h-9 sm:w-9 drop-shadow-sm" />
                    </div>
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border-2 border-amber-700/40 bg-gradient-to-br from-white via-orange-100 to-amber-200/80 font-black text-amber-950 shadow-sm text-sm sm:text-base">
                      {third ? getPlayerInitials(third.name) : "—"}
                    </div>
                  </div>

                  {/* Player Name & Grade */}
                  <div className="mb-2 text-center w-full px-1">
                    <p className="truncate text-xs sm:text-sm font-bold text-ink" title={third?.name}>
                      {third ? third.name : (isId ? "Menunggu" : "Waiting")}
                    </p>
                    <div className="mt-0.5 flex items-center justify-center gap-1">
                      {third?.grade && <GradeChip grade={third.grade} />}
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      {isId ? "Urutan 3" : "Order 3"}
                    </span>
                  </div>

                  {/* Pedestal Block */}
                  <div className="flex h-16 sm:h-20 w-full flex-col items-center justify-start rounded-t-2xl border-t-2 border-x border-amber-300 bg-gradient-to-b from-orange-200/80 via-amber-100/70 to-amber-50/30 pt-2 shadow-sm">
                    <span className="text-xl sm:text-2xl font-black text-amber-900/80 tracking-tight">3</span>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800/80">
                      {isId ? "Ketiga" : "3rd"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stage Base Baseline */}
              <div className="mx-auto h-1.5 w-full max-w-xl rounded-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
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
                    const isTop2 = arrivalNum === 2;
                    const isTop3 = arrivalNum === 3;
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
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                              <IconCrown3D className="h-4 w-4 shrink-0" />
                              <span>{isId ? "Terawal (Urutan 1)" : "Earliest (Order 1)"}</span>
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-2xs">
                              <IconMedalSilver3D className="h-3.5 w-3.5 shrink-0" />
                              <span>{isId ? "3 Terawal (Urutan 2)" : "First 3 (Order 2)"}</span>
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/80 bg-orange-50 px-2 py-0.5 text-xs font-bold text-amber-900 shadow-2xs">
                              <IconMedalBronze3D className="h-3.5 w-3.5 shrink-0" />
                              <span>{isId ? "3 Terawal (Urutan 3)" : "First 3 (Order 3)"}</span>
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
                                  : isTop2
                                    ? "bg-slate-100 text-slate-800 border border-slate-300"
                                    : isTop3
                                      ? "bg-orange-100/70 text-amber-900 border border-amber-300"
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
