import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import {
  useAddEventPlayersMutation,
  useAttendanceQuery,
  useCreateMatchEventMutation,
  useDeleteEventRoundMutation,
  useDeleteMatchEventMutation,
  useGenerateMatchesMutation,
  useMabarListQuery,
  useMatchEventQuery,
  useMatchEventsQuery,
  usePlayersAllQuery,
  useUpdateGenMatchMutation,
  useUpdateMatchEventMutation,
} from "../store/services";
import { useI18n } from "../i18n";
import { Btn, ConfirmModal, DeleteRowButton, ErrorBox, Field, GenderChip, GradeChip, Loading, PageHead } from "../ui";
import type { GenMatch, GenTeamPlayer } from "../types";

const NEXT_STATUS: Record<string, string | null> = { UPCOMING: "PLAYING", PLAYING: "ENDED", ENDED: null };

export function MatchMakerListPage() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [courts, setCourts] = useState(0);
  const [base, setBase] = useState(0);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [poolSource, setPoolSource] = useState<"active" | "session" | "custom">("active");
  const [poolSessionId, setPoolSessionId] = useState("");
  const [customIds, setCustomIds] = useState<string[]>([]);
  const [customSearch, setCustomSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const events = useMatchEventsQuery();
  const sessions = useMabarListQuery("");
  const poolAttendance = useAttendanceQuery(poolSessionId, { skip: poolSource !== "session" || !poolSessionId });
  const allPlayers = usePlayersAllQuery();
  const [create, createState] = useCreateMatchEventMutation();
  const [remove, removeState] = useDeleteMatchEventMutation();

  const sessionRows = useMemo(
    () =>
      [...(poolAttendance.data ?? [])]
        .sort((a, b) => (a.listed_at < b.listed_at ? -1 : a.listed_at > b.listed_at ? 1 : 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poolAttendance.data],
  );
  const sessionIds = useMemo(() => new Set(sessionRows.map((a) => a.player_id)), [sessionRows]);
  const playersById = useMemo(
    () => new Map((allPlayers.data ?? []).map((p) => [p.id, p])),
    [allPlayers.data],
  );

  // Manual checklist: nothing is pre-checked. The user checks who actually
  // came (in arrival order) and leaves absentees unchecked.
  // Switching pool source starts clean.
  useEffect(() => {
    setCustomIds([]);
  }, [poolSource, poolSessionId]);

  const customList = useMemo(
    () => [...(allPlayers.data ?? [])].filter((p) => p.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)),
    [allPlayers.data],
  );

  const customFiltered = useMemo(() => {
    const q = customSearch.trim().toLowerCase();
    if (!q) return customList;
    return customList.filter((p) => p.name.toLowerCase().includes(q));
  }, [customList, customSearch]);

  const poolCount = poolSource === "active" ? null : customIds.length;

  function toggleCustom(id: string) {
    setCustomIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (!name.trim() || createState.isLoading) return;
    let player_ids: string[] | undefined;
    if (poolSource === "session") {
      const picked = customIds.filter((pid) => sessionIds.has(pid));
      if (picked.length < 4) {
        setError(t("matchmaker.errorNeedFourSession"));
        return;
      }
      player_ids = picked;
    } else if (poolSource === "custom") {
      if (customIds.length < 4) {
        setError(t("matchmaker.errorNeedFourCustom"));
        return;
      }
      player_ids = [...customIds];
    }
    try {
      await create({ name: name.trim(), player_ids, court_count: Math.max(0, courts || 0), base_played: Math.max(0, base || 0), source_session_id: poolSource === "session" && poolSessionId ? poolSessionId : undefined }).unwrap();
      setName("");
      setCourts(0);
      setBase(0);
      setCustomIds([]);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("matchmaker.errorCreateEvent"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await remove(pendingDelete.id).unwrap();
      setPendingDelete(null);
      setError("");
    } catch (e) {
      setPendingDelete(null);
      setError(e instanceof ApiError ? e.message : t("matchmaker.errorDeleteEvent"));
    }
  }

  const eventList = events.data ?? [];

  return (
    <div className="space-y-6">
      <PageHead
        title={t("matchmaker.pageTitle")}
        sub={t("matchmaker.pageSubtitle")}
      />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* CREATE EVENT FORM */}
        <section
          aria-label={t("matchmaker.newEventTitle")}
          className="h-fit overflow-hidden rounded-2xl border border-line bg-white shadow-card"
        >
          <div className="border-b border-paper/10 bg-gradient-to-r from-[#143728] via-[#1a4434] to-[#102a1f] px-4 py-3.5 text-paper">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-lime/20 text-lime">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white">{t("matchmaker.newEventTitle")}</h2>
                <p className="text-[11px] text-paper/70">{t("matchmaker.pageSubtitle")}</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3.5">
            <Field label={t("matchmaker.eventNameLabel")}>
              <input
                id="event-nama"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden focus:ring-1 focus:ring-pine"
                placeholder={t("matchmaker.eventNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              />
            </Field>

            <Field label={t("matchmaker.courtsLabel")} hint={t("matchmaker.courtsHint")}>
              <div className="relative">
                <input
                  id="event-courts"
                  type="number"
                  min={0}
                  max={99}
                  className="w-full rounded-lg border border-line pl-8 pr-3 py-2 text-sm focus:border-pine focus:outline-hidden focus:ring-1 focus:ring-pine"
                  value={courts}
                  onChange={(e) => setCourts(Math.max(0, Number(e.target.value) || 0))}
                />
                <span className="pointer-events-none absolute left-2.5 top-2.5 text-xs text-ink-faint">🏸</span>
              </div>
            </Field>

            <Field label={t("matchmaker.baseLabel")} hint={t("matchmaker.baseHint")}>
              <div className="relative">
                <input
                  id="event-base"
                  type="number"
                  min={0}
                  max={999}
                  className="w-full rounded-lg border border-line pl-8 pr-3 py-2 text-sm focus:border-pine focus:outline-hidden focus:ring-1 focus:ring-pine"
                  value={base}
                  onChange={(e) => setBase(Math.max(0, Number(e.target.value) || 0))}
                />
                <span className="pointer-events-none absolute left-2.5 top-2.5 text-xs text-ink-faint">▶️</span>
              </div>
            </Field>

            <Field label={t("matchmaker.poolSourceLabel")}>
              <select
                id="pool-source"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden focus:ring-1 focus:ring-pine bg-white"
                value={poolSource}
                onChange={(e) => setPoolSource(e.target.value as "active" | "session" | "custom")}
              >
                <option value="active">{t("matchmaker.poolSourceActive")}</option>
                <option value="session">{t("matchmaker.poolSourceSession")}</option>
                <option value="custom">{t("matchmaker.poolSourceCustom")}</option>
              </select>
            </Field>

            {poolSource === "session" && (
              <>
                <Field
                  label={t("matchmaker.sessionSelectLabel")}
                  hint={poolSessionId ? t("matchmaker.sessionPlayersCount", { count: customIds.length }) : t("matchmaker.sessionHint")}
                >
                  <select
                    id="pool-session"
                    className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden focus:ring-1 focus:ring-pine bg-white"
                    value={poolSessionId}
                    onChange={(e) => setPoolSessionId(e.target.value)}
                  >
                    <option value="">{t("matchmaker.sessionSelectPrompt")}</option>
                    {(sessions.data ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.date} · {s.type === "PERIOD" ? t("dashboard.period") : t("dashboard.daily")}{s.period_name ? ` · ${s.period_name}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                {poolSessionId && (
                  <Field label={t("matchmaker.sessionPickLabel")}>
                    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-court/20 p-2">
                      {sessionRows.length === 0 ? (
                        <p className="p-2 text-center text-xs text-ink-faint">{t("matchmaker.noMatchingPlayers")}</p>
                      ) : (
                        sessionRows.map((a) => {
                          const info = playersById.get(a.player_id);
                          const arrival = customIds.indexOf(a.player_id);
                          const isPicked = arrival >= 0;
                          return (
                            <label
                              key={a.player_id}
                              className={`flex items-center gap-2 rounded-md p-1.5 text-xs transition-colors cursor-pointer ${
                                isPicked ? "bg-white shadow-2xs border border-emerald-200" : "hover:bg-white/80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="rounded text-pine focus:ring-pine"
                                checked={isPicked}
                                onChange={() => toggleCustom(a.player_id)}
                              />
                              {isPicked && (
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-pine to-emerald-700 text-[10px] font-black text-lime shadow-2xs">
                                  {arrival + 1}
                                </span>
                              )}
                              <span className="font-semibold text-ink flex-1 truncate">{info?.name ?? a.player_name}</span>
                              <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${a.status === "PRESENT" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"}`}>
                                {a.status}
                              </span>
                              {info?.grade && <GradeChip grade={info.grade} />}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </Field>
                )}
              </>
            )}

            {poolSource === "custom" && (
              <Field label={t("matchmaker.customPlayersLabel", { count: customIds.length })}>
                <input
                  id="custom-search"
                  className="mb-2 w-full rounded-lg border border-line px-3 py-1.5 text-xs focus:border-pine focus:outline-hidden"
                  placeholder={t("matchmaker.customSearchPlaceholder")}
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-line bg-court/20 p-2">
                  {customFiltered.length === 0 ? (
                    <p className="p-2 text-center text-xs text-ink-faint">{t("matchmaker.noMatchingPlayers")}</p>
                  ) : (
                    customFiltered.map((p) => {
                      const arrival = customIds.indexOf(p.id);
                      const isPicked = arrival >= 0;
                      return (
                        <label
                          key={p.id}
                          className={`flex items-center gap-2 rounded-md p-1.5 text-xs transition-colors cursor-pointer ${
                            isPicked ? "bg-white shadow-2xs border border-emerald-200" : "hover:bg-white/80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="rounded text-pine focus:ring-pine"
                            checked={isPicked}
                            onChange={() => toggleCustom(p.id)}
                          />
                          {isPicked && (
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-pine to-emerald-700 text-[10px] font-black text-lime shadow-2xs">
                              {arrival + 1}
                            </span>
                          )}
                          <span className="font-semibold text-ink flex-1 truncate">{p.name}</span>
                          {p.grade && <GradeChip grade={p.grade} />}
                        </label>
                      );
                    })
                  )}
                </div>
              </Field>
            )}

            {poolCount !== null && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 border border-emerald-200/60 px-3 py-1.5 text-xs font-semibold text-emerald-900">
                <span>{t("matchmaker.poolCountText", { count: poolCount })}</span>
                {poolCount < 4 && <span className="text-red-700 font-bold">{t("matchmaker.poolNeedMin")}</span>}
              </div>
            )}

            {error && <p role="alert" className="text-xs text-red-700 font-medium">{error}</p>}

            <button
              type="button"
              disabled={createState.isLoading || !name.trim()}
              onClick={submit}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#143728] via-[#1a4434] to-[#123023] py-2.5 px-4 text-sm font-bold text-lime shadow-md hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
              {createState.isLoading ? t("matchmaker.btnCreating") : t("matchmaker.btnCreateEvent")}
            </button>
          </div>
        </section>

        {/* EVENTS LIST & CARDS */}
        <section aria-label={t("matchmaker.eventsSectionTitle")} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-ink">{t("matchmaker.eventsSectionTitle")}</h2>
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-court via-emerald-50 to-court px-2.5 py-0.5 text-xs font-bold text-pine border border-pine/15">
                {t("matchmaker.totalEventsStats", { count: eventList.length })}
              </span>
            </div>

            {eventList.length > 0 && (
              <div className="inline-flex rounded-lg border border-line bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === "cards" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  {t("matchmaker.viewCards")}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    viewMode === "table" ? "bg-pine text-white shadow-2xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                    <path d="M3 6h18M3 12h18M3 18h18" />
                  </svg>
                  {t("matchmaker.viewTable")}
                </button>
              </div>
            )}
          </div>

          {events.isFetching && !events.data ? (
            <Loading />
          ) : events.isError ? (
            <ErrorBox message={t("matchmaker.errorCreateEvent")} onRetry={() => events.refetch()} />
          ) : eventList.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 shadow-card text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-pine">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                  <circle cx="12" cy="12" r="8.5" />
                  <path d="M12 3.5v17M3.5 12h17" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-ink">{t("matchmaker.emptyEvents")}</p>
            </div>
          ) : viewMode === "cards" ? (
            /* MODERN RESPONSIVE CARDS GRID */
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
              {eventList.map((ev) => (
                <article
                  key={ev.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line/80 bg-white p-4 shadow-card hover:shadow-md transition-all hover:border-pine/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to={`/match-maker/${ev.id}`}
                          className="block text-base font-extrabold text-ink hover:text-pine transition-colors truncate"
                          title={ev.name}
                        >
                          {ev.name}
                        </Link>
                        <span className="text-[11px] text-ink-faint">
                          {new Date(ev.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </span>
                      </div>
                      <DeleteRowButton
                        label={t("common.delete")}
                        onClick={() => setPendingDelete({ id: ev.id, name: ev.name })}
                      />
                    </div>

                    {/* STATS CHIPS WITH GRADIENTS */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold text-emerald-900">
                        <span>🏸</span>
                        {ev.court_count > 0 ? t("matchmaker.cardCourts", { count: ev.court_count }) : t("matchmaker.cardUnlimitedCourts")}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 border border-sky-200/80 px-2.5 py-1 text-xs font-bold text-sky-900">
                        <span>👥</span>
                        {t("matchmaker.cardPlayers", { count: ev.players })}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200/80 px-2.5 py-1 text-xs font-bold text-amber-900">
                        <span>⚔️</span>
                        {t("matchmaker.cardMatches", { count: ev.matches })}
                      </span>
                      {ev.is_public && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-lime/20 border border-lime/50 px-2.5 py-1 text-xs font-bold text-pine">
                          <span>🌐</span>
                          Live
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                    <Link
                      to={`/match-maker/${ev.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#143728] to-[#1e4d3a] px-3.5 py-1.5 text-xs font-bold text-lime shadow-2xs hover:brightness-110 transition-all"
                    >
                      {t("matchmaker.btnManageDraw")}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("matchmaker.colEvent")}</th>
                    <th className="text-right">{t("matchmaker.colCourts")}</th>
                    <th className="text-right">{t("matchmaker.colPlayers")}</th>
                    <th className="text-right">{t("matchmaker.colMatches")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {eventList.map((ev) => (
                    <tr key={ev.id}>
                      <td>
                        <Link className="font-bold text-pine hover:underline" to={`/match-maker/${ev.id}`}>
                          {ev.name}
                        </Link>
                        {ev.is_public && <span title="Public live"> 🌐</span>}
                      </td>
                      <td className="text-right tabular-nums">
                        {ev.court_count > 0 ? ev.court_count : t("matchmaker.cardUnlimitedCourts")}
                      </td>
                      <td className="text-right tabular-nums">{ev.players}</td>
                      <td className="text-right tabular-nums">{ev.matches}</td>
                      <td className="text-right">
                        <DeleteRowButton
                          label={t("common.delete")}
                          onClick={() => setPendingDelete({ id: ev.id, name: ev.name })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={t("matchmaker.deleteModalTitle", { name: pendingDelete.name })}
          body={<p>{t("matchmaker.deleteModalBody")}</p>}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export function MatchMakerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const detail = useMatchEventQuery(id ?? "", { skip: !id });
  const [rounds, setRounds] = useState(1);
  const [activeRoundTab, setActiveRoundTab] = useState<number | "ALL">("ALL");
  const [genError, setGenError] = useState("");
  const [generate, genState] = useGenerateMatchesMutation();
  const [deleteRound, deleteRoundState] = useDeleteEventRoundMutation();
  const [pendingRoundDelete, setPendingRoundDelete] = useState<number | null>(null);
  const [updateEvent, updateEventState] = useUpdateMatchEventMutation();
  const [courtsDraft, setCourtsDraft] = useState<number | null>(null);
  const [baseDraft, setBaseDraft] = useState<number | null>(null);
  const courtCap = detail.data?.event.court_count ?? 0;
  const baseCap = detail.data?.event.base_played ?? 0;

  useEffect(() => {
    if (detail.data) setCourtsDraft(detail.data.event.court_count ?? 0);
  }, [detail.data?.event.court_count]);

  useEffect(() => {
    if (detail.data) setBaseDraft(detail.data.event.base_played ?? 0);
  }, [detail.data?.event.base_played]);

  async function saveCourts() {
    if (!id || courtsDraft === null || courtsDraft === courtCap || updateEventState.isLoading) return;
    try {
      await updateEvent({ id, body: { court_count: Math.max(0, courtsDraft || 0) } }).unwrap();
      setGenError("");
    } catch (e) {
      setGenError(e instanceof ApiError ? e.message : t("matchmaker.errorSaveCourts"));
      setCourtsDraft(courtCap);
    }
  }

  async function saveBase() {
    if (!id || baseDraft === null || baseDraft === baseCap || updateEventState.isLoading) return;
    try {
      await updateEvent({ id, body: { base_played: Math.max(0, baseDraft || 0) } }).unwrap();
      setGenError("");
    } catch (e) {
      setGenError(e instanceof ApiError ? e.message : t("matchmaker.errorSaveCourts"));
      setBaseDraft(baseCap);
    }
  }

  async function runGenerate() {
    if (!id || genState.isLoading) return;
    try {
      await generate({ eventId: id, rounds: Math.max(1, Math.min(5, rounds || 1)) }).unwrap();
      setGenError("");
    } catch (e) {
      setGenError(e instanceof ApiError ? e.message : t("matchmaker.errorGenerate"));
    }
  }

  async function runGenerateRound(round: number, topup = false) {
    if (!id || genState.isLoading) return;
    try {
      await generate({ eventId: id, rounds: 1, round, topup }).unwrap();
      setGenError("");
    } catch (e) {
      setGenError(e instanceof ApiError ? e.message : t("matchmaker.errorGenerate"));
    }
  }

  async function confirmRoundDelete() {
    if (!id || pendingRoundDelete === null || deleteRoundState.isLoading) return;
    try {
      await deleteRound({ eventId: id, round: pendingRoundDelete }).unwrap();
      setPendingRoundDelete(null);
      setGenError("");
    } catch (e) {
      setPendingRoundDelete(null);
      setGenError(e instanceof ApiError ? e.message : t("matchmaker.errorGenerate"));
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<number, GenMatch[]>();
    for (const m of detail.data?.matches ?? []) {
      const arr = map.get(m.round) ?? [];
      arr.push(m);
      map.set(m.round, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [detail.data]);

  const allRoundNumbers = useMemo(() => grouped.map(([r]) => r), [grouped]);

  const missingRounds = useMemo(() => {
    if (grouped.length === 0) return [];
    const max = Math.max(...grouped.map(([r]) => r));
    const have = new Set(grouped.map(([r]) => r));
    const out: number[] = [];
    for (let r = 1; r <= max; r++) if (!have.has(r)) out.push(r);
    return out;
  }, [grouped]);

  const filteredGrouped = useMemo(() => {
    if (activeRoundTab === "ALL") return grouped;
    return grouped.filter(([r]) => r === activeRoundTab);
  }, [grouped, activeRoundTab]);

  return (
    <div className="space-y-6">
      <PageHead
        title={detail.data?.event.name ?? t("matchmaker.pageTitle")}
        sub={
          detail.data
            ? t("matchmaker.eventDetailSub", {
                players: detail.data.event.player_ids.length,
                matches: detail.data.matches.length,
              })
            : undefined
        }
        right={
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink shadow-2xs hover:bg-court/60 transition-colors"
            to="/match-maker"
          >
            {t("matchmaker.backToEvents")}
          </Link>
        }
      />

      {detail.isFetching && !detail.data ? (
        <Loading />
      ) : detail.isError || !detail.data ? (
        <ErrorBox message={t("matchmaker.errorCreateEvent")} onRetry={() => detail.refetch()} />
      ) : (
        <>
          {/* GENERATOR HERO CARD */}
          <section
            aria-label={t("matchmaker.generatorTitle")}
            className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/25 to-court/40 p-4 sm:p-5 shadow-card"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#143728] to-[#1e523b] text-lime shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-ink">{t("matchmaker.generatorTitle")}</h2>
                  <p className="text-xs text-ink-soft max-w-xl">{t("matchmaker.generatorDesc")}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3 sm:gap-4">
              <div className="w-28">
                <label className="block text-xs font-bold text-ink mb-1">
                  🏸 {t("matchmaker.courtsLabel")}
                </label>
                <input
                  id="detail-courts"
                  type="number"
                  min={0}
                  max={99}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold focus:border-pine focus:outline-hidden bg-white"
                  value={courtsDraft ?? 0}
                  onChange={(e) => setCourtsDraft(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={saveCourts}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                />
              </div>

              <div className="w-28">
                <label className="block text-xs font-bold text-ink mb-1" title={t("matchmaker.baseHint")}>
                  ▶️ {t("matchmaker.baseLabel")}
                </label>
                <input
                  id="detail-base"
                  type="number"
                  min={0}
                  max={999}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold focus:border-pine focus:outline-hidden bg-white"
                  value={baseDraft ?? 0}
                  onChange={(e) => setBaseDraft(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={saveBase}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                />
              </div>

              <div className="w-32">
                <label className="block text-xs font-bold text-ink mb-1">
                  🔄 {t("matchmaker.roundsLabel")}
                </label>
                <input
                  id="rounds"
                  type="number"
                  min={1}
                  max={5}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold focus:border-pine focus:outline-hidden bg-white"
                  value={rounds}
                  onChange={(e) => setRounds(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>

              <button
                type="button"
                disabled={genState.isLoading}
                onClick={runGenerate}
                title={t("matchmaker.addRoundsHint", { next: (allRoundNumbers.length ? Math.max(...allRoundNumbers) + 1 : 1) })}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#143728] via-[#1a4434] to-[#123023] py-2.5 px-5 text-sm font-extrabold text-lime shadow-md hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                {genState.isLoading ? t("matchmaker.btnGenerating") : t("matchmaker.btnGenerate", { count: rounds || 1 })}
              </button>
            </div>

            {genError && <p role="alert" className="mt-3 text-xs font-semibold text-red-700">{genError}</p>}
          </section>

          <PublicLiveSection
            eventId={detail.data.event.id}
            isPublic={detail.data.event.is_public ?? false}
            showGrades={detail.data.event.show_grades ?? false}
          />

          <LateArrivalsSection
            eventId={detail.data.event.id}
            poolIds={detail.data.event.player_ids ?? []}
            sourceSessionId={detail.data.event.source_session_id ?? null}
          />

          {/* ROUND TABS FILTER (FOR EFFORTLESS NAVIGATION ON MOBILE/TABLET) */}
          {allRoundNumbers.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveRoundTab("ALL")}
                className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-extrabold transition-colors ${
                  activeRoundTab === "ALL"
                    ? "bg-pine text-white shadow-2xs"
                    : "border border-line bg-white text-ink-soft hover:bg-court/60"
                }`}
              >
                {t("matchmaker.allRounds")} ({detail.data.matches.length})
              </button>
              {allRoundNumbers.map((r) => {
                const count = detail.data.matches.filter((m) => m.round === r).length;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setActiveRoundTab(r)}
                    className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-extrabold transition-colors ${
                      activeRoundTab === r
                        ? "bg-pine text-white shadow-2xs"
                        : "border border-line bg-white text-ink-soft hover:bg-court/60"
                    }`}
                  >
                    {t("matchmaker.roundTitle", { round: r })} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* MATCHES ARENA */}
          {grouped.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-8 shadow-card text-center">
              <p className="text-sm font-semibold text-ink-soft">{t("matchmaker.noMatchesYet")}</p>
            </div>
          ) : (
            filteredGrouped.map(([round, matches]) => (
              <section key={round} aria-label={`Round ${round}`} className="space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-pine text-xs font-black text-lime">
                      {round}
                    </span>
                    <h2 className="text-sm font-extrabold text-ink">
                      {t("matchmaker.roundTitle", { round })} · {t("matchmaker.roundMatchesCount", { count: matches.length })}
                    </h2>
                  </div>
                  <span className="inline-flex gap-1">
                    <Btn disabled={genState.isLoading} onClick={() => runGenerateRound(round, true)}>
                      {t("matchmaker.btnTopUpRound")}
                    </Btn>
                    <DeleteRowButton label={t("matchmaker.btnDeleteRound")} onClick={() => setPendingRoundDelete(round)} />
                  </span>
                </div>

                {/* RESPONSIVE MATCH CARDS GRID: 1 col on mobile, 2 cols on tablet, 3 cols on PC */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {matches.map((m) => (
                    <MatchCard key={m.id} match={m} maxCourt={courtCap} pool={detail.data.counts ?? []} />
                  ))}
                </div>
              </section>
            ))
          )}

          {missingRounds
            .filter((r) => activeRoundTab === "ALL" || activeRoundTab === r)
            .map((r) => (
              <section key={`missing-${r}`} aria-label={`Round ${r} empty`} className="space-y-3">
                <div className="flex items-center justify-between border-b border-dashed border-line pb-2">
                  <h2 className="text-sm font-extrabold text-ink-faint">
                    {t("matchmaker.roundTitle", { round: r })} · {t("matchmaker.roundDeleted")}
                  </h2>
                  <Btn disabled={genState.isLoading} onClick={() => runGenerateRound(r)}>
                    {t("matchmaker.btnRegenerateRound", { round: r })}
                  </Btn>
                </div>
              </section>
            ))}

          {pendingRoundDelete !== null && (
            <ConfirmModal
              title={t("matchmaker.deleteRoundTitle", { round: pendingRoundDelete })}
              body={<p>{t("matchmaker.deleteRoundBody", { round: pendingRoundDelete })}</p>}
              confirmLabel={t("matchmaker.btnConfirmDeleteRound")}
              busy={deleteRoundState.isLoading}
              onConfirm={confirmRoundDelete}
              onCancel={() => setPendingRoundDelete(null)}
            />
          )}

          {/* PLAYER PLAY COUNTS LEADERBOARD */}
          <section aria-label={t("matchmaker.playCountsTitle")} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <div className="border-b border-line bg-gradient-to-r from-court/50 via-white to-court/30 px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">{t("matchmaker.playCountsTitle")}</h2>
              <p className="text-xs text-ink-faint">{t("matchmaker.playCountsSub")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th className="w-12">{t("matchmaker.colNo")}</th>
                    <th>{t("matchmaker.colPlayer")}</th>
                    <th>{t("matchmaker.colGrade")}</th>
                    <th>{t("matchmaker.colGender")}</th>
                    <th className="w-36 text-right">{t("matchmaker.colPlayed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sorted = [...(detail.data.counts ?? [])].sort(
                      (a, b) => b.played - a.played || (a.arrival || 999) - (b.arrival || 999),
                    );
                    const maxPlayed = Math.max(1, ...sorted.map((s) => s.played));
                    return sorted.map((c, idx) => {
                      const pct = Math.round((c.played / maxPlayed) * 100);
                      return (
                        <tr key={c.player_id} className="hover:bg-court/30 transition-colors">
                          <td className="tabular-nums font-semibold text-ink-faint">{idx + 1}</td>
                          <td className="font-bold text-ink">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1e523b] text-[10px] font-black text-lime">
                                {c.name.slice(0, 1).toUpperCase()}
                              </span>
                              <span>{c.name}</span>
                            </div>
                          </td>
                          <td>{c.grade ? <GradeChip grade={c.grade} /> : <span className="text-ink-faint text-xs">—</span>}</td>
                          <td>{c.gender ? <GenderChip gender={c.gender} /> : <span className="text-ink-faint text-xs">—</span>}</td>
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden hidden sm:block">
                                <div
                                  className="bg-gradient-to-r from-pine to-emerald-500 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="tabular-nums font-extrabold text-sm text-ink">{c.played}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </section>

          <div>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-court/60 transition-colors"
              onClick={() => navigate("/match-maker")}
            >
              {t("matchmaker.backToEvents")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PublicLiveSection({ eventId, isPublic, showGrades }: { eventId: string; isPublic: boolean; showGrades: boolean }) {
  const [update, updateState] = useUpdateMatchEventMutation();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/live/${eventId}`;

  async function toggle(patch: { is_public?: boolean; show_grades?: boolean }) {
    try {
      await update({ id: eventId, body: patch }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section aria-label="Public live view" className="mb-5 rounded-2xl border border-line bg-white shadow-card p-4">
      <h2 className="text-sm font-extrabold">🌐 Public live view</h2>
      <p className="mb-3 text-xs text-ink-soft">Read-only page anyone with the link can open. No login, no editing.</p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isPublic}
            disabled={updateState.isLoading}
            onChange={(e) => toggle({ is_public: e.target.checked })}
          />
          Show this event publicly
        </label>
        <label className={`flex items-center gap-2 text-sm font-semibold ${!isPublic ? "opacity-40" : ""}`}>
          <input
            type="checkbox"
            checked={showGrades}
            disabled={updateState.isLoading || !isPublic}
            onChange={(e) => toggle({ show_grades: e.target.checked })}
          />
          Show grades on public page
        </label>
      </div>
      {isPublic && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 break-all rounded-lg border border-line bg-court/40 px-2 py-1.5 text-xs">{url}</code>
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold hover:bg-court/60"
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs font-bold text-pine underline">
            Open →
          </a>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
    </section>
  );
}

export function LateArrivalsSection({ eventId, poolIds, sourceSessionId }: { eventId: string; poolIds: string[]; sourceSessionId?: string | null }) {
  const { t } = useI18n();
  const allPlayers = usePlayersAllQuery();
  const sessionAttendance = useAttendanceQuery(sourceSessionId ?? "", { skip: !sourceSessionId });
  const sessions = useMabarListQuery("");
  const [updateEvent, updateEventState] = useUpdateMatchEventMutation();
  const [addPlayers, addState] = useAddEventPlayersMutation();
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const inPool = useMemo(() => new Set(poolIds), [poolIds]);
  const playersById = useMemo(() => new Map((allPlayers.data ?? []).map((p) => [p.id, p])), [allPlayers.data]);
  // Prefer the event's source session: only people from that session play.
  // Fallback to all active players for events without a source.
  // Only listed/present players count — mark ABSENT in the session to hide
  // people who never showed up.
  const SESSION_ALIVE = ["PRESENT", "LISTED", "CONFIRMED"];
  const candidates = useMemo(() => {
    if (sourceSessionId && sessionAttendance.data) {
      return sessionAttendance.data
        .filter((a) => !inPool.has(a.player_id) && SESSION_ALIVE.includes(a.status))
        .sort((a, b) => (a.listed_at < b.listed_at ? -1 : a.listed_at > b.listed_at ? 1 : 0))
        .map((a) => playersById.get(a.player_id) ?? { id: a.player_id, name: a.player_name, grade: null as string | null, gender: null as string | null, status: "ACTIVE" as const });
    }
    return [...(allPlayers.data ?? [])].filter((p) => p.status === "ACTIVE" && !inPool.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [sourceSessionId, sessionAttendance.data, allPlayers.data, inPool, playersById]);
  const [lateSearch, setLateSearch] = useState("");
  const lateFiltered = useMemo(() => {
    const q = lateSearch.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((p) => p.name.toLowerCase().includes(q));
  }, [candidates, lateSearch]);

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    if (picked.length === 0 || addState.isLoading) return;
    try {
      await addPlayers({ eventId, player_ids: picked }).unwrap();
      setPicked([]);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add players.");
    }
  }

  async function setSource(sessionId: string) {
    if (!sessionId || updateEventState.isLoading) return;
    try {
      await updateEvent({ id: eventId, body: { source_session_id: sessionId } }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save source session.");
    }
  }

  if (!sourceSessionId) {
    return (
      <section aria-label={t("matchmaker.lateArrivalsTitle")} className="mb-5 rounded-2xl border border-dashed border-line bg-white shadow-card p-4">
        <h2 className="text-sm font-extrabold">🕐 {t("matchmaker.lateArrivalsTitle")}</h2>
        <p className="mb-3 text-xs text-ink-soft">{t("matchmaker.lateArrivalsNeedSource")}</p>
        <select
          aria-label={t("matchmaker.sessionSelectLabel")}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-white"
          defaultValue=""
          disabled={updateEventState.isLoading}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="">{t("matchmaker.sessionSelectPrompt")}</option>
          {(sessions.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.date} · {s.type === "PERIOD" ? t("dashboard.period") : t("dashboard.daily")}{s.period_name ? ` · ${s.period_name}` : ""}
            </option>
          ))}
        </select>
        {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      </section>
    );
  }

  if (candidates.length === 0) return null;
  return (
    <section aria-label={t("matchmaker.lateArrivalsTitle")} className="mb-5 rounded-2xl border border-line bg-white shadow-card p-4">
      <h2 className="text-sm font-extrabold">🕐 {t("matchmaker.lateArrivalsTitle")}</h2>
      <p className="mb-3 text-xs text-ink-soft">{t("matchmaker.lateArrivalsDesc")}</p>
      <input
        className="mb-2 w-full rounded-lg border border-line px-3 py-1.5 text-xs focus:border-pine focus:outline-hidden"
        placeholder={t("matchmaker.customSearchPlaceholder")}
        value={lateSearch}
        onChange={(e) => setLateSearch(e.target.value)}
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-line bg-court/20 p-2">
        {lateFiltered.length === 0 ? (
          <p className="p-2 text-center text-xs text-ink-faint">{t("matchmaker.noMatchingPlayers")}</p>
        ) : (
          lateFiltered.map((p) => (
            <label key={p.id} className="flex items-center gap-2 rounded-md p-1.5 text-xs cursor-pointer hover:bg-white/80">
              <input type="checkbox" className="rounded text-pine focus:ring-pine" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
              <span className="font-semibold flex-1 truncate">{p.name}</span>
              {p.grade && <GradeChip grade={p.grade} />}
              {p.gender && <GenderChip gender={p.gender} />}
            </label>
          ))
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Btn disabled={addState.isLoading || picked.length === 0} onClick={submit}>
          {addState.isLoading ? "…" : t("matchmaker.lateArrivalsAdd", { count: picked.length })}
        </Btn>
        {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </section>
  );
}

export function TeamPanel({ team, align }: { team: GenTeamPlayer[]; align: "left" | "right" }) {
  return (
    <div
      className={`flex-1 rounded-xl border border-emerald-900/10 bg-white/90 p-2.5 shadow-2xs flex flex-col justify-center space-y-2 ${
        align === "right" ? "text-right items-end" : "text-left items-start"
      }`}
    >
      {team.map((p) => {
        const initial = p.name.trim().slice(0, 1).toUpperCase();
        return (
          <div key={p.player_id} className={`flex items-center gap-2 max-w-full ${align === "right" ? "flex-row-reverse" : "flex-row"}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1e523b] text-[10px] font-black text-lime shadow-2xs">
              {initial}
            </span>
            <div className="min-w-0">
              <span className="block text-xs sm:text-sm font-bold text-ink leading-tight truncate" title={p.name}>
                {p.name}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1">
                {p.grade ? <GradeChip grade={p.grade} /> : <span className="text-[10px] text-ink-faint">—</span>}
                {p.gender && <GenderChip gender={p.gender} />}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function MatchCard({
  match: m,
  maxCourt,
  pool,
}: {
  match: GenMatch;
  maxCourt: number;
  pool: { player_id: string; name: string; grade: string | null; gender?: string | null }[];
}) {
  const { t } = useI18n();
  const [update, updateState] = useUpdateGenMatchMutation();
  const [editing, setEditing] = useState(false);
  const [court, setCourt] = useState(m.court ?? 0);
  const [cocks, setCocks] = useState(m.shuttlecock_used ?? 0);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(Date.now());
  const next = NEXT_STATUS[m.status];
  const locked = m.status === "ENDED";
  const cap = maxCourt > 0 ? maxCourt : 99;

  // Live clock while playing; frozen once ended.
  useEffect(() => {
    if (m.status !== "PLAYING") return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [m.status, m.id]);

  const startMs = Date.parse(m.started_at ?? m.updated_at ?? m.created_at);
  const elapsedSec =
    m.status === "PLAYING"
      ? (nowMs - startMs) / 1000
      : m.status === "ENDED" && m.ended_at
        ? (Date.parse(m.ended_at) - startMs) / 1000
        : 0;

  useEffect(() => {
    setCourt(m.court ?? 0);
  }, [m.court]);

  useEffect(() => {
    setCocks(m.shuttlecock_used ?? 0);
  }, [m.shuttlecock_used]);

  async function advance(to: string) {
    try {
      await update({ id: m.id, body: { status: to } }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("dashboard.errorLoad"));
    }
  }

  async function saveCourt() {
    const n = Math.min(cap, Math.max(0, Math.trunc(Number(court) || 0)));
    if (n === (m.court ?? 0)) {
      setCourt(m.court ?? 0);
      return;
    }
    try {
      await update({ id: m.id, body: { court: n } }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("matchmaker.errorSaveCourts"));
      setCourt(m.court ?? 0);
    }
  }

  async function stepCocks(delta: number) {
    if (locked || updateState.isLoading) return;
    const n = Math.min(999, Math.max(0, (cocks ?? 0) + delta));
    setCocks(n);
    try {
      await update({ id: m.id, body: { shuttlecock_used: n } }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save shuttlecock count.");
      setCocks(m.shuttlecock_used ?? 0);
    }
  }

  return (
    <article
      aria-label={`Round ${m.round} match`}
      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line/90 bg-white shadow-card hover:shadow-md transition-all hover:border-pine/30"
    >
      {/* CARD HEADER */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-court/30 via-white to-court/30 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-pine/10 border border-pine/20 px-2 py-0.5 text-[11px] font-black uppercase text-pine">
            R-{m.round}
          </span>
          {m.status !== "UPCOMING" && (
            <span className="rounded-md bg-ink/5 border border-line px-2 py-0.5 text-[11px] font-black tabular-nums text-ink" title="Match duration">
              ⏱ {fmtClock(elapsedSec)}
            </span>
          )}
        </div>
          {locked ? (
            <span className="text-xs font-extrabold text-ink-soft">
              🏸 {m.court ? t("matchmaker.courtNumber", { court: m.court }) : t("matchmaker.courtUnlimited")}
            </span>
          ) : (
            <label className="flex items-center gap-1 text-xs font-extrabold text-ink">
              <span>🏸 {t("matchmaker.courtLabel")}</span>
              <input
                aria-label="Court number"
                type="number"
                min={0}
                max={cap}
                className="w-12 rounded border border-line px-1.5 py-0.5 text-xs font-bold text-center bg-white focus:border-pine focus:outline-hidden"
                value={court}
                onChange={(e) => setCourt(Math.min(cap, Math.max(0, Number(e.target.value) || 0)))}
                onBlur={saveCourt}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            </label>
          )}
          {/* STATUS PILL WITH RADIANT GRADIENTS */}
          {m.status === "PLAYING" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-2.5 py-0.5 text-[11px] font-black text-white shadow-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-lime" />
            </span>
            {t("matchmaker.statusPlaying")}
          </span>
        ) : m.status === "ENDED" ? (
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
            {t("matchmaker.statusEnded")}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-2xs">
            {t("matchmaker.statusUpcoming")}
          </span>
        )}
      </div>

      {/* DOUBLES MATCH ARENA */}
      <div className="p-3 bg-gradient-to-b from-[#f8faf9] to-[#edf4f0]/80">
        <div className="flex items-stretch gap-2">
          <TeamPanel team={m.team1} align="left" />
          <div className="flex shrink-0 items-center justify-center px-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1a4434] text-[11px] font-black text-lime shadow-md border-2 border-lime/30">
              {t("matchmaker.vs")}
            </span>
          </div>
          <TeamPanel team={m.team2} align="right" />
        </div>
      </div>

      {error && <p role="alert" className="px-3 py-1 text-xs text-red-700 font-semibold">{error}</p>}

      {/* CARD ACTION FOOTER */}
      <div className="flex items-center justify-between gap-2 border-t border-line px-3.5 py-2.5 bg-white">
        <div className="flex items-center gap-2">
          {next && (
            <button
              type="button"
              disabled={updateState.isLoading}
              onClick={() => advance(next)}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold transition-all shadow-2xs active:scale-95 ${
                next === "PLAYING"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white"
                  : "bg-gradient-to-r from-[#143728] to-[#1e4d3a] hover:brightness-110 text-lime"
              }`}
            >
              {next === "PLAYING" ? t("matchmaker.btnStartPlaying") : t("matchmaker.btnFinishMatch")}
            </button>
          )}
          {m.status === "ENDED" && (
            <button
              type="button"
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-ink-soft hover:bg-court/60 transition-colors"
              disabled={updateState.isLoading}
              onClick={() => advance("UPCOMING")}
            >
              {t("matchmaker.btnReopen")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1" title="Shuttlecocks used">
          <span className="text-xs font-extrabold text-ink-soft">🏸</span>
          {!locked ? (
            <>
              <button
                type="button"
                aria-label="One fewer shuttlecock"
                disabled={updateState.isLoading || (cocks ?? 0) <= 0}
                onClick={() => stepCocks(-1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-line text-sm font-black text-ink hover:bg-court/60 disabled:opacity-40"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-black tabular-nums">{cocks ?? 0}</span>
              <button
                type="button"
                aria-label="One more shuttlecock"
                disabled={updateState.isLoading}
                onClick={() => stepCocks(1)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-line text-sm font-black text-ink hover:bg-court/60 disabled:opacity-40"
              >
                +
              </button>
            </>
          ) : (
            <span className="text-sm font-black tabular-nums">{cocks ?? 0}</span>
          )}
        </div>

        <button
          type="button"
          className="rounded-lg border border-line/80 px-2.5 py-1.5 text-xs font-bold text-ink hover:bg-court/60 transition-colors"
          onClick={() => setEditing(true)}
        >
          {t("matchmaker.btnEditTeams")}
        </button>
      </div>

      {editing && <EditTeamsModal match={m} pool={pool} onClose={() => setEditing(false)} />}
    </article>
  );
}

function EditTeamsModal({
  match: m,
  pool,
  onClose,
}: {
  match: GenMatch;
  pool: { player_id: string; name: string; grade: string | null; gender?: string | null }[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [update, updateState] = useUpdateGenMatchMutation();
  const [t1, setT1] = useState<string[]>(m.team1.map((p) => p.player_id));
  const [t2, setT2] = useState<string[]>(m.team2.map((p) => p.player_id));
  const [error, setError] = useState("");

  const options = useMemo(
    () => [...pool].sort((a, b) => a.name.localeCompare(b.name)),
    [pool],
  );

  function setSide(setter: (v: string[]) => void, current: string[], i: number, v: string) {
    const next = [...current];
    next[i] = v;
    setter(next);
  }

  function picker(value: string, onChange: (v: string) => void, label: string) {
    return (
      <label className="block text-sm">
        <span className="sr-only">{label}</span>
        <select
          className="w-full rounded-lg border border-line px-3 py-1.5 text-xs font-semibold focus:border-pine bg-white"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {options.map((p) => (
            <option key={p.player_id} value={p.player_id}>
              {p.name}{p.grade ? ` (${p.grade})` : ""}{p.gender ? ` [${p.gender}]` : ""}
            </option>
          ))}
        </select>
      </label>
    );
  }

  async function save() {
    if (t1.some((v) => !v) || t2.some((v) => !v)) {
      setError(t("matchmaker.errorPickAllFour"));
      return;
    }
    try {
      await update({ id: m.id, body: { team1: t1, team2: t2 } }).unwrap();
      setError("");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("matchmaker.errorSaveTeams"));
    }
  }

  return (
    <ConfirmModal
      title={t("matchmaker.editTeamsModalTitle", { round: m.round })}
      body={
        <div className="space-y-3">
          <p className="text-xs text-ink-faint">{t("matchmaker.editTeamsModalHint")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-2.5 space-y-2">
              <p className="text-xs font-extrabold text-emerald-950">{t("matchmaker.team1")}</p>
              {picker(t1[0] ?? "", (v) => setSide(setT1, t1, 0, v), "Team 1 player 1")}
              {picker(t1[1] ?? "", (v) => setSide(setT1, t1, 1, v), "Team 1 player 2")}
            </div>
            <div className="rounded-xl border border-sky-200/80 bg-sky-50/30 p-2.5 space-y-2">
              <p className="text-xs font-extrabold text-sky-950">{t("matchmaker.team2")}</p>
              {picker(t2[0] ?? "", (v) => setSide(setT2, t2, 0, v), "Team 2 player 1")}
              {picker(t2[1] ?? "", (v) => setSide(setT2, t2, 1, v), "Team 2 player 2")}
            </div>
          </div>
          {error && <p role="alert" className="text-xs font-semibold text-red-700">{error}</p>}
        </div>
      }
      confirmLabel={t("matchmaker.btnSaveTeams")}
      busy={updateState.isLoading}
      onConfirm={save}
      onCancel={onClose}
    />
  );
}
