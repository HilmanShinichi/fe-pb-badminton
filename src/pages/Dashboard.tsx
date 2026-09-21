import { useEffect, useState } from "react";
import { useDashboardQuery, useDeleteMabarMutation, type DashboardSession } from "../store/services";
import { ApiError } from "../store/baseApi";
import { rupiah } from "../format";
import { useI18n } from "../i18n";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Loading, OpenLink, PageHead } from "../ui";

const RECENT_PAGE_SIZE = 5;

export function DashboardPage() {
  const { t, dateFormatted } = useI18n();
  const [pending, setPending] = useState<DashboardSession | null>(null);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERIOD" | "DAILY_EVENT">("ALL");
  const [recentPage, setRecentPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [recentQ, setRecentQ] = useState("");
  const [remove, removeState] = useDeleteMabarMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setRecentQ(searchInput.trim());
      setRecentPage(0);
    }, 300);
    return () => clearTimeout(timer);
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
  if (q.isError || !q.data) return <ErrorBox message={t("dashboard.errorLoad")} onRetry={() => q.refetch()} />;

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
      setError(e instanceof ApiError ? e.message : t("dashboard.errorDelete"));
    }
  }

  return (
    <div>
      <PageHead title={t("dashboard.pageTitle")} sub={t("dashboard.pageSubtitle")} />
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      <section aria-label="Cash flow by scope" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <div className="border-b border-line px-3 py-2">
          <h2 className="text-sm font-semibold">{t("dashboard.cashFlowMonth", { amount: rupiah(d.month_cash_flow) })}</h2>
          <p className="text-xs text-ink-faint">{t("dashboard.cashFlowDesc")}</p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-3">
          <SummaryCell
            label={t("dashboard.daily")}
            value={rupiah(daily.cash_flow)}
            sub={`${t("dashboard.in")} ${rupiah(daily.revenue)} · ${t("dashboard.out")} ${rupiah(daily.expense)} · ${t("dashboard.stockPcs", { count: d.stock_by_purpose?.DAILY ?? 0 })}`}
          />
          <SummaryCell
            label={t("dashboard.period")}
            value={rupiah(period.cash_flow)}
            sub={`${t("dashboard.in")} ${rupiah(period.revenue)} · ${t("dashboard.out")} ${rupiah(period.expense)} · ${t("dashboard.stockPcs", { count: d.stock_by_purpose?.PERIOD ?? 0 })}`}
          />
          <SummaryCell
            label={t("dashboard.general")}
            value={rupiah(general.cash_flow)}
            sub={`${t("dashboard.in")} ${rupiah(general.revenue)} · ${t("dashboard.out")} ${rupiah(general.expense)}${d.stock_by_purpose?.GENERAL ? ` · ${t("dashboard.stockPcs", { count: d.stock_by_purpose.GENERAL })}` : ""}`}
          />
        </dl>
      </section>
      <section aria-label="Summary" className="mb-5 rounded-xl border border-line bg-white shadow-card">
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-3">
          <SummaryCell
            label={t("dashboard.activePeriod")}
            value={d.active_period.name ?? "—"}
            sub={d.active_period.name ? t("dashboard.membersCount", { count: d.active_period.members }) : t("dashboard.noActivePeriod")}
          />
          <SummaryCell
            label={t("dashboard.shuttlecockStock")}
            value={`${d.shuttlecock_stock} pcs`}
            sub={
              d.shuttlecock_stock < 0
                ? t("dashboard.usageExceeds")
                : stockBreakdown(d.stock_by_purpose, t)
            }
          />
          <SummaryCell
            label={t("dashboard.nextSession")}
            value={d.upcoming_sessions.length ? dateFormatted(d.upcoming_sessions[0].date) : "—"}
            sub={d.upcoming_sessions.length ? t("dashboard.upcomingCount", { count: d.upcoming_sessions.length }) : t("dashboard.nothingScheduled")}
          />
        </dl>
      </section>

      <section aria-label="By type" className="mb-5 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">{t("dashboard.periodOpenPlay")}</h2>
            <p className="text-xs text-ink-faint">
              {t("dashboard.upcomingAndRecent", { up: periodStats.up, recent: periodStats.sessions })}
            </p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <SummaryCell label={t("dashboard.recentProfit")} value={rupiah(periodStats.profit)} sub={t("dashboard.sessionsCount", { count: periodStats.sessions })} />
            <SummaryCell label={t("dashboard.members")} value={String(d.active_period.members)} sub={d.active_period.name ?? t("dashboard.noActivePeriod")} />
          </dl>
        </div>
        <div className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">{t("dashboard.dailyOpenPlay")}</h2>
            <p className="text-xs text-ink-faint">
              {t("dashboard.upcomingAndRecent", { up: dailyStats.up, recent: dailyStats.sessions })}
            </p>
          </div>
          <dl className="grid grid-cols-2 divide-x divide-line">
            <SummaryCell label={t("dashboard.recentProfit")} value={rupiah(dailyStats.profit)} sub={t("dashboard.sessionsCount", { count: dailyStats.sessions })} />
            <SummaryCell
              label={t("dashboard.billsPaid")}
              value={`${dailyStats.billsPaid}/${dailyStats.billsTotal}`}
              sub={dailyStats.billsTotal > 0 && dailyStats.billsPaid >= dailyStats.billsTotal ? t("dashboard.allSettled") : t("dashboard.collecting")}
            />
          </dl>
        </div>
      </section>

      <div className="mb-4 flex gap-1.5" role="tablist" aria-label="Filter sessions by type">
        {(["ALL", "PERIOD", "DAILY_EVENT"] as const).map((filter) => (
          <button
            key={filter}
            role="tab"
            aria-selected={typeFilter === filter}
            type="button"
            onClick={() => setTypeFilter(filter)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${typeFilter === filter ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
          >
            {filter === "ALL" ? t("dashboard.filterAll") : filter === "PERIOD" ? t("dashboard.period") : t("dashboard.daily")}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-label={t("dashboard.upcomingSessions")} className="rounded-xl border border-line bg-white shadow-card">
          <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">{t("dashboard.upcomingSessions")}</h2>
          {upcoming.length === 0 ? (
            <div className="p-3">
              <Empty
                text={
                  typeFilter === "ALL"
                    ? t("dashboard.noSessionsScheduled")
                    : t("dashboard.noTypeSessionsScheduled", {
                        type: typeFilter === "PERIOD" ? t("dashboard.period") : t("dashboard.daily"),
                      })
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("dashboard.colDate")}</th>
                  <th>{t("dashboard.colType")}</th>
                  <th>{t("dashboard.colVenue")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((s) => (
                  <tr key={s.id}>
                    <td>{dateFormatted(s.date)}</td>
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

        <section aria-label={t("dashboard.recentSessionsTitle")} className="rounded-xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
            <h2 className="text-sm font-semibold">{t("dashboard.recentSessionsTitle")}</h2>
            <span className="text-xs text-ink-faint">{t("dashboard.sessionsCount", { count: recentTotal })}</span>
            <label htmlFor="cari-sesi" className="sr-only">{t("dashboard.searchSessionsPlaceholder")}</label>
            <input
              id="cari-sesi"
              className="ml-auto min-w-0 flex-1 basis-32 text-sm"
              placeholder={t("dashboard.searchSessionsPlaceholder")}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {recent.length === 0 ? (
            <div className="p-3">
              <Empty text={recentQ || typeFilter !== "ALL" ? t("dashboard.noSessionsMatch") : t("dashboard.noFinishedSessions")} />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("dashboard.colDate")}</th>
                  <th>{t("dashboard.colType")}</th>
                  <th>{t("dashboard.colResult")}</th>
                  <th>{t("dashboard.colBills")}</th>
                  <th className="text-right">{t("dashboard.colProfit")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{dateFormatted(s.date)}</td>
                    <td><Badge status={s.type} /></td>
                    <td><Badge status={s.status || "BREAK_EVEN"} /></td>
                    <td>
                      {s.type === "DAILY_EVENT" ? (
                        s.payment_status === "SETTLED" ? (
                          <Badge status="SETTLED" />
                        ) : (
                          <span className="tabular-nums">
                            {t("dashboard.billsPaidCount", { paid: s.bills_paid ?? 0, total: s.bills_total ?? 0 })}
                          </span>
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
              {t("dashboard.pageOf", { page: recentPage + 1, pages: recentPages, total: recentTotal })}
            </span>
            <nav aria-label="Recent sessions pages" className="inline-flex flex-wrap items-center gap-1">
              <Btn variant="plain" disabled={recentPage === 0 || q.isFetching} onClick={() => setRecentPage((p) => Math.max(0, p - 1))}>
                {t("dashboard.prev")}
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
                {t("dashboard.next")}
              </Btn>
            </nav>
          </div>
        </section>
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        {t("dashboard.profitDisclaimer")}
      </p>
      {pending && (
        <ConfirmModal
          title={t("dashboard.deleteModalTitle")}
          body={
            <>
              <p>
                <strong>
                  {(pending.type === "PERIOD" ? t("dashboard.periodOpenPlay") : t("dashboard.dailyOpenPlay"))} · {dateFormatted(pending.date)}
                </strong>{" "}
                {t("dashboard.deleteModalSessionIntro")}
              </p>
              <ul className="mt-2 list-disc pl-5">
                <li>{t("dashboard.deleteModalList1")}</li>
                <li>{t("dashboard.deleteModalList2")}</li>
                <li>{t("dashboard.deleteModalList3")}</li>
              </ul>
              <p className="mt-2">{t("dashboard.deleteModalConfirm")}</p>
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

function stockBreakdown(by?: Record<string, number>, t?: (path: string, vars?: Record<string, string | number>) => string): string {
  if (!by) return t ? t("dashboard.allProducts") : "All products";
  const dailyText = t ? `${t("dashboard.daily")} ${by.DAILY ?? 0}` : `Daily ${by.DAILY ?? 0}`;
  const periodText = t ? `${t("dashboard.period")} ${by.PERIOD ?? 0}` : `Period ${by.PERIOD ?? 0}`;
  const parts = [dailyText, periodText];
  if (by.GENERAL) {
    parts.push(t ? t("dashboard.stockBreakdownShared", { count: by.GENERAL }) : `Shared ${by.GENERAL}`);
  }
  return parts.join(" · ");
}

function SummaryCell({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
      <dd className="text-xs text-ink-faint">{sub}</dd>
    </div>
  );
}

