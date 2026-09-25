import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePublicMatchEventQuery, usePublicMatchEventsQuery } from "../store/services";
import {
  CountProgressBar,
  Empty,
  ErrorBox,
  IconPlay,
  IconShuttlecock,
  IconStopwatch,
  IconWhistle,
  Loading,
  RoundProgress,
} from "../components";
import { TeamPanel, fmtClock } from "./MatchMaker";
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
  const startMs = Date.parse(m.started_at ?? m.updated_at ?? m.created_at);
  const elapsed =
    m.status === "PLAYING"
      ? (nowMs - startMs) / 1000
      : m.status === "ENDED" && m.ended_at
        ? (Date.parse(m.ended_at) - startMs) / 1000
        : 0;
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-court/30 px-3.5 py-2.5">
        <span className="text-[11px] font-black uppercase text-pine">Round {m.round}{(m.wave ?? 1) > 1 ? ` · Gel. ${m.wave}` : ""}</span>
        <span className="inline-flex items-center gap-2">
          {m.status !== "UPCOMING" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white border border-line px-2 py-0.5 text-[11px] font-black tabular-nums">
              <IconStopwatch className="h-3 w-3 text-ink-soft" />
              {fmtClock(elapsed)}
            </span>
          )}
          {m.court > 0 && (
            <span className="text-xs font-extrabold text-ink-soft">Court {m.court}</span>
          )}
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${livePill(m.status)}`}>
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
          <span className="inline-flex items-center gap-1.5">
            <span>·</span>
            <IconWhistle className="h-3.5 w-3.5 text-amber-700" />
            <span>{m.referee.name}</span>
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
            <span>Played: {detail.data.counts.reduce((a, c) => a + c.played, 0)}</span>
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
                    {isPlayed ? "Played" : "Refereed"} ({countScale > 0 ? `Max ${countScale}` : "Max 5"})
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
            className="mt-4 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold shadow-card hover:border-pine/40"
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
