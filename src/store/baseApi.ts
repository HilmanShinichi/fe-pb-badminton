import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (typeof err === "object" && err !== null && "status" in err) {
    const e = err as { status?: unknown; data?: { error?: { code?: string; message?: string } } };
    const status = typeof e.status === "number" ? e.status : 0;
    return new ApiError(status, e.data?.error?.code ?? "UNKNOWN", e.data?.error?.message ?? `HTTP ${status}`);
  }
  return new ApiError(0, "UNKNOWN", "Network error.");
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? "").replace(/\/$/, "");

const rawBase = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const envelopeBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBase(args, api, extraOptions);
  if (result.error) throw toApiError(result.error);
  const body = result.data as { data?: unknown };
  return { data: (body?.data ?? body) as unknown };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: envelopeBaseQuery,
  tagTypes: ["Dashboard", "Players", "Periods", "Members", "Mabar", "Attendance", "Matches", "SimpleStats", "Billing", "Inventory", "Finance", "Reports"],
  endpoints: () => ({}),
});
