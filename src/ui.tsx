import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { statusClass, statusLabel } from "./format";

export function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${statusClass(status)}`}>
      {statusLabel(status)}
    </span>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-ink-soft">{sub}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

const NAV: Array<{ label: string; to: string; desc: string; icon: ReactNode }> = [
  {
    label: "Dashboard",
    to: "/",
    desc: "Today at a glance",
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
    label: "Open Play",
    to: "/mabar",
    desc: "Sessions and attendance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <circle cx="12" cy="17.3" r="3" fill="currentColor" stroke="none" />
        <path d="M12 14V4.2" />
        <path d="M12 14 6.8 5.6" />
        <path d="M12 14 17.2 5.6" />
        <path d="M8.9 9.6h6.2" />
      </svg>
    ),
  },
  {
    label: "Periods",
    to: "/periods",
    desc: "Members and billing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
        <path d="M3.5 9.8h17M8 2.8v4M16 2.8v4" />
      </svg>
    ),
  },
  {
    label: "Players",
    to: "/players",
    desc: "Player roster",
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
    label: "Inventory",
    to: "/inventory",
    desc: "Shuttlecock stock",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="h-4 w-4">
        <path d="M12 3 4 6.8v10.4L12 21l8-3.8V6.8L12 3Z" />
        <path d="M4 6.8 12 10.5l8-3.7" />
        <path d="M12 10.5V21" />
      </svg>
    ),
  },
  {
    label: "Finance",
    to: "/finance",
    desc: "Cash and profit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M6.1 12h.01M17.9 12h.01" />
      </svg>
    ),
  },
  {
    label: "Reports",
    to: "/reports",
    desc: "Recaps and CSV",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
        <path d="M5 20V10.5M12 20V4.5M19 20v-6.5" />
      </svg>
    ),
  },
  {
    label: "Simulator",
    to: "/simulator",
    desc: "Test scenarios",
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
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(min-width: 1024px)").matches,
  );
  const active = NAV.find((n) => (n.to === "/" ? location.pathname === "/" : location.pathname.startsWith(n.to)));

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
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="primary-sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col overflow-hidden bg-pine text-paper transition-all duration-300 lg:sticky lg:top-0 lg:h-screen ${
          open ? "w-60" : "w-16"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-paper/15 px-3 py-3">
          <button
            type="button"
            className="shrink-0 rounded-md border border-paper/25 p-2 hover:bg-paper/10"
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
            className={`min-w-0 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 invisible"}`}
          >
            <span className="block whitespace-nowrap text-base font-extrabold tracking-tight">
              PB <span className="text-lime">KECEBONG</span>
            </span>
            <span className="mt-0.5 block whitespace-nowrap text-xs text-paper/60">Open play manager</span>
          </Link>
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-3">
          <p
            aria-hidden={!open}
            className={`max-h-6 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-paper/45 transition-all duration-300 ${
              open ? "max-h-6 opacity-100" : "max-h-0 pb-0 opacity-0"
            }`}
          >
            Sessions
          </p>
          <ul className="space-y-0.5">
            {NAV.slice(0, 4).map((n) => (
              <NavItem key={n.to} {...n} open={open} onGo={closeOnMobile} />
            ))}
          </ul>
          <p
            aria-hidden={!open}
            className={`max-h-10 overflow-hidden whitespace-nowrap px-2.5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-widest text-paper/45 transition-all duration-300 ${
              open ? "max-h-10 opacity-100" : "max-h-0 pb-0 pt-0 opacity-0"
            }`}
          >
            Finance
          </p>
          <ul className="space-y-0.5">
            {NAV.slice(4).map((n) => (
              <NavItem key={n.to} {...n} open={open} onGo={closeOnMobile} />
            ))}
          </ul>
        </nav>
        <div
          className={`border-t border-paper/15 px-3.5 py-3.5 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0 invisible"
          }`}
        >
          <p className="truncate text-sm font-medium">{auth?.username ?? "Admin"}</p>
          <button type="button" onClick={quit} className="mt-0.5 text-xs text-paper/60 underline hover:text-paper">
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pl-16 lg:pl-0">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5 lg:px-8">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{active?.label ?? "PB Kecebong"}</p>
              {active && <p className="truncate text-xs text-ink-soft">{active.desc}</p>}
            </div>
            <div className="ml-auto hidden items-center gap-2 sm:flex">
              <span className="rounded-full bg-court px-2.5 py-1 text-xs font-medium text-pine">
                {auth?.username ?? "Admin"}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-5 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  label,
  to,
  desc,
  icon,
  open,
  onGo,
}: {
  label: string;
  to: string;
  desc: string;
  icon: ReactNode;
  open: boolean;
  onGo: () => void;
}) {
  return (
    <li>
      <NavLink
        to={to}
        end={to === "/"}
        onClick={onGo}
        title={label}
        className={({ isActive }) =>
          `flex items-center rounded-lg py-2 transition-all duration-300 ${
            open ? "gap-3 px-2.5" : "justify-center px-0"
          } ${isActive ? "bg-paper text-pine" : "text-paper/75 hover:bg-paper/10 hover:text-paper"}`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                isActive ? "bg-pine text-lime" : "bg-pine-deep text-paper/85"
              }`}
            >
              {icon}
            </span>
            <span
              aria-hidden={!open}
              className={`min-w-0 whitespace-nowrap transition-all duration-300 ${
                open ? "w-full opacity-100" : "w-0 overflow-hidden opacity-0"
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">{label}</span>
              <span className={`block text-xs leading-tight ${isActive ? "text-pine/65" : "text-paper/50"}`}>{desc}</span>
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
}

export function Btn({
  children,
  variant = "primary",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "plain" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-pine text-paper hover:bg-pine-deep"
      : variant === "danger"
        ? "border border-red-300 bg-white text-red-700 hover:bg-red-50"
        : "border border-line bg-white hover:bg-court/60";
  return (
    <button type="button" className={`${base} ${styles}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
}) {  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-court/50 px-4 py-2.5">
        <h2 className="text-sm font-bold">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm text-ink-soft">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}{" "}
      <button type="button" className="font-semibold underline" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

export function Loading({ text = "Loading…" }: { text?: string }) {
  return (
    <p role="status" className="py-6 text-center text-sm text-ink-soft">
      {text}
    </p>
  );
}

const pill = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";

export function OpenLink({ to }: { to: string }) {
  return (
    <Link to={to} className={`${pill} bg-pine text-paper hover:bg-pine-deep`}>
      Open
    </Link>
  );
}

export function DeleteRowButton({ onClick, label = "Delete" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${pill} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50`}
    >
      {label}
    </button>
  );
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = "Yes, delete",
  cancelLabel = "No, keep it",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-ink/50" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-xl border border-line bg-white p-4 shadow-card">
        <h2 className="text-base font-bold">{title}</h2>
        <div className="mt-2 text-sm text-ink-soft">{body}</div>
        <div className="mt-4 flex justify-end gap-2">
          <Btn variant="plain" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Btn>
          <Btn variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Deleting…" : confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function formatGrouped(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.trunc(n).toLocaleString("id-ID");
}

function formatDigits(digits: string): string {
  const d = digits.replace(/^0+(?=\d)/, "");
  if (d === "") return "";
  return Number(d).toLocaleString("id-ID");
}

// MoneyInput formats live while typing (90000 → 90.000). The DOM value and
// cursor are updated synchronously inside onChange, so fast typing can never
// race a re-render and scramble digits.
export function MoneyInput({
  id,
  value,
  onChange,
  min = 0,
}: {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  function cursorAfter(formatted: string, digitCount: number): number {
    let seen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) seen++;
      if (seen === digitCount) return i + 1;
    }
    return formatted.length;
  }

  return (
    <input
      id={id}
      className="w-full tabular-nums"
      inputMode="numeric"
      autoComplete="off"
      value={focused ? text : formatGrouped(value)}
      onFocus={() => {
        setText(value ? formatGrouped(value) : "");
        setFocused(true);
      }}
      onChange={(e) => {
        const el = e.target;
        const raw = el.value;
        const cursor = el.selectionStart ?? raw.length;
        const prevDigits = text.replace(/[^0-9]/g, "");
        let digits = raw.replace(/[^0-9]/g, "");
        let digitCursor = raw.slice(0, cursor).replace(/[^0-9]/g, "").length;
        if (digits === prevDigits && raw.length < text.length) {
          // Backspace landed on a separator: delete the digit before it.
          digits = digits.slice(0, Math.max(0, digitCursor - 1)) + digits.slice(digitCursor);
          digitCursor = Math.max(0, digitCursor - 1);
        }
        digits = digits.replace(/^0+(?=\d)/, "");
        const formatted = formatDigits(digits);
        el.value = formatted;
        try {
          const pos = cursorAfter(formatted, Math.min(digitCursor, digits.length));
          el.setSelectionRange(pos, pos);
        } catch {
          /* ignore */
        }
        setText(formatted);
        onChange(Math.max(min, Number(digits) || 0));
      }}
      onBlur={() => setFocused(false)}
    />
  );
}
