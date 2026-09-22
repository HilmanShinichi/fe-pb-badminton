import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import { useCreateMabarMutation, useMabarListQuery, usePeriodsQuery } from "../store/services";
import { dateId } from "../format";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import { useI18n } from "../i18n";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MabarListPage() {
  const { t, lang } = useI18n();
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({
    type: "PERIOD",
    period_id: "",
    date: today(),
    venue_description: "",
    court_cost: 90000,
    shuttle_pack_price: 125000,
    shuttle_units_per_pack: 12,
    shuttlecock_price: 3000,
  });
  const [error, setError] = useState("");

  const list = useMabarListQuery(typeFilter);
  const periods = usePeriodsQuery();
  const [create, createState] = useCreateMabarMutation();

  const valid =
    !!form.date &&
    (form.type === "DAILY_EVENT" ? !!form.venue_description.trim() : !!form.period_id);

  // Per-session court share of a period: venue total split evenly, same rule
  // the backend uses when generating sessions. Auto-filled on creation so a
  // period session never starts at Rp0 court cost.
  function courtShare(periodId: string): number {
    const p = (periods.data ?? []).find((x) => x.id === periodId);
    if (!p) return 0;
    return Math.floor((p.venue_cost_total ?? 0) / Math.max(1, p.number_of_sessions || 1));
  }

  function pickPeriod(periodId: string) {
    const p = (periods.data ?? []).find((x) => x.id === periodId);
    setForm({
      ...form,
      period_id: periodId,
      court_cost: courtShare(periodId),
      shuttle_pack_price: p?.shuttle_pack_price ?? form.shuttle_pack_price,
      shuttle_units_per_pack: p?.shuttle_units_per_pack || form.shuttle_units_per_pack,
    });
  }

  function setPack(v: number) {
    setForm({ ...form, shuttle_pack_price: Math.max(0, v || 0) });
  }

  function setUnits(v: number) {
    setForm({ ...form, shuttle_units_per_pack: Math.max(1, v || 1) });
  }

  async function submit() {
    try {
      await create({
        type: form.type,
        period_id: form.type === "PERIOD" ? form.period_id || null : null,
        date: form.date,
        venue_description: form.type === "DAILY_EVENT" ? form.venue_description.trim() || null : null,
        court_cost: Number(form.court_cost) || 0,
        shuttlecock_price: form.type === "DAILY_EVENT" ? Number(form.shuttlecock_price) || 0 : 0,
        shuttle_pack_price: Number(form.shuttle_pack_price) || 0,
        shuttle_units_per_pack: Number(form.shuttle_units_per_pack) || 12,
      }).unwrap();
      setError("");
      setForm({ ...form, venue_description: "" });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("mabar.errorCreateSession"));
    }
  }

  return (
    <div className="w-full min-w-0 space-y-5">
      <PageHead
        title={t("mabar.pageTitle")}
        sub={t("mabar.pageSubtitle")}
        right={
          <select
            aria-label="Filter by type"
            className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs focus:border-pine"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">{t("mabar.filterAll")}</option>
            <option value="PERIOD">{t("mabar.filterPeriod")}</option>
            <option value="DAILY_EVENT">{t("mabar.filterDaily")}</option>
          </select>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[340px_1fr] w-full min-w-0 items-start">
        {/* Schedule Form */}
        <section aria-label="New session" className="h-fit rounded-xl border border-line bg-white shadow-card p-4 min-w-0 w-full">
          <div className="flex items-center gap-2 mb-3.5 pb-2.5 border-b border-line/60">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-court text-pine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ink">{t("mabar.scheduleTitle")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={t("mabar.fieldSessionType")}>
              <select id="type" className="w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PERIOD">{t("mabar.filterPeriod")}</option>
                <option value="DAILY_EVENT">{t("mabar.filterDaily")}</option>
              </select>
            </Field>

            {form.type === "PERIOD" ? (
              <>
                <Field
                  label={t("mabar.fieldPeriod")}
                  error={!form.period_id && error ? t("mabar.errorPeriodRequired") : undefined}
                >
                  <select id="period" className="w-full" value={form.period_id} onChange={(e) => pickPeriod(e.target.value)}>
                    <option value="">{t("mabar.selectPeriodPlaceholder")}</option>
                    {(periods.data ?? []).filter((p) => p.status !== "COMPLETED").map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("mabar.fieldCourtCostPeriod")} hint={t("mabar.hintCourtCostPeriod")}>
                  <MoneyInput id="court-cost-period" value={form.court_cost} onChange={(n) => setForm({ ...form, court_cost: n })} />
                </Field>
              </>
            ) : (
              <>
                <Field
                  label={t("mabar.fieldVenueDescription")}
                  hint={t("mabar.hintVenueDescription")}
                  error={!form.venue_description.trim() && error ? t("mabar.errorVenueRequired") : undefined}
                >
                  <input
                    id="venue-description"
                    className="w-full"
                    value={form.venue_description}
                    onChange={(e) => setForm({ ...form, venue_description: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label={t("mabar.fieldCourtCostDaily")} hint={t("mabar.hintCourtCostDaily")}>
                    <MoneyInput id="court-cost" value={form.court_cost} onChange={(n) => setForm({ ...form, court_cost: n })} />
                  </Field>
                  <Field label={t("mabar.fieldUnitsPack")} hint={t("mabar.hintUnitsPack")}>
                    <input id="units-pack" type="number" min={1} className="w-full" value={form.shuttle_units_per_pack} onChange={(e) => setUnits(Number(e.target.value))} />
                  </Field>
                </div>
                <Field label={t("mabar.fieldShuttlePackPrice")} hint={t("mabar.hintShuttlePackPrice")}>
                  <MoneyInput id="pack-price" value={form.shuttle_pack_price} onChange={(n) => setPack(n)} />
                </Field>
                <Field
                  label={t("mabar.fieldShuttlePrice")}
                  hint={`${t("mabar.hintShuttlePriceCalc")} ${Math.round(form.shuttle_pack_price / Math.max(1, form.shuttle_units_per_pack)).toLocaleString("id-ID")}.`}
                >
                  <MoneyInput id="kok-price" value={form.shuttlecock_price} onChange={(n) => setForm({ ...form, shuttlecock_price: n })} />
                </Field>
                <p className="text-xs text-ink-faint leading-relaxed">{t("mabar.courtCostSplitNote")}</p>
              </>
            )}

            <Field label={t("mabar.fieldDate")}>
              <input id="date" type="date" className="w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>

            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

            <Btn className="w-full justify-center" disabled={!valid || createState.isLoading} onClick={submit}>
              {createState.isLoading ? t("mabar.btnCreating") : t("mabar.btnCreateSession")}
            </Btn>
          </div>
        </section>

        {/* Sessions List */}
        <section aria-label="Session list" className="h-fit rounded-xl border border-line bg-white shadow-card min-w-0 w-full overflow-hidden">
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message={t("mabar.errorLoadSessions")} onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text={t("mabar.emptySessions")} /></div>
          ) : (
            <>
              {/* Mobile Card View (sm:hidden) - 100% width, zero horizontal scroll */}
              <div className="divide-y divide-line/70 sm:hidden">
                {(list.data ?? []).map((s) => (
                  <div key={s.id} className="p-3.5 space-y-3 transition-colors hover:bg-court/25">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-court text-pine shrink-0">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                        </span>
                        <span className="text-xs font-bold text-ink truncate">
                          {dateId(s.date, lang)}{s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""}
                        </span>
                      </div>
                      <Badge status={s.type} />
                    </div>

                    <div className="rounded-lg bg-court/40 border border-line/60 p-2.5 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                        {s.type === "PERIOD" ? t("mabar.filterPeriod") : t("mabar.filterDaily")}
                      </div>
                      <div className="text-xs font-semibold text-ink break-words mt-0.5">
                        {s.period_name ?? s.venue_description ?? s.venue_name ?? "—"}
                      </div>
                    </div>

                    <Link
                      to={`/mabar/${s.id}`}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-gradient-to-r from-pine to-pine-deep px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:brightness-110 active:scale-[0.99] transition-all"
                    >
                      <span>{t("mabar.btnOpenSession")}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                ))}
              </div>

              {/* Desktop & Tablet Table View (hidden sm:block) */}
              <div className="overflow-x-auto w-full hidden sm:block">
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("mabar.colDate")}</th>
                      <th>{t("mabar.colType")}</th>
                      <th>{t("mabar.colVenuePeriod")}</th>
                      <th className="text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(list.data ?? []).map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap font-medium text-ink">
                          {dateId(s.date, lang)}{s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""}
                        </td>
                        <td><Badge status={s.type} /></td>
                        <td className="font-normal text-ink-soft">{s.period_name ?? s.venue_description ?? s.venue_name ?? "—"}</td>
                        <td className="text-right whitespace-nowrap">
                          <OpenLink to={`/mabar/${s.id}`} label={t("mabar.btnOpenSession")} />
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

export { MabarDetailPage } from "./MabarDetail";
