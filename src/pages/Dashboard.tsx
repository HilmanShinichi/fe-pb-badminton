import { useEffect, useState } from "react";
import { useDashboardQuery, useDeleteMabarMutation, type DashboardSession } from "../store/services";
import { ApiError } from "../store/baseApi";
import { dateId, rupiah } from "../format";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Loading, OpenLink, PageHead } from "../ui";

const RECENT_PAGE_SIZE = 5;

export function DashboardPage() {
  const [pending, setPending] = useState<DashboardSession | null>(null);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERIOD" | "DAILY_EVENT">("ALL");
  const [recentPage, setRecentPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [recentQ, setRecentQ] = useState("");
  const [remove, removeState] = useDeleteMabarMutation();

  useEffect(() => {
    const t = setTimeout(() => {
      setRecentQ(searchInput.trim());
      setRecentPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setRecentPage(0);
  }, [typeFilter]);

  const q = useDashboardQuery({
    recent_limit: RECENT_PAGE_SIZE,
    recent_offset: recentPage * RECENT_PAGE_SIZE,
    recent_type: typeFilter,
    recent_q: recentQ,
  });

  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load the dashboard." onRetry={() => q.refetch()} />;

  const d = q.data;
  const daily = d.month_daily ?? { revenue: 0, expense: 0, cash_flow: 0 };
  const period = d.month_period ?? { revenue: 0, expense: 0, cash_flow: 0 };
  const general = d.month_general ?? { revenue: d.month_revenue, expense: d.month_expense, cash_flow: d.month_cash_flow };

  const upcoming = d.upcoming_sessions.filter((s) => typeFilter === "ALL" || s.type === typeFilter);
  const recent = d.recent_sessions;
  const recentTotal = d.recent_total ?? recent.length;
  const recentPages = Math.max(1, Math.ceil(recentTotal / RECENT_PAGE_SIZE));
  if (recentPage >= recentPages) setRecentPage(recentPages - 1);

  function typeStats(type: "PERIOD" | "DAILY_EVENT") {
    const up = d.upcoming_sessions.filter((s) => s.type === type).length;
    const rec = d.recent_sessions.filter((s) => s.type === type);
    const profit = rec.reduce((a, s) => a + s.profit, 0);
    const billsTotal = rec.reduce((a, s) => a + (s.bills_total ?? 0), 0);
    const billsPaid = rec.reduce((a, s) => a + (s.bills_paid ?? 0), 0);
    return { up, sessions: rec.length, profit, billsTotal, billsPaid };
  }
  const periodStats = typeStats("PERIOD");
  const dailyStats = typeStats("DAILY_EVENT");

  async function confirmDelete() {
    if (!pending) return;
    try {
      await remove({ id: pending.id, force: true }).unwrap();
      setPending(null);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete session.");
    }
  }

  return (
    <div>
      <PageHead title="Dashboard" sub="Today: sessions, money, and stock." />
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <section aria-label="Cash flow by scope" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line px-3 py-2">
          <h2 className="text-sm font-semibold">Cash flow this month · {rupiah(d.month_cash_flow)}</h2>
          <p className="text-xs text-ink-faint">Daily and Period are tracked separately. General = no specific session, period, or product.</p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-3">
          <SummaryCell label="Daily" value={rupiah(daily.cash_flow)} sub={`In ${rupiah(daily.revenue)} · Out ${rupiah(daily.expense)} · Stock ${d.stock_by_purpose?.DAILY ?? 0} pcs`} />
          <SummaryCell label="Period" value={rupiah(period.cash_flow)} sub={`In ${rupiah(period.revenue)} · Out ${rupiah(period.expense)} · Stock ${d.stock_by_purpose?.PERIOD ?? 0} pcs`} />
          <SummaryCell label="General" value={rupiah(general.cash_flow)} sub={`In ${rupiah(general.revenue)} · Out ${rupiah(general.expense)}${d.stock_by_purpose?.GENERAL ? ` · Stock ${d.stock_by_purpose.GENERAL} pcs` : ""}`} />
        </dl>
      </section>
      <section aria-label="Summary" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-3">
          <SummaryCell label="Active period" value={d.active_period.name ?? "—"} sub={`${d.active_period.members} members`} />
          <SummaryCell
            label="Shuttlecock stock"
            value={`${d.shuttlecock_stock} pcs`}
            sub={
              d.shuttlecock_stock < 0
                ? "Usage exceeds purchases — record a purchase"
                : stockBreakdown(d.stock_by_purpose)
            }
          />
          <SummaryCell label="Next session" value={d.upcoming_sessions.length ? dateId(d.upcoming_sessions[0].date) : "—"} sub={d.upcoming_sessions.length ? `${d.upcoming_sessions.length} upcoming` : "Nothing scheduled"} />
        </dl>
      </section>

      <section aria-label="By type" className="mb-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">Period open play</h2>
            <p className="text-xs text-ink-faint">{periodStats.up} upcoming · {periodStats.sessions} recent</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <SummaryCell label="Recent profit" value={rupiah(periodStats.profit)} sub={`${periodStats.sessions} sessions`} />
            <SummaryCell label="Members" value={String(d.active_period.members)} sub={d.active_period.name ?? "No active period"} />
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">Daily open play</h2>
            <p className="text-xs text-ink-faint">{dailyStats.up} upcoming · {dailyStats.sessions} recent</p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <SummaryCell label="Recent profit" value={rupiah(dailyStats.profit)} sub={`${dailyStats.sessions} sessions`} />
            <SummaryCell label="Bills paid" value={`${dailyStats.billsPaid}/${dailyStats.billsTotal}`} sub={dailyStats.billsTotal > 0 && dailyStats.billsPaid >= dailyStats.billsTotal ? "All settled" : "Collecting"} />
          </dl>
        </div>
      </section>

      <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Filter sessions by type">
        {(["ALL", "PERIOD", "DAILY_EVENT"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={typeFilter === t}
            type="button"
            onClick={() => setTypeFilter(t)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${typeFilter === t ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
          >
            {t === "ALL" ? "All" : t === "PERIOD" ? "Period" : "Daily"}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-label="Upcoming sessions" className="rounded-xl border border-line bg-white shadow-card">
          <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">Upcoming sessions</h2>
          {upcoming.length === 0 ? (
            <div className="p-3"><Empty text={typeFilter === "ALL" ? "No sessions scheduled." : `No ${typeFilter === "PERIOD" ? "period" : "daily"} sessions scheduled.`} /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Venue</th><th></th></tr>
              </thead>
              <tbody>
                {upcoming.map((s) => (
                  <tr key={s.id}>
                    <td>{dateId(s.date)}</td>
                    <td><Badge status={s.type} /></td>
                    <td>{s.venue_name ?? s.period_name ?? "—"}</td>
                    <td className="whitespace-nowrap text-right">
                      <span className="inline-flex gap-1.5">
                        <OpenLink to={`/mabar/${s.id}`} />
                        <DeleteRowButton onClick={() => setPending(s)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </section>

        <section aria-label="Recent sessions" className="rounded-xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">Recent sessions: profit or loss?</h2>
            <span className="text-xs text-ink-faint">{recentTotal} sessions</span>
            <label htmlFor="cari-sesi" className="sr-only">Search sessions</label>
            <input
              id="cari-sesi"
              className="ml-auto min-w-0 flex-1 basis-32 text-sm"
              placeholder="Search venue, period, date…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {recent.length === 0 ? (
            <div className="p-3"><Empty text={recentQ || typeFilter !== "ALL" ? "No sessions match the filter." : "No finished sessions yet."} /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Result</th><th>Bills</th><th className="text-right">Profit</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{dateId(s.date)}</td>
                    <td><Badge status={s.type} /></td>
                    <td><Badge status={s.status || "BREAK_EVEN"} /></td>
                    <td>
                      {s.type === "DAILY_EVENT" ? (
                        s.payment_status === "SETTLED" ? (
                          <Badge status="SETTLED" />
                        ) : (
                          <span className="tabular-nums">{s.bills_paid}/{s.bills_total} paid</span>
                        )
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums">{rupiah(s.profit)}</td>
                    <td className="whitespace-nowrap text-right">
                      <span className="inline-flex gap-1.5">
                        <OpenLink to={`/mabar/${s.id}`} />
                        <DeleteRowButton onClick={() => setPending(s)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
            <span className="text-xs text-ink-faint tabular-nums">
              Page {recentPage + 1} of {recentPages} · {recentTotal} sessions
            </span>
            <nav aria-label="Recent sessions pages" className="inline-flex flex-wrap items-center gap-1">
              <Btn variant="plain" disabled={recentPage === 0 || q.isFetching} onClick={() => setRecentPage((p) => Math.max(0, p - 1))}>
                Prev
              </Btn>
              {pageNumbers(recentPage, recentPages).map((n, i) =>
                n === "…" ? (
                  <span key={`gap-${i}`} aria-hidden className="px-1 text-xs text-ink-faint">…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Go to page ${Number(n) + 1}`}
                    aria-current={n === recentPage ? "page" : undefined}
                    disabled={q.isFetching}
                    onClick={() => setRecentPage(Number(n))}
                    className={`min-w-8 rounded-lg px-2.5 py-2 text-sm font-semibold tabular-nums transition-colors disabled:opacity-50 ${
                      n === recentPage ? "bg-pine text-paper" : "border border-line bg-white hover:bg-court/60"
                    }`}
                  >
                    {Number(n) + 1}
                  </button>
                ),
              )}
              <Btn variant="plain" disabled={recentPage + 1 >= recentPages || q.isFetching} onClick={() => setRecentPage((p) => p + 1)}>
                Next
              </Btn>
            </nav>
          </div>
        </section>
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        Session profit = revenue minus court cost minus shuttlecock usage cost. Tube purchases count as cash flow, not profit.
      </p>
      {pending && (
        <ConfirmModal
          title="Delete this session?"
          body={
            <>
              <p>
                <strong>{pending.type === "PERIOD" ? "Period Open Play" : "Daily Open Play"} · {dateId(pending.date)}</strong>{" "}
                and <strong>everything inside it</strong> will be permanently hard-deleted from the database:
              </p>
              <ul className="mt-2 list-disc pl-5">
                <li>Matches, attendance, and simple recap</li>
                <li>Player bills and payments</li>
                <li>Shuttlecock usage and session money records</li>
              </ul>
              <p className="mt-2">This cannot be undone. Are you sure?</p>
            </>
          }
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

// Compact page list: all numbers when few, otherwise first/last plus a
// window around the current page with ellipsis gaps.
function pageNumbers(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const keep = new Set([0, total - 1, current - 1, current, current + 1]);
  const nums = [...keep].filter((n) => n >= 0 && n < total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push("…");
    out.push(nums[i]);
  }
  return out;
}

function stockBreakdown(by?: Record<string, number>): string {  if (!by) return "All products";
  const parts = [`Daily ${by.DAILY ?? 0}`, `Period ${by.PERIOD ?? 0}`];
  if (by.GENERAL) parts.push(`Shared ${by.GENERAL}`);
  return parts.join(" · ");
}

function SummaryCell({ label, value, sub }: { label: string; value: string; sub: string }) {  return (
    <div className="px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-ink-faint">{sub}</dd>
    </div>
  );
}
