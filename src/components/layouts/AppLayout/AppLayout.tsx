import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import { useI18n } from "../../../i18n";
import { useTheme } from "../../../theme";
import { API_BASE_URL } from "../../../store/baseApi";
import { LanguageSwitcher } from "../../atoms/LanguageSwitcher";
import { ThemeSwitcher } from "../../atoms/ThemeSwitcher";
import { ClubLogo } from "../../atoms/ClubLogo";
import { LogoUploadModal } from "../../molecules/LogoUploadModal";

interface NavDef {
  itemKey: string;
  to: string;
  icon: ReactNode;
  badge?: string;
  perm: string;
}

const NAV: NavDef[] = [
  {
    itemKey: "dashboard",
    perm: "dashboard",
    to: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4" aria-hidden="true">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    itemKey: "mabar",
    perm: "mabar",
    to: "/mabar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="5.5" r="2.5" />
        <path d="M6 21v-5.2a2 2 0 0 1 .8-1.6l3.7-2.7 1.5 3" />
        <path d="M18 21v-5.2a2 2 0 0 0-.8-1.6l-3.7-2.7-1.5 3" />
      </svg>
    ),
  },
  {
    itemKey: "matchmaker",
    perm: "matchmaker",
    to: "/match-maker",
    badge: "AI",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17" />
        <circle cx="12" cy="12" r="1.4" />
      </svg>
    ),
  },
  {
    itemKey: "periods",
    perm: "periods",
    to: "/periods",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.8h17M8 2.8v4M16 2.8v4" />
      </svg>
    ),
  },
  {
    itemKey: "players",
    perm: "players",
    to: "/players",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="9.5" cy="8" r="3.4" />
        <path d="M3.5 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" />
        <path d="M15.8 5.1a3.2 3.2 0 0 1 0 5.9" />
        <path d="M17.6 14.8c2 .8 3.3 2.6 3.7 5.2" />
      </svg>
    ),
  },
  {
    itemKey: "noShows",
    perm: "reports",
    to: "/no-shows",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="17" y1="8" x2="22" y2="13" />
        <line x1="22" y1="8" x2="17" y2="13" />
      </svg>
    ),
  },
  {
    itemKey: "inventory",
    perm: "inventory",
    to: "/inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8L12 3Z" />
        <path d="M4 6.8 12 10.5l8-3.7" />
        <path d="M12 10.5V21" />
      </svg>
    ),
  },
  {
    itemKey: "finance",
    perm: "finance",
    to: "/finance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
        <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.1 12h.01M17.9 12h.01" />
      </svg>
    ),
  },
  {
    itemKey: "reports",
    perm: "reports",
    to: "/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
        <path d="M5 20V10.5M12 20V4.5M19 20v-6.5" />
      </svg>
    ),
  },
  {
    itemKey: "simulator",
    perm: "simulator",
    to: "/simulator",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M9.3 3h5.4M10.4 3v5.2L4.9 17.6a2 2 0 0 0 1.8 2.9h10.6a2 2 0 0 0 1.8-2.9L13.6 8.2V3" />
        <path d="M7.4 14.6h9.2" />
      </svg>
    ),
  },
  {
    itemKey: "users",
    perm: "users",
    to: "/users",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
        <path d="M18.5 8v6M15.5 11h6" />
      </svg>
    ),
  },
];

const SESSION_KEYS = ["dashboard", "mabar", "matchmaker", "periods", "players", "noShows"];
const FINANCE_KEYS = ["inventory", "finance", "reports", "simulator"];

