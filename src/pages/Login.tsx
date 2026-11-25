import { useState } from "react";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { homeFor } from "../permissions";
import type { RootState } from "../store/store";
import { API_BASE_URL } from "../store/baseApi";
import { useTheme } from "../theme";
import { Btn, Field, ClubLogo, ThemeSwitcher, LanguageSwitcher } from "../ui";
import { useI18n } from "../i18n";

export function LoginPage() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const { isId } = useI18n();
  const navigate = useNavigate();
  const token = useSelector((s: RootState) => s.auth.token);
  const permissions = useSelector((s: RootState) => s.auth.permissions);
  const isSuperadmin = useSelector((s: RootState) => s.auth.isSuperadmin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to={homeFor(permissions, isSuperadmin)} replace />;

  const isModern = theme === "modern";
  const isGreen = theme === "green";

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
        data?: { token: string; username: string; permissions?: string[]; is_superadmin?: boolean };
        error?: { message?: string };
      };
      if (!res.ok || !body.data) throw new Error(body.error?.message ?? "Sign-in failed.");
      login(body.data.token, body.data.username, body.data.permissions ?? [], !!body.data.is_superadmin);
      navigate(homeFor(body.data.permissions ?? [], !!body.data.is_superadmin), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`relative flex min-h-screen flex-col items-center justify-center px-4 py-12 ${
        isGreen
          ? "bg-gradient-to-b from-[#143728] via-[#1a4434] to-[#102a1f]"
          : "bg-paper"
      }`}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeSwitcher compact />
        <LanguageSwitcher />
      </div>

      <div
        className={`w-full max-w-sm border border-line p-7 ${
          isModern
            ? "rounded-[24px] bg-white shadow-card"
            : isGreen
              ? "rounded-2xl bg-paper shadow-2xl"
              : "rounded-2xl bg-white shadow-lg"
        }`}
      >
        <div className="mb-5 flex items-center justify-between gap-3.5 border-b border-line pb-4">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-ink">
              PB{" "}
              <span
                style={
                  isGreen
                    ? { color: "var(--theme-accentDeep)" }
                    : isModern
                      ? undefined
                      : { color: "var(--theme-linkAccent)" }
                }
              >
                KECEBONG
              </span>
            </p>
            <p className="text-xs text-ink-soft">Badminton Club Manager</p>
          </div>
          <ClubLogo size="lg" showRing={isGreen} />
        </div>
        <p className="mb-4 text-xs font-medium text-ink-soft">
          {isId ? "Masuk untuk mengelola sesi dan keuangan." : "Sign in to manage sessions and club finances."}
        </p>
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
            {busy ? (isId ? "Memeriksa…" : "Checking…") : isId ? "Masuk" : "Sign in"}
          </Btn>
        </form>
        <div className="mt-5 border-t border-line pt-4 text-center">
          <Link
            to="/"
            className="text-xs font-semibold hover:underline"
            style={{ color: "var(--theme-linkAccent)" }}
          >
            {isId ? "Kembali ke Beranda" : "Back to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
