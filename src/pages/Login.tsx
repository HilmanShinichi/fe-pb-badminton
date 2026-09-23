import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import type { RootState } from "../store/store";
import { API_BASE_URL } from "../store/baseApi";
import { Btn, Field, ClubLogo } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#143728] via-[#1a4434] to-[#102a1f] px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-paper p-7 shadow-2xl border border-line">
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-line">
          <ClubLogo size="lg" />
          <div>
            <p className="text-base font-extrabold tracking-tight text-pine">
              PB <span className="text-lime-deep">KECEBONG</span>
            </p>
            <p className="text-xs text-ink-soft">Badminton Club Manager</p>
          </div>
        </div>
        <p className="mb-4 text-xs font-medium text-ink-soft">Masuk untuk mengelola sesi dan keuangan.</p>
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
        <Btn type="submit" disabled={busy} className="w-full">
          {busy ? "Checking…" : "Sign in"}
        </Btn>
      </form>
      <div className="mt-5 pt-4 border-t border-line text-center">
        <Link to="/" className="text-xs font-semibold text-pine hover:underline">
          ← Kembali ke Beranda
        </Link>
      </div>
      </div>
    </div>
  );
}
