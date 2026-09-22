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
import { useI18n } from "../i18n";

const REVENUE_SOURCES = ["COMMITMENT_FEE", "ATTENDANCE_CONTRIBUTION", "NON_MEMBER_FEE", "DAILY_EVENT_CONTRIBUTION", "OTHER"];
const EXPENSE_CATEGORIES = ["VENUE", "SHUTTLECOCK_PURCHASE", "EQUIPMENT", "REFUND", "OTHER"];

export function FinancePage() {
  const { t, lang } = useI18n();
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
      setRevError(e instanceof ApiError ? e.message : t("finance.errorSaveRevenue"));
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
      setExpError(e instanceof ApiError ? e.message : t("finance.errorSaveExpense"));
    }
  }

  const s = summary.data;

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHead
        title={t("finance.pageTitle")}
        sub={t("finance.pageSubtitle")}
        right={
          <select
            aria-label={t("finance.filterPeriodLabel")}
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs focus:border-pine"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          >
            <option value="">{t("finance.filterAllPeriods")}</option>
            {(periods.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        }
      />

      {/* Financial Summary */}
      {summary.isFetching && !s ? (
        <Loading />
      ) : summary.isError || !s ? (
        <ErrorBox message={t("finance.errorLoadSummary")} onRetry={() => summary.refetch()} />
      ) : (
        <section aria-label="Financial summary" className="rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
          <dl className="grid grid-cols-1 divide-y sm:divide-y-0 sm:grid-cols-2 lg:grid-cols-4 sm:divide-x divide-line">
            <Cell
              label={t("finance.operatingProfit")}
              value={rupiah(s.operating_profit)}
              sub={t("finance.costSub", { cost: rupiah(s.operating_cost) })}
              valueClass={s.operating_profit >= 0 ? "text-emerald-700" : "text-rose-700"}
            />
            <Cell
              label={t("finance.totalRevenue")}
              value={rupiah(s.total_revenue)}
              sub={t("finance.cashInSub", { in: rupiah(s.cash_in) })}
            />
            <Cell
              label={t("finance.cashFlow")}
              value={rupiah(s.cash_flow)}
              sub={t("finance.cashOutSub", { out: rupiah(s.cash_out) })}
              valueClass={s.cash_flow >= 0 ? "text-emerald-700" : "text-rose-700"}
            />
            <Cell
              label={t("finance.shuttleUsage")}
              value={`${s.shuttlecock_used} pcs`}
              sub={t("finance.shuttleCostSub", { cost: rupiah(s.shuttlecock_usage_cost) })}
            />
          </dl>
        </section>
      )}

      {/* Record Revenue & Record Expense */}
      <div className="grid gap-5 lg:grid-cols-2 min-w-0 w-full items-start">
        {/* Record Revenue */}
        <section aria-label="Record revenue" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("finance.recordRevenueTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("finance.fieldSource")}>
              <select id="sumber" className="w-full" value={rev.source} onChange={(e) => setRev({ ...rev, source: e.target.value })}>
                {REVENUE_SOURCES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label={t("finance.fieldAmount")}>
              <MoneyInput id="nominal-masuk" value={Number(rev.amount) || 0} onChange={(n) => setRev({ ...rev, amount: n ? String(n) : "" })} />
            </Field>
            <Field label={t("finance.fieldRelatedSession")} hint={t("inventory.hintOptional")}>
              <select id="sesi-masuk" className="w-full" value={rev.session_id} onChange={(e) => setRev({ ...rev, session_id: e.target.value })}>
                <option value="">{t("finance.optNoSession")}</option>
                {(sessions.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{dateId(m.date, lang)} · {m.type}</option>
                ))}
              </select>
            </Field>
            <Field label={t("inventory.fieldNote")} hint={t("inventory.hintOptional")}>
              <input id="catatan-masuk" className="w-full" value={rev.note} onChange={(e) => setRev({ ...rev, note: e.target.value })} />
            </Field>
            {revError && <p role="alert" className="text-sm text-red-700">{revError}</p>}
            <Btn className="w-full justify-center" disabled={!Number(rev.amount) || revState.isLoading} onClick={submitRevenue}>
              {revState.isLoading ? t("finance.btnSavingRevenue") : t("finance.btnSaveRevenue")}
            </Btn>
          </div>
        </section>

        {/* Record Expense */}
        <section aria-label="Record expense" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-rose-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("finance.recordExpenseTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("finance.fieldCategory")}>
              <select id="kategori" className="w-full" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label={t("finance.fieldAmount")}>
              <MoneyInput id="nominal-keluar" value={Number(exp.amount) || 0} onChange={(n) => setExp({ ...exp, amount: n ? String(n) : "" })} />
            </Field>
            <Field label={t("finance.fieldRelatedSession")} hint={t("inventory.hintOptional")}>
              <select id="sesi-keluar" className="w-full" value={exp.session_id} onChange={(e) => setExp({ ...exp, session_id: e.target.value })}>
                <option value="">{t("finance.optNoSession")}</option>
                {(sessions.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>{dateId(m.date, lang)} · {m.type}</option>
                ))}
              </select>
            </Field>
            <Field label={t("inventory.fieldNote")} hint={t("inventory.hintOptional")}>
              <input id="catatan-keluar" className="w-full" value={exp.note} onChange={(e) => setExp({ ...exp, note: e.target.value })} />
            </Field>
            {expError && <p role="alert" className="text-sm text-red-700">{expError}</p>}
            <Btn className="w-full justify-center" disabled={!Number(exp.amount) || expState.isLoading} onClick={submitExpense}>
              {expState.isLoading ? t("finance.btnSavingExpense") : t("finance.btnSaveExpense")}
            </Btn>
          </div>
        </section>
      </div>

      {/* Recent Transactions */}
      <section aria-label="Transactions" className="rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
        <h2 className="border-b border-line px-3.5 py-2.5 text-sm font-semibold text-ink">
          {t("finance.recentTxTitle")}
        </h2>
        {tx.isFetching && !tx.data ? (
          <Loading />
        ) : (tx.data ?? []).length === 0 ? (
          <div className="p-3"><Empty text={t("finance.emptyTransactions")} /></div>
        ) : (
          <>
            {/* Mobile Card List (sm:hidden) */}
            <div className="divide-y divide-line/70 sm:hidden">
              {(tx.data ?? []).map((tItem) => (
                <div key={tItem.id} className="p-3.5 space-y-2 transition-colors hover:bg-court/25">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink truncate">
                      {dateId(tItem.occurred_at, lang)}
                    </span>
                    <Badge status={tItem.kind} />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-ink truncate">
                      {tItem.category}{tItem.player_name ? ` · ${tItem.player_name}` : ""}
                    </span>
                    <span className={`font-bold tabular-nums text-sm ${tItem.kind === "IN" ? "text-emerald-700" : "text-rose-700"}`}>
                      {tItem.kind === "IN" ? `+${rupiah(tItem.amount)}` : `−${rupiah(tItem.amount)}`}
                    </span>
                  </div>

                  {tItem.note && (
                    <p className="text-[11px] text-ink-soft bg-court/40 border border-line/60 rounded-md px-2 py-1">
                      {tItem.note}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop & Tablet Table (hidden sm:block) */}
            <div className="overflow-x-auto w-full hidden sm:block">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("finance.colDate")}</th>
                    <th>{t("finance.colType")}</th>
                    <th>{t("finance.colCategory")}</th>
                    <th className="text-right">{t("finance.colAmount")}</th>
                    <th>{t("finance.colNote")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(tx.data ?? []).map((tItem) => (
                    <tr key={tItem.id}>
                      <td className="whitespace-nowrap font-medium text-ink">{dateId(tItem.occurred_at, lang)}</td>
                      <td><Badge status={tItem.kind} /></td>
                      <td className="font-normal text-ink">{tItem.category}{tItem.player_name ? ` · ${tItem.player_name}` : ""}</td>
                      <td className={`text-right font-bold tabular-nums ${tItem.kind === "IN" ? "text-emerald-700" : "text-rose-700"}`}>
                        {tItem.kind === "IN" ? `+${rupiah(tItem.amount)}` : `−${rupiah(tItem.amount)}`}
                      </td>
                      <td className="font-normal text-ink-soft">{tItem.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Cell({ label, value, sub, valueClass = "text-ink" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="px-3.5 py-3">
      <dt className="text-xs uppercase tracking-wide text-ink-faint font-semibold">{label}</dt>
      <dd className={`mt-1 text-lg font-bold tabular-nums ${valueClass}`}>{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-ink-faint">{sub}</dd>}
    </div>
  );
}
