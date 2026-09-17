import { baseApi } from "./baseApi";
import type {
  AttendanceRow,
  BillRow,
  MabarSession,
  MatchRow,
  Membership,
  Period,
  Player,
  Product,
  SimpleStatRow,
} from "../types";

export interface DashboardSession {
  id: string;
  type: string;
  date: string;
  period_name: string | null;
  venue_name: string | null;
  court_cost: number;
  revenue: number;
  shuttlecock_used: number;
  shuttlecock_cost: number;
  profit: number;
  status: string;
  bills_total: number;
  bills_paid: number;
  payment_status: string;
}

export interface DashboardScopeCash {
  revenue: number;
  expense: number;
  cash_flow: number;
}

export interface DashboardParams {
  recent_limit?: number;
  recent_offset?: number;
  recent_type?: string;
  recent_q?: string;
}

export interface DashboardData {
  active_period: { id: string | null; name: string | null; members: number };
  upcoming_sessions: DashboardSession[];
  recent_sessions: DashboardSession[];
  recent_total?: number;
  recent_limit?: number;
  recent_offset?: number;
  shuttlecock_stock: number;
  stock_by_purpose: Record<string, number>;
  month_revenue: number;
  month_expense: number;
  month_cash_flow: number;
  month_daily?: DashboardScopeCash;
  month_period?: DashboardScopeCash;
  month_general?: DashboardScopeCash;
}

export interface MabarSummary {
  session: MabarSession;
  revenue: number;
  billed_paid: number;
  court_cost: number;
  shuttlecock_used: number;
  shuttlecock_cost: number;
  other_expense: number;
  operating_cost: number;
  profit: number;
  status: string;
  players_present: number;
  players_listed: number;
  no_show: number;
}

export interface PeriodSummary {
  period: Period;
  total_revenue: number;
  billed_revenue: number;
  commitment_total: number;
  member_count: number;
  member_present: number;
  non_member_present: number;
  total_venue_cost: number;
  shuttlecock_usage_cost: number;
  shuttlecock_purchase_cost: number;
  operating_cost: number;
  operating_profit: number;
  status: string;
  cash_in: number;
  cash_out: number;
  cash_flow: number;
  shuttlecock_used: number;
  shuttlecock_stock: number;
  sessions: number;
  avg_profit_per_session: number;
  projection: {
    venue_total: number;
    sessions: number;
    shuttle_per_session: number;
    shuttle_units: number;
    shuttle_cost: number;
    operating_cost: number;
    operating_cost_to_date: number;
    revenue_full: number;
    revenue_billed: number;
    profit_full: number;
    profit_billed: number;
    status_full: string;
  };
}

export interface ShuttlecockMatrix {
  dates: string[];
  rows: Array<{ name: string; cells: Record<string, number>; total: number }>;
  total: number;
  avg_per_session: number;
}

export interface SessionBreakdownRow {
  session_id: string;
  date: string;
  players_present: number;
  revenue: number;
  court_cost: number;
  shuttlecock_used: number;
  shuttlecock_cost: number;
  operating_cost: number;
  profit: number;
  status: string;
}

export interface FinanceSummary {
  total_revenue: number;
  total_expense: number;
  expense_by_category: Record<string, number>;
  venue_cost: number;
  shuttlecock_usage_cost: number;
  operating_cost: number;
  operating_profit: number;
  status: string;
  cash_in: number;
  cash_out: number;
  cash_flow: number;
  shuttlecock_used: number;
}

export interface FinanceTx {
  id: string;
  kind: string;
  category: string;
  player_id: string | null;
  player_name: string | null;
  amount: number;
  note: string | null;
  session_id: string | null;
  occurred_at: string;
}

export interface InventoryTx {
  id: string;
  product_id: string;
  product: string;
  type: string;
  units: number;
  unit_price: number | null;
  session_id: string | null;
  match_id: string | null;
  note: string | null;
  occurred_at: string;
}

export interface AttendanceStats {
  listed: number;
  present: number;
  cancelled: number;
  no_show: number;
  no_show_rate_bp: number;
}

export interface ReportRow {
  [key: string]: string | number | null;
}

export interface InactiveReport {
  threshold_months: number;
  players: ReportRow[];
}

