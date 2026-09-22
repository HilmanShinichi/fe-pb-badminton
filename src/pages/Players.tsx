import { useState } from "react";
import {
  useDeletePlayerMutation,
  useCreatePlayerMutation,
  usePlayersQuery,
  useUpdatePlayerMutation,
} from "../store/services";
import { ApiError } from "../store/baseApi";
import { useI18n } from "../i18n";
import { Badge, Btn, ConfirmModal, Empty, ErrorBox, Field, GenderChip, GradeChip, Loading, PageHead } from "../ui";
import type { Player } from "../types";
import { GRADES } from "../types";

export function PlayersPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", notes: "", grade: "", gender: "" });
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Player | null>(null);
  const [actionError, setActionError] = useState("");
  const list = usePlayersQuery(q);
  const [create, createState] = useCreatePlayerMutation();
  const [removePlayer, removeState] = useDeletePlayerMutation();

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await removePlayer(pendingDelete.id).unwrap();
      setPendingDelete(null);
      setActionError("");
    } catch (e) {
      setPendingDelete(null);
      setActionError(e instanceof ApiError ? e.message : t("players.errorDelete"));
    }
  }

  async function submit() {
    try {
      await create({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        grade: form.grade || null,
        gender: form.gender || null,
      }).unwrap();
      setForm({ name: "", phone: "", notes: "", grade: "", gender: "" });
      setFormError("");
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("players.errorSave"));
    }
  }

  const playersList = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHead
        title={t("players.pageTitle")}
        sub={t("players.pageSubtitle", { count: playersList.length })}
      />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* ADD PLAYER CARD */}
        <section aria-label={t("players.newPlayer")} className="h-fit rounded-2xl border border-line bg-white shadow-card p-4">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-pine font-black">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-ink">{t("players.newPlayer")}</h2>
          </div>
          <div className="space-y-3">
            <Field label={t("players.nameLabel")} error={!form.name.trim() && formError ? t("players.nameRequired") : undefined}>
              <input
                id="nama"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
                placeholder={t("players.nameLabel")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label={t("players.phoneLabel")} hint={t("players.phoneHint")}>
              <input
                id="whatsapp"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
                placeholder="0812..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label={t("players.notesLabel")} hint={t("players.notesHint")}>
              <input
                id="catatan"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
                placeholder={t("players.notesHint")}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label={t("players.colGrade")} hint="A1–C3.">
              <select
                id="grade"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden bg-white"
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
              >
                <option value="">—</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label={t("players.colGender")}>
              <select
                id="gender"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden bg-white"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">—</option>
                <option value="L">♂ {t("players.genderMale")}</option>
                <option value="P">♀ {t("players.genderFemale")}</option>
              </select>
            </Field>
            {formError && form.name.trim() && (
              <p role="alert" className="text-xs text-red-700 font-medium">{formError}</p>
            )}
            <Btn disabled={createState.isLoading || !form.name.trim()} onClick={submit} className="w-full justify-center">
              {createState.isLoading ? t("players.btnSaving") : t("players.btnAddPlayer")}
            </Btn>
          </div>
        </section>

        {/* PLAYER LIST CARD */}
        <section aria-label={t("players.pageTitle")} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3.5 bg-gradient-to-r from-court/40 via-white to-court/20">
            <div className="relative w-full max-w-xs">
              <label htmlFor="cari" className="sr-only">{t("players.searchPlaceholder")}</label>
              <input
                id="cari"
                className="w-full rounded-lg border border-line pl-8 pr-3 py-1.5 text-xs sm:text-sm focus:border-pine focus:outline-hidden bg-white"
                placeholder={t("players.searchPlaceholder")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <span className="pointer-events-none absolute left-2.5 top-2 sm:top-2.5 text-xs text-ink-faint">🔍</span>
            </div>
            <span className="text-xs font-bold text-ink-soft">
              {playersList.length} {t("players.colPlayer").toLowerCase()}
            </span>
            {actionError && <p role="alert" className="w-full text-xs text-red-700 font-semibold">{actionError}</p>}
          </div>

          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-4"><ErrorBox message={t("players.errorLoad")} onRetry={() => list.refetch()} /></div>
          ) : playersList.length === 0 ? (
            <div className="p-8 text-center"><Empty text={q ? t("players.emptyMatching") : t("players.emptyNone")} /></div>
          ) : (
            <>
              {/* MOBILE RESPONSIVE CARDS (FITS SCREEN 100%, NO HORIZONTAL SCROLL) */}
              <div className="divide-y divide-line/70 block sm:hidden">
                {playersList.map((p) => (
                  <PlayerMobileCard key={p.id} player={p} onDelete={() => setPendingDelete(p)} />
                ))}
              </div>

              {/* TABLE VIEW FOR TABLET & DESKTOP (WITH REAL STYLED BUTTONS) */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("players.colName")}</th>
                      <th>{t("players.colPhone")}</th>
                      <th>{t("players.colGrade")}</th>
                      <th>{t("players.colGender")}</th>
                      <th>{t("players.colStatus")}</th>
                      <th className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {playersList.map((p) => (
                      <PlayerRow key={p.id} player={p} onDelete={() => setPendingDelete(p)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title={t("players.deleteModalTitle", { name: pendingDelete.name })}
          body={
            <p>
              {t("players.deleteModalBody", { name: pendingDelete.name })}
            </p>
          }
          confirmLabel={t("players.btnConfirmDelete")}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/**
 * Mobile-optimized player card that takes 100% of the screen width
 * and avoids any horizontal scrolling on small phone viewports.
 */
function PlayerMobileCard({ player, onDelete }: { player: Player; onDelete: () => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [phone, setPhone] = useState(player.phone ?? "");
  const [grade, setGrade] = useState(player.grade ?? "");
  const [gender, setGender] = useState(player.gender ?? "");
  const [error, setError] = useState("");
  const [update, updateState] = useUpdatePlayerMutation();

  async function save() {
    try {
      await update({
        id: player.id,
        name: name.trim(),
        phone: phone.trim() || null,
        notes: player.notes,
        grade: grade === (player.grade ?? "") ? undefined : grade || null,
        gender: gender === (player.gender ?? "") ? undefined : gender || null,
      }).unwrap();
      setEditing(false);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("players.errorSave"));
    }
  }

  const initial = player.name.trim().slice(0, 1).toUpperCase();

  if (editing) {
    return (
      <div className="p-3 bg-emerald-50/30 space-y-2.5">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-ink">{t("players.colName")}</label>
          <input
            className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold bg-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-ink">{t("players.colPhone")}</label>
            <input
              className="w-full rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold bg-white"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-ink">{t("players.colGrade")}</label>
            <select
              className="w-full rounded-lg border border-line px-2 py-1.5 text-xs font-semibold bg-white"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">—</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-ink">{t("players.colGender")}</label>
            <select
              className="w-full rounded-lg border border-line px-2 py-1.5 text-xs font-semibold bg-white"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">—</option>
              <option value="L">♂ {t("players.genderMale")}</option>
              <option value="P">♀ {t("players.genderFemale")}</option>
            </select>
          </div>
        </div>

        {error && <p role="alert" className="text-xs text-red-700 font-semibold">{error}</p>}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-pine py-1.5 text-xs font-bold text-white shadow-2xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            disabled={updateState.isLoading || !name.trim()}
            onClick={save}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            {t("players.btnSave")}
          </button>
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-white py-1.5 text-xs font-bold text-ink hover:bg-court/60 active:scale-95 transition-all"
            onClick={() => {
              setEditing(false);
              setName(player.name);
              setPhone(player.phone ?? "");
              setGrade(player.grade ?? "");
              setGender(player.gender ?? "");
            }}
          >
            {t("players.btnCancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2.5 p-3 hover:bg-court/30 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1e523b] text-xs font-black text-lime shadow-2xs">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-ink truncate max-w-[130px]">{player.name}</span>
            {player.grade && <GradeChip grade={player.grade} />}
            {player.gender && <GenderChip gender={player.gender} />}
            <Badge status={player.status} />
          </div>
          {player.phone ? (
            <a
              href={`https://wa.me/${player.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-pine tabular-nums"
            >
              <span>📱</span> {player.phone}
            </a>
          ) : (
            <span className="text-[11px] text-ink-faint">—</span>
          )}
        </div>
      </div>

      {/* REAL STYLED BUTTONS ON MOBILE */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-1 text-xs font-bold text-ink shadow-2xs hover:bg-court/60 active:scale-95 transition-all"
          title={t("players.btnEdit")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-ink-soft">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          <span>{t("players.btnEdit")}</span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 active:scale-95 transition-all"
          title={t("players.btnDelete")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-rose-600">
            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          <span>{t("players.btnDelete")}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Tablet and Desktop table row with real styled buttons.
 */
function PlayerRow({ player, onDelete }: { player: Player; onDelete: () => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [phone, setPhone] = useState(player.phone ?? "");
  const [grade, setGrade] = useState(player.grade ?? "");
  const [gender, setGender] = useState(player.gender ?? "");
  const [error, setError] = useState("");
  const [update, updateState] = useUpdatePlayerMutation();

  async function save() {
    try {
      await update({
        id: player.id,
        name: name.trim(),
        phone: phone.trim() || null,
        notes: player.notes,
        grade: grade === (player.grade ?? "") ? undefined : grade || null,
        gender: gender === (player.gender ?? "") ? undefined : gender || null,
      }).unwrap();
      setEditing(false);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("players.errorSave"));
    }
  }

  const initial = player.name.trim().slice(0, 1).toUpperCase();

  return (
    <tr className="hover:bg-court/40 transition-colors">
      <td>
        {editing ? (
          <span>
            <input
              aria-label={`Name ${player.name}`}
              className="w-full max-w-[180px] rounded-md border border-line px-2 py-1 text-xs font-semibold bg-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <span role="alert" className="block text-xs text-red-700 font-semibold mt-1">{error}</span>}
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1e523b] text-[10px] font-black text-lime">
              {initial}
            </span>
            <span className="font-bold text-ink">{player.name}</span>
          </div>
        )}
      </td>
      <td className="tabular-nums">
        {editing ? (
          <input
            aria-label={`Phone ${player.name}`}
            className="w-full max-w-[140px] rounded-md border border-line px-2 py-1 text-xs font-semibold bg-white"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08..."
          />
        ) : (
          player.phone ? (
            <a
              href={`https://wa.me/${player.phone.replace(/^0/, "62").replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-soft hover:text-pine hover:underline inline-flex items-center gap-1"
            >
              <span>📱</span> {player.phone}
            </a>
          ) : (
            <span className="text-ink-faint">—</span>
          )
        )}
      </td>
      <td>
        {editing ? (
          <select
            aria-label={`Grade ${player.name}`}
            className="max-w-[90px] rounded-md border border-line px-2 py-1 text-xs font-semibold bg-white"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">—</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        ) : (
          player.grade ? <GradeChip grade={player.grade} /> : <span className="text-ink-faint">—</span>
        )}
      </td>
      <td>
        {editing ? (
          <select
            aria-label={`Gender ${player.name}`}
            className="max-w-[130px] rounded-md border border-line px-2 py-1 text-xs font-semibold bg-white"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">—</option>
            <option value="L">♂ {t("players.genderMale")}</option>
            <option value="P">♀ {t("players.genderFemale")}</option>
          </select>
        ) : (
          player.gender ? <GenderChip gender={player.gender} /> : <span className="text-ink-faint">—</span>
        )}
      </td>
      <td><Badge status={player.status} /></td>
      <td className="whitespace-nowrap text-right">
        {editing ? (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-pine text-white px-2.5 py-1 text-xs font-bold shadow-2xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              disabled={updateState.isLoading || !name.trim()}
              onClick={save}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              {t("players.btnSave")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink hover:bg-court/60 active:scale-95 transition-all"
              onClick={() => {
                setEditing(false);
                setName(player.name);
                setPhone(player.phone ?? "");
                setGrade(player.grade ?? "");
              }}
            >
              {t("players.btnCancel")}
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-bold text-ink shadow-2xs hover:bg-court/60 active:scale-95 transition-all"
              onClick={() => setEditing(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-ink-soft">
                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              {t("players.btnEdit")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 shadow-2xs hover:bg-rose-100 active:scale-95 transition-all"
              onClick={onDelete}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-rose-600">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
              {t("players.btnDelete")}
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
