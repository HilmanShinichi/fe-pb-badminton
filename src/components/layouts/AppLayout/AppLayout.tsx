import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../auth";
import { useI18n } from "../../../i18n";
import { LanguageSwitcher } from "../../atoms/LanguageSwitcher";

const NAV: Array<{ itemKey: string; to: string; icon: ReactNode; badge?: string }> = [
  {
    itemKey: "dashboard",
    to: "/",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    itemKey: "mabar",
    to: "/mabar",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="5.5" r="2.5" />
        <path d="M6 21v-5.2a2 2 0 0 1 .8-1.6l3.7-2.7 1.5 3" />
        <path d="M18 21v-5.2a2 2 0 0 0-.8-1.6l-3.7-2.7-1.5 3" />
      </svg>
    ),
  },
  {
    itemKey: "matchmaker",
    to: "/match-maker",
    badge: "AI",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 3.5v17M3.5 12h17" />
        <circle cx="12" cy="12" r="1.4" />
      </svg>
    ),
  },
  {
    itemKey: "periods",
    to: "/periods",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.8h17M8 2.8v4M16 2.8v4" />
      </svg>
    ),
  },
  {
    itemKey: "players",
    to: "/players",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <circle cx="9.5" cy="8" r="3.4" />
        <path d="M3.5 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" />
        <path d="M15.8 5.1a3.2 3.2 0 0 1 0 5.9" />
        <path d="M17.6 14.8c2 .8 3.3 2.6 3.7 5.2" />
      </svg>
    ),
  },
  {
    itemKey: "noShows",
    to: "/no-shows",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="17" y1="8" x2="22" y2="13" />
        <line x1="22" y1="8" x2="17" y2="13" />
      </svg>
    ),
  },
  {
    itemKey: "inventory",
    to: "/inventory",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8L12 3Z" />
        <path d="M4 6.8 12 10.5l8-3.7" />
        <path d="M12 10.5V21" />
      </svg>
    ),
  },
  {
    itemKey: "finance",
    to: "/finance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.1 12h.01M17.9 12h.01" />
      </svg>
    ),
  },
  {
    itemKey: "reports",
    to: "/reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <path d="M5 20V10.5M12 20V4.5M19 20v-6.5" />
      </svg>
    ),
  },
  {
    itemKey: "simulator",
    to: "/simulator",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M9.3 3h5.4M10.4 3v5.2L4.9 17.6a2 2 0 0 0 1.8 2.9h10.6a2 2 0 0 0 1.8-2.9L13.6 8.2V3" />
        <path d="M7.4 14.6h9.2" />
      </svg>
    ),
  },
];

