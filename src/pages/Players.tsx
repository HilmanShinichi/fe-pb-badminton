import { useState } from "react";
import {
  useDeletePlayerMutation,
  useCreatePlayerMutation,
  usePlayersQuery,
  useUpdatePlayerMutation,
} from "../store/services";
import { ApiError } from "../store/baseApi";
import { useI18n } from "../i18n";
import { Badge, Btn, ConfirmModal, Empty, ErrorBox, Field, Loading, PageHead } from "../ui";
import type { Player } from "../types";

export function PlayersPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", notes: "" });
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
      }).unwrap();
      setForm({ name: "", phone: "", notes: "" });
      setFormError("");
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("players.errorSave"));
    }
  }

  return (
    <div>
      <PageHead
        title={t("players.pageTitle")}
        sub={t("players.pageSubtitle", { count: list.data?.length ?? 0 })}
      />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section aria-label={t("players.newPlayer")} className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">{t("players.newPlayer")}</h2>
          <div className="space-y-3">
            <Field label={t("players.nameLabel")} error={!form.name.trim() && formError ? t("players.nameRequired") : undefined}>
              <input id="nama" className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("players.phoneLabel")} hint={t("players.phoneHint")}>
              <input id="whatsapp" className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t("players.notesLabel")} hint={t("players.notesHint")}>
              <input id="catatan" className="w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            {formError && form.name.trim() && (
              <p role="alert" className="text-sm text-red-700">{formError}</p>
            )}
            <Btn disabled={createState.isLoading || !form.name.trim()} onClick={submit}>
              {createState.isLoading ? t("players.btnSaving") : t("players.btnAddPlayer")}
            </Btn>
          </div>
        </section>

        <section aria-label={t("players.pageTitle")} className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-3">
            <label htmlFor="cari" className="sr-only">{t("players.searchPlaceholder")}</label>
            <input
              id="cari"
              className="w-full max-w-xs"
              placeholder={t("players.searchPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
          </div>
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message={t("players.errorLoad")} onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text={q ? t("players.emptyMatching") : t("players.emptyNone")} /></div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>{t("players.colName")}</th>
                  <th>{t("players.colPhone")}</th>
                  <th>{t("players.colStatus")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((p) => (
                  <PlayerRow key={p.id} player={p} onDelete={() => setPendingDelete(p)} />
                ))}
              </tbody>
            </table>
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

function PlayerRow({ player, onDelete }: { player: Player; onDelete: () => void }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [error, setError] = useState("");
  const [update, updateState] = useUpdatePlayerMutation();

  async function save() {
    try {
      await update({ id: player.id, name: name.trim(), phone: player.phone, notes: player.notes }).unwrap();
      setEditing(false);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("players.errorSave"));
    }
  }

  return (
    <tr>
      <td>
        {editing ? (
          <span>
            <input aria-label={`Name ${player.name}`} className="w-full max-w-[180px]" value={name} onChange={(e) => setName(e.target.value)} />
            {error && <span role="alert" className="block text-xs text-red-700">{error}</span>}
          </span>
        ) : (
          <span className="font-medium">{player.name}</span>
        )}
      </td>
      <td className="tabular-nums">{player.phone ?? "—"}</td>
      <td><Badge status={player.status} /></td>
      <td className="whitespace-nowrap text-right">
        {editing ? (
          <>
            <button type="button" className="mr-2 underline" disabled={updateState.isLoading || !name.trim()} onClick={save}>
              {t("players.btnSave")}
            </button>
            <button type="button" className="underline" onClick={() => { setEditing(false); setName(player.name); }}>
              {t("players.btnCancel")}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="mr-2 underline" onClick={() => setEditing(true)}>
              {t("players.btnEdit")}
            </button>
            <button
              type="button"
              className="text-red-700 underline"
              onClick={onDelete}
            >
              {t("players.btnDelete")}
            </button>
          </>
        )}
      </td>
    </tr>
  );
}

