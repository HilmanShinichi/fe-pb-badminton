import { useMemo, useState } from "react";
import { useI18n } from "../../../i18n";

export interface PickerPlayer {
  player_id: string;
  name: string;
  grade: string | null;
  gender?: string | null;
}

// Searchable player picker: replaces native <select> so a big roster stays
// usable. Button shows the pick; expanding reveals a search box plus a
// scrollable list. Inline expansion (no floating overlay) so it never gets
// clipped inside modals.
export function PlayerPicker({
  id,
  value,
  onChange,
  pool,
  placeholder,
  allowClear,
  clearLabel,
}: {
  id?: string;
  value: string;
  onChange: (playerId: string) => void;
  pool: PickerPlayer[];
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = pool.find((p) => p.player_id === value);
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = [...pool].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return list;
    return list.filter((p) => p.name.toLowerCase().includes(query));
  }, [pool, q]);

  function pick(pid: string) {
    onChange(pid);
    setOpen(false);
    setQ("");
  }

  const sub = (p: PickerPlayer) => `${p.grade ? ` (${p.grade})` : ""}${p.gender ? ` [${p.gender}]` : ""}`;
  return (
    <div>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
      >
        <span className={`truncate ${selected ? "font-semibold text-ink" : "text-ink-faint"}`}>
          {selected ? `${selected.name}${sub(selected)}` : (placeholder ?? t("matchmaker.playerPickPlaceholder"))}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="mt-1 overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="border-b border-line/60 p-1.5">
            <input
              autoFocus
              className="w-full rounded-md border border-line px-2.5 py-1.5 text-xs focus:border-pine focus:outline-hidden"
              placeholder={t("matchmaker.customSearchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
            />
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {allowClear && value && (
              <button
                type="button"
                onClick={() => pick("")}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-bold text-red-700 hover:bg-red-50"
              >
                ✕ {clearLabel ?? t("matchmaker.manualCardNoReferee")}
              </button>
            )}
            {filtered.length === 0 ? (
              <p className="p-2 text-center text-xs text-ink-faint">{t("matchmaker.noMatchingPlayers")}</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.player_id}
                  type="button"
                  onClick={() => pick(p.player_id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-court/60 ${p.player_id === value ? "bg-court/60 font-extrabold text-pine" : "text-ink"}`}
                >
                  <span className="truncate">{p.name}{sub(p)}</span>
                  {p.player_id === value && <span aria-hidden>✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
