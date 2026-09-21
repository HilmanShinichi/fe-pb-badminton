import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import {
  useAddMemberMutation,
  useCompletePeriodMutation,
  useCreatePlayerMutation,
  useCreateRevenueMutation,
  useDeletePeriodMutation,
  usePeriodAttendanceMatrixQuery,
  usePeriodMembersQuery,
  usePeriodSessionsQuery,
  usePeriodSummaryQuery,
  usePlayersAllQuery,
  useRemoveMemberMutation,
  useSessionBreakdownQuery,
  useShuttlecockMatrixQuery,
  useUpdatePeriodMutation,
} from "../store/services";
import { dateDmy, dateId, rupiah } from "../format";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import type { Membership, PeriodAttendanceMatrixNonMember, PeriodAttendanceMatrixResponse } from "../types";

function paidOf(m: Membership): number {
  const p = m.paid ?? {};
  return (p.COMMITMENT_FEE ?? 0) + (p.ATTENDANCE_CONTRIBUTION ?? 0) + (p.NON_MEMBER_FEE ?? 0) + (p.VISIT_BILLS ?? 0);
}

function commitmentPaid(m: Membership): boolean {
  if (!m.commitment_fee) return true;
  return (m.paid?.COMMITMENT_FEE ?? 0) >= m.commitment_fee;
}