export function Layout({ children }: { children: ReactNode }) {
  const { auth, logout, can, refresh } = useAuth();
  const { t, isId } = useI18n();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 1024px)").matches,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  // Sync access rights from the server once per mount (permission edits by
  // another superadmin apply without forcing a re-login).
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    setMoreOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  const visibleNav = NAV.filter((n) => can(n.perm));
  const navSession = visibleNav.filter((n) => SESSION_KEYS.includes(n.itemKey));
  const navFinance = visibleNav.filter((n) => FINANCE_KEYS.includes(n.itemKey));
  const navAdmin = visibleNav.filter((n) => n.itemKey === "users");

  const active = NAV.find(
    (n) => location.pathname === n.to || (n.to !== "/dashboard" && location.pathname.startsWith(n.to)),
  );
  const activeLabel = active ? t(`nav.${active.itemKey}.label`) : "PB Kecebong";
  const activeDesc = active ? t(`nav.${active.itemKey}.desc`) : "";

  function quit() {
    logout();
    navigate("/login");
  }

  async function changePassword() {
    if (!auth?.token || !pwCur || pwNext.length < 8 || pwBusy) return;
    setPwBusy(true);
    setPwError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ current_password: pwCur, new_password: pwNext }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed.");
      setPwCur("");
      setPwNext("");
      setPwDone(true);
      setTimeout(() => {
        setPwOpen(false);
        setPwDone(false);
      }, 1200);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Failed.");
    } finally {
      setPwBusy(false);
    }
  }

  function closeOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023.5px)").matches) {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setMoreOpen(false);
        setAccountOpen(false);
        setPwOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const passwordModal = pwOpen && (
    <div role="dialog" aria-modal="true" aria-label={isId ? "Ganti sandi" : "Change password"} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-sm bg-white p-5 shadow-2xl border border-line ${theme === "modern" ? "rounded-[22px]" : "rounded-2xl"}`}>
        <h3 className="text-base font-black text-ink">{isId ? "Ganti sandi" : "Change password"}</h3>
        <div className="mt-3 space-y-2.5">
          <label htmlFor="pw-current" className="block text-xs font-semibold text-ink-soft">
            {isId ? "Sandi lama" : "Current password"}
          </label>
          <input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            placeholder={isId ? "Sandi lama" : "Current password"}
            className="w-full"
            value={pwCur}
            onChange={(e) => setPwCur(e.target.value)}
          />
          <label htmlFor="pw-next" className="block text-xs font-semibold text-ink-soft">
            {isId ? "Sandi baru (min 8)" : "New password (min 8)"}
          </label>
          <input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            placeholder={isId ? "Sandi baru (min 8)" : "New password (min 8)"}
            className="w-full"
            value={pwNext}
            onChange={(e) => setPwNext(e.target.value)}
          />
        </div>
        {pwError && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{pwError}</p>}
        {pwDone && <p className="mt-2 text-xs font-semibold text-emerald-700">✓</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setPwOpen(false)}
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-court/60"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={pwBusy || !pwCur || pwNext.length < 8}
            onClick={changePassword}
            className="rounded-xl bg-[var(--theme-ctaBg)] px-4 py-2 text-sm font-bold text-[var(--theme-ctaText)] hover:bg-[var(--theme-ctaBgHover)] disabled:opacity-50"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );

  if (theme === "modern") {
    return (
      <ModernShell
        auth={auth}
        active={active}
        activeLabel={activeLabel}
        visibleNav={visibleNav}
        navSession={navSession}
        navFinance={navFinance}
        navAdmin={navAdmin}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        accountOpen={accountOpen}
        setAccountOpen={setAccountOpen}
        onOpenLogo={() => setLogoModalOpen(true)}
        onOpenPassword={() => {
          setAccountOpen(false);
          setMoreOpen(false);
          setPwOpen(true);
          setPwError("");
          setPwDone(false);
        }}
        onLogout={quit}
      >
        {children}
        <LogoUploadModal open={logoModalOpen} onClose={() => setLogoModalOpen(false)} />
        {passwordModal}
      </ModernShell>
    );
  }

  const isLightSidebar = theme === "light";

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="primary-sidebar"
        style={{
          backgroundImage: `linear-gradient(to bottom, var(--theme-sidebarGradientFrom), var(--theme-sidebarGradientVia), var(--theme-sidebarGradientTo))`,
          color: "var(--theme-sidebarText)",
        }}
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-hidden transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          isLightSidebar ? "border-r border-line shadow-sm" : "shadow-xl"
        } ${open ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-16"}`}
      >
        <div
          className={`flex h-16 items-center border-b transition-all duration-300 ${
            isLightSidebar ? "border-line bg-white/80" : "border-paper/10 bg-black/15"
          } ${open ? "gap-2.5 px-3 justify-start" : "justify-center px-0"}`}
        >
          <button
            type="button"
            className={`shrink-0 h-10 w-10 flex items-center justify-center rounded-xl border transition-colors ${
              isLightSidebar
                ? "border-line hover:bg-court text-ink"
                : "border-paper/20 hover:bg-paper/10 text-paper"
            }`}
            aria-label={open ? "Hide menu" : "Show menu"}
            aria-expanded={open}
            aria-controls="primary-sidebar"
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-full bg-current transition-all duration-300 ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-full bg-current transition-all duration-300 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-full bg-current transition-all duration-300 ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
          {open && (
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <ClubLogo
                size="sm"
                editable
                onEdit={() => setLogoModalOpen(true)}
                className="cursor-pointer"
              />
              <Link
                to="/dashboard"
                onClick={closeOnMobile}
                className="min-w-0 flex flex-col transition-opacity duration-300 flex-1"
              >
                <span className="block whitespace-nowrap text-base font-extrabold tracking-tight">
                  PB{" "}
                  <span className={isLightSidebar ? "text-pine" : "bg-gradient-to-r from-lime via-emerald-300 to-lime bg-clip-text text-transparent"}>
                    KECEBONG
                  </span>
                </span>
                <span className={`mt-0.5 block whitespace-nowrap text-xs ${isLightSidebar ? "text-ink-soft" : "text-paper/60"}`}>
                  {isId ? "Manajer mabar badminton" : "Badminton open play manager"}
                </span>
              </Link>
            </div>
          )}
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
          {navSession.length > 0 && (
            <>
              {open && (
                <p className={`max-h-6 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 ${isLightSidebar ? "text-ink-faint" : "text-paper/45"}`}>
                  {isId ? "Sesi & Pemain" : "Sessions & Roster"}
                </p>
              )}
              <ul className="space-y-1">
                {navSession.map((n) => (
                  <NavItem key={n.to} itemKey={n.itemKey} to={n.to} icon={n.icon} open={open} onGo={closeOnMobile} badge={n.badge} lightSidebar={isLightSidebar} />
                ))}
              </ul>
            </>
          )}
          {navFinance.length > 0 && (
            <>
              {open ? (
                <p className={`max-h-10 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 ${isLightSidebar ? "text-ink-faint" : "text-paper/45"}`}>
                  {isId ? "Kas & Laporan" : "Finance & Reports"}
                </p>
              ) : (
                <div className={`my-2.5 mx-auto h-px w-6 ${isLightSidebar ? "bg-line" : "bg-paper/15"}`} />
              )}
              <ul className="space-y-1">
                {navFinance.map((n) => (
                  <NavItem key={n.to} itemKey={n.itemKey} to={n.to} icon={n.icon} open={open} onGo={closeOnMobile} badge={n.badge} lightSidebar={isLightSidebar} />
                ))}
              </ul>
            </>
          )}
          {navAdmin.length > 0 && (
            <>
              {open ? (
                <p className={`max-h-10 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest transition-all duration-300 ${isLightSidebar ? "text-ink-faint" : "text-paper/45"}`}>
                  Admin
                </p>
              ) : (
                <div className={`my-2.5 mx-auto h-px w-6 ${isLightSidebar ? "bg-line" : "bg-paper/15"}`} />
              )}
              <ul className="space-y-1">
                {navAdmin.map((n) => (
                  <NavItem key={n.to} itemKey={n.itemKey} to={n.to} icon={n.icon} open={open} onGo={closeOnMobile} badge={n.badge} lightSidebar={isLightSidebar} />
                ))}
              </ul>
            </>
          )}
        </nav>
        {open ? (
          <div className={`border-t px-3 py-3 transition-opacity duration-300 ${isLightSidebar ? "border-line" : "border-paper/15"}`}>
            <div className="mb-2.5 flex flex-col gap-2 lg:hidden">
              <ThemeSwitcher className="w-full justify-between" />
              <LanguageSwitcher className="w-full justify-between" />
            </div>
            <div className="flex items-center justify-between">
              <p className="truncate text-sm font-medium">{auth?.username ?? "Admin"}</p>
              <button
                type="button"
                onClick={() => setLogoModalOpen(true)}
                className={`text-[11px] hover:underline font-semibold ${isLightSidebar ? "text-pine" : "text-lime"}`}
                title="Ganti logo klub"
              >
                {isId ? "Ubah Logo" : "Edit Logo"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPwOpen(true);
                  setPwError("");
                  setPwDone(false);
                }}
                className={`mt-0.5 text-xs underline ${isLightSidebar ? "text-ink-soft hover:text-ink" : "text-paper/60 hover:text-paper"}`}
              >
                {isId ? "Ganti sandi" : "Change password"}
              </button>
              <button
                type="button"
                onClick={quit}
                className={`mt-0.5 text-xs underline ${isLightSidebar ? "text-ink-soft hover:text-ink" : "text-paper/60 hover:text-paper"}`}
              >
                {t("nav.logout")}
              </button>
            </div>
          </div>
        ) : (
          <div className={`border-t py-3 flex flex-col items-center justify-center gap-2 ${isLightSidebar ? "border-line" : "border-paper/15"}`}>
            <button
              type="button"
              onClick={() => setLogoModalOpen(true)}
              title="Ganti Logo Klub"
              aria-label="Ganti Logo Klub"
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${
                isLightSidebar ? "text-ink-soft hover:bg-court hover:text-pine" : "text-paper/70 hover:bg-white/10 hover:text-lime"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={quit}
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
              className={`h-10 w-10 flex items-center justify-center rounded-xl transition-colors ${
                isLightSidebar ? "text-ink-soft hover:bg-red-50 hover:text-red-700" : "text-paper/70 hover:bg-white/10 hover:text-red-300"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 h-16 border-b border-line/80 bg-paper/90 backdrop-blur-md">
          <div className="flex h-full items-center gap-2.5 px-3.5 sm:gap-3 sm:px-5 lg:px-8">
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line bg-white p-2 text-ink shadow-2xs hover:bg-court/60 lg:hidden transition-colors min-h-[40px] min-w-[40px]"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{activeLabel}</p>
              {active && <p className="truncate text-xs text-ink-soft hidden sm:block">{activeDesc}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
              <ThemeSwitcher compact />
              <div className="hidden sm:block">
                <LanguageSwitcher />
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink border border-line shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  {auth?.username ?? "Admin"}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:px-5 sm:py-5 lg:px-8 overflow-x-hidden">{children}</main>
      </div>

      <LogoUploadModal open={logoModalOpen} onClose={() => setLogoModalOpen(false)} />
      {passwordModal}
    </div>
  );
}

function ModernShell({
  auth,
  active,
  activeLabel,
  visibleNav,
  navSession,
  navFinance,
  navAdmin,
  moreOpen,
  setMoreOpen,
  accountOpen,
  setAccountOpen,
  onOpenLogo,
  onOpenPassword,
  onLogout,
  children,
}: {
  auth: { username?: string | null; isSuperadmin?: boolean } | null;
  active: NavDef | undefined;
  activeLabel: string;
  visibleNav: NavDef[];
  navSession: NavDef[];
  navFinance: NavDef[];
  navAdmin: NavDef[];
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
  accountOpen: boolean;
  setAccountOpen: (v: boolean) => void;
  onOpenLogo: () => void;
  onOpenPassword: () => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const { t, isId } = useI18n();
  const navigate = useNavigate();

  type GroupId = "sessions" | "finance" | "admin";
  const currentGroup: GroupId = active
    ? FINANCE_KEYS.includes(active.itemKey)
      ? "finance"
      : active.itemKey === "users"
        ? "admin"
        : "sessions"
    : "sessions";

  const groups: Array<{ id: GroupId; label: string; firstTo: string; items: NavDef[] }> = [];
  if (navSession.length > 0) {
    groups.push({
      id: "sessions",
      label: isId ? "Sesi & Mabar" : "Sessions",
      firstTo: navSession[0].to,
      items: navSession,
    });
  }
  if (navFinance.length > 0) {
    groups.push({
      id: "finance",
      label: isId ? "Kas & Laporan" : "Finance",
      firstTo: navFinance[0].to,
      items: navFinance,
    });
  }
  if (navAdmin.length > 0) {
    groups.push({
      id: "admin",
      label: "Admin",
      firstTo: navAdmin[0].to,
      items: navAdmin,
    });
  }

  // Build up to 4 quick-action squircle tiles for the active segment (matching
  // the 5-tile strip in themenew.png: 4 primary destinations + "Lainnya" drawer).
  const activeGroupItems = groups.find((g) => g.id === currentGroup)?.items ?? visibleNav;
  const quickTiles = activeGroupItems.slice(0, 4);
  const statusPillText =
    active?.itemKey === "simulator"
      ? isId
        ? "Simulasi"
        : "Simulation"
      : active?.itemKey === "matchmaker"
        ? "Match AI"
        : auth?.isSuperadmin
          ? "Superadmin"
          : "Admin";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-3.5 pb-4 sm:px-6 lg:px-8">
          {/* Top row: Title + status pill on left, Theme/Lang + Circular ClubLogo avatar on right */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                to="/dashboard"
                className="truncate text-lg sm:text-xl font-bold tracking-tight text-ink hover:opacity-80 transition-opacity"
              >
                PB Kecebong
              </Link>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: "var(--theme-badgeBg)", color: "var(--theme-badgeText)" }}
              >
                {statusPillText}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <ThemeSwitcher compact />
                <LanguageSwitcher />
              </div>
              <div className="relative flex items-center gap-1.5">
                <ClubLogo
                  size="md"
                  editable
                  showRing={false}
                  onEdit={onOpenLogo}
                  className="border border-line shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  aria-label={isId ? "Menu akun" : "Account menu"}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-[#f5f6f8] text-ink-soft hover:bg-court hover:text-ink transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-2 w-60 rounded-[20px] border border-line bg-white p-2 shadow-lg"
                  >
                    <div className="border-b border-line px-3 py-2 mb-1">
                      <p className="truncate text-sm font-bold text-ink">{auth?.username ?? "Admin"}</p>
                      <p className="text-xs text-ink-faint">{activeLabel}</p>
                    </div>
                    <div className="md:hidden px-2 py-2 space-y-2 border-b border-line mb-1">
                      <ThemeSwitcher className="w-full justify-between" />
                      <LanguageSwitcher className="w-full justify-between" />
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setAccountOpen(false);
                        onOpenLogo();
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-court transition-colors"
                    >
                      {isId ? "Ubah logo klub" : "Change club logo"}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onOpenPassword}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-court transition-colors"
                    >
                      {isId ? "Ganti sandi" : "Change password"}
                    </button>
                    <Link
                      to="/live"
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-court transition-colors"
                    >
                      {isId ? "Lihat Live Skor Publik" : "Public Live View"}
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onLogout}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
                    >
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Segmented Pill Category Track (matching Peta | Rute | Halte) */}
          {groups.length > 0 && (
            <nav aria-label="Workspace sections" className="mt-3.5">
              <div
                role="tablist"
                aria-label={isId ? "Kategori menu" : "Navigation categories"}
                className="grid rounded-full bg-[var(--theme-trackBg)] p-1"
                style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
              >
                {groups.map((grp) => {
                  const isCurrent = grp.id === currentGroup;
                  return (
                    <button
                      key={grp.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => {
                        if (!isCurrent) navigate(grp.firstTo);
                      }}
                      className={`min-h-[38px] rounded-full px-3 py-1.5 text-sm font-semibold transition-all truncate ${
                        isCurrent
                          ? "bg-white text-ink shadow-xs"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {grp.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          )}

          {/* Squircle Quick-Action Strip (matching the 5 rounded icon tiles) */}
          <nav aria-label="Primary" className="mt-4">
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3 max-w-xl mx-auto sm:max-w-none sm:flex sm:items-start sm:justify-start">
              {quickTiles.map((item) => {
                const label = t(`nav.${item.itemKey}.label`);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/dashboard"}
                    className="group flex flex-col items-center gap-1.5 text-center sm:w-24"
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                            isActive
                              ? "border-pine bg-pine text-white shadow-xs"
                              : "border-line/80 bg-[#f3f5f8] text-ink group-hover:bg-court"
                          }`}
                        >
                          {item.icon}
                          {item.badge && (
                            <span
                              className="absolute -top-1.5 -right-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                              style={{ backgroundColor: "var(--theme-linkSoftBg)", color: "var(--theme-linkSoftText)" }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </span>
                        <span className={`text-[11px] sm:text-xs leading-tight line-clamp-2 ${isActive ? "font-bold text-ink" : "font-medium text-ink-soft"}`}>
                          {label}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}

              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="modern-more-nav"
                onClick={() => setMoreOpen(!moreOpen)}
                className="group flex flex-col items-center gap-1.5 text-center sm:w-24"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
                    moreOpen
                      ? "border-pine bg-pine text-white shadow-xs"
                      : "border-line/80 bg-[#f3f5f8] text-ink group-hover:bg-court"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                    <rect x="4" y="4" width="7" height="7" rx="2" />
                    <rect x="13" y="4" width="7" height="7" rx="2" />
                    <rect x="4" y="13" width="7" height="7" rx="2" />
                    <rect x="13" y="13" width="7" height="7" rx="2" />
                  </svg>
                </span>
                <span className={`text-[11px] sm:text-xs leading-tight ${moreOpen ? "font-bold text-ink" : "font-medium text-ink-soft"}`}>
                  {isId ? "Lainnya" : "More"}
                </span>
              </button>
            </div>

            {moreOpen && (
              <div
                id="modern-more-nav"
                className="mt-4 rounded-[22px] border border-line bg-[#f8f9fb] p-3.5 shadow-card"
              >
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                    {isId ? "Semua Menu" : "All Destinations"}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--theme-linkAccent)" }}
                  >
                    {isId ? "Tutup" : "Close"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {visibleNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/dashboard"}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                          isActive
                            ? "border-pine bg-pine text-white font-semibold"
                            : "border-line bg-white text-ink hover:bg-court/60"
                        }`
                      }
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{t(`nav.${item.itemKey}.label`)}</span>
                    </NavLink>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 md:hidden">
                  <ThemeSwitcher compact />
                  <LanguageSwitcher />
                </div>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

function NavItem({
  itemKey,
  to,
  icon,
  open,
  onGo,
  badge,
  lightSidebar,
}: {
  itemKey: string;
  to: string;
  icon: ReactNode;
  open: boolean;
  onGo: () => void;
  badge?: string;
  lightSidebar: boolean;
}) {
  const { t } = useI18n();
  const label = t(`nav.${itemKey}.label`);
  const desc = t(`nav.${itemKey}.desc`);
  return (
    <li>
      <NavLink
        to={to}
        end={to === "/dashboard"}
        onClick={onGo}
        title={label}
        className={({ isActive }) =>
          `group relative flex items-center rounded-xl transition-all duration-200 ${
            open
              ? "gap-3 px-3 py-2.5 " +
                (isActive
                  ? lightSidebar
                    ? "bg-court text-pine font-semibold border-l-2 border-pine"
                    : "bg-white/15 text-white font-semibold shadow-2xs border-l-2 border-lime"
                  : lightSidebar
                    ? "text-ink-soft hover:bg-court/70 hover:text-ink"
                    : "text-paper/75 hover:bg-white/8 hover:text-white")
              : "mx-auto h-10 w-10 justify-center p-0 " +
                (isActive
                  ? lightSidebar
                    ? "bg-pine text-white font-bold shadow-sm"
                    : "bg-lime text-pine-deep font-bold shadow-md ring-1 ring-lime/40"
                  : lightSidebar
                    ? "text-ink-soft hover:bg-court hover:text-ink"
                    : "text-paper/75 hover:bg-white/10 hover:text-white")
          }`
        }
      >
        {({ isActive }) => (
          <>
            {open ? (
              <>
                <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors">
                  <span
                    className={`flex h-full w-full items-center justify-center rounded-md ${
                      isActive
                        ? lightSidebar
                          ? "bg-pine text-white font-bold"
                          : "bg-lime text-pine-deep font-bold"
                        : lightSidebar
                          ? "bg-court text-ink-soft"
                          : "bg-black/20 text-paper/85"
                    }`}
                  >
                    {icon}
                  </span>
                </span>
                <span className="min-w-0 flex-1 whitespace-nowrap">
                  <span className="flex items-center justify-between gap-1.5">
                    <span className="block text-sm font-semibold leading-tight">{label}</span>
                    {badge && (
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shadow-2xs ${
                          lightSidebar ? "bg-pine text-white" : "bg-gradient-to-r from-lime to-emerald-400 text-pine-deep"
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`block text-xs leading-tight ${
                      isActive
                        ? lightSidebar
                          ? "text-pine/80"
                          : "text-lime/90"
                        : lightSidebar
                          ? "text-ink-faint"
                          : "text-paper/50"
                    }`}
                  >
                    {desc}
                  </span>
                </span>
              </>
            ) : (
              <span className="relative flex items-center justify-center">
                {icon}
                {badge && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
                  </span>
                )}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  );
}