export function Layout({ children }: { children: ReactNode }) {
  const { auth, logout } = useAuth();
  const { t, isId } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 1024px)").matches,
  );
  const active = NAV.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)));
  const activeLabel = active ? t(`nav.${active.itemKey}.label`) : "PB Kecebong";
  const activeDesc = active ? t(`nav.${active.itemKey}.desc`) : "";

  function quit() {
    logout();
    navigate("/login");
  }

  function closeOnMobile() {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023.5px)").matches) {
      setOpen(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-hidden bg-gradient-to-b from-[#143728] via-[#1a4434] to-[#102a1f] text-paper shadow-xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-16"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-paper/10 px-3 py-3 bg-black/15">
          <button
            type="button"
            className="shrink-0 rounded-md border border-paper/20 p-2 hover:bg-paper/10 transition-colors"
            aria-label={open ? "Hide menu" : "Show menu"}
            aria-expanded={open}
            aria-controls="primary-sidebar"
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-full bg-paper transition-all duration-300 ${
                  open ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 w-full bg-paper transition-all duration-300 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-full bg-paper transition-all duration-300 ${
                  open ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
          <Link
            to="/"
            onClick={closeOnMobile}
            className={`min-w-0 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 lg:invisible"}`}
          >
            <span className="block whitespace-nowrap text-base font-extrabold tracking-tight">
              PB <span className="bg-gradient-to-r from-lime via-emerald-300 to-lime bg-clip-text text-transparent">KECEBONG</span>
            </span>
            <span className="mt-0.5 block whitespace-nowrap text-xs text-paper/60">{isId ? "Manajer mabar badminton" : "Badminton open play manager"}</span>
          </Link>
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
          <p
            aria-hidden={!open}
            className={`max-h-6 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-paper/45 transition-all duration-300 ${
              open ? "max-h-6 opacity-100" : "max-h-0 pb-0 opacity-0"
            }`}
          >
            {isId ? "Sesi & Pemain" : "Sessions & Roster"}
          </p>
          <ul className="space-y-0.5">
            {NAV.slice(0, 6).map((n) => (
              <NavItem key={n.to} itemKey={n.itemKey} to={n.to} icon={n.icon} open={open} onGo={closeOnMobile} badge={n.badge} />
            ))}
          </ul>
          <p
            aria-hidden={!open}
            className={`max-h-10 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest text-paper/45 transition-all duration-300 ${
              open ? "max-h-10 opacity-100" : "max-h-0 pb-0 pt-0 opacity-0"
            }`}
          >
            {isId ? "Kas & Laporan" : "Finance & Reports"}
          </p>
          <ul className="space-y-0.5">
            {NAV.slice(6).map((n) => (
              <NavItem key={n.to} itemKey={n.itemKey} to={n.to} icon={n.icon} open={open} onGo={closeOnMobile} badge={n.badge} />
            ))}
          </ul>
        </nav>
        <div
          className={`border-t border-paper/15 px-3 py-3 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 lg:invisible"
          }`}
        >
          <div className="mb-2.5">
            <LanguageSwitcher className="w-full justify-between bg-black/30 border-paper/15 text-paper !p-1" />
          </div>
          <p className="truncate text-sm font-medium">{auth?.username ?? "Admin"}</p>
          <button type="button" onClick={quit} className="mt-0.5 text-xs text-paper/60 underline hover:text-paper">
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-x-hidden">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 sm:gap-3 sm:px-5 lg:px-8">
            <button
              type="button"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-line bg-white p-2 text-ink shadow-2xs hover:bg-court/60 lg:hidden transition-colors"
              aria-label={open ? "Close navigation" : "Open navigation"}
              onClick={() => setOpen(!open)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{activeLabel}</p>
              {active && <p className="truncate text-xs text-ink-soft hidden sm:block">{activeDesc}</p>}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <div className="hidden items-center gap-2 md:flex">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-court via-emerald-50 to-court px-3 py-1 text-xs font-semibold text-pine border border-pine/15 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {auth?.username ?? "Admin"}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-3.5 py-4 sm:px-5 sm:py-5 lg:px-8">{children}</main>
      </div>
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
}: {
  itemKey: string;
  to: string;
  icon: ReactNode;
  open: boolean;
  onGo: () => void;
  badge?: string;
}) {
  const { t } = useI18n();
  const label = t(`nav.${itemKey}.label`);
  const desc = t(`nav.${itemKey}.desc`);
  return (
    <li>
      <NavLink
        to={to}
        end={to === "/"}
        onClick={onGo}
        title={label}
        className={({ isActive }) =>
          `group relative flex items-center rounded-lg py-2 transition-all duration-200 ${
            open ? "gap-3 px-2.5" : "justify-center px-0"
          } ${
            isActive
              ? "bg-gradient-to-r from-white/20 to-white/10 text-white font-semibold shadow-2xs border-l-2 border-lime"
              : "text-paper/75 hover:bg-white/8 hover:text-white"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors">
              <span
                className={`flex h-full w-full items-center justify-center rounded-md ${
                  isActive ? "bg-lime text-pine-deep font-bold" : "bg-black/20 text-paper/85"
                }`}
              >
                {icon}
              </span>
              {!open && badge && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-lime" />
                </span>
              )}
            </span>
            <span
              aria-hidden={!open}
              className={`min-w-0 flex-1 whitespace-nowrap transition-all duration-300 ${
                open ? "w-full opacity-100" : "w-0 overflow-hidden opacity-0"
              }`}
            >
              <span className="flex items-center justify-between gap-1.5">
                <span className="block text-sm font-semibold leading-tight">{label}</span>
                {badge && (
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-lime to-emerald-400 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-pine-deep shadow-2xs">
                    {badge}
                  </span>
                )}
              </span>
              <span className={`block text-xs leading-tight ${isActive ? "text-lime/90" : "text-paper/50"}`}>{desc}</span>
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
}
