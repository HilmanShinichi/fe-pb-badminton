import { API_BASE_URL, isProtectedRoute } from "../store/baseApi";
import { clearCredentials } from "../store/authSlice";
import { store } from "../store/store";

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (header) {
    const m = /filename="([^"]+)"/.exec(header) ?? /filename=([^;]+)/.exec(header);
    if (m) return m[1].trim();
  }
  return fallback;
}

// Downloads a same-backend file (CSV export) with the session token in the
// Authorization header instead of the URL, so tokens never land in browser
// history, bookmarks, or server access logs.
export async function downloadAuthedCsv(path: string, fallbackName: string): Promise<void> {
  const token = store.getState().auth.token;
  if (!token) {
    if (isProtectedRoute(window.location.pathname)) window.location.replace("/login");
    throw new Error("Login is required.");
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error("Network error.");
  }
  if (res.status === 401) {
    store.dispatch(clearCredentials());
    if (isProtectedRoute(window.location.pathname)) window.location.replace("/login");
    throw new Error("Session expired. Please login again.");
  }
  if (!res.ok) {
    const msg: string | undefined = await res.json().then(
      (b) => (b as { error?: { message?: string } } | null)?.error?.message,
      () => undefined,
    );
    throw new Error(msg ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameFromDisposition(res.headers.get("Content-Disposition"), fallbackName);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
