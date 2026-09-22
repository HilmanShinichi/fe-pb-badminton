import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs } from "@reduxjs/toolkit/query/react";
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
  if (typeof err === "object" && err !== null) {
    const e = err as { status?: unknown; data?: unknown };
    // RTK Query wraps errors thrown from baseQuery in a CUSTOM_ERROR
    // envelope — unwrap it back to the original ApiError.
    if (e.status === "CUSTOM_ERROR" && e.data !== undefined) return toApiError(e.data);
    if ("status" in err) {
      const d = e.data as { error?: { code?: string; message?: string } } | undefined;
      const status = typeof e.status === "number" ? e.status : 0;
      return new ApiError(status, d?.error?.code ?? "UNKNOWN", d?.error?.message ?? `HTTP ${status}`);
    }
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

const envelopeBaseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBase(args, api, extraOptions);
  // Return (don't throw): throwing makes RTK Query wrap the error in a
  // CUSTOM_ERROR envelope, which breaks `instanceof ApiError` checks and
  // hides backend error codes/messages from every catch site.
  if (result.error) return { error: toApiError(result.error) };
  const body = result.data as { data?: unknown };
  return { data: (body?.data ?? body) as unknown };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: envelopeBaseQuery,
  tagTypes: ["Dashboard", "Players", "Periods", "Members", "Mabar", "Attendance", "Matches", "SimpleStats", "Billing", "Inventory", "Finance", "Reports", "MatchMaker"],
  endpoints: () => ({}),
});
