import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  token: string | null;
  username: string | null;
  permissions: string[];
  isSuperadmin: boolean;
}

const KEY = "pbk_auth";

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>;
      if (parsed.token) {
        return {
          token: parsed.token,
          username: parsed.username ?? null,
          permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
          isSuperadmin: !!parsed.isSuperadmin,
        };
      }
    }
  } catch {
    /* start without a session */
  }
  return { token: null, username: null, permissions: [], isSuperadmin: false };
}

function persist(state: AuthState) {
  if (!state.token) {
    localStorage.removeItem(KEY);
    return;
  }
  localStorage.setItem(
    KEY,
    JSON.stringify({ token: state.token, username: state.username, permissions: state.permissions, isSuperadmin: state.isSuperadmin }),
  );
}

const authSlice = createSlice({
  name: "auth",
  initialState: load(),
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; username: string; permissions?: string[]; isSuperadmin?: boolean }>,
    ) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      state.permissions = action.payload.permissions ?? [];
      state.isSuperadmin = !!action.payload.isSuperadmin;
      persist(state);
    },
    setPermissions(state, action: PayloadAction<{ permissions: string[]; isSuperadmin: boolean }>) {
      state.permissions = action.payload.permissions;
      state.isSuperadmin = action.payload.isSuperadmin;
      persist(state);
    },
    clearCredentials(state) {
      state.token = null;
      state.username = null;
      state.permissions = [];
      state.isSuperadmin = false;
      localStorage.removeItem(KEY);
    },
  },
});

export const { setCredentials, setPermissions, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
