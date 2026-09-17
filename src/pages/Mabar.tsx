import { useState } from "react";
import { ApiError } from "../store/baseApi";
import { useCreateMabarMutation, useMabarListQuery, usePeriodsQuery } from "../store/services";
import { dateId } from "../format";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MabarListPage() {
  const [typeFilter, setTypeFilter] = useState("");
  const [form, setForm] = useState({ type: "PERIOD", period_id: "", date: today(), venue_description: "", court_cost: 90000, shuttle_pack_price: 125000, shuttle_units_per_pack: 12, shuttlecock_price: 3000 });
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
      setError(e instanceof ApiError ? e.message : "Could not create session.");
    }
  }

  return (
    <div>
      <PageHead
        title="Open Play"
        sub="Period and daily/event sessions. Open a row to record attendance and matches."
        right={
          <select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="PERIOD">Period</option>
            <option value="DAILY_EVENT">Daily/Event</option>
          </select>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <section aria-label="New session" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">Schedule a session</h2>
          <div className="space-y-3">
            <Field label="Type">
              <select id="type" className="w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="PERIOD">Period</option>
                <option value="DAILY_EVENT">Daily/Event</option>
              </select>
            </Field>
            {form.type === "PERIOD" ? (
              <>
                <Field label="Period" error={!form.period_id && error ? "PERIOD sessions must belong to a period." : undefined}>
                  <select id="period" className="w-full" value={form.period_id} onChange={(e) => pickPeriod(e.target.value)}>
                    <option value="">- Select period -</option>
                    {(periods.data ?? []).filter((p) => p.status !== "COMPLETED").map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Court cost (Rp)" hint="Auto: period venue total ÷ sessions. Editable.">
                  <MoneyInput id="court-cost-period" value={form.court_cost} onChange={(n) => setForm({ ...form, court_cost: n })} />
                </Field>
              </>
            ) : (
              <>
                <Field
                  label="Venue/court description"
                  hint="Example: Courts 1, 2, and 3 for 3 hours."
                  error={!form.venue_description.trim() && error ? "Venue description is required for Daily/Event." : undefined}
                >
                  <input
                    id="venue-description"
                    className="w-full"
                    value={form.venue_description}
                    onChange={(e) => setForm({ ...form, venue_description: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Court (Rp)" hint="E.g. 90.000 for 3 hours.">
                    <MoneyInput id="court-cost" value={form.court_cost} onChange={(n) => setForm({ ...form, court_cost: n })} />
                  </Field>
                  <Field label="Units/pack" hint="E.g. 12.">
                    <input id="units-pack" type="number" min={1} className="w-full" value={form.shuttle_units_per_pack} onChange={(e) => setUnits(Number(e.target.value))} />
                  </Field>
                </div>
                <Field label="Shuttle pack price (Rp)" hint="Set this first, e.g. 125.000.">
                  <MoneyInput id="pack-price" value={form.shuttle_pack_price} onChange={(n) => setPack(n)} />
                </Field>
                <Field label="Price/shuttle (Rp)" hint={`You decide. Pack ÷ units suggests ≈ ${Math.round(form.shuttle_pack_price / Math.max(1, form.shuttle_units_per_pack)).toLocaleString("id-ID")}.`}>
                  <MoneyInput id="kok-price" value={form.shuttlecock_price} onChange={(n) => setForm({ ...form, shuttlecock_price: n })} />
                </Field>
                <p className="text-xs text-ink-faint">Court cost is split evenly across players present. Shuttles = per-player share × price/shuttle.</p>
              </>
            )}
            <Field label="Date">
              <input id="date" type="date" className="w-full" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Btn disabled={!valid || createState.isLoading} onClick={submit}>
              {createState.isLoading ? "Saving…" : "Create session"}
            </Btn>
          </div>
        </section>

        <section aria-label="Session list" className="h-fit rounded-xl border border-line bg-white shadow-card">
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message="Could not load sessions." onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text="No sessions yet." /></div>
          ) : (
            <table className="data">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Period / Venue</th><th></th></tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{dateId(s.date)}{s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""}</td>
                    <td><Badge status={s.type} /></td>
                    <td>{s.period_name ?? s.venue_description ?? s.venue_name ?? "—"}</td>
                    <td className="text-right"><OpenLink to={`/mabar/${s.id}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

export { MabarDetailPage } from "./MabarDetail";
