import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  token: string | null;
  username: string | null;
}

const KEY = "pbk_auth";

function load(): AuthState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AuthState;
      if (parsed.token) return parsed;
    }
  } catch {
    /* start without a session */
  }
  return { token: null, username: null };
}

const authSlice = createSlice({
  name: "auth",
  initialState: load(),
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; username: string }>) {
      state.token = action.payload.token;
      state.username = action.payload.username;
      localStorage.setItem(KEY, JSON.stringify({ token: state.token, username: state.username }));
    },
    clearCredentials(state) {
      state.token = null;
      state.username = null;
      localStorage.removeItem(KEY);
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