export function PeriodDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [forceArmed, setForceArmed] = useState(false);

  const summary = usePeriodSummaryQuery(id);
  const members = usePeriodMembersQuery(id);
  const sessions = usePeriodSessionsQuery(id);
  const breakdown = useSessionBreakdownQuery(id);
  const matrix = useShuttlecockMatrixQuery(id);
  const players = usePlayersAllQuery();
  const [addMember, addState] = useAddMemberMutation();
  const [removeMember, withdrawState] = useRemoveMemberMutation();
  const [withdrawFor, setWithdrawFor] = useState<Membership | null>(null);
  const [withdrawError, setWithdrawError] = useState("");

  async function confirmWithdraw() {
    if (!withdrawFor) return;
    try {
      await removeMember({ periodId: id, playerId: withdrawFor.player_id }).unwrap();
      setWithdrawFor(null);
      setWithdrawError("");
    } catch (e) {
      setWithdrawError(e instanceof ApiError ? e.message : "Could not withdraw member.");
    }
  }
  const [createPlayer, createState] = useCreatePlayerMutation();
  const [complete, completeState] = useCompletePeriodMutation();
  const [update, updateState] = useUpdatePeriodMutation();
  const [remove, removeState] = useDeletePeriodMutation();
  const [recordPayment, payState] = useCreateRevenueMutation();
  const [payFor, setPayFor] = useState<Membership | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    number_of_sessions: 5,
    commitment_fee: 0,
    member_contribution: 0,
    non_member_fee: 0,
    venue_cost_total: 0,
    shuttle_pack_price: 125000,
    shuttle_units_per_pack: 12,
    shuttle_per_session: 24,
  });

  useEffect(() => {
    if (summary.data) {
      const p = summary.data.period;
      setForm({
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        number_of_sessions: p.number_of_sessions || 5,
        commitment_fee: p.commitment_fee,
        member_contribution: p.member_contribution,
        non_member_fee: p.non_member_fee,
        venue_cost_total: p.venue_cost_total ?? 0,
        shuttle_pack_price: p.shuttle_pack_price ?? 125000,
        shuttle_units_per_pack: p.shuttle_units_per_pack ?? 12,
        shuttle_per_session: p.shuttle_per_session ?? 24,
      });
    }
  }, [summary.data]);

  if (summary.isFetching && !summary.data) return <Loading />;
  if (summary.isError || !summary.data) return <ErrorBox message="Could not load period." onRetry={() => summary.refetch()} />;

  const s = summary.data;
  const proj = s.projection;
  const done = s.period.status === "COMPLETED";
  const candidates = (players.data ?? []).filter(
    (p) => p.status !== "ARCHIVED" && !(members.data ?? []).some((m) => m.player_id === p.id)
  );

  // Session progress: a session counts as held once its date has passed.
  // Future-dated entries are scheduled, not held yet.
  const today = new Date().toISOString().slice(0, 10);
  const orderedSessions = [...(sessions.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const heldSessions = orderedSessions.filter((x) => x.date <= today);
  const upcomingSessions = orderedSessions.filter((x) => x.date > today);
  const plannedSessions = Math.max(1, proj.sessions || s.period.number_of_sessions || 1);
  const remainingSessions = Math.max(0, plannedSessions - heldSessions.length);
  const lastHeldDate = heldSessions.length ? heldSessions[heldSessions.length - 1].date : null;
  const progressPct = Math.min(100, Math.round((heldSessions.length / plannedSessions) * 100));

  async function submitMember() {
    if (!pick) return;
    try {
      await addMember({ periodId: id, player_id: pick }).unwrap();
      setPick("");
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add member.");
    }
  }

  const memberBusy = addState.isLoading || createState.isLoading;

  const memberRows = members.data ?? [];
  const billedTotal = memberRows.reduce((a, m) => a + m.total_bill, 0);
  const collectedTotal = memberRows.reduce((a, m) => a + paidOf(m), 0);

  function openPay(m: Membership) {
    const commitDue = Math.max(0, m.commitment_fee - (m.paid?.COMMITMENT_FEE ?? 0));
    setPayFor(m);
    setPayAmount(commitDue);
    setPayNote("");
    setPayError("");
  }

  async function submitPayment() {
    if (!payFor || !payAmount || payAmount <= 0 || payState.isLoading) return;
    try {
      await recordPayment({
        source: "COMMITMENT_FEE",
        amount: Math.round(payAmount),
        period_id: id,
        player_id: payFor.player_id,
        session_id: null,
        note: payNote.trim() || null,
      }).unwrap();
      setPayFor(null);
      setPayAmount(0);
      setPayNote("");
      setPayError("");
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : "Could not record payment.");
    }
  }

  async function submitNewMember() {
    const name = newName.trim();
    if (!name || memberBusy) return;
    const alreadyMember = (members.data ?? []).find(
      (m) => m.player_name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyMember) {
      setError(`"${alreadyMember.player_name}" is already registered as a member.`);
      return;
    }
    try {
      const memberIds = new Set((members.data ?? []).map((m) => m.player_id));
      const existing = (players.data ?? []).find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.status !== "ARCHIVED" && !memberIds.has(p.id),
      );
      if (existing) {
        await addMember({ periodId: id, player_id: existing.id }).unwrap();
      } else {
        const created = await createPlayer({ name, phone: null, notes: null }).unwrap();
        await addMember({ periodId: id, player_id: created.id }).unwrap();
      }
      setNewName("");
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not add new member.");
    }
  }

  async function confirmComplete() {
    try {
      await complete(id).unwrap();
      setPendingComplete(false);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not complete period.");
      setPendingComplete(false);
    }
  }

  async function confirmDelete() {
    try {
      await remove({ id, force: forceArmed }).unwrap();
      navigate("/periods");
    } catch (e) {
      if (e instanceof ApiError && e.code === "PERIOD_HAS_HISTORY" && !forceArmed) {
        setForceArmed(true);
      } else {
        setError(e instanceof ApiError ? e.message : "Could not delete period.");
        setPendingDelete(false);
        setForceArmed(false);
      }
    }
  }

  return (
    <div>
      <PageHead
        title={s.period.name}
        sub={`${dateId(s.period.start_date)} – ${dateId(s.period.end_date)} · ${s.sessions} sessions`}
        right={
          <>
            <Badge status={s.period.status} />
            {!done && (
              <Btn
                variant="plain"
                disabled={completeState.isLoading}
                onClick={() => setPendingComplete(true)}
              >
                Complete period
              </Btn>
            )}
            <DeleteRowButton onClick={() => { setPendingDelete(true); setForceArmed(false); }} />
          </>
        }
      />
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}

      <section aria-label="Period projection" className="mb-5 rounded-xl border border-pine/30 bg-white shadow-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pine/20 bg-gradient-to-r from-[#143728] via-[#1d4d3b] to-[#153f2f] px-4 py-3 text-paper">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
            <h2 className="text-sm font-bold tracking-tight">
              Period projection · {s.member_count} members · {proj.sessions} sessions
            </h2>
          </div>
          {!done && (
            <button
              type="button"
              className="rounded-lg border border-paper/25 bg-white/10 px-3 py-1 text-xs font-semibold text-paper hover:bg-white/20 transition-colors"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Close settings" : "Edit period"}
            </button>
          )}
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line/70 sm:grid-cols-4 bg-gradient-to-b from-emerald-50/25 to-white">
          <Cell label="Profit full" value={rupiah(proj.profit_full)} sub={`${proj.status_full} · full attendance`} highlight={proj.profit_full >= 0 ? "emerald" : "rose"} />
          <Cell label="Revenue full" value={rupiah(proj.revenue_full)} sub={`Member price ${rupiah(s.commitment_total)}`} />
          <Cell label="Projected cost" value={rupiah(proj.operating_cost)} sub={`Courts ${rupiah(proj.venue_total)} · Shuttles ${rupiah(proj.shuttle_cost)}`} />
          <Cell label="Projected shuttles" value={`${proj.shuttle_units} pcs`} sub={`${proj.shuttle_per_session}/session · ${s.shuttlecock_used} used`} />
        </dl>
        <dl className="grid grid-cols-2 divide-x divide-line/70 border-t border-line/70 sm:grid-cols-4 bg-white">
          <Cell label="Billed so far" value={rupiah(proj.revenue_billed)} sub={`${s.member_present} member visits · ${s.non_member_present} non-member`} />
          <Cell label="Running profit" value={rupiah(proj.profit_billed)} sub="Billed − cost to date" highlight={proj.profit_billed >= 0 ? "emerald" : "rose"} />
          <Cell label="Actual cash" value={rupiah(s.cash_flow)} sub={`In ${rupiah(s.cash_in)} · Out ${rupiah(s.cash_out)}`} />
          <Cell label="Actual profit" value={rupiah(s.operating_profit)} sub={`Revenue ${rupiah(s.total_revenue)} · Cost ${rupiah(s.operating_cost)}`} highlight={s.operating_profit >= 0 ? "emerald" : "rose"} />
        </dl>
        {editing && !done && (
          <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-4">
            <Field label="Name">
              <input id="edit-nama" className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Start">
              <input id="edit-mulai" type="date" className="w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label="End">
              <input id="edit-selesai" type="date" className="w-full" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </Field>
            <Field label="Sessions" hint="Used when no weekdays set.">
              <input id="edit-sesi" type="number" min={1} className="w-full" value={form.number_of_sessions} onChange={(e) => setForm({ ...form, number_of_sessions: Number(e.target.value) })} />
            </Field>
            <Field label="Member price (Rp)">
              <MoneyInput id="edit-komitmen" value={form.commitment_fee} onChange={(n) => setForm({ ...form, commitment_fee: n })} />
            </Field>
            <Field label="Contribution/session (Rp)">
              <MoneyInput id="edit-kontribusi" value={form.member_contribution} onChange={(n) => setForm({ ...form, member_contribution: n })} />
            </Field>
            <Field label="Non-member (Rp)">
              <MoneyInput id="edit-nonmember" value={form.non_member_fee} onChange={(n) => setForm({ ...form, non_member_fee: n })} />
            </Field>
            <Field label="Total court (Rp)">
              <MoneyInput id="edit-lapangan" value={form.venue_cost_total} onChange={(n) => setForm({ ...form, venue_cost_total: n })} />
            </Field>
            <Field label="Shuttle/pack (Rp)">
              <MoneyInput id="edit-kok" value={form.shuttle_pack_price} onChange={(n) => setForm({ ...form, shuttle_pack_price: n })} />
            </Field>
            <Field label="Units/pack">
              <input id="edit-isi" type="number" min={1} className="w-full" value={form.shuttle_units_per_pack} onChange={(e) => setForm({ ...form, shuttle_units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label="Shuttles/session">
              <input id="edit-koksesi" type="number" min={0} className="w-full" value={form.shuttle_per_session} onChange={(e) => setForm({ ...form, shuttle_per_session: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-4">
              <Btn
                disabled={updateState.isLoading || !form.name.trim() || !form.start_date || !form.end_date}
                onClick={() => {
                  update({ id, body: { ...form, name: form.name.trim() } })
                    .unwrap().then(() => { setEditing(false); setError(""); }).catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Could not save settings."));
                }}
              >
                {updateState.isLoading ? "Saving…" : "Save settings"}
              </Btn>
            </div>
          </div>
        )}
      </section>

      <section aria-label="Period finances" className="mb-5 rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/30 to-white px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Period Finances & Cash Balance</h2>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4 bg-white">
          <Cell label="Operating profit" value={rupiah(s.operating_profit)} sub={`${s.status === "PROFIT" ? "Profit" : s.status === "LOSS" ? "Loss" : "Break-even"} · avg ${rupiah(s.avg_profit_per_session)}/session`} highlight={s.operating_profit >= 0 ? "emerald" : "rose"} />
          <Cell label="Revenue" value={rupiah(s.total_revenue)} sub={`Cash in ${rupiah(s.cash_in)}`} />
          <Cell label="Operating cost" value={rupiah(s.operating_cost)} sub={`Courts ${rupiah(s.total_venue_cost)} · Shuttles ${rupiah(s.shuttlecock_usage_cost)}`} />
          <Cell label="Cash flow" value={rupiah(s.cash_flow)} sub={`Out ${rupiah(s.cash_out)} · stock ${s.shuttlecock_stock} pcs`} />
        </dl>
      </section>

      <div className="flex flex-col gap-5">
        <section aria-label="Per session" className="h-fit rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">Per session · {heldSessions.length} of {plannedSessions} held</h2>
              <span className="text-xs font-semibold text-pine">{progressPct}% held</span>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">
              One row = one night, with that night's own revenue, cost and profit.
              {remainingSessions > 0
                ? ` ${remainingSessions} remaining`
                : " All sessions held"}
              {upcomingSessions.length > 0 && ` · ${upcomingSessions.length} scheduled`}
              {lastHeldDate && ` · last held ${dateId(lastHeldDate)}`}
              {` · ends ${dateId(s.period.end_date)}`}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              Whole-period totals (including items without a session) are in the projection and finances above.
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-court/80 border border-line/40"
              role="progressbar"
              aria-valuenow={heldSessions.length}
              aria-valuemin={0}
              aria-valuemax={plannedSessions}
              aria-label="Sessions held"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-pine via-emerald-600 to-lime transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {breakdown.isFetching && !breakdown.data ? (
            <Loading />
          ) : (breakdown.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text="No sessions in this period." /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Date</th><th className="text-right">Present</th><th className="text-right">Revenue</th><th className="text-right">Cost</th><th className="text-right">Profit</th><th></th></tr>
              </thead>
              <tbody>
                {(breakdown.data ?? []).map((row) => (
                  <tr key={row.session_id}>
                    <td className="whitespace-nowrap">{dateId(row.date)}</td>
                    <td className="text-right tabular-nums">{row.players_present}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{rupiah(row.revenue)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{rupiah(row.operating_cost)}</td>
                    <td className={`whitespace-nowrap text-right font-semibold tabular-nums ${row.profit < 0 ? "text-red-700" : "text-green-700"}`}>
                      {rupiah(row.profit)}
                    </td>
                    <td className="text-right"><OpenLink to={`/mabar/${row.session_id}`} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-3 py-2 text-xs font-semibold text-ink-soft">
                    Sessions subtotal
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {(breakdown.data ?? []).reduce((a, r) => a + r.players_present, 0)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {rupiah((breakdown.data ?? []).reduce((a, r) => a + r.revenue, 0))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {rupiah((breakdown.data ?? []).reduce((a, r) => a + r.operating_cost, 0))}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {rupiah((breakdown.data ?? []).reduce((a, r) => a + r.profit, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>
          )}
        </section>

        <section aria-label="Members" className="h-fit rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3">
            <h2 className="text-sm font-bold text-ink">
              Members · {memberRows.length}
              {memberRows.length > 0 && (
                <span className="font-normal text-ink-soft"> · collected <strong className="text-emerald-800 font-semibold">{rupiah(collectedTotal)}</strong> of {rupiah(billedTotal)}</span>
              )}
            </h2>
          </div>
          {members.isFetching && !members.data ? (
            <Loading />
          ) : memberRows.length === 0 ? (
            <div className="p-3"><Empty text="No members yet." /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Name</th><th className="text-right">Attended</th><th className="text-right">Bill</th><th className="text-right">Paid</th><th className="text-right">Saved</th><th></th></tr>
              </thead>
              <tbody>
                {memberRows.map((m) => {
                  const paid = paidOf(m);
                  const commitDone = commitmentPaid(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="font-medium">{m.player_name}</span>
                        <span className={`block text-xs ${commitDone ? "text-green-700" : "text-amber-700"}`}>
                          {m.commitment_fee
                            ? (commitDone ? "Member price paid" : `Member price unpaid (${rupiah(m.commitment_fee)})`)
                            : "No member price"}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{m.attendance_count}×</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(m.total_bill)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(paid)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(m.benefit)}</td>
                      <td className="whitespace-nowrap text-right">
                        {!done && (
                          <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-pine to-pine-deep px-3 py-1 text-xs font-semibold text-paper hover:brightness-110 shadow-2xs transition-all"
                            title="Record member price payment"
                            onClick={() => openPay(m)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
                              <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
                              <circle cx="12" cy="12" r="2.6" />
                              <path d="M6.1 12h.01M17.9 12h.01" />
                            </svg>
                            Member price
                          </button>
                          <DeleteRowButton label="Delete" onClick={() => { setWithdrawFor(m); setWithdrawError(""); }} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
          {payFor && !done && (
            <ConfirmModal
              title={`Member price · ${payFor.player_name}`}
              body={
                <>
                  <Field label="Amount (Rp)">
                    <MoneyInput id="pay-amount" value={payAmount} onChange={setPayAmount} />
                  </Field>
                  <div className="mt-3">
                    <Field label="Note" hint="Optional. E.g. cash, transfer.">
                      <input id="pay-note" className="w-full" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                    </Field>
                  </div>
                  {payError && <p role="alert" className="mt-2 text-sm text-red-700">{payError}</p>}
                  <p className="mt-2 text-xs text-ink-faint">Visit payments are collected per session in Open Play. Use this form only for member price.</p>
                </>
              }
              confirmLabel={payState.isLoading ? "Saving…" : `Save ${rupiah(payAmount || 0)}`}
              cancelLabel="Cancel"
              busy={payState.isLoading}
              onConfirm={submitPayment}
              onCancel={() => setPayFor(null)}
            />
          )}
          {withdrawFor && !done && (
            <ConfirmModal
              title={`Delete ${withdrawFor.player_name} from this period?`}
              body={
                <>
                  <p>Membership and <strong>all their payments in this period are permanently deleted</strong>. Session attendance history stays. This cannot be undone.</p>
                  {withdrawError && <p role="alert" className="mt-2 text-sm text-red-700">{withdrawError}</p>}
                </>
              }
              confirmLabel={withdrawState.isLoading ? "Deleting…" : "Yes, delete"}
              busy={withdrawState.isLoading}
              onConfirm={confirmWithdraw}
              onCancel={() => setWithdrawFor(null)}
            />
          )}
          {!done && (
            <div className="space-y-2 border-t border-line p-3">
              <div className="flex gap-2">
                <label htmlFor="tambah-member" className="sr-only">Add member</label>
                <select id="tambah-member" className="min-w-0 flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">- Add member… -</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Btn disabled={!pick || addState.isLoading} onClick={submitMember}>Add</Btn>
              </div>
              <div className="flex gap-2">
                <label htmlFor="tambah-member-baru" className="sr-only">New member name</label>
                <input
                  id="tambah-member-baru"
                  className="min-w-0 flex-1"
                  placeholder="New member name…"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewMember(); }}
                />
                <Btn disabled={!newName.trim() || memberBusy} onClick={submitNewMember}>
                  {createState.isLoading ? "Saving…" : "Add new"}
                </Btn>
              </div>
              <p className="text-xs text-ink-faint">If the name is not in the list, type a new name and click Add new — it will be registered and added as a member right away.</p>
            </div>
          )}
        </section>
      </div>

      <MemberAttendanceMatrixSection periodId={id} periodName={s.period.name} />

      {(matrix.data?.rows.length ?? 0) > 0 && (
      <section aria-label="Shuttlecock use per player" className="mt-5 rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">
          Shuttlecocks per player · total {matrix.data?.total ?? 0} · avg {matrix.data?.avg_per_session ?? 0}/session
        </h2>
        <p className="border-b border-line bg-court/40 px-3 py-1.5 text-xs text-ink-soft">
          Detailed 2v2 matches only. Simple recap numbers stay in their own session panel.
        </p>
        {matrix.isFetching && !matrix.data ? (
          <Loading />
        ) : !matrix.data || matrix.data.rows.length === 0 ? (
          <div className="p-3"><Empty text="No match data in this period." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Player</th>
                  {matrix.data.dates.map((d) => (
                    <th key={d} className="text-right">{dateId(d)}</th>
                  ))}
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.data.rows.map((r) => (
                  <tr key={r.name}>
                    <td className="font-medium">{r.name}</td>
                    {(matrix.data?.dates ?? []).map((d) => (
                      <td key={d} className="text-right tabular-nums">{r.cells[d] ?? "–"}</td>
                    ))}
                    <td className="text-right font-semibold tabular-nums">{r.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
      )}
      {pendingComplete && (
        <ConfirmModal
          title="Complete this period?"
          body={
            <p>
              <strong>{s.period.name}</strong> will become read-only. Sessions, members, and money
              can no longer be changed afterwards. Are you sure?
            </p>
          }
          confirmLabel="Yes, complete"
          busy={completeState.isLoading}
          onConfirm={confirmComplete}
          onCancel={() => setPendingComplete(false)}
        />
      )}
      {pendingDelete && (
        <ConfirmModal
          title={forceArmed ? "Delete period and everything inside?" : "Delete this period?"}
          body={
            forceArmed ? (
              <>
                <p>
                  <strong>{s.period.name}</strong> has sessions, members, or money. Deleting it will{" "}
                  <strong>permanently hard-delete the period and its whole tree</strong>: all sessions with
                  matches, attendance, bills, payments, shuttlecock usage, memberships, and money records.
                </p>
                <p className="mt-2">This cannot be undone. Are you sure?</p>
              </>
            ) : (
              <p>
                Delete period <strong>{s.period.name}</strong>? This cannot be undone.
              </p>
            )
          }
          confirmLabel={forceArmed ? "Yes, delete everything" : "Yes, delete"}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => { setPendingDelete(false); setForceArmed(false); }}
        />
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "emerald" | "rose";
}) {
  return (
    <div className="px-3.5 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd
        className={`mt-1 text-base font-bold tabular-nums ${
          highlight === "emerald"
            ? "text-emerald-800"
            : highlight === "rose"
            ? "text-rose-700"
            : "text-ink"
        }`}
      >
        {value}
      </dd>
      {sub && <dd className="mt-0.5 text-xs text-ink-soft">{sub}</dd>}
    </div>
  );
}

async function copyTableImage(
  data: PeriodAttendanceMatrixResponse,
  periodName: string
): Promise<boolean> {
  const { sessions, rows, commitment_fee, member_contribution, total_lapangan_paid } = data;

  const feeLabel = commitment_fee >= 1000 && commitment_fee % 1000 === 0
    ? `LAPANGAN ${commitment_fee / 1000}K`
    : commitment_fee > 0
    ? `LAPANGAN ${rupiah(commitment_fee)}`
    : `LAPANGAN`;

  const scale = 2;
  const noColWidth = 50;
  const nameColWidth = 160;
  const lapanganColWidth = 140;
  const sessionColWidth = 140;

  const sessCount = Math.max(1, sessions.length);
  const totalColsWidth = noColWidth + nameColWidth + lapanganColWidth + sessCount * sessionColWidth;
  const padX = 24;
  const padY = 24;
  const bannerHeight = 70;
  const headerRowHeight = 40;
  const rowHeight = 32;
  const footerRowHeight = 38;

  const canvasWidth = totalColsWidth + padX * 2;
  const tableHeight = headerRowHeight + rows.length * rowHeight + footerRowHeight;
  const canvasHeight = padY * 2 + bannerHeight + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title Banner
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("PB KECEBONG — REKAP KAS KOK & LAPANGAN", padX, padY + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    `Period: ${periodName}  ·  Tarif Lapangan: ${feeLabel}  ·  Kas Kok: ${rupiah(member_contribution)}/pertemuan`,
    padX,
    padY + 44
  );

  const startX = padX;
  const startY = padY + bannerHeight;

  // Column X boundary coordinates
  const colXs: number[] = [
    startX,
    startX + noColWidth,
    startX + noColWidth + nameColWidth,
    startX + noColWidth + nameColWidth + lapanganColWidth,
  ];
  for (let i = 0; i < sessCount; i++) {
    colXs.push(colXs[colXs.length - 1] + sessionColWidth);
  }

  // Header Background
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(startX, startY, totalColsWidth, headerRowHeight);

  // Header Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";

  // NO
  ctx.textAlign = "center";
  ctx.fillText("NO", colXs[0] + noColWidth / 2, startY + headerRowHeight / 2);

  // LIST MEM
  ctx.textAlign = "left";
  ctx.fillText("LIST MEM", colXs[1] + 12, startY + headerRowHeight / 2);

  // LAPANGAN
  ctx.textAlign = "center";
  ctx.fillText(feeLabel, colXs[2] + lapanganColWidth / 2, startY + headerRowHeight / 2);

  // Sessions
  if (sessions.length === 0) {
    ctx.fillText("Belum ada pertemuan", colXs[3] + sessionColWidth / 2, startY + headerRowHeight / 2);
  } else {
    sessions.forEach((s, sIdx) => {
      ctx.fillText(`Kas Kok (${dateDmy(s.date)})`, colXs[3 + sIdx] + sessionColWidth / 2, startY + headerRowHeight / 2);
    });
  }

  // Header Vertical Lines (White for high contrast on dark blue)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + headerRowHeight);
    ctx.stroke();
  }

  // Header Bottom Border Line (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY + headerRowHeight);
  ctx.lineTo(startX + totalColsWidth, startY + headerRowHeight);
  ctx.stroke();

  // Rows
  let curY = startY + headerRowHeight;
  rows.forEach((r, idx) => {
    // Row background
    ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(startX, curY, totalColsWidth, rowHeight);

    // NO
    ctx.fillStyle = "#475569";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(idx + 1), colXs[0] + noColWidth / 2, curY + rowHeight / 2);

    // LIST MEM
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(r.player_name, colXs[1] + 12, curY + rowHeight / 2);

    // LAPANGAN Cell
    if (r.commitment_paid) {
      ctx.fillStyle = "#059669";
      ctx.fillRect(colXs[2] + 4, curY + 3, lapanganColWidth - 8, rowHeight - 6);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LUNAS", colXs[2] + lapanganColWidth / 2, curY + rowHeight / 2);
    } else {
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(colXs[2] + 4, curY + 3, lapanganColWidth - 8, rowHeight - 6);
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(r.commitment_amount_paid > 0 ? "KURANG" : "BELUM", colXs[2] + lapanganColWidth / 2, curY + rowHeight / 2);
    }

    // Sessions Attendance Cells
    if (sessions.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("—", colXs[3] + sessionColWidth / 2, curY + rowHeight / 2);
    } else {
      sessions.forEach((s, sIdx) => {
        const isPresent = r.attendances[s.id] === "PRESENT";
        const sessX = colXs[3 + sIdx];
        if (isPresent) {
          ctx.fillStyle = "#059669";
          ctx.fillRect(sessX + 4, curY + 3, sessionColWidth - 8, rowHeight - 6);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✓", sessX + sessionColWidth / 2, curY + rowHeight / 2);
        } else {
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(sessX + 4, curY + 3, sessionColWidth - 8, rowHeight - 6);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("TIDAK HADIR", sessX + sessionColWidth / 2, curY + rowHeight / 2);
        }
      });
    }

    // Row Bottom Border Line (Solid Black)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, curY + rowHeight);
    ctx.lineTo(startX + totalColsWidth, curY + rowHeight);
    ctx.stroke();

    // Column Separator Lines (Solid Black)
    for (const x of colXs) {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + rowHeight);
      ctx.stroke();
    }

    curY += rowHeight;
  });

  // Footer Row (TOTAL)
  ctx.fillStyle = "#fde047";
  ctx.fillRect(startX, curY, totalColsWidth, footerRowHeight);

  // Footer Top Border (Thick Black Line)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + totalColsWidth, curY);
  ctx.stroke();

  // Footer Bottom Border (Black Line)
  ctx.beginPath();
  ctx.moveTo(startX, curY + footerRowHeight);
  ctx.lineTo(startX + totalColsWidth, curY + footerRowHeight);
  ctx.stroke();

  // Footer Vertical Column Separator Lines (Solid Black)
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, curY);
    ctx.lineTo(x, curY + footerRowHeight);
    ctx.stroke();
  }

  // Footer Text
  ctx.fillStyle = "#000000";
  ctx.font = "900 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", colXs[1] + 12, curY + footerRowHeight / 2);

  // Total Lapangan
  ctx.textAlign = "center";
  ctx.fillText(rupiah(total_lapangan_paid), colXs[2] + lapanganColWidth / 2, curY + footerRowHeight / 2);

  // Total each session
  if (sessions.length === 0) {
    ctx.fillText("—", colXs[3] + sessionColWidth / 2, curY + footerRowHeight / 2);
  } else {
    sessions.forEach((s, sIdx) => {
      ctx.fillText(rupiah(s.total_kas_kok), colXs[3 + sIdx] + sessionColWidth / 2, curY + footerRowHeight / 2);
    });
  }

  // Outer Border (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, totalColsWidth, tableHeight);

  return new Promise<boolean>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          resolve(true);
        } else {
          throw new Error("Clipboard API not supported");
        }
      } catch (err) {
        console.warn("ClipboardItem write failed, fallback to download:", err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rekap-kas-kok-${periodName.toLowerCase().replace(/\s+/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(true);
      }
    }, "image/png");
  });
}

async function copyNonMemberTableImage(
  items: PeriodAttendanceMatrixNonMember[],
  sessionDate: string,
  fee: number,
  periodName: string
): Promise<boolean> {
  const feeLabel = fee >= 1000 && fee % 1000 === 0 ? `INCLUDE KOK ${fee / 1000}K` : `INCLUDE KOK ${rupiah(fee)}`;

  const scale = 2;
  const noColWidth = 50;
  const nameColWidth = 180;
  const feeColWidth = 160;
  const noteColWidth = 140;

  const totalColsWidth = noColWidth + nameColWidth + feeColWidth + noteColWidth;
  const padX = 24;
  const padY = 24;
  const bannerHeight = 70;
  const headerRowHeight = 40;
  const rowHeight = 32;
  const footerRowHeight = 38;

  const canvasWidth = totalColsWidth + padX * 2;
  const tableHeight = headerRowHeight + items.length * rowHeight + footerRowHeight;
  const canvasHeight = padY * 2 + bannerHeight + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title Banner
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("PB KECEBONG — LIST NON MEMBER", padX, padY + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    `Period: ${periodName}  ·  Pertemuan: ${dateDmy(sessionDate)}  ·  Tarif: ${feeLabel}`,
    padX,
    padY + 44
  );

  const startX = padX;
  const startY = padY + bannerHeight;

  const colXs = [
    startX,
    startX + noColWidth,
    startX + noColWidth + nameColWidth,
    startX + noColWidth + nameColWidth + feeColWidth,
    startX + totalColsWidth,
  ];

  // Header Background
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(startX, startY, totalColsWidth, headerRowHeight);

  // Header Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";

  // NO
  ctx.textAlign = "center";
  ctx.fillText("NO", colXs[0] + noColWidth / 2, startY + headerRowHeight / 2);

  // LIST NON MEMBER
  ctx.textAlign = "left";
  ctx.fillText("LIST NON MEMBER", colXs[1] + 12, startY + headerRowHeight / 2);

  // INCLUDE KOK
  ctx.textAlign = "center";
  ctx.fillText(feeLabel, colXs[2] + feeColWidth / 2, startY + headerRowHeight / 2);

  // NOTE
  ctx.textAlign = "left";
  ctx.fillText("NOTE", colXs[3] + 12, startY + headerRowHeight / 2);

  // Header Vertical Lines (White for high contrast against dark blue header)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + headerRowHeight);
    ctx.stroke();
  }

  // Header Bottom Border Line (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY + headerRowHeight);
  ctx.lineTo(startX + totalColsWidth, startY + headerRowHeight);
  ctx.stroke();

  // Body Rows
  let curY = startY + headerRowHeight;
  items.forEach((nm, idx) => {
    // Row background (white or subtle alternating)
    ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(startX, curY, totalColsWidth, rowHeight);

    // Fee cell background: bright green #00e600 filling the entire cell
    ctx.fillStyle = "#00e600";
    ctx.fillRect(colXs[2], curY, feeColWidth, rowHeight);

    // Text: NO
    ctx.fillStyle = "#475569";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(idx + 1), colXs[0] + noColWidth / 2, curY + rowHeight / 2);

    // Text: LIST NON MEMBER
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(nm.player_name, colXs[1] + 12, curY + rowHeight / 2);

    // Text: FEE
    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(nm.fee), colXs[2] + feeColWidth / 2, curY + rowHeight / 2);

    // Text: NOTE
    ctx.fillStyle = "#475569";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(nm.note || "", colXs[3] + 12, curY + rowHeight / 2);

    // Row Bottom Border Line (Solid Black)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, curY + rowHeight);
    ctx.lineTo(startX + totalColsWidth, curY + rowHeight);
    ctx.stroke();

    // Column Separator Lines (Solid Black)
    for (const x of colXs) {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + rowHeight);
      ctx.stroke();
    }

    curY += rowHeight;
  });

  // Footer (TOTAL)
  const total = items.reduce((a, b) => a + b.fee, 0);
  ctx.fillStyle = "#fde047";
  ctx.fillRect(startX, curY, totalColsWidth, footerRowHeight);

  // Footer Top Border (Thick Black Line)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + totalColsWidth, curY);
  ctx.stroke();

  // Footer Bottom Border (Black Line)
  ctx.beginPath();
  ctx.moveTo(startX, curY + footerRowHeight);
  ctx.lineTo(startX + totalColsWidth, curY + footerRowHeight);
  ctx.stroke();

  // Footer Vertical Column Separator Lines (Solid Black)
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, curY);
    ctx.lineTo(x, curY + footerRowHeight);
    ctx.stroke();
  }

  // Footer Text
  ctx.fillStyle = "#000000";
  ctx.font = "900 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", colXs[1] + 12, curY + footerRowHeight / 2);

  ctx.textAlign = "center";
  ctx.fillText(rupiah(total), colXs[2] + feeColWidth / 2, curY + footerRowHeight / 2);

  // Outer Border (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, totalColsWidth, tableHeight);

  return new Promise<boolean>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          resolve(true);
        } else {
          throw new Error("Clipboard API not supported");
        }
      } catch (err) {
        console.warn("ClipboardItem write failed, fallback to download:", err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rekap-non-member-${dateDmy(sessionDate).replace(/\//g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(true);
      }
    }, "image/png");
  });
}

function MemberAttendanceMatrixSection({ periodId, periodName }: { periodId: string; periodName: string }) {
  const { data, isFetching, isError, refetch } = usePeriodAttendanceMatrixQuery(periodId);
  const [activeTab, setActiveTab] = useState<"member" | "non_member">("member");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);

  useEffect(() => {
    if (data?.sessions && data.sessions.length > 0 && !selectedSessionId) {
      const sessWithNonMember = data.sessions.find((s) =>
        (data.non_members ?? []).some((nm) => nm.session_id === s.id)
      );
      setSelectedSessionId(sessWithNonMember ? sessWithNonMember.id : data.sessions[0].id);
    }
  }, [data, selectedSessionId]);

  if (isFetching && !data) return <Loading />;
  if (isError || !data) {
    return (
      <section aria-label="Rekap Kas Kok & Lapangan Member" className="mt-5 rounded-xl border border-line bg-white shadow-card p-4">
        <h2 className="text-sm font-semibold mb-2">Rekap Kehadiran & Kas Kok Member</h2>
        <ErrorBox
          message="Belum dapat memuat rekap matrix. Pastikan server backend Go telah di-restart agar endpoint baru aktif."
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  const { sessions, rows, commitment_fee, member_contribution, total_lapangan_paid } = data;

  const feeLabel = commitment_fee >= 1000 && commitment_fee % 1000 === 0
    ? `LAPANGAN ${commitment_fee / 1000}K`
    : commitment_fee > 0
    ? `LAPANGAN ${rupiah(commitment_fee)}`
    : `LAPANGAN`;

  const nonMemberFeeLabel = data.non_member_fee >= 1000 && data.non_member_fee % 1000 === 0
    ? `INCLUDE KOK ${data.non_member_fee / 1000}K`
    : `INCLUDE KOK ${rupiah(data.non_member_fee || 25000)}`;

  const currentSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  const filteredNonMembers = (data.non_members ?? []).filter(
    (nm) => nm.session_id === (currentSession?.id ?? "")
  );
  const totalNonMember = filteredNonMembers.reduce((a, b) => a + b.fee, 0);

  if (rows.length === 0 && (data.non_members ?? []).length === 0) {
    return (
      <section aria-label="Rekap Kas Kok & Lapangan" className="mt-5 rounded-xl border border-line bg-white shadow-card p-4">
        <h2 className="text-sm font-semibold mb-1">Rekap Kehadiran & Kas Kok</h2>
        <p className="text-xs text-ink-faint mb-3">Tabel otomatis bertambah kolomnya setiap ada pertemuan/sesi baru di period ini.</p>
        <Empty text="Belum ada member atau pemain terdaftar di period ini. Tambahkan member di atas untuk mulai melihat rekap kas kok & lapangan." />
      </section>
    );
  }

  async function handleCopyMemberImage() {
    if (!data || copyingImage) return;
    setCopyingImage(true);
    try {
      const ok = await copyTableImage(data, periodName);
      if (ok) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (e) {
      console.error("Could not copy table image:", e);
    } finally {
      setCopyingImage(false);
    }
  }

  async function handleCopyNonMemberImage() {
    if (!currentSession || filteredNonMembers.length === 0 || copyingImage) return;
    setCopyingImage(true);
    try {
      const ok = await copyNonMemberTableImage(
        filteredNonMembers,
        currentSession.date,
        data?.non_member_fee || 25000,
        periodName
      );
      if (ok) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (e) {
      console.error("Could not copy non-member image:", e);
    } finally {
      setCopyingImage(false);
    }
  }

  function handleCopyMemberWhatsApp() {
    if (!data) return;
    let text = `*REKAP KAS KOK & LAPANGAN*\n`;
    text += `*Period:* ${periodName}\n`;
    text += `*Tarif Lapangan:* ${feeLabel} | *Kas Kok:* ${rupiah(member_contribution)}/kehadiran\n`;
    text += `──────────────────────\n`;

    rows.forEach((r, idx) => {
      const lap = r.commitment_paid ? "LUNAS" : "BELUM";
      let rowText = `${idx + 1}. *${r.player_name}* [Lap: ${lap}]`;
      sessions.forEach((s) => {
        const hadir = r.attendances[s.id] === "PRESENT";
        rowText += ` | ${dateDmy(s.date).slice(0, 5)}: ${hadir ? "✓" : "TH"}`;
      });
      text += rowText + "\n";
    });

    text += `──────────────────────\n`;
    text += `*TOTAL:*\n`;
    text += `• Lapangan: ${rupiah(total_lapangan_paid)}\n`;
    sessions.forEach((s) => {
      text += `• Kas Kok (${dateDmy(s.date)}): ${rupiah(s.total_kas_kok)} (${s.present_count} hadir)\n`;
    });
    text += `• Total Kas Kok: ${rupiah(data.total_kas_kok)}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleCopyNonMemberWhatsApp() {
    if (!currentSession) return;
    let text = `*LIST NON MEMBER - PB KECEBONG*\n`;
    text += `*Period:* ${periodName}\n`;
    text += `*Pertemuan:* ${dateDmy(currentSession.date)}\n`;
    text += `*Tarif:* ${nonMemberFeeLabel}\n`;
    text += `──────────────────────\n`;

    filteredNonMembers.forEach((nm, idx) => {
      text += `${idx + 1}. *${nm.player_name}* - ${rupiah(nm.fee)}${nm.note ? ` (${nm.note})` : ""}\n`;
    });

    text += `──────────────────────\n`;
    text += `*TOTAL: ${rupiah(totalNonMember)}* (${filteredNonMembers.length} orang)\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleExportMemberCSV() {
    if (!data) return;
    const headers = ["NO", "LIST MEM", feeLabel, ...sessions.map((s) => `Kas Kok (${dateDmy(s.date)})`)];
    const csvRows: string[][] = [];

    rows.forEach((r, idx) => {
      const lap = r.commitment_paid ? "LUNAS" : "BELUM";
      const sessionCells = sessions.map((s) => (r.attendances[s.id] === "PRESENT" ? "HADIR" : "TIDAK HADIR"));
      csvRows.push([String(idx + 1), r.player_name, lap, ...sessionCells]);
    });

    const totalRow = ["", "TOTAL", String(total_lapangan_paid), ...sessions.map((s) => String(s.total_kas_kok))];
    csvRows.push(totalRow);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekap-member-${periodName.toLowerCase().replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportNonMemberCSV() {
    if (!currentSession) return;
    const headers = ["NO", "LIST NON MEMBER", nonMemberFeeLabel, "NOTE"];
    const csvRows: string[][] = [];

    filteredNonMembers.forEach((nm, idx) => {
      csvRows.push([String(idx + 1), nm.player_name, String(nm.fee), nm.note || ""]);
    });

    csvRows.push(["", "TOTAL", String(totalNonMember), ""]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekap-non-member-${dateDmy(currentSession.date).replace(/\//g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section aria-label="Rekap Kas Kok & Lapangan" className="mt-5 rounded-xl border border-line bg-white shadow-card overflow-hidden">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 bg-gradient-to-r from-court/75 via-court/40 to-white">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">
              {activeTab === "member" ? "Rekap Kehadiran & Kas Kok Member" : "Rekap List Non-Member (Tamu)"}
            </h2>
            <span className="text-xs font-medium text-ink-soft">
              · {activeTab === "member" ? `${rows.length} member · ${sessions.length} pertemuan` : `${filteredNonMembers.length} non-member pada pertemuan ini`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">
            {activeTab === "member"
              ? `Tarif Lapangan ${feeLabel} · Kas Kok ${rupiah(member_contribution)}/pertemuan · Kolom otomatis bertambah setiap ada pertemuan baru.`
              : `Tarif ${nonMemberFeeLabel} · Filter per pertemuan agar tidak menumpuk semua tanggal.`}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/90 border border-line p-1 rounded-lg shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("member")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "member"
                ? "bg-gradient-to-r from-pine to-pine-deep text-paper shadow-2xs"
                : "text-ink-soft hover:text-ink hover:bg-court/40"
            }`}
          >
            🏸 Member ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("non_member")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "non_member"
                ? "bg-gradient-to-r from-pine to-pine-deep text-paper shadow-2xs"
                : "text-ink-soft hover:text-ink hover:bg-court/40"
            }`}
          >
            👥 Non-Member ({(data.non_members ?? []).length})
          </button>
        </div>
      </div>

      {activeTab === "non_member" ? (
        <div>
          {/* Non-Member Session Filter & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-court/40 via-court/20 to-white border-b border-line">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-sesi-nonmember" className="text-xs font-semibold text-ink whitespace-nowrap">
                Pilih Pertemuan:
              </label>
              <select
                id="filter-sesi-nonmember"
                className="text-xs bg-white border border-line rounded-md px-2.5 py-1.5 font-medium text-ink focus:border-pine focus:outline-hidden"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessions.map((s, idx) => {
                  const count = (data.non_members ?? []).filter((nm) => nm.session_id === s.id).length;
                  return (
                    <option key={s.id} value={s.id}>
                      Pertemuan {idx + 1} · {dateDmy(s.date)} ({count} non-member)
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Btn
                variant="plain"
                onClick={handleCopyNonMemberImage}
                disabled={copyingImage || filteredNonMembers.length === 0}
                className="border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-950 hover:from-emerald-100 hover:to-emerald-50 font-semibold shadow-2xs"
                title="Salin gambar tabel non-member ke clipboard (bisa langsung Ctrl+V di WhatsApp)"
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                    <path d="M21 15l-5-5L5 21" strokeWidth="2" />
                  </svg>
                  {copiedImage ? "✓ Gambar Tersalin!" : copyingImage ? "Menyalin…" : "Salin Gambar (WA)"}
                </span>
              </Btn>
              <Btn
                variant="plain"
                onClick={handleCopyNonMemberWhatsApp}
                disabled={filteredNonMembers.length === 0}
                title="Salin format ringkasan teks untuk WhatsApp"
              >
                {copied ? "✓ Teks Tersalin!" : "Salin Teks WA"}
              </Btn>
              <Btn
                variant="plain"
                onClick={handleExportNonMemberCSV}
                disabled={filteredNonMembers.length === 0}
                title="Download format CSV Excel"
              >
                Download CSV
              </Btn>
            </div>
          </div>

          {/* Non-Member Table */}
          {filteredNonMembers.length === 0 ? (
            <div className="p-6">
              <Empty text={`Tidak ada non-member yang tercatat hadir pada pertemuan ${currentSession ? dateDmy(currentSession.date) : ""}.`} />
            </div>
          ) : (
            <div className="overflow-x-auto max-w-2xl mx-auto sm:mx-0 p-3">
              <table className="w-full text-xs border-collapse border border-neutral-400 shadow-xs">
                <thead className="bg-[#1e3a8a] text-white tracking-wider uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 border border-white/40 w-12 text-center">NO</th>
                    <th className="py-2.5 px-3 border border-white/40 text-left min-w-[160px]">LIST NON MEMBER</th>
                    <th className="py-2.5 px-3 border border-white/40 text-center min-w-[150px] bg-blue-900/80">
                      {nonMemberFeeLabel}
                    </th>
                    <th className="py-2.5 px-3 border border-white/40 text-left min-w-[120px]">NOTE</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredNonMembers.map((nm, idx) => (
                    <tr key={nm.player_id} className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}>
                      <td className="py-2 px-3 border border-neutral-400 font-medium text-neutral-600 text-center">{idx + 1}</td>
                      <td className="py-2 px-3 border border-neutral-400 text-left font-semibold text-neutral-900">{nm.player_name}</td>
                      <td className="py-2 px-3 border border-neutral-400 bg-[#00e600] text-black font-bold text-center">
                        {nm.fee}
                      </td>
                      <td className="py-2 px-3 border border-neutral-400 text-left text-neutral-600 text-[11px]">{nm.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold border-t-2 border-neutral-900 bg-yellow-300 text-neutral-900 text-sm">
                  <tr>
                    <td className="py-2.5 px-3 border border-neutral-400"></td>
                    <td className="py-2.5 px-3 border border-neutral-400 text-left font-black tracking-wider">TOTAL</td>
                    <td className="py-2.5 px-3 border border-neutral-400 font-black text-center whitespace-nowrap">
                      {rupiah(totalNonMember)}
                    </td>
                    <td className="py-2.5 px-3 border border-neutral-400"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Member Table */
        <div>
          <div className="flex justify-end gap-2 p-3.5 bg-gradient-to-r from-court/40 via-court/20 to-white border-b border-line">
            <Btn
              variant="plain"
              onClick={handleCopyMemberImage}
              disabled={copyingImage}
              className="border-emerald-300/80 bg-gradient-to-r from-emerald-50 to-white text-emerald-950 hover:from-emerald-100 hover:to-emerald-50 font-semibold shadow-2xs"
              title="Salin gambar tabel ke clipboard (bisa langsung Ctrl+V di WhatsApp)"
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                  <path d="M21 15l-5-5L5 21" strokeWidth="2" />
                </svg>
                {copiedImage ? "✓ Gambar Tersalin!" : copyingImage ? "Menyalin…" : "Salin Gambar (WA)"}
              </span>
            </Btn>
            <Btn variant="plain" onClick={handleCopyMemberWhatsApp} title="Salin format ringkasan teks untuk WhatsApp">
              {copied ? "✓ Teks Tersalin!" : "Salin Teks WA"}
            </Btn>
            <Btn variant="plain" onClick={handleExportMemberCSV} title="Download format CSV Excel">
              Download CSV
            </Btn>
          </div>

          <div className="overflow-x-auto p-3">
            <table className="w-full text-xs text-center border-collapse border border-neutral-400 shadow-xs">
              <thead className="bg-[#1e3a8a] text-white tracking-wider uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 border border-white/40 w-12 text-center">NO</th>
                  <th className="py-2.5 px-3 border border-white/40 text-left min-w-[130px]">LIST MEM</th>
                  <th className="py-2.5 px-3 border border-white/40 min-w-[130px] whitespace-nowrap bg-blue-900/80">
                    {feeLabel}
                  </th>
                  {sessions.map((s) => (
                    <th key={s.id} className="py-2.5 px-3 border border-white/40 min-w-[140px] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Kas Kok ({dateDmy(s.date)})</span>
                        <OpenLink to={`/mabar/${s.id}`} />
                      </div>
                    </th>
                  ))}
                  {sessions.length === 0 && (
                    <th className="py-2.5 px-3 border border-white/40 text-xs italic font-normal text-blue-200">
                      Belum ada pertemuan
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((r, idx) => (
                  <tr key={r.player_id} className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}>
                    <td className="py-2 px-3 border border-neutral-400 font-medium text-neutral-600">{idx + 1}</td>
                    <td className="py-2 px-3 border border-neutral-400 text-left font-semibold text-neutral-900">{r.player_name}</td>
                    <td className="py-2 px-3 border border-neutral-400">
                      {r.commitment_paid ? (
                        <span className="inline-block w-full py-1 font-bold text-xs bg-emerald-600 text-white rounded shadow-sm">
                          LUNAS
                        </span>
                      ) : (
                        <span className="inline-block w-full py-1 font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300 rounded">
                          {r.commitment_amount_paid > 0
                            ? `Kurang ${rupiah(Math.max(0, (r.commitment_fee || commitment_fee) - r.commitment_amount_paid))}`
                            : "BELUM"}
                        </span>
                      )}
                    </td>
                    {sessions.map((s) => {
                      const status = r.attendances[s.id];
                      const isPresent = status === "PRESENT";
                      return isPresent ? (
                        <td
                          key={s.id}
                          className="py-2 px-3 border border-neutral-400 bg-emerald-600 text-white font-bold text-sm"
                          title={`${r.player_name}: Hadir`}
                        >
                          ✓
                        </td>
                      ) : (
                        <td
                          key={s.id}
                          className="py-2 px-3 border border-neutral-400 bg-red-600 text-white font-bold text-[11px] whitespace-nowrap"
                          title={`${r.player_name}: ${status ? status : "Tidak Hadir"}`}
                        >
                          TIDAK HADIR
                        </td>
                      );
                    })}
                    {sessions.length === 0 && (
                      <td className="py-2 px-3 border border-neutral-400 text-neutral-400 italic">
                        —
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-neutral-900 bg-yellow-300 text-neutral-900">
                <tr className="text-sm">
                  <td className="py-2.5 px-3 border border-neutral-400"></td>
                  <td className="py-2.5 px-3 border border-neutral-400 text-left font-black tracking-wider">TOTAL</td>
                  <td className="py-2.5 px-3 border border-neutral-400 font-black whitespace-nowrap">
                    {rupiah(total_lapangan_paid)}
                  </td>
                  {sessions.map((s) => (
                    <td key={s.id} className="py-2.5 px-3 border border-neutral-400 font-black whitespace-nowrap">
                      {rupiah(s.total_kas_kok)}
                    </td>
                  ))}
                  {sessions.length === 0 && (
                    <td className="py-2.5 px-3 border border-neutral-400 text-neutral-600">
                      —
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

