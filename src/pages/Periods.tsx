import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import { useCreatePeriodMutation, usePeriodsQuery } from "../store/services";
import { dateId } from "../format";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import { useI18n } from "../i18n";
import type { Period } from "../types";

export function PeriodListPage() {
  const { t, lang } = useI18n();
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    number_of_sessions: "5",
    commitment_fee: 45000,
    member_contribution: 10000,
    non_member_fee: 25000,
    venue_cost_total: 762000,
    shuttle_pack_price: 125000,
    shuttle_units_per_pack: 12,
    shuttle_per_session: 24,
  });
  const [error, setError] = useState("");

  const list = usePeriodsQuery();
  const [create, createState] = useCreatePeriodMutation();

  const valid =
    form.name.trim() &&
    form.start_date &&
    form.end_date &&
    form.start_date <= form.end_date &&
    Number(form.number_of_sessions) >= 1;

  async function submit() {
    try {
      await create({
        ...form,
        number_of_sessions: Math.max(1, Math.floor(Number(form.number_of_sessions)) || 1),
      }).unwrap();
      setError("");
      setForm({ ...form, name: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("periods.errorCreatePeriod"));
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHead title={t("periods.pageTitle")} sub={t("periods.pageSubtitle")} />

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] w-full min-w-0 items-start">
        {/* New Period Form */}
        <section aria-label="New period" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("periods.newPeriodTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("periods.fieldName")}>
              <input
                id="nama"
                className="w-full"
                placeholder={t("periods.namePlaceholder")}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label={t("periods.fieldStartDate")}>
                <input
                  id="mulai"
                  type="date"
                  className="w-full"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </Field>
              <Field label={t("periods.fieldEndDate")}>
                <input
                  id="selesai"
                  type="date"
                  className="w-full"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </Field>
            </div>

            <Field label={t("periods.fieldSessions")}>
              <input
                id="jumlah-sesi"
                type="number"
                min={1}
                className="w-full"
                value={form.number_of_sessions}
                onChange={(e) => setForm({ ...form, number_of_sessions: e.target.value })}
              />
            </Field>

            <Field label={t("periods.fieldMemberPrice")}>
              <MoneyInput id="commitment-fee-rp" value={form.commitment_fee} onChange={(n) => setForm({ ...form, commitment_fee: n })} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label={t("periods.fieldContributionPerSession")}>
                <MoneyInput id="kontribusi-per-sesi-rp" value={form.member_contribution} onChange={(n) => setForm({ ...form, member_contribution: n })} />
              </Field>
              <Field label={t("periods.fieldNonMemberRate")}>
                <MoneyInput id="tarif-non-member-rp" value={form.non_member_fee} onChange={(n) => setForm({ ...form, non_member_fee: n })} />
              </Field>
            </div>

            <Field label={t("periods.fieldVenueCostTotal")} hint={t("periods.hintVenueCostTotal")}>
              <MoneyInput id="lapangan-total" value={form.venue_cost_total} onChange={(n) => setForm({ ...form, venue_cost_total: n })} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label={t("periods.fieldShuttlePackPrice")}>
                <MoneyInput id="kok-pack" value={form.shuttle_pack_price} onChange={(n) => setForm({ ...form, shuttle_pack_price: n })} />
              </Field>
              <Field label={t("periods.fieldUnitsPerPack")}>
                <input
                  id="kok-isi"
                  type="number"
                  min={1}
                  className="w-full"
                  value={form.shuttle_units_per_pack}
                  onChange={(e) => setForm({ ...form, shuttle_units_per_pack: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label={t("periods.fieldShuttlePerSession")} hint={t("periods.hintShuttlePerSession")}>
              <input
                id="kok-per-sesi"
                type="number"
                min={0}
                className="w-full"
                value={form.shuttle_per_session}
                onChange={(e) => setForm({ ...form, shuttle_per_session: Number(e.target.value) })}
              />
            </Field>

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <Btn className="w-full justify-center" disabled={!valid || createState.isLoading} onClick={submit}>
              {createState.isLoading ? t("periods.btnCreating") : t("periods.btnCreatePeriod")}
            </Btn>
          </div>
        </section>

        {/* Periods List */}
        <section aria-label="Period list" className="h-fit rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message={t("periods.errorLoadPeriods")} onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text={t("periods.emptyPeriods")} /></div>
          ) : (
            <>
              {/* Mobile Card View (sm:hidden) - 100% width, zero horizontal scroll */}
              <div className="divide-y divide-line/70 sm:hidden">
                {(list.data ?? []).map((p: Period) => (
                  <div key={p.id} className="p-3.5 space-y-3 transition-colors hover:bg-court/25">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-ink truncate">{p.name}</h3>
                      <Badge status={p.status} />
                    </div>

                    <div className="rounded-lg bg-court/40 border border-line/60 p-2.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-ink-soft">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 text-pine">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span className="font-semibold text-ink">
                          {dateId(p.start_date, lang)} – {dateId(p.end_date, lang)}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-faint">
                        {t("periods.sessionsCount", { count: p.number_of_sessions })}
                      </div>
                    </div>

                    <Link
                      to={`/periods/${p.id}`}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-pine to-pine-deep px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-110 active:scale-[0.99] transition-all"
                    >
                      <span>{t("periods.btnOpenPeriod")}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Desktop & Tablet Table (hidden sm:block) */}
              <div className="overflow-x-auto w-full hidden sm:block">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("periods.colPeriod")}</th>
                      <th>{t("periods.colDates")}</th>
                      <th className="text-right">{t("periods.colSessions")}</th>
                      <th>{t("periods.colStatus")}</th>
                      <th className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(list.data ?? []).map((p: Period) => (
                      <tr key={p.id}>
                        <td className="font-medium text-ink">{p.name}</td>
                        <td className="whitespace-nowrap font-normal text-ink-soft">
                          {dateId(p.start_date, lang)} – {dateId(p.end_date, lang)}
                        </td>
                        <td className="text-right tabular-nums">{p.number_of_sessions}</td>
                        <td><Badge status={p.status} /></td>
                        <td className="text-right whitespace-nowrap">
                          <OpenLink to={`/periods/${p.id}`} label={t("periods.btnOpenPeriod")} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export { PeriodDetailPage } from "./PeriodDetail";
