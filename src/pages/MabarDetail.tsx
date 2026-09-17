import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { skipToken } from "@reduxjs/toolkit/query";
import { ApiError } from "../store/baseApi";
import {
  useAttendanceQuery,
  useBillingQuery,
  useCreateMatchMutation,
  useCreatePlayerMutation,
  useDeleteMatchMutation,
  useGenerateBillingMutation,
  useInventoryTxQuery,
  useMabarSummaryQuery,
  useMatchesQuery,
  usePeriodMembersQuery,
  usePeriodSummaryQuery,
  usePlayersAllQuery,
  useProductsQuery,
  useRemoveAttendanceMutation,
  useSaveAllocationMutation,
  useSaveSimpleStatsMutation,
  useSetAttendanceMutation,
  useSimpleStatsQuery,
  useUpdateBillingStatusMutation,
  useUpdateMabarMutation,
  type MabarSummary,
} from "../store/services";
import { dateId, rupiah, statusClass, statusLabel } from "../format";
import { Badge, Btn, ConfirmModal, Empty, ErrorBox, Field, Loading, MoneyInput, PageHead } from "../ui";

const STATUSES = ["PRESENT", "LISTED", "CONFIRMED", "CANCELLED", "ABSENT", "NO_SHOW"];

// Badminton needs at least 4 players on court: calculations stay locked
// until this many players are marked PRESENT.
const MIN_PRESENT = 4;

type RecapMode = "simple" | "detail";

function initialMode(sessionType: string, sessionId: string): RecapMode {
  try {
    const saved = window.localStorage.getItem(`mabar-mode-${sessionId}`);
    if (saved === "simple" || saved === "detail") return saved;
  } catch {
    /* ignore */
  }
  return sessionType === "DAILY_EVENT" ? "simple" : "detail";
}

export function MabarDetailPage() {
  const { id = "" } = useParams();
  const summary = useMabarSummaryQuery(id);

  if (summary.isFetching && !summary.data) return <Loading />;
  if (summary.isError || !summary.data) return <ErrorBox message="Could not load session." onRetry={() => summary.refetch()} />;

  return <MabarDetailInner sessionId={id} sessionType={summary.data.session.type} summary={summary.data} onRetry={() => summary.refetch()} />;
}