export const api = baseApi.injectEndpoints({
  endpoints: (build) => ({
    dashboard: build.query<DashboardData, DashboardParams | void>({
      query: (p) => {
        const qs = new URLSearchParams();
        if (p?.recent_limit) qs.set("recent_limit", String(p.recent_limit));
        if (p?.recent_offset) qs.set("recent_offset", String(p.recent_offset));
        if (p?.recent_type && p.recent_type !== "ALL") qs.set("recent_type", p.recent_type);
        if (p?.recent_q?.trim()) qs.set("recent_q", p.recent_q.trim());
        const s = qs.toString();
        return `/api/v1/dashboard${s ? `?${s}` : ""}`;
      },
      providesTags: ["Dashboard"],
    }),

    players: build.query<Player[], string>({
      query: (q) => `/api/v1/players${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      providesTags: ["Players"],
    }),
    playersAll: build.query<Player[], void>({
      query: () => "/api/v1/players?limit=200",
      providesTags: ["Players"],
    }),
    createPlayer: build.mutation<Player, { name: string; phone: string | null; notes: string | null }>({
      query: (body) => ({ url: "/api/v1/players", method: "POST", body }),
      invalidatesTags: ["Players"],
    }),
    updatePlayer: build.mutation<Player, { id: string; name: string; phone: string | null; notes: string | null }>({
      query: ({ id, ...body }) => ({ url: `/api/v1/players/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Players"],
    }),
    deletePlayer: build.mutation<unknown, string>({
      query: (id) => ({ url: `/api/v1/players/${id}`, method: "DELETE" }),
      invalidatesTags: ["Players"],
    }),

    periods: build.query<Period[], void>({
      query: () => "/api/v1/periods",
      providesTags: ["Periods"],
    }),
    createPeriod: build.mutation<Period, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/periods", method: "POST", body }),
      invalidatesTags: ["Periods", "Dashboard"],
    }),
    updatePeriod: build.mutation<Period, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/api/v1/periods/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Periods", id }, "Periods"],
    }),
    deletePeriod: build.mutation<unknown, { id: string; force?: boolean }>({
      query: ({ id, force }) => ({ url: `/api/v1/periods/${id}${force ? "?force=true" : ""}`, method: "DELETE" }),
      invalidatesTags: ["Periods", "Mabar", "Dashboard"],
    }),
    completePeriod: build.mutation<unknown, string>({
      query: (id) => ({ url: `/api/v1/periods/${id}/complete`, method: "POST" }),
      invalidatesTags: ["Periods", "Dashboard"],
    }),
    periodSummary: build.query<PeriodSummary, string>({
      query: (id) => `/api/v1/periods/${id}/summary`,
      providesTags: (_r, _e, id) => [{ type: "Periods", id }],
    }),
    periodMembers: build.query<Membership[], string>({
      query: (id) => `/api/v1/periods/${id}/members`,
      providesTags: (_r, _e, id) => [{ type: "Members", id }],
    }),
    addMember: build.mutation<unknown, { periodId: string; player_id: string }>({
      query: ({ periodId, ...body }) => ({ url: `/api/v1/periods/${periodId}/members`, method: "POST", body }),
      invalidatesTags: (_r, _e, { periodId }) => [{ type: "Members", id: periodId }],
    }),
    periodSessions: build.query<MabarSession[], string>({
      query: (id) => `/api/v1/mabar?period_id=${id}`,
      providesTags: ["Mabar"],
    }),
    shuttlecockMatrix: build.query<ShuttlecockMatrix, string>({
      query: (id) => `/api/v1/periods/${id}/shuttlecock-matrix`,
      providesTags: ["Reports"],
    }),
    sessionBreakdown: build.query<SessionBreakdownRow[], string>({
      query: (id) => `/api/v1/periods/${id}/session-breakdown`,
      providesTags: (_r, _e, id) => [{ type: "Periods", id }, "Mabar"],
    }),

    mabarList: build.query<MabarSession[], string>({
      query: (type) => `/api/v1/mabar${type ? `?type=${type}` : ""}`,
      providesTags: ["Mabar"],
    }),
    createMabar: build.mutation<MabarSession, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/mabar", method: "POST", body }),
      invalidatesTags: ["Mabar", "Dashboard"],
    }),
    updateMabar: build.mutation<MabarSession, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/api/v1/mabar/${id}`, method: "PATCH", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Mabar", id },
        { type: "Billing", id },
        "Mabar",
      ],
    }),
    deleteMabar: build.mutation<unknown, { id: string; force?: boolean }>({
      query: ({ id, force }) => ({ url: `/api/v1/mabar/${id}${force ? "?force=true" : ""}`, method: "DELETE" }),
      invalidatesTags: ["Mabar", "Dashboard"],
    }),
    mabarSummary: build.query<MabarSummary, string>({
      query: (id) => `/api/v1/mabar/${id}/summary`,
      providesTags: (_r, _e, id) => [{ type: "Mabar", id }],
    }),

    attendance: build.query<AttendanceRow[], string>({
      query: (id) => `/api/v1/mabar/${id}/attendance`,
      providesTags: (_r, _e, id) => [{ type: "Attendance", id }],
    }),
    setAttendance: build.mutation<
      AttendanceRow[],
      { sessionId: string; players?: Array<{ player_id: string; status: string; is_member: boolean }>; present_all?: boolean }
    >({
      query: ({ sessionId, ...body }) => ({ url: `/api/v1/mabar/${sessionId}/attendance`, method: "POST", body }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Attendance", id: sessionId },
        { type: "Mabar", id: sessionId },
      ],
    }),
    attendanceStats: build.query<AttendanceStats, string>({
      query: (id) => `/api/v1/mabar/${id}/attendance/stats`,
      providesTags: (_r, _e, id) => [{ type: "Attendance", id }],
    }),
    removeAttendance: build.mutation<{ ok: boolean; player_deleted: boolean }, { sessionId: string; playerId: string }>({
      query: ({ sessionId, playerId }) => ({ url: `/api/v1/mabar/${sessionId}/attendance/${playerId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Attendance", id: sessionId },
        { type: "Mabar", id: sessionId },
        "Players",
      ],
    }),

    matches: build.query<MatchRow[], string>({
      query: (id) => `/api/v1/mabar/${id}/matches`,
      providesTags: (_r, _e, id) => [{ type: "Matches", id }],
    }),
    createMatch: build.mutation<unknown, { sessionId: string; shuttlecock_used: number; players: Array<{ player_id: string }> }>({
      query: ({ sessionId, ...body }) => ({ url: `/api/v1/mabar/${sessionId}/matches`, method: "POST", body }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Matches", id: sessionId },
        { type: "Mabar", id: sessionId },
      ],
    }),
    deleteMatch: build.mutation<unknown, { matchId: string; sessionId: string }>({
      query: ({ matchId }) => ({ url: `/api/v1/matches/${matchId}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Matches", id: sessionId },
        { type: "Mabar", id: sessionId },
      ],
    }),

    simpleStats: build.query<SimpleStatRow[], string>({
      query: (id) => `/api/v1/mabar/${id}/simple-stats`,
      providesTags: (_r, _e, id) => [{ type: "SimpleStats", id }],
    }),
    saveSimpleStats: build.mutation<
      SimpleStatRow[],
      { sessionId: string; rows: Array<{ player_id: string; play_count: number; shuttlecock_used: number }> }
    >({
      query: ({ sessionId, rows }) => ({ url: `/api/v1/mabar/${sessionId}/simple-stats`, method: "POST", body: { rows } }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "SimpleStats", id: sessionId },
        { type: "Mabar", id: sessionId },
        { type: "Billing", id: sessionId },
        "Dashboard",
      ],
    }),
    saveAllocation: build.mutation<
      Array<{ product_id: string; product_name: string; units: number }>,
      { sessionId: string; items: Array<{ product_id: string; units: number }> }
    >({
      query: ({ sessionId, items }) => ({ url: `/api/v1/mabar/${sessionId}/shuttlecock-allocation`, method: "POST", body: { items } }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Mabar", id: sessionId },
        "Mabar",
        "Inventory",
        "Dashboard",
      ],
    }),

    billing: build.query<BillRow[], string>({
      query: (id) => `/api/v1/mabar/${id}/billing`,
      providesTags: (_r, _e, id) => [{ type: "Billing", id }],
    }),
    generateBilling: build.mutation<BillRow[], string>({
      query: (id) => ({ url: `/api/v1/mabar/${id}/billing`, method: "POST", body: {} }),
      invalidatesTags: (_r, _e, id) => [{ type: "Billing", id }, "Dashboard"],
    }),
    updateBillingStatus: build.mutation<unknown, { sessionId: string; playerId: string; payment_status?: string; payment_method?: string }>({
      query: ({ sessionId, playerId, ...body }) => ({
        url: `/api/v1/mabar/${sessionId}/billing/${playerId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { sessionId }) => [
        { type: "Billing", id: sessionId },
        { type: "Mabar", id: sessionId },
        "Dashboard",
      ],
    }),

    products: build.query<Product[], void>({
      query: () => "/api/v1/inventory/shuttlecock",
      providesTags: ["Inventory"],
    }),
    createProduct: build.mutation<Product, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/inventory/shuttlecock", method: "POST", body }),
      invalidatesTags: ["Inventory", "Dashboard"],
    }),
    updateProduct: build.mutation<Product, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/api/v1/inventory/shuttlecock/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Inventory", "Dashboard"],
    }),
    deleteProduct: build.mutation<unknown, { id: string; force?: boolean }>({
      query: ({ id, force }) => ({ url: `/api/v1/inventory/shuttlecock/${id}${force ? "?force=true" : ""}`, method: "DELETE" }),
      invalidatesTags: ["Inventory", "Dashboard"],
    }),
    purchase: build.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/inventory/shuttlecock/purchase", method: "POST", body }),
      invalidatesTags: ["Inventory", "Finance", "Dashboard"],
    }),
    adjust: build.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/inventory/shuttlecock/adjustment", method: "POST", body }),
      invalidatesTags: ["Inventory", "Dashboard"],
    }),
    inventoryTx: build.query<InventoryTx[], void>({
      query: () => "/api/v1/inventory/shuttlecock/transactions",
      providesTags: ["Inventory"],
    }),

    financeSummary: build.query<FinanceSummary, string>({
      query: (qs) => `/api/v1/finance/summary${qs}`,
      providesTags: ["Finance"],
    }),
    financeTx: build.query<FinanceTx[], void>({
      query: () => "/api/v1/finance/transactions",
      providesTags: ["Finance"],
    }),
    createRevenue: build.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/finance/revenue", method: "POST", body }),
      invalidatesTags: ["Finance", "Dashboard", "Mabar", "Members", "Periods"],
    }),
    createExpense: build.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/finance/expense", method: "POST", body }),
      invalidatesTags: ["Finance", "Dashboard", "Mabar"],
    }),

    venues: build.query<Array<{ id: string; name: string; court_count: number }>, void>({
      query: () => "/api/v1/venues",
    }),
    reportAttendance: build.query<ReportRow[], void>({
      query: () => "/api/v1/reports/attendance",
      providesTags: ["Reports"],
    }),
    reportNoShow: build.query<ReportRow[], void>({
      query: () => "/api/v1/reports/no-show",
      providesTags: ["Reports"],
    }),
    reportShuttlecock: build.query<ReportRow[], void>({
      query: () => "/api/v1/reports/shuttlecock",
      providesTags: ["Reports"],
    }),
    reportPlayerUsage: build.query<ReportRow[], void>({
      query: () => "/api/v1/reports/player-usage",
      providesTags: ["Reports"],
    }),
    reportFinancial: build.query<{ total_revenue: number; total_expense: number; cash_flow: number; revenue_by_source: Record<string, number>; expense_by_category: Record<string, number> }, void>({
      query: () => "/api/v1/reports/financial",
      providesTags: ["Reports"],
    }),
    reportInactive: build.query<InactiveReport, number>({
      query: (months) => `/api/v1/reports/inactive-members?months=${months}`,
      providesTags: ["Reports"],
    }),

    simulatePeriod: build.mutation<Record<string, number | string | Array<Record<string, number>>>, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/simulator/period", method: "POST", body }),
    }),
    simulateDaily: build.mutation<Record<string, number | string | Record<string, number>>, Record<string, unknown>>({
      query: (body) => ({ url: "/api/v1/simulator/daily-event", method: "POST", body }),
    }),
  }),
});

