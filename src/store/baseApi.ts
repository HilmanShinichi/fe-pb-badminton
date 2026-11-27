import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs } from "@reduxjs/toolkit/query/react";
import type { RootState } from "./store";
import { clearCredentials } from "./authSlice";

export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  payload?: unknown;
}

function isApiErrorShape(value: unknown): value is ApiErrorShape {
  if (typeof value !== "object" || value === null) return false;
  const error = value as Partial<ApiErrorShape>;
  return (
    typeof error.status === "number" &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

export class ApiError extends Error implements ApiErrorShape {
  static [Symbol.hasInstance](value: unknown): boolean {
    return isApiErrorShape(value);
  }

  code: string;
  status: number;
  payload?: unknown;
  constructor(status: number, code: string, message: string, payload?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function toApiError(err: unknown): ApiError {
  if (isApiErrorShape(err)) {
    return err instanceof Error
      ? err
      : new ApiError(err.status, err.code, err.message, err.payload);
  }
  if (typeof err === "object" && err !== null) {
    const e = err as {
      status?: unknown;
      data?: unknown;
      error?: unknown;
      originalStatus?: unknown;
    };
    // RTK Query wraps errors thrown from baseQuery in a CUSTOM_ERROR
    // envelope — unwrap it back to the original ApiError.
    if (e.status === "CUSTOM_ERROR" && e.data !== undefined) return toApiError(e.data);
    if ("status" in err) {
      const d = e.data as { error?: { code?: string; message?: string; payment?: unknown } } | undefined;
      if (typeof e.status === "number") {
        return new ApiError(
          e.status,
          d?.error?.code ?? "UNKNOWN",
          d?.error?.message ?? `HTTP ${e.status}`,
          d?.error?.payment
        );
      }

      if (typeof e.status === "string") {
        const message =
          e.status === "PARSING_ERROR" && typeof e.data === "string"
            ? e.data.trim()
            : typeof e.error === "string"
              ? e.error
              : "Network error.";
        const status =
          e.status === "PARSING_ERROR" && typeof e.originalStatus === "number"
            ? e.originalStatus
            : 0;
        return new ApiError(
          status,
          e.status === "FETCH_ERROR" ? "NETWORK_ERROR" : e.status,
          message || "Network error.",
          e.data
        );
      }
    }
  }
  return new ApiError(0, "UNKNOWN", "Network error.");
}

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined ?? "").replace(/\/$/, "");

// Protected app routes (Guard-ed in main.tsx). Used to decide whether an
// expired session should bounce the user to /login; public pages (landing,
// live) only drop the stale token silently.
export function isProtectedRoute(path: string): boolean {
  return (
    path.startsWith("/dashboard") ||
    path.startsWith("/mabar") ||
    path.startsWith("/periods") ||
    path.startsWith("/players") ||
    path.startsWith("/no-shows") ||
    path.startsWith("/inventory") ||
    path.startsWith("/finance") ||
    path.startsWith("/reports") ||
    path.startsWith("/simulator") ||
    path.startsWith("/match-maker")
  );
}

const rawBase = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const envelopeBaseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiErrorShape> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBase(args, api, extraOptions);
  // Return (don't throw): throwing makes RTK Query wrap the error in a
  // CUSTOM_ERROR envelope, which breaks `instanceof ApiError` checks and
  // hides backend error codes/messages from every catch site.
  if (result.error) {
    const apiErr = toApiError(result.error);
    // Expired token or rotated JWT_SECRET after deploy: drop the stale
    // session and send protected pages back to login instead of rendering
    // raw {"code":"UNAUTHORIZED"} errors on every screen.
    if (apiErr.status === 401 && apiErr.code === "UNAUTHORIZED") {
      try {
        api.dispatch(clearCredentials());
      } catch {
        /* store already gone */
      }
      if (typeof window !== "undefined") {
        if (isProtectedRoute(window.location.pathname)) window.location.replace("/login");
      }
    }
    return {
      error: {
        status: apiErr.status,
        code: apiErr.code,
        message: apiErr.message,
        payload: apiErr.payload,
      },
    };
  }
  const body = result.data as { data?: unknown };
  return { data: (body?.data ?? body) as unknown };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: envelopeBaseQuery,
  tagTypes: ["Dashboard", "Players", "Periods", "Members", "Mabar", "Attendance", "Matches", "SimpleStats", "Billing", "Inventory", "Finance", "Reports", "MatchMaker", "AdminUsers", "Payments", "RegistrationInfo", "MabarCancellations"],
  endpoints: () => ({}),
});
