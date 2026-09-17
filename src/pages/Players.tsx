import { useState } from "react";
import {
  useDeletePlayerMutation,
  useCreatePlayerMutation,
  usePlayersQuery,
  useUpdatePlayerMutation,
} from "../store/services";
import { ApiError } from "../store/baseApi";
import { Badge, Btn, ConfirmModal, Empty, ErrorBox, Field, Loading, PageHead } from "../ui";
import type { Player } from "../types";

export function PlayersPage() {
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
      setActionError(e instanceof ApiError ? e.message : "Could not delete player.");
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
      setFormError(e instanceof ApiError ? e.message : "Could not save player.");
    }
  }

  return (
    <div>
      <PageHead title="Players" sub={`${list.data?.length ?? 0} registered. Players with history cannot be deleted.`} />
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <section aria-label="Add player" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">New player</h2>
          <div className="space-y-3">
            <Field label="Name" error={!form.name.trim() && formError ? "Player name is required." : undefined}>
              <input id="nama" className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="WhatsApp" hint="Optional.">
              <input id="whatsapp" className="w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Notes" hint="Optional.">
              <input id="catatan" className="w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            {formError && form.name.trim() && (
              <p role="alert" className="text-sm text-red-700">{formError}</p>
            )}
            <Btn disabled={createState.isLoading || !form.name.trim()} onClick={submit}>
              {createState.isLoading ? "Saving…" : "Add player"}
            </Btn>
          </div>
        </section>

        <section aria-label="Player list" className="rounded-xl border border-line bg-white shadow-card">
          <div className="border-b border-line p-3">
            <label htmlFor="cari" className="sr-only">Search players</label>
            <input
              id="cari"
              className="w-full max-w-xs"
              placeholder="Search name or WhatsApp…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {actionError && <p role="alert" className="mt-2 text-sm text-red-700">{actionError}</p>}
          </div>
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message="Could not load players." onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text={q ? "No matching players." : "No players yet."} /></div>
          ) : (
            <table className="data">
              <thead>
                <tr><th>Name</th><th>WhatsApp</th><th>Status</th><th></th></tr>
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
          title={`Delete ${pendingDelete.name}?`}
          body={
            <p>
              <strong>{pendingDelete.name}</strong> will be permanently deleted.
              Players with attendance, bills, or other history cannot be deleted.
            </p>
          }
          confirmLabel="Yes, delete"
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function PlayerRow({ player, onDelete }: { player: Player; onDelete: () => void }) {
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
      setError(e instanceof ApiError ? e.message : "Could not save.");
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
            <button type="button" className="mr-2 underline" disabled={updateState.isLoading || !name.trim()} onClick={save}>Save</button>
            <button type="button" className="underline" onClick={() => { setEditing(false); setName(player.name); }}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="mr-2 underline" onClick={() => setEditing(true)}>Edit</button>
            <button
              type="button"
              className="text-red-700 underline"
              onClick={onDelete}
            >
              Delete
            </button>
          </>
        )}
      </td>
    </tr>
  );
}
