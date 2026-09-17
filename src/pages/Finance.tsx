import { useState } from "react";
import { ApiError } from "../store/baseApi";
import {
  useCreateExpenseMutation,
  useCreateRevenueMutation,
  useFinanceSummaryQuery,
  useFinanceTxQuery,
  useMabarListQuery,
  usePeriodsQuery,
} from "../store/services";
import { dateId, rupiah } from "../format";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, MoneyInput, PageHead } from "../ui";

const REVENUE_SOURCES = ["COMMITMENT_FEE", "ATTENDANCE_CONTRIBUTION", "NON_MEMBER_FEE", "DAILY_EVENT_CONTRIBUTION", "OTHER"];
const EXPENSE_CATEGORIES = ["VENUE", "SHUTTLECOCK_PURCHASE", "EQUIPMENT", "REFUND", "OTHER"];

export function FinancePage() {
  const [periodId, setPeriodId] = useState("");
  const qs = periodId ? `?period_id=${periodId}` : "";
  const summary = useFinanceSummaryQuery(qs);
  const tx = useFinanceTxQuery();
  const periods = usePeriodsQuery();
  const sessions = useMabarListQuery("");

  const [rev, setRev] = useState({ source: "OTHER", amount: "", session_id: "", note: "" });
  const [revError, setRevError] = useState("");
  const [exp, setExp] = useState({ category: "VENUE", amount: "", session_id: "", note: "" });
  const [expError, setExpError] = useState("");
  const [createRevenue, revState] = useCreateRevenueMutation();
  const [createExpense, expState] = useCreateExpenseMutation();

  async function submitRevenue() {
    try {
      await createRevenue({
        source: rev.source,
        amount: Number(rev.amount),
        session_id: rev.session_id || null,
        period_id: periodId || null,
        note: rev.note.trim() || null,
      }).unwrap();
      setRev({ ...rev, amount: "", note: "" });
      setRevError("");
    } catch (e) {
      setRevError(e instanceof ApiError ? e.message : "Could not save revenue.");
    }
  }

  async function submitExpense() {
    try {
      await createExpense({
        category: exp.category,
        amount: Number(exp.amount),
        session_id: exp.session_id || null,
        period_id: periodId || null,
        note: exp.note.trim() || null,
      }).unwrap();
      setExp({ ...exp, amount: "", note: "" });
      setExpError("");
    } catch (e) {
      setExpError(e instanceof ApiError ? e.message : "Could not save expense.");
    }
  }

  const s = summary.data;

  return (
    <div>
      <PageHead
        title="Finance"
        sub="Revenue, expenses, operating profit, and cash flow."
        right={
          <select aria-label="Filter by period" value={periodId} onChange={(e) => setPeriodId(e.target.value)}>
            <option value="">All periods</option>
            {(periods.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        }
      />
      {summary.isFetching && !s ? (
        <Loading />
      ) : summary.isError || !s ? (
        <ErrorBox message="Could not load summary." onRetry={() => summary.refetch()} />
      ) : (
        <section aria-label="Financial summary" className="mb-5 rounded-xl border border-line bg-white shadow-card">
          <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
            <Cell label="Operating profit" value={rupiah(s.operating_profit)} sub={`Cost ${rupiah(s.operating_cost)}`} />
            <Cell label="Revenue" value={rupiah(s.total_revenue)} sub={`Cash in ${rupiah(s.cash_in)}`} />
            <Cell label="Cash flow" value={rupiah(s.cash_flow)} sub={`Out ${rupiah(s.cash_out)}`} />
            <Cell label="Shuttlecock usage" value={`${s.shuttlecock_used} pcs`} sub={`Cost ${rupiah(s.shuttlecock_usage_cost)}`} />
          </dl>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-label="Record revenue" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Record revenue</h2>
          <div className="space-y-3">
            <Field label="Source">
              <select id="sumber" className="w-full" value={rev.source} onChange={(e) => setRev({ ...rev, source: e.target.value })}>
                {REVENUE_SOURCES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (Rp)">
              <MoneyInput id="nominal-masuk" value={Number(rev.amount) || 0} onChange={(n) => setRev({ ...rev, amount: n ? String(n) : "" })} />
            </Field>
            <Field label="Related session" hint="Optional.">
              <select id="sesi-masuk" className="w-full" value={rev.session_id} onChange={(e) => setRev({ ...rev, session_id: e.target.value })}>
                <option value="">- No session -</option>
                {(sessions.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{dateId(m.date)} · {m.type}</option>
                ))}
              </select>
            </Field>
            {revError && <p role="alert" className="text-sm text-red-700">{revError}</p>}
            <Btn disabled={!Number(rev.amount) || revState.isLoading} onClick={submitRevenue}>
              {revState.isLoading ? "Saving…" : "Save revenue"}
            </Btn>
          </div>
        </section>

        <section aria-label="Record expense" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Record expense</h2>
          <div className="space-y-3">
            <Field label="Category">
              <select id="kategori" className="w-full" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (Rp)">
              <MoneyInput id="nominal-keluar" value={Number(exp.amount) || 0} onChange={(n) => setExp({ ...exp, amount: n ? String(n) : "" })} />
            </Field>
            <Field label="Related session" hint="Optional.">
              <select id="sesi-keluar" className="w-full" value={exp.session_id} onChange={(e) => setExp({ ...exp, session_id: e.target.value })}>
                <option value="">- No session -</option>
                {(sessions.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{dateId(m.date)} · {m.type}</option>
                ))}
              </select>
            </Field>
            {expError && <p role="alert" className="text-sm text-red-700">{expError}</p>}
            <Btn disabled={!Number(exp.amount) || expState.isLoading} onClick={submitExpense}>
              {expState.isLoading ? "Saving…" : "Save expense"}
            </Btn>
          </div>
        </section>
      </div>

      <section aria-label="Transactions" className="mt-5 rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">Recent transactions</h2>
        {tx.isFetching && !tx.data ? (
          <Loading />
        ) : (tx.data ?? []).length === 0 ? (
          <div className="p-3"><Empty text="No transactions yet." /></div>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Date</th><th>Type</th><th>Category</th><th className="text-right">Amount</th><th>Note</th></tr>
            </thead>
            <tbody>
              {(tx.data ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap">{dateId(t.occurred_at)}</td>
                  <td><Badge status={t.kind} /></td>
                  <td>{t.category}{t.player_name ? ` · ${t.player_name}` : ""}</td>
                  <td className="text-right tabular-nums">{rupiah(t.amount)}</td>
                  <td>{t.note ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
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
