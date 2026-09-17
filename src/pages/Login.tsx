import { useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { RootState } from "../store/store";
import { Btn, Field } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        data?: { token: string; username: string };
        error?: { message?: string };
      };
      if (!res.ok || !body.data) throw new Error(body.error?.message ?? "Sign-in failed.");
      login(body.data.token, body.data.username);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-pine px-4">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-7 shadow-card">
        <p className="text-base font-extrabold tracking-tight text-pine">
          PB <span className="text-lime-deep">KECEBONG</span>
        </p>
        <p className="mb-5 mt-1 text-sm text-ink-soft">Sign in to manage open play.</p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Username">
          <input
            id="username"
            className="w-full"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            id="password"
            className="w-full"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <Btn type="submit" disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </Btn>
      </form>
      </div>
    </div>
  );
}
