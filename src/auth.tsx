import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials, setCredentials, setPermissions } from "./store/authSlice";
import { API_BASE_URL } from "./store/baseApi";
import { canAccess } from "./permissions";
import type { AppDispatch, RootState } from "./store/store";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((s: RootState) => s.auth);
  const login = useCallback(
    (token: string, username: string, permissions: string[] = [], isSuperadmin = false) =>
      dispatch(setCredentials({ token, username, permissions, isSuperadmin })),
    [dispatch],
  );
  const logout = useCallback(() => dispatch(clearCredentials()), [dispatch]);
  const can = useCallback(
    (perm: string) => canAccess(auth.permissions, auth.isSuperadmin, perm),
    [auth.permissions, auth.isSuperadmin],
  );
  // Re-sync access from the server (permission edits apply without asking
  // the user to log out and back in).
  const refresh = useCallback(async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: { permissions?: string[]; is_superadmin?: boolean };
      };
      if (res.ok && body.data) {
        dispatch(
          setPermissions({ permissions: body.data.permissions ?? [], isSuperadmin: !!body.data.is_superadmin }),
        );
      }
    } catch {
      /* keep cached access */
    }
  }, [dispatch, auth.token]);
  return { auth: auth.token ? auth : null, login, logout, can, refresh };
}