function MabarDetailInner({
  sessionId,
  sessionType,
  summary: s,
  onRetry,
}: {
  sessionId: string;
  sessionType: string;
  summary: MabarSummary;
  onRetry: () => void;
}) {
  const [mode, setMode] = useState<RecapMode>(() => initialMode(sessionType, sessionId));

  useEffect(() => {
    try {
      window.localStorage.setItem(`mabar-mode-${sessionId}`, mode);
    } catch {
      /* ignore */
    }
  }, [mode, sessionId]);

  return (
    <div>
      <PageHead
        title={`${s.session.type === "PERIOD" ? "Period Open Play" : "Daily Open Play"} · ${dateId(s.session.date)}`}
        sub={s.session.period_name ?? s.session.venue_description ?? undefined}
        right={<Badge status={s.status} />}
      />
      <section aria-label="Session result" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-5">
          <Cell label="Profit / loss" value={rupiah(s.profit)} strong />
          <Cell label="Revenue" value={rupiah(s.revenue)} sub={`Paid bills ${rupiah(s.billed_paid ?? 0)}`} />
          <Cell label="Operating cost" value={rupiah(s.operating_cost)} sub={`Courts ${rupiah(s.court_cost)} · Shuttles ${rupiah(s.shuttlecock_cost)}`} />
          <Cell label="Players present" value={String(s.players_present)} sub={`${s.players_listed} listed · ${s.no_show} no-shows`} />
          <Cell label="Shuttlecocks" value={`${s.shuttlecock_used} pcs`} sub="Matches + simple recap" />
        </dl>
      </section>
      {s.session.type === "DAILY_EVENT" && (
        <SessionCostPanel sessionId={sessionId} summary={s} onSaved={onRetry} />
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <AttendancePanel sessionId={sessionId} sessionType={s.session.type} periodId={s.session.period_id ?? null} />
        <div>
          <div role="tablist" aria-label="Recap mode" className="mb-3 flex gap-1">
            {(["simple", "detail"] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                type="button"
                onClick={() => setMode(m)}
                className={`border px-3 py-1.5 text-sm ${mode === m ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
              >
                {m === "simple" ? "Simple" : "Detailed 2v2"}
              </button>
            ))}
          </div>
          {mode === "simple" ? (
            <SimpleRecapPanel sessionId={sessionId} onRetry={onRetry} />
          ) : (
            <MatchesPanel sessionId={sessionId} />
          )}
        </div>
      </div>
      <div className="mt-5">
        <BillingPanel sessionId={sessionId} sessionType={s.session.type} periodId={s.session.period_id ?? null} />
      </div>
    </div>
  );
}

function Cell({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className={`mt-0.5 tabular-nums ${strong ? "text-lg font-bold" : "text-base font-semibold"}`}>{value}</dd>
      {sub && <dd className="text-xs text-ink-faint">{sub}</dd>}
    </div>
  );
}

function SessionCostPanel({ sessionId, summary: s, onSaved }: { sessionId: string; summary: MabarSummary; onSaved: () => void }) {
  const [error, setError] = useState("");
  const [update, updateState] = useUpdateMabarMutation();
  const [court, setCourt] = useState(s.session.court_cost);
  const [units, setUnits] = useState(s.session.shuttle_units_per_pack || 12);
  const [pack, setPack] = useState(s.session.shuttle_pack_price || (s.session.shuttlecock_price > 0 ? s.session.shuttlecock_price * 12 : 125000));
  const [price, setPrice] = useState(s.session.shuttlecock_price);

  useEffect(() => {
    setCourt(s.session.court_cost);
    setPrice(s.session.shuttlecock_price);
    setPack(s.session.shuttle_pack_price || (s.session.shuttlecock_price > 0 ? s.session.shuttlecock_price * 12 : 125000));
    setUnits(s.session.shuttle_units_per_pack || 12);
  }, [s.session.court_cost, s.session.shuttlecock_price, s.session.shuttle_pack_price, s.session.shuttle_units_per_pack]);

  const present = Math.max(1, s.players_present);
  const share = Math.floor(court / present);
  const suggested = Math.round(pack / Math.max(1, units));
  const dirty =
    court !== s.session.court_cost ||
    price !== s.session.shuttlecock_price ||
    pack !== s.session.shuttle_pack_price ||
    units !== s.session.shuttle_units_per_pack;

  function onPack(v: number) {
    setPack(Math.max(0, v || 0));
  }

  function onUnits(v: number) {
    setUnits(Math.max(1, v || 1));
  }

  async function submit() {
    try {
      await update({
        id: sessionId,
        body: {
          type: s.session.type,
          date: s.session.date,
          period_id: s.session.period_id,
          venue_id: s.session.venue_id,
          start_time: s.session.start_time,
          end_time: s.session.end_time,
          description: s.session.description,
          venue_description: s.session.venue_description,
          pricing_mode: s.session.pricing_mode,
          status: s.session.status,
          court_cost: Math.max(0, court),
          shuttlecock_price: Math.max(0, price),
          shuttle_pack_price: Math.max(0, pack),
          shuttle_units_per_pack: Math.max(1, units),
        },
      }).unwrap();
      setError("");
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save session pricing.");
    }
  }

  return (
    <section aria-label="Session pricing" className="mb-5 rounded-xl border border-line bg-white shadow-card">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold">Daily pricing</h2>
        <p className="mt-0.5 text-xs text-ink-faint">
          Set the pack price first ({units} pcs = {rupiah(pack)} → suggested {rupiah(suggested)}/shuttle),
          then set the final price/shuttle. Court cost is split evenly across players present ({s.players_present} now → {rupiah(share)} each).
          E.g. 3 shuttles × {rupiah(price)} = {rupiah(3 * price)}.
        </p>
      </div>
      {error && <p role="alert" className="px-3 pt-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        <Field label="Court cost (Rp)" hint="E.g. 90.000 for 3 hours.">
          <MoneyInput id="daily-court" value={court} onChange={(n) => setCourt(n)} />
        </Field>
        <Field label="Units/pack" hint="E.g. 12.">
          <input id="daily-units" type="number" min={1} className="w-full" value={units} onChange={(e) => onUnits(Number(e.target.value))} />
        </Field>
        <Field label="Shuttle pack price (Rp)" hint="Set this first.">
          <MoneyInput id="daily-pack" value={pack} onChange={(n) => onPack(n)} />
        </Field>
        <Field label="Price/shuttle (Rp)" hint={`You decide. Pack ÷ units suggests ≈ Rp${suggested.toLocaleString("id-ID")}.`}>
          <MoneyInput id="daily-shuttle" value={price} onChange={(n) => setPrice(n)} />
        </Field>
        <div className="sm:col-span-2">
          <Btn disabled={!dirty || updateState.isLoading} onClick={submit}>
            {updateState.isLoading ? "Saving…" : "Save pricing"}
          </Btn>
        </div>
      </div>
    </section>
  );
}

function AttendancePanel({ sessionId, sessionType, periodId }: { sessionId: string; sessionType: string; periodId: string | null }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const attendance = useAttendanceQuery(sessionId);
  const players = usePlayersAllQuery();
  const periodMembers = usePeriodMembersQuery(periodId ?? skipToken);
  const [setAttendance, saveState] = useSetAttendanceMutation();
  const [removeRow, removeState] = useRemoveAttendanceMutation();
  const [createPlayer, createState] = useCreatePlayerMutation();
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<{ playerId: string; playerName: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("PRESENT");

  const rows = useMemo(
    () =>
      [...(attendance.data ?? [])].sort(
        (a, b) => Number(b.is_member) - Number(a.is_member) || a.player_name.localeCompare(b.player_name),
      ),
    [attendance.data],
  );
  const byId = useMemo(() => new Map(rows.map((r) => [r.player_id, r])), [rows]);
  // True period members. In PERIOD sessions is_member must follow this —
  // a guest is never a member just because the session belongs to a period.
  const memberIds = useMemo(
    () => new Set((periodMembers.data ?? []).map((m) => m.player_id)),
    [periodMembers.data],
  );
  const membersLoading = sessionType === "PERIOD" && !!periodId && periodMembers.isFetching && !periodMembers.data;
  const defaultIsMember = (playerId: string) => sessionType === "PERIOD" && memberIds.has(playerId);
  const selectedCount = rows.filter((r) => selected.has(r.player_id)).length;
  const allChecked = rows.length > 0 && selectedCount === rows.length;
  const someChecked = selectedCount > 0 && selectedCount < rows.length;

  function toggle(playerId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  }

  function toggleAll() {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.player_id)));
  }

  async function setStatus(playerId: string, status: string) {
    const cur = byId.get(playerId);
    try {
      await setAttendance({
        sessionId,
        players: [{ player_id: playerId, status, is_member: cur?.is_member ?? defaultIsMember(playerId) }],
      }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save attendance.");
    }
  }

  async function flipMember(playerId: string) {
    const cur = byId.get(playerId);
    if (!cur) return;
    try {
      await setAttendance({
        sessionId,
        players: [{ player_id: playerId, status: cur.status, is_member: !cur.is_member }],
      }).unwrap();
      setError("");
      setNotice("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save attendance.");
    }
  }

  async function applyBulk(status: string) {
    const ids = rows.filter((r) => selected.has(r.player_id)).map((r) => r.player_id);
    if (ids.length === 0) return;
    try {
      await setAttendance({
        sessionId,
        players: ids.map((player_id) => ({
          player_id,
          status,
          is_member: byId.get(player_id)?.is_member ?? defaultIsMember(player_id),
        })),
      }).unwrap();
      setError("");
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save attendance.");
    }
  }

  const candidates = (players.data ?? []).filter((p) => !byId.has(p.id) && p.status !== "ARCHIVED");
  const busy = saveState.isLoading || createState.isLoading || removeState.isLoading;

  async function removePlayer() {
    if (!pendingRemove || removeState.isLoading) return;
    const { playerId, playerName } = pendingRemove;
    try {
      const res = await removeRow({ sessionId, playerId }).unwrap();
      setError("");
      setPendingRemove(null);
      setNotice(
        res.player_deleted
          ? `Removed "${playerName}" from this session and permanently deleted the player (no other history).`
          : `Removed "${playerName}" from this session.`,
      );
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    } catch (e) {
      setNotice("");
      setError(e instanceof ApiError ? e.message : "Could not remove player.");
    }
  }

  async function addNewPlayer() {
    const name = newName.trim();
    if (!name || busy) return;
    const alreadyListed = rows.find((r) => r.player_name.toLowerCase() === name.toLowerCase());
    if (alreadyListed) {
      setError(`"${alreadyListed.player_name}" is already on the attendance list.`);
      return;
    }
    try {
      const existing = (players.data ?? []).find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.status !== "ARCHIVED" && !byId.has(p.id),
      );
      if (existing) {
        await setAttendance({
          sessionId,
          players: [{ player_id: existing.id, status: "PRESENT", is_member: defaultIsMember(existing.id) }],
        }).unwrap();
      } else {
        const created = await createPlayer({ name, phone: null, notes: null }).unwrap();
        await setAttendance({
          sessionId,
          players: [{ player_id: created.id, status: "PRESENT", is_member: defaultIsMember(created.id) }],
        }).unwrap();
      }
      setNewName("");
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add new player.");
    }
  }

  return (
    <section aria-label="Attendance" className="h-fit rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold">Attendance · {rows.length} players</h2>
        <Btn
          variant="plain"
          disabled={saveState.isLoading}
          onClick={() => setAttendance({ sessionId, present_all: true }).unwrap().catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not save."))}
        >
          Mark all listed as present
        </Btn>
      </div>
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-court/40 px-3 py-2">
          <span className="text-sm font-medium">{selectedCount} selected</span>
          <label htmlFor="bulk-status" className="sr-only">Bulk status</label>
          <select id="bulk-status" value={bulkStatus} disabled={saveState.isLoading} onChange={(e) => setBulkStatus(e.target.value)}>
            {STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <Btn disabled={saveState.isLoading} onClick={() => applyBulk(bulkStatus)}>
            {saveState.isLoading ? "Saving…" : `Apply → ${bulkStatus}`}
          </Btn>
          <button type="button" className="text-sm underline" onClick={() => setSelected(new Set())}>
            Cancel
          </button>
        </div>
      )}
      {error && <p role="alert" className="px-3 pt-2 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="px-3 pt-2 text-sm text-green-700">{notice}</p>}
      {attendance.isFetching && !attendance.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <div className="p-3"><Empty text="No attendance list yet. Add players below." /></div>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all players"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  disabled={saveState.isLoading}
                  onChange={toggleAll}
                />
              </th>
              <th className="w-10">No</th>
              <th>Player</th><th>Type</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.player_name}`}
                    checked={selected.has(r.player_id)}
                    disabled={saveState.isLoading}
                    onChange={() => toggle(r.player_id)}
                  />
                </td>
                <td className="tabular-nums text-ink-faint">{i + 1}</td>
                <td className="font-medium">{r.player_name}</td>
                <td>
                  <button
                    type="button"
                    title={r.is_member ? "Member rate — click to switch to non-member rate" : "Non-member rate — click to switch to member rate"}
                    disabled={saveState.isLoading}
                    onClick={() => flipMember(r.player_id)}
                    className={`rounded border px-1.5 py-0.5 text-xs font-medium disabled:opacity-50 ${r.is_member ? "border-green-300 bg-green-100 text-green-800" : "border-amber-300 bg-amber-100 text-amber-900"}`}
                  >
                    {r.is_member ? "Member" : "Non-member"}
                  </button>
                </td>
                <td>
                  <select
                    aria-label={`Status for ${r.player_name}`}
                    value={r.status}
                    disabled={saveState.isLoading}
                    onChange={(e) => setStatus(r.player_id, e.target.value)}
                    className={`cursor-pointer rounded border px-1.5 py-0.5 text-xs font-medium ${statusClass(r.status)}`}
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>{statusLabel(st)}</option>
                    ))}
                  </select>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    aria-label={`Remove ${r.player_name} from session`}
                    title={`Remove ${r.player_name} from session`}
                    disabled={removeState.isLoading}
                    onClick={() => { setNotice(""); setError(""); setPendingRemove({ playerId: r.player_id, playerName: r.player_name }); }}
                    className="rounded px-1.5 py-0.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="space-y-2 border-t border-line p-3">
        <div className="flex gap-2">
          <label htmlFor="add-present" className="sr-only">Add player to attendance</label>
          <select id="add-present" className="min-w-0 flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Add a player…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Btn
            disabled={!pick || saveState.isLoading || membersLoading}
            onClick={() => {
              setAttendance({ sessionId, players: [{ player_id: pick, status: "LISTED", is_member: defaultIsMember(pick) }] })
                .unwrap()
                .then(() => setPick(""))
                .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not save."));
            }}
          >
            Add
          </Btn>
        </div>
        <div className="flex gap-2">
          <label htmlFor="add-new-player" className="sr-only">New player name</label>
          <input
            id="add-new-player"
            className="min-w-0 flex-1"
            placeholder="New player name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNewPlayer(); }}
          />
          <Btn disabled={!newName.trim() || busy || membersLoading} onClick={addNewPlayer}>
            {createState.isLoading ? "Saving…" : "Add new"}
          </Btn>
        </div>
        <p className="text-xs text-ink-faint">If the name is not in the list, type a new name and click Add new — it will be registered and added to attendance as PRESENT. Open play needs at least {MIN_PRESENT} PRESENT players before bills and charges can be calculated.</p>
      </div>
      {pendingRemove && (
        <ConfirmModal
          title={`Remove ${pendingRemove.playerName} from this session?`}
          body={
            <>
              <p>
                <strong>{pendingRemove.playerName}</strong> will be removed from this session's attendance list.
              </p>
              <p className="mt-2">
                If the player has no other history, they are permanently deleted too and disappear from every list.
                Players with bills here cannot be removed — set their status to CANCELLED instead.
              </p>
            </>
          }
          confirmLabel="Yes, remove"
          busy={removeState.isLoading}
          onConfirm={removePlayer}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </section>
  );
}

function SimpleRecapPanel({ sessionId, onRetry }: { sessionId: string; onRetry: () => void }) {
  const [error, setError] = useState("");
  const attendance = useAttendanceQuery(sessionId);
  const simple = useSimpleStatsQuery(sessionId);
  const [save, saveState] = useSaveSimpleStatsMutation();
  const [draft, setDraft] = useState<Record<string, { plays: number; cocks: number }>>({});
  const [initializedFor, setInitializedFor] = useState("");

  const present = useMemo(
    () => (attendance.data ?? []).filter((r) => r.status === "PRESENT"),
    [attendance.data],
  );

  useEffect(() => {
    if (!simple.data || initializedFor === sessionId + JSON.stringify(simple.data)) return;
    const next: Record<string, { plays: number; cocks: number }> = {};
    for (const row of simple.data) {
      next[row.player_id] = { plays: row.play_count, cocks: row.shuttlecock_used };
    }
    setDraft((prev) => ({ ...next, ...prev }));
    setInitializedFor(sessionId + JSON.stringify(simple.data));
  }, [simple.data, sessionId, initializedFor]);

  const get = (playerId: string) => draft[playerId] ?? { plays: 0, cocks: 0 };
  const set = (playerId: string, patch: Partial<{ plays: number; cocks: number }>) =>
    setDraft((d) => ({ ...d, [playerId]: { ...get(playerId), ...patch } }));

  const totalPlays = present.reduce((a, p) => a + get(p.player_id).plays, 0);
  const totalCocks = present.reduce((a, p) => a + get(p.player_id).cocks, 0);
  const dirty = useMemo(() => {
    const base = new Map((simple.data ?? []).map((r) => [r.player_id, r]));
    return present.some((p) => {
      const b = base.get(p.player_id);
      const g = get(p.player_id);
      return (b?.play_count ?? 0) !== g.plays || (b?.shuttlecock_used ?? 0) !== g.cocks;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, simple.data, present]);

  async function submit() {
    try {
      await save({
        sessionId,
        rows: present.map((p) => ({
          player_id: p.player_id,
          play_count: Math.max(0, get(p.player_id).plays),
          shuttlecock_used: Math.max(0, get(p.player_id).cocks),
        })),
      }).unwrap();
      setError("");
      onRetry();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save recap.");
    }
  }

  return (
    <section aria-label="Simple recap" className="h-fit rounded-xl border border-line bg-white shadow-card">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold">
          Simple recap · {present.length} present · {totalPlays} plays · {totalCocks} shuttles
        </h2>
        <p className="mt-0.5 text-xs text-ink-faint">
          Only this is required: present names + total plays + total shuttles. No need to enter 2 vs 2 per match. Stock &amp; billing follow these numbers.
        </p>
      </div>
      {error && <p role="alert" className="px-3 pt-2 text-sm text-red-700">{error}</p>}
      {attendance.isFetching && !attendance.data ? (
        <Loading />
      ) : present.length === 0 ? (
        <div className="p-3"><Empty text="Nobody marked PRESENT yet. Mark attendance first." /></div>
      ) : (
        <table className="data">
          <thead>
            <tr><th>Player</th><th className="text-right">Plays</th><th className="text-right">Shuttles</th></tr>
          </thead>
          <tbody>
            {present.map((p) => {
              const v = get(p.player_id);
              return (
                <tr key={p.player_id}>
                  <td className="font-medium">{p.player_name}</td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <button type="button" aria-label={`Decrease plays for ${p.player_name}`} className="border border-line px-2 py-0.5" onClick={() => set(p.player_id, { plays: Math.max(0, v.plays - 1) })}>−</button>
                      <input aria-label={`Total plays for ${p.player_name}`} className="w-12 text-center tabular-nums" inputMode="numeric" value={v.plays} onChange={(e) => set(p.player_id, { plays: Math.max(0, Number(e.target.value) || 0) })} />
                      <button type="button" aria-label={`Increase plays for ${p.player_name}`} className="border border-line px-2 py-0.5" onClick={() => set(p.player_id, { plays: v.plays + 1 })}>+</button>
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="inline-flex items-center gap-1">
                      <button type="button" aria-label={`Decrease shuttles for ${p.player_name}`} className="border border-line px-2 py-0.5" onClick={() => set(p.player_id, { cocks: Math.max(0, v.cocks - 1) })}>−</button>
                      <input aria-label={`Total shuttles for ${p.player_name}`} className="w-12 text-center tabular-nums" inputMode="numeric" value={v.cocks} onChange={(e) => set(p.player_id, { cocks: Math.max(0, Number(e.target.value) || 0) })} />
                      <button type="button" aria-label={`Increase shuttles for ${p.player_name}`} className="border border-line px-2 py-0.5" onClick={() => set(p.player_id, { cocks: v.cocks + 1 })}>+</button>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-3 py-2 text-xs font-semibold text-ink-soft">{present.length} players</td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{totalPlays}</td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{totalCocks}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <div className="flex items-center gap-2 border-t border-line p-3">
        <Btn disabled={!dirty || saveState.isLoading || present.length === 0} onClick={submit}>
          {saveState.isLoading ? "Saving…" : "Save simple recap"}
        </Btn>
        {simple.isFetching && <span className="text-xs text-ink-faint">Loading…</span>}
      </div>
    </section>
  );
}

function MatchesPanel({ sessionId }: { sessionId: string }) {
  const [error, setError] = useState("");
  const matches = useMatchesQuery(sessionId);
  const players = usePlayersAllQuery();
  const [create, createState] = useCreateMatchMutation();
  const [remove, removeState] = useDeleteMatchMutation();

  const [slots, setSlots] = useState(["", "", "", ""]);
  const [shuttles, setShuttles] = useState(1);

  const nameOf = useMemo(() => {
    const m = new Map((players.data ?? []).map((p) => [p.id, p.name]));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [players.data]);

  const namedCount = slots.filter(Boolean).length;
  const usage = useMemo(() => {
    const plays = new Map<string, number>();
    const cock = new Map<string, number>();
    for (const m of matches.data ?? []) {
      for (const id of m.players) {
        plays.set(id, (plays.get(id) ?? 0) + 1);
        cock.set(id, (cock.get(id) ?? 0) + m.shuttlecock_used);
      }
    }
    return [...plays.entries()]
      .map(([id, playCount]) => ({ id, playCount, shuttles: cock.get(id) ?? 0 }))
      .sort((a, b) => b.playCount - a.playCount || b.shuttles - a.shuttles);
  }, [matches.data]);

  const totalPlays = usage.reduce((a, u) => a + u.playCount, 0);
  const totalShuttles = (matches.data ?? []).reduce((a, m) => a + m.shuttlecock_used, 0);

  async function submit() {
    try {
      await create({
        sessionId,
        shuttlecock_used: shuttles,
        players: slots.filter(Boolean).map((player_id) => ({ player_id })),
      }).unwrap();
      setError("");
      setSlots(["", "", "", ""]);
      setShuttles(1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save match.");
    }
  }

  return (
    <section aria-label="Matches" className="h-fit rounded-xl border border-line bg-white shadow-card">
      <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">
        Detailed 2v2 (optional) · {matches.data?.length ?? 0} · {totalShuttles} shuttles used
      </h2>
      <p className="border-b border-line bg-court/40 px-3 py-1.5 text-xs text-ink-soft">
        Optional. For a quick daily session the Simple tab is enough. Use this only to record 2 vs 2 lineups per game.
      </p>
      {matches.isFetching && !matches.data ? (
        <Loading />
      ) : (matches.data ?? []).length === 0 ? (
        <div className="p-3"><Empty text="No matches yet. Record the first one below." /></div>
      ) : (
        <table className="data">
          <thead>
            <tr><th>#</th><th>Players</th><th className="text-right">Shuttles</th><th></th></tr>
          </thead>
          <tbody>
            {(matches.data ?? []).map((m) => (
              <tr key={m.id}>
                <td className="tabular-nums">{m.sequence}</td>
                <td>{m.players.length ? m.players.map(nameOf).join(" · ") : "No names recorded"}</td>
                <td className="text-right tabular-nums">{m.shuttlecock_used}</td>
                <td className="text-right">
                  <button type="button" className="text-red-700 underline" disabled={removeState.isLoading} onClick={() => remove({ matchId: m.id, sessionId })}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {usage.length > 0 && (
        <table className="data border-t border-line">
          <thead>
            <tr><th>Player</th><th className="text-right">Plays</th><th className="text-right">Shuttles</th></tr>
          </thead>
          <tbody>
            {usage.map((u) => (
              <tr key={u.id}>
                <td className="font-medium">{nameOf(u.id)}</td>
                <td className="text-right tabular-nums">{u.playCount}</td>
                <td className="text-right tabular-nums">{u.shuttles}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="px-3 py-2 text-xs font-semibold text-ink-soft">{usage.length} named players</td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{totalPlays}</td>
              <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{totalShuttles}</td>
            </tr>
          </tfoot>
        </table>
      )}
      <div className="border-t border-line p-3">
        <h3 className="mb-2 text-sm font-semibold">New match</h3>
        <div className="grid grid-cols-2 gap-2">
          {slots.map((v, i) => (
            <select key={i} aria-label={`Player ${i + 1} (optional)`} value={v} onChange={(e) => setSlots(slots.map((s, j) => (j === i ? e.target.value : s)))}>
              <option value="">Any player (optional)</option>
              {(players.data ?? []).filter((p) => p.status !== "ARCHIVED").map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">
          Names are optional. Leave every slot on Any player to log a bare 2 vs 2, and only pick names when you want per-player totals.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Field label="Shuttles used" error={shuttles < 0 ? "Shuttle count must not be negative." : undefined}>
            <span className="flex items-center gap-1">
              <button type="button" aria-label="Decrease" className="border border-line px-2 py-1" onClick={() => setShuttles(Math.max(0, shuttles - 1))}>−</button>
              <input id="shuttlecock" className="w-14 text-center tabular-nums" inputMode="numeric" value={shuttles} onChange={(e) => setShuttles(Math.max(0, Number(e.target.value) || 0))} />
              <button type="button" aria-label="Increase" className="border border-line px-2 py-1" onClick={() => setShuttles(shuttles + 1)}>+</button>
            </span>
          </Field>
          <div className="pt-5">
            <Btn disabled={createState.isLoading} onClick={submit}>
              {createState.isLoading ? "Saving…" : "Save match"}
            </Btn>
          </div>
        </div>
        {namedCount > 0 && namedCount < 2 && (
          <p className="mt-1 text-xs text-ink-faint">Only {namedCount} name picked. The match still saves, it just attributes play to that one name.</p>
        )}
        {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}

function BillStatusCell({ playerName, status, disabled, onChange }: { playerName: string; status: string; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <select
      aria-label={`Payment status for ${playerName}`}
      value={status}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`cursor-pointer rounded border px-1.5 py-0.5 text-xs font-medium ${statusClass(status)}`}
    >
      {["UNPAID", "PAID"].map((st) => (
        <option key={st} value={st}>{statusLabel(st)}</option>
      ))}
    </select>
  );
}

function BillMethodCell({ playerName, status, method, disabled, onChange }: { playerName: string; status: string; method: string; disabled: boolean; onChange: (v: string) => void }) {
  if (status !== "PAID") return <span className="text-ink-faint">—</span>;
  return (
    <select
      aria-label={`Payment method for ${playerName}`}
      value={method ?? "CASH"}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="cursor-pointer rounded border border-line bg-white px-1.5 py-0.5 text-xs font-medium text-ink"
    >
      {["CASH", "QRIS", "BCA"].map((m) => (
        <option key={m} value={m}>{m === "CASH" ? "Cash" : m}</option>
      ))}
    </select>
  );
}

function PeriodRateHint({ periodId }: { periodId: string }) {
  const q = usePeriodSummaryQuery(periodId);
  if (!q.data) return null;
  return (
    <span>
      {" "}· members {rupiah(q.data.period.member_contribution)} · non-members {rupiah(q.data.period.non_member_fee)} (change in Period settings)
    </span>
  );
}

function ShuttleSources({ sessionId, usageTotal, purpose }: { sessionId: string; usageTotal: number; purpose: string }) {
  const products = useProductsQuery();
  const tx = useInventoryTxQuery();
  const [save, saveState] = useSaveAllocationMutation();
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Array<{ product_id: string; units: string }>>([]);
  const [ready, setReady] = useState(false);

  const active = (products.data ?? []).filter(
    (p) => p.active && (p.purpose === purpose || p.purpose === "GENERAL"),
  );
  const current = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tx.data ?? []) {
      if (t.session_id === sessionId && t.type === "USAGE") m.set(t.product_id, (m.get(t.product_id) ?? 0) + t.units);
    }
    return [...m.entries()].map(([product_id, units]) => ({ product_id, units }));
  }, [tx.data, sessionId]);

  useEffect(() => {
    if (ready || !products.data || tx.isFetching) return;
    if (current.length > 0) {
      setRows(current.map((r) => ({ product_id: r.product_id, units: String(r.units) })));
    } else if (usageTotal > 0 && active.length > 0) {
      const first =
        active.find((p) => p.purpose === purpose) ??
        active.find((p) => p.purpose === "GENERAL") ??
        active[0];
      setRows([{ product_id: first.id, units: String(usageTotal) }]);
    }
    setReady(true);
  }, [ready, products.data, tx.isFetching, current, usageTotal, active]);

  if (usageTotal <= 0) return null;

  const suitableIds = new Set(active.map((p) => p.id));
  const mismatched = current.filter((r) => r.units > 0 && !suitableIds.has(r.product_id));
  const mismatchNames = mismatched.map((r) => {
    const found = (products.data ?? []).find((p) => p.id === r.product_id);
    return `${found?.name ?? "Unknown product"}${found ? ` (${found.purpose === "GENERAL" ? "shared" : found.purpose.toLowerCase()})` : ""}`;
  });

  const parsed = rows.map((r) => ({ product_id: r.product_id, units: Math.max(0, Number(r.units) || 0) }));
  const allocated = parsed.reduce((a, r) => a + r.units, 0);
  const balanced = allocated === usageTotal && parsed.every((r) => r.product_id && r.units > 0);
  const nameOf = (id: string) => active.find((p) => p.id === id)?.name ?? "Unknown product";
  const stockOf = (id: string) => active.find((p) => p.id === id)?.stock ?? 0;

  async function submit() {
    try {
      const res = await save({ sessionId, items: parsed }).unwrap();
      setRows(res.map((r) => ({ product_id: r.product_id, units: String(r.units) })));
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save allocation.");
    }
  }

  return (
    <div className="border-b border-line p-3">
      <h3 className="mb-2 text-sm font-semibold">
        Shuttle sources · {allocated}/{usageTotal} pcs
        {allocated === usageTotal ? (
          <span className="ml-2 font-normal text-green-700">covered</span>
        ) : (
          <span className="ml-2 font-normal text-amber-700">not fully allocated</span>
        )}
      </h3>
      {mismatched.length > 0 && (
        <p className="mb-2 border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          {mismatchNames.join(", ")} {mismatched.length === 1 ? "is" : "are"} not for {purpose === "DAILY" ? "daily" : "period"} sessions
          and cannot be used here — replace {mismatched.length === 1 ? "it" : "them"} below.
        </p>
      )}
      {active.length === 0 && (
        <p className="mb-2 border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          No {purpose === "DAILY" ? "daily" : "period"} shuttlecock in inventory yet — add one in Inventory
          (New product → Used for: {purpose === "DAILY" ? "Daily open play" : "Period"}), then buy tubes.
        </p>
      )}
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              aria-label={`Source product ${i + 1}`}
              className="min-w-0 flex-1"
              value={r.product_id}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, product_id: e.target.value } : x)))}
            >
              <option value="">- Select product -</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.stock} left)</option>
              ))}
            </select>
            <input
              aria-label={`Units from source ${i + 1}`}
              className="w-20 text-center tabular-nums"
              inputMode="numeric"
              value={r.units}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, units: e.target.value.replace(/[^0-9]/g, "") } : x)))}
            />
            <span className="text-xs text-ink-faint">pcs</span>
            <button
              type="button"
              aria-label={`Remove source ${i + 1} (${nameOf(r.product_id)})`}
              disabled={rows.length <= 1}
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="rounded px-1.5 py-0.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-30"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {rows.length > 0 && (
        <p className="mt-1 text-xs text-ink-faint">
          Stock now: {rows.map((r) => `${nameOf(r.product_id)} ${stockOf(r.product_id)}`).join(" · ") || "—"}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <Btn
          variant="plain"
          disabled={saveState.isLoading || active.length === 0}
          onClick={() => setRows([...rows, { product_id: active[0]?.id ?? "", units: "" }])}
        >
          Add source
        </Btn>
        <Btn disabled={!balanced || saveState.isLoading} onClick={submit}>
          {saveState.isLoading ? "Saving…" : "Save sources"}
        </Btn>
      </div>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
      <p className="mt-1 text-xs text-ink-faint">
        Split usage across inventory products (e.g. 12 + 1). Must add up to {usageTotal} pcs. Saving replaces this session's stock records.
      </p>
    </div>
  );
}

function BillingPanel({ sessionId, sessionType, periodId }: { sessionId: string; sessionType: string; periodId: string | null }) {
  const [error, setError] = useState("");
  const bills = useBillingQuery(sessionId);
  const attendance = useAttendanceQuery(sessionId);
  const simple = useSimpleStatsQuery(sessionId);
  const matchList = useMatchesQuery(sessionId);
  const products = useProductsQuery();
  const [generate, generateState] = useGenerateBillingMutation();
  const [setStatus, statusState] = useUpdateBillingStatusMutation();

  const isDaily = sessionType === "DAILY_EVENT";
  const memberOf = useMemo(
    () => new Map((attendance.data ?? []).map((r) => [r.player_id, r.is_member] as const)),
    [attendance.data],
  );
  // Per-player shuttle usage from both recap modes (same summing as billing).
  const shuttleOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of simple.data ?? []) m.set(row.player_id, (m.get(row.player_id) ?? 0) + row.shuttlecock_used);
    for (const mt of matchList.data ?? []) {
      for (const pid of mt.players) m.set(pid, (m.get(pid) ?? 0) + mt.shuttlecock_used);
    }
    return m;
  }, [simple.data, matchList.data]);

  const presentCount = (attendance.data ?? []).filter((r) => r.status === "PRESENT").length;
  const enoughPlayers = presentCount >= MIN_PRESENT;

  // Session-level shuttle usage vs inventory, mirroring the backend bucket
  // pick (matching purpose → GENERAL → first active). Warns before stock
  // would go negative; saving is blocked server-side until a purchase covers it.
  const sessionUsage = useMemo(
    () =>
      (matchList.data ?? []).reduce((a, m) => a + m.shuttlecock_used, 0) +
      (simple.data ?? []).reduce((a, r) => a + r.shuttlecock_used, 0),
    [matchList.data, simple.data],
  );
  const stockPick = useMemo(() => {
    const list = (products.data ?? []).filter(
      (p) => p.active && (p.purpose === (isDaily ? "DAILY" : "PERIOD") || p.purpose === "GENERAL"),
    );
    const want = isDaily ? "DAILY" : "PERIOD";
    return list.find((p) => p.purpose === want) ?? list.find((p) => p.purpose === "GENERAL") ?? list[0];
  }, [products.data, isDaily]);
  const shortfall = stockPick ? sessionUsage - stockPick.stock : 0;

  async function changeStatus(playerId: string, payment_status: string) {
    try {
      await setStatus({
        sessionId,
        playerId,
        payment_status,
        ...(payment_status === "UNPAID" ? { payment_method: "CASH" } : {}),
      }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update payment status.");
    }
  }

  async function changeMethod(playerId: string, payment_method: string) {
    try {
      await setStatus({ sessionId, playerId, payment_method }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not update payment method.");
    }
  }

  return (
    <section aria-label="Player bills" className="rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold">Player bills</h2>
        <Btn
          variant="plain"
          disabled={generateState.isLoading || !enoughPlayers}
          title={enoughPlayers ? undefined : `Need at least ${MIN_PRESENT} present players (${presentCount}/${MIN_PRESENT})`}
          onClick={() => generate(sessionId).unwrap().catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not generate bills."))}
        >
          {generateState.isLoading ? "Calculating…" : "Recalculate bills"}
        </Btn>
      </div>
      {!enoughPlayers && (
        <p className="border-b border-line bg-court/40 px-3 py-1.5 text-xs text-ink-soft">
          Need at least {MIN_PRESENT} present players ({presentCount}/{MIN_PRESENT}) to calculate bills — badminton needs 4 on court.
        </p>
      )}
      <ShuttleSources sessionId={sessionId} usageTotal={sessionUsage} purpose={isDaily ? "DAILY" : "PERIOD"} />
      {stockPick && shortfall > 0 && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          This session uses {sessionUsage} shuttles but '{stockPick.name}' has only {stockPick.stock} in stock
          — stock would go −{shortfall} on auto-pick. Split across products in Shuttle sources above, or record a purchase (Inventory → Buy tubes).
        </p>
      )}
      {!stockPick && sessionUsage > 0 && (
        <p className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          No {isDaily ? "daily" : "period"} shuttlecock in inventory yet — usage cannot be recorded.
          Add one in Inventory (New product → Used for: {isDaily ? "Daily open play" : "Period"}), then buy tubes.
        </p>
      )}
      {error && <p role="alert" className="px-3 pt-2 text-sm text-red-700">{error}</p>}
      {!isDaily && (
        <p className="border-b border-line bg-court/40 px-3 py-1.5 text-xs text-ink-soft">
          Period rates apply here
          {periodId && <PeriodRateHint periodId={periodId} />}.
          Marking PAID here (Cash/QRIS/BCA) feeds the member balance on the Period page.
        </p>
      )}
      {bills.isFetching && !bills.data ? (
        <Loading />
      ) : (bills.data ?? []).length === 0 ? (
        <div className="p-3"><Empty text={isDaily ? "No bills yet. Make sure players are present, then recalculate." : "No bills yet. Mark at least 4 players PRESENT, then recalculate."} /></div>
      ) : isDaily ? (
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th className="w-10">No</th>
                <th>Player</th>
                <th className="text-right">Court</th>
                <th className="text-right">Shuttles</th>
                <th className="text-right">Shuttle</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {(bills.data ?? []).map((b, i) => {
                return (
                  <tr key={b.player_id}>
                    <td className="tabular-nums text-ink-faint">{i + 1}</td>
                    <td className="font-medium">{b.player_name}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{rupiah(b.court_share)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{b.shuttlecock_count}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{rupiah(b.shuttlecock_contribution)}</td>
                    <td className="whitespace-nowrap text-right font-semibold tabular-nums">{rupiah(b.total)}</td>
                    <td>
                      <BillStatusCell playerName={b.player_name} status={b.payment_status} disabled={statusState.isLoading} onChange={(v) => changeStatus(b.player_id, v)} />
                    </td>
                    <td>
                      <BillMethodCell playerName={b.player_name} status={b.payment_status} method={b.payment_method} disabled={statusState.isLoading} onChange={(v) => changeMethod(b.player_id, v)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 text-xs font-semibold text-ink-soft" colSpan={2}>
                  {(bills.data ?? []).length} players
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {rupiah((bills.data ?? []).reduce((a, b) => a + b.court_share, 0))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {(bills.data ?? []).reduce((a, b) => a + b.shuttlecock_count, 0)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {rupiah((bills.data ?? []).reduce((a, b) => a + b.shuttlecock_contribution, 0))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {rupiah((bills.data ?? []).reduce((a, b) => a + b.total, 0))}
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th className="w-10">No</th>
                <th>Player</th>
                <th>Type</th>
                <th className="text-right">Charge</th>
                <th className="text-right">Shuttles</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody>
              {(bills.data ?? []).map((b, i) => (
                <tr key={b.player_id}>
                  <td className="tabular-nums text-ink-faint">{i + 1}</td>
                  <td className="font-medium">{b.player_name}</td>
                  <td>{memberOf.get(b.player_id) ? "Member" : "Non-member"}</td>
                  <td className="whitespace-nowrap text-right font-semibold tabular-nums">{rupiah(b.total)}</td>
                  <td className="whitespace-nowrap text-right tabular-nums">{shuttleOf.get(b.player_id) ?? 0}</td>
                  <td>
                    <BillStatusCell playerName={b.player_name} status={b.payment_status} disabled={statusState.isLoading} onChange={(v) => changeStatus(b.player_id, v)} />
                  </td>
                  <td>
                    <BillMethodCell playerName={b.player_name} status={b.payment_status} method={b.payment_method} disabled={statusState.isLoading} onChange={(v) => changeMethod(b.player_id, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="px-3 py-2 text-xs font-semibold text-ink-soft" colSpan={3}>
                  {(bills.data ?? []).length} players · {(bills.data ?? []).filter((b) => b.payment_status === "PAID").length} paid
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {rupiah((bills.data ?? []).reduce((a, b) => a + b.total, 0))}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                  {(bills.data ?? []).reduce((a, b) => a + (shuttleOf.get(b.player_id) ?? 0), 0)}
                </td>
                <td />
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
