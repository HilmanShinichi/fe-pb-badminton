import { useState } from "react";
import { ApiError } from "../store/baseApi";
import {
  useAdminUsersQuery,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  useUpdateAdminUserMutation,
  type AdminUser,
} from "../store/services";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { FEATURE_PERMS } from "../permissions";
import { Btn, ConfirmModal, ErrorBox, Field, Loading, PageHead } from "../components";

export function UsersPage() {
  const { t, isId } = useI18n();
  const { auth } = useAuth();
  const list = useAdminUsersQuery();
  const [create, createState] = useCreateAdminUserMutation();
  const [update, updateState] = useUpdateAdminUserMutation();
  const [remove, removeState] = useDeleteAdminUserMutation();

  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [superAll, setSuperAll] = useState(false);
  const [perms, setPerms] = useState<string[]>(["matchmaker"]);
  const [formError, setFormError] = useState("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [editSuper, setEditSuper] = useState(false);
  const [editPass, setEditPass] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null);

  function toggle(list: string[], set: (v: string[]) => void, key: string) {
    set(list.includes(key) ? list.filter((x) => x !== key) : [...list, key]);
  }

  async function submitCreate() {
    if (!name.trim() || !pass) return;
    setFormError("");
    try {
      await create({ username: name.trim(), password: pass, permissions: perms, is_superadmin: superAll }).unwrap();
      setName("");
      setPass("");
      setSuperAll(false);
      setPerms(["matchmaker"]);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("usersAdmin.errorLoad"));
    }
  }

  function openEdit(u: AdminUser) {
    setEditing(u);
    setEditPerms([...u.permissions]);
    setEditSuper(u.is_superadmin);
    setEditPass("");
    setFormError("");
  }

  async function submitEdit() {
    if (!editing || updateState.isLoading) return;
    setFormError("");
    try {
      await update({
        id: editing.id,
        body: { permissions: editPerms, is_superadmin: editSuper, ...(editPass ? { password: editPass } : {}) },
      }).unwrap();
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : t("usersAdmin.errorLoad"));
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || removeState.isLoading) return;
    try {
      await remove(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch (e) {
      setPendingDelete(null);
      setFormError(e instanceof ApiError ? e.message : t("usersAdmin.errorLoad"));
    }
  }

  const permLabel = (key: string) => permLabels[key] ?? key;
  const permLabels: Record<string, string> = {
    dashboard: t("nav.dashboard.label"),
    mabar: t("nav.mabar.label"),
    matchmaker: t("nav.matchmaker.label"),
    periods: t("nav.periods.label"),
    players: t("nav.players.label"),
    inventory: t("nav.inventory.label"),
    finance: t("nav.finance.label"),
    reports: t("nav.reports.label"),
    simulator: t("nav.simulator.label"),
  };

  return (
    <div className="space-y-6">
      <PageHead title={t("usersAdmin.pageTitle")} sub={t("usersAdmin.pageSubtitle")} />

      <section aria-label={t("usersAdmin.newUserTitle")} className="rounded-2xl border border-line bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-extrabold text-ink">{t("usersAdmin.newUserTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("usersAdmin.fieldUsername")}>
            <input
              id="admin-username"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </Field>
          <Field label={t("usersAdmin.fieldPassword")}>
            <input
              id="admin-password"
              type="password"
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
          <input
            type="checkbox"
            className="rounded text-pine focus:ring-pine"
            checked={superAll}
            onChange={(e) => setSuperAll(e.target.checked)}
          />
          {t("usersAdmin.fieldAllAccess")}
        </label>
        {!superAll && (
          <div className="mt-2">
            <p className="mb-1.5 text-xs font-bold text-ink">{t("usersAdmin.fieldFeatures")}</p>
            <div className="flex flex-wrap gap-1.5">
              {FEATURE_PERMS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(perms, setPerms, key)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    perms.includes(key)
                      ? "bg-pine text-white shadow-2xs"
                      : "border border-line bg-white text-ink-soft hover:bg-court/60"
                  }`}
                >
                  {permLabel(key)}
                </button>
              ))}
            </div>
          </div>
        )}
        {formError && !editing && (
          <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{formError}</p>
        )}
        <div className="mt-3">
          <Btn disabled={createState.isLoading || !name.trim() || !pass} onClick={submitCreate}>
            {createState.isLoading ? t("common.saving") : t("usersAdmin.btnCreate")}
          </Btn>
        </div>
        <p className="mt-2 text-xs text-ink-faint">{t("usersAdmin.reloginNote")}</p>
      </section>

      {list.isFetching && !list.data ? (
        <Loading />
      ) : list.isError || !list.data ? (
        <ErrorBox message={t("usersAdmin.errorLoad")} onRetry={() => list.refetch()} />
      ) : (
        <section aria-label={t("usersAdmin.pageTitle")} className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
          <div className="divide-y divide-line/60">
            {list.data.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-2 p-3.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#143728] to-[#1e523b] text-xs font-black text-lime">
                  {u.username.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-ink">
                    {u.username}
                    {auth?.username === u.username && <span className="ml-2 text-[10px] font-bold text-ink-faint">{isId ? "(kamu)" : "(you)"}</span>}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {u.is_superadmin ? (
                      <span className="rounded-full bg-pine px-2 py-0.5 text-[10px] font-black uppercase text-lime">
                        {t("usersAdmin.allAccess")}
                      </span>
                    ) : (
                      u.permissions.map((key) => (
                        <span key={key} className="rounded-full bg-court px-2 py-0.5 text-[10px] font-bold text-pine">
                          {permLabel(key)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <span className="inline-flex gap-1.5">
                  <Btn disabled={updateState.isLoading} onClick={() => openEdit(u)}>
                    {t("common.edit")}
                  </Btn>
                  <button
                    type="button"
                    disabled={removeState.isLoading || auth?.username === u.username}
                    title={t("usersAdmin.btnDelete")}
                    onClick={() => setPendingDelete(u)}
                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    {t("usersAdmin.btnDelete")}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <ConfirmModal
          title={editing.username}
          body={
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink">
                <input
                  type="checkbox"
                  className="rounded text-pine focus:ring-pine"
                  checked={editSuper}
                  onChange={(e) => setEditSuper(e.target.checked)}
                />
                {t("usersAdmin.fieldAllAccess")}
              </label>
              {!editSuper && (
                <div>
                  <p className="mb-1.5 text-xs font-bold text-ink">{t("usersAdmin.fieldFeatures")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {FEATURE_PERMS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(editPerms, setEditPerms, key)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                          editPerms.includes(key)
                            ? "bg-pine text-white shadow-2xs"
                            : "border border-line bg-white text-ink-soft hover:bg-court/60"
                        }`}
                      >
                        {permLabel(key)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Field label={t("usersAdmin.fieldPasswordOptional")}>
                <input
                  type="password"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-pine focus:outline-hidden"
                  value={editPass}
                  onChange={(e) => setEditPass(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              {formError && (
                <p role="alert" className="text-xs font-semibold text-red-700">{formError}</p>
              )}
              <p className="text-xs text-ink-faint">{t("usersAdmin.reloginNote")}</p>
            </div>
          }
          confirmLabel={t("usersAdmin.btnSave")}
          busy={updateState.isLoading}
          onConfirm={submitEdit}
          onCancel={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t("usersAdmin.deleteTitle", { name: pendingDelete.username })}
          body={<p>{t("usersAdmin.deleteBody")}</p>}
          confirmLabel={t("usersAdmin.btnDelete")}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
