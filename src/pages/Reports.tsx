import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useReportAttendanceQuery,
  useReportFinancialQuery,
  useReportInactiveQuery,
  useReportNoShowQuery,
  useReportPlayerUsageQuery,
  useReportShuttlecockQuery,
} from "../store/services";
import type { RootState } from "../store/store";
import { rateBp, rupiah } from "../format";
import { Badge, Empty, ErrorBox, Loading, PageHead } from "../ui";

type Tab = "attendance" | "noshow" | "shuttlecock" | "usage" | "financial" | "inactive";

const TABS: Array<[Tab, string]> = [
  ["attendance", "Attendance"],
  ["noshow", "No-show"],
  ["shuttlecock", "Shuttlecocks"],
  ["usage", "Players"],
  ["financial", "Finance"],
  ["inactive", "Inactive"],
];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("attendance");
  const [months, setMonths] = useState(6);
  const token = useSelector((s: RootState) => s.auth.token);

  return (
    <div>
      <PageHead
        title="Reports"
        sub="Operational recaps and CSV downloads for sharing."
        right={
          <a
            className="rounded-xl border border-line bg-white shadow-card px-3 py-1.5 text-sm hover:bg-court/60"
            href={csvHref(tab, months)}
            onClick={(e) => { if (!token) e.preventDefault(); }}
          >
            Download CSV
          </a>
        }
      />
      <div role="tablist" aria-label="Report type" className="mb-4 flex flex-wrap gap-1 border-b border-line pb-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            type="button"
            onClick={() => setTab(key)}
            className={`border px-3 py-1.5 text-sm ${tab === key ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "attendance" && <AttendanceReport />}
      {tab === "noshow" && <NoShowReport />}
      {tab === "shuttlecock" && <ShuttlecockReport />}
      {tab === "usage" && <UsageReport />}
      {tab === "financial" && <FinancialReport />}
      {tab === "inactive" && <InactiveReport months={months} onMonths={setMonths} />}
    </div>
  );
}

function csvHref(tab: Tab, months: number): string {
  switch (tab) {
    case "attendance": return "/api/v1/reports/attendance?format=csv";
    case "noshow": return "/api/v1/reports/no-show?format=csv";
    case "shuttlecock": return "/api/v1/reports/shuttlecock?format=csv";
    case "usage": return "/api/v1/reports/player-usage?format=csv";
    case "financial": return "/api/v1/reports/financial?format=csv";
    case "inactive": return `/api/v1/reports/inactive-members?months=${months}`;
  }
}

function AttendanceReport() {
  const q = useReportAttendanceQuery();
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />;
  if (q.data.length === 0) return <Empty text="No attendance data yet." />;
  return (
    <table className="data">
      <thead><tr><th>Player</th><th className="text-right">Listed</th><th className="text-right">Present</th><th className="text-right">Cancelled</th><th className="text-right">No-show</th><th className="text-right">Rate</th></tr></thead>
      <tbody>
        {q.data.map((r) => (
          <tr key={String(r.player)}>
            <td className="font-medium">{String(r.player)}</td>
            <td className="text-right tabular-nums">{Number(r.listed)}</td>
            <td className="text-right tabular-nums">{Number(r.present)}</td>
            <td className="text-right tabular-nums">{Number(r.cancelled)}</td>
            <td className="text-right tabular-nums">{Number(r.no_show)}</td>
            <td className="text-right tabular-nums">{rateBp(Number(r.no_show_rate_bp))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NoShowReport() {
  const q = useReportNoShowQuery();
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />;
  if (q.data.length === 0) return <Empty text="No no-shows recorded. Well done." />;
  return (
    <table className="data">
      <thead><tr><th>#</th><th>Player</th><th className="text-right">Listed</th><th className="text-right">Present</th><th className="text-right">No-show</th><th className="text-right">Rate</th></tr></thead>
      <tbody>
        {q.data.map((r, i) => (
          <tr key={String(r.player)}>
            <td className="tabular-nums">{i + 1}</td>
            <td className="font-medium">{String(r.player)}</td>
            <td className="text-right tabular-nums">{Number(r.listed)}</td>
            <td className="text-right tabular-nums">{Number(r.present)}</td>
            <td className="text-right tabular-nums">{Number(r.no_show)}</td>
            <td className="text-right tabular-nums">{rateBp(Number(r.no_show_rate_bp))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ShuttlecockReport() {
  const q = useReportShuttlecockQuery();
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />;
  if (q.data.length === 0) return <Empty text="No usage data yet." />;
  return (
    <table className="data">
      <thead><tr><th>#</th><th>Player</th><th className="text-right">Matches</th><th className="text-right">Player shuttles</th></tr></thead>
      <tbody>
        {q.data.map((r, i) => (
          <tr key={String(r.player)}>
            <td className="tabular-nums">{i + 1}</td>
            <td className="font-medium">{String(r.player)}</td>
            <td className="text-right tabular-nums">{Number(r.matches)}</td>
            <td className="text-right font-semibold tabular-nums">{Number(r.shuttlecock_usage)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsageReport() {
  const q = useReportPlayerUsageQuery();
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />;
  if (q.data.length === 0) return <Empty text="No player data yet." />;
  return (
    <table className="data">
      <thead><tr><th>Player</th><th className="text-right">Present</th><th className="text-right">Matches</th><th className="text-right">Player shuttles</th></tr></thead>
      <tbody>
        {q.data.map((r) => (
          <tr key={String(r.player)}>
            <td className="font-medium">{String(r.player)}</td>
            <td className="text-right tabular-nums">{Number(r.present)}</td>
            <td className="text-right tabular-nums">{Number(r.matches)}</td>
            <td className="text-right tabular-nums">{Number(r.shuttlecock_usage)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FinancialReport() {
  const q = useReportFinancialQuery();
  if (q.isFetching && !q.data) return <Loading />;
  if (q.isError || !q.data) return <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />;
  const rows: Array<[string, string, number]> = [
    ...Object.entries(q.data.revenue_by_source).map(([k, v]): [string, string, number] => ["Revenue", k, v]),
    ...Object.entries(q.data.expense_by_category).map(([k, v]): [string, string, number] => ["Expense", k, v]),
  ];
  return (
    <div>
      <dl className="mb-4 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-white shadow-card">
        <div className="px-3 py-2.5"><dt className="text-xs uppercase text-ink-faint">In</dt><dd className="font-semibold tabular-nums">{rupiah(q.data.total_revenue)}</dd></div>
        <div className="px-3 py-2.5"><dt className="text-xs uppercase text-ink-faint">Out</dt><dd className="font-semibold tabular-nums">{rupiah(q.data.total_expense)}</dd></div>
        <div className="px-3 py-2.5"><dt className="text-xs uppercase text-ink-faint">Cash flow</dt><dd className="font-semibold tabular-nums">{rupiah(q.data.cash_flow)}</dd></div>
      </dl>
      <table className="data">
        <thead><tr><th>Type</th><th>Category</th><th className="text-right">Amount</th></tr></thead>
        <tbody>
          {rows.map(([kind, cat, amt]) => (
            <tr key={`${kind}-${cat}`}>
              <td><Badge status={kind} /></td>
              <td>{cat}</td>
              <td className="text-right tabular-nums">{rupiah(amt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InactiveReport({ months, onMonths }: { months: number; onMonths: (n: number) => void }) {
  const q = useReportInactiveQuery(months);
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm">
        Inactivity threshold
        <select aria-label="Threshold in months" value={months} onChange={(e) => onMonths(Number(e.target.value))}>
          {[3, 6, 9, 12].map((m) => (
            <option key={m} value={m}>{m} months</option>
          ))}
        </select>
      </label>
      {q.isFetching && !q.data ? (
        <Loading />
      ) : q.isError || !q.data ? (
        <ErrorBox message="Could not load report." onRetry={() => q.refetch()} />
      ) : q.data.players.length === 0 ? (
        <Empty text={`No players inactive for more than ${months} months.`} />
      ) : (
        <table className="data">
          <thead><tr><th>Player</th><th>Last present</th><th className="text-right">Total present</th><th className="text-right">Days inactive</th></tr></thead>
          <tbody>
            {q.data.players.map((r) => (
              <tr key={String(r.player)}>
                <td className="font-medium">{String(r.player)}</td>
                <td>{String(r.last_present)}</td>
                <td className="text-right tabular-nums">{Number(r.total_present)}</td>
                <td className="text-right tabular-nums">{Number(r.days_inactive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
