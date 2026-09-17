import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearCredentials, setCredentials } from "./store/authSlice";
import type { AppDispatch, RootState } from "./store/store";

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>();
  const auth = useSelector((s: RootState) => s.auth);
  const login = useCallback(
    (token: string, username: string) => dispatch(setCredentials({ token, username })),
    [dispatch]
  );
  const logout = useCallback(() => dispatch(clearCredentials()), [dispatch]);
  return { auth: auth.token ? auth : null, login, logout };
}