export const {
  useDashboardQuery,
  usePlayersQuery,
  usePlayersAllQuery,
  useCreatePlayerMutation,
  useUpdatePlayerMutation,
  useDeletePlayerMutation,
  usePeriodsQuery,
  useCreatePeriodMutation,
  useUpdatePeriodMutation,
  useDeletePeriodMutation,
  useCompletePeriodMutation,
  usePeriodSummaryQuery,
  usePeriodMembersQuery,
  useAddMemberMutation,
  usePeriodSessionsQuery,
  useShuttlecockMatrixQuery,
  useSessionBreakdownQuery,
  useMabarListQuery,
  useCreateMabarMutation,
  useUpdateMabarMutation,
  useDeleteMabarMutation,
  useMabarSummaryQuery,
  useAttendanceQuery,
  useSetAttendanceMutation,
  useRemoveAttendanceMutation,
  useAttendanceStatsQuery,
  useMatchesQuery,
  useCreateMatchMutation,
  useDeleteMatchMutation,
  useSimpleStatsQuery,
  useSaveSimpleStatsMutation,
  useSaveAllocationMutation,
  useBillingQuery,
  useGenerateBillingMutation,
  useUpdateBillingStatusMutation,
  useProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  usePurchaseMutation,
  useAdjustMutation,
  useInventoryTxQuery,
  useFinanceSummaryQuery,
  useFinanceTxQuery,
  useCreateRevenueMutation,
  useCreateExpenseMutation,
  useVenuesQuery,
  useReportAttendanceQuery,
  useReportNoShowQuery,
  useReportShuttlecockQuery,
  useReportPlayerUsageQuery,
  useReportFinancialQuery,
  useReportInactiveQuery,
  useSimulatePeriodMutation,
  useSimulateDailyMutation,
} = api;
