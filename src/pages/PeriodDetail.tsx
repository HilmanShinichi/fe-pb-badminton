import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import {
  useAddMemberMutation,
  useCompletePeriodMutation,
  useCreatePlayerMutation,
  useCreateRevenueMutation,
  useDeletePeriodMutation,
  usePeriodMembersQuery,
  usePeriodSessionsQuery,
  usePeriodSummaryQuery,
  usePlayersAllQuery,
  useSessionBreakdownQuery,
  useShuttlecockMatrixQuery,
  useUpdatePeriodMutation,
} from "../store/services";
import { dateId, rupiah } from "../format";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import type { Membership } from "../types";

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

      <section aria-label="Period projection" className="mb-5 rounded-xl border border-pine bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
          <h2 className="text-sm font-semibold">
            Period projection · {s.member_count} members · {proj.sessions} sessions
          </h2>
          {!done && (
            <Btn variant="plain" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close settings" : "Edit period"}
            </Btn>
          )}
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
          <Cell label="Profit full" value={rupiah(proj.profit_full)} sub={`${proj.status_full} · full attendance`} />
            <Cell label="Revenue full" value={rupiah(proj.revenue_full)} sub={`Member price ${rupiah(s.commitment_total)}`} />
          <Cell label="Projected cost" value={rupiah(proj.operating_cost)} sub={`Courts ${rupiah(proj.venue_total)} · Shuttles ${rupiah(proj.shuttle_cost)}`} />
          <Cell label="Projected shuttles" value={`${proj.shuttle_units} pcs`} sub={`${proj.shuttle_per_session}/session · ${s.shuttlecock_used} used`} />
        </dl>
        <dl className="grid grid-cols-2 divide-x divide-line border-t border-line sm:grid-cols-4">
          <Cell label="Billed so far" value={rupiah(proj.revenue_billed)} sub={`${s.member_present} member visits · ${s.non_member_present} non-member`} />
          <Cell label="Running profit" value={rupiah(proj.profit_billed)} sub="Billed − cost to date" />
          <Cell label="Actual cash" value={rupiah(s.cash_flow)} sub={`In ${rupiah(s.cash_in)} · Out ${rupiah(s.cash_out)}`} />
          <Cell label="Actual profit" value={rupiah(s.operating_profit)} sub={`Revenue ${rupiah(s.total_revenue)} · Cost ${rupiah(s.operating_cost)}`} />
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

      <section aria-label="Period finances" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
          <Cell label="Operating profit" value={rupiah(s.operating_profit)} sub={`${s.status === "PROFIT" ? "Profit" : s.status === "LOSS" ? "Loss" : "Break-even"} · avg ${rupiah(s.avg_profit_per_session)}/session`} />
          <Cell label="Revenue" value={rupiah(s.total_revenue)} sub={`Cash in ${rupiah(s.cash_in)}`} />
          <Cell label="Operating cost" value={rupiah(s.operating_cost)} sub={`Courts ${rupiah(s.total_venue_cost)} · Shuttles ${rupiah(s.shuttlecock_usage_cost)}`} />
          <Cell label="Cash flow" value={rupiah(s.cash_flow)} sub={`Out ${rupiah(s.cash_out)} · stock ${s.shuttlecock_stock} pcs`} />
        </dl>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-label="Members" className="h-fit rounded-xl border border-line bg-white shadow-card">
          <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">
            Members · {memberRows.length}
            {memberRows.length > 0 && (
              <span className="font-normal text-ink-soft"> · collected {rupiah(collectedTotal)} of {rupiah(billedTotal)}</span>
            )}
          </h2>
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
                      <td className="text-right">
                        {!done && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-pine px-3 py-1 text-xs font-semibold text-paper hover:bg-pine-deep"
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
            <div className="space-y-2 border-t border-line bg-court/40 p-3">
              <p className="text-sm font-semibold">Record member price payment · {payFor.player_name}</p>
              <Field label="Amount (Rp)">
                <MoneyInput id="pay-amount" value={payAmount} onChange={setPayAmount} />
              </Field>
              <Field label="Note" hint="Optional. E.g. cash, transfer.">
                <input id="pay-note" className="w-full" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
              </Field>
              {payError && <p role="alert" className="text-sm text-red-700">{payError}</p>}
              <div className="flex items-center gap-2">
                <Btn disabled={!payAmount || payAmount <= 0 || payState.isLoading} onClick={submitPayment}>
                  {payState.isLoading ? "Saving…" : `Save ${rupiah(payAmount || 0)}`}
                </Btn>
                <button type="button" className="text-sm underline" onClick={() => setPayFor(null)}>
                  Cancel
                </button>
              </div>
              <p className="text-xs text-ink-faint">Visit payments are collected per session in Open Play (Cash/QRIS/BCA). Use this form only for member price.</p>
            </div>
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

        <section aria-label="Per session" className="h-fit rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">Per session · {heldSessions.length} of {plannedSessions} held</h2>
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
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-court"
              role="progressbar"
              aria-valuenow={heldSessions.length}
              aria-valuemin={0}
              aria-valuemax={plannedSessions}
              aria-label="Sessions held"
            >
              <div className="h-full rounded-full bg-pine" style={{ width: `${progressPct}%` }} />
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
      </div>

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

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-ink-faint">{sub}</dd>}
    </div>
  );
}
