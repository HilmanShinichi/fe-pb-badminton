import { useState } from "react";
import { ApiError } from "../store/baseApi";
import { useCreatePeriodMutation, usePeriodsQuery } from "../store/services";
import { dateId } from "../format";
import { Badge, Btn, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import type { Period } from "../types";

export function PeriodListPage() {
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

  const valid = form.name.trim() && form.start_date && form.end_date && form.start_date <= form.end_date && Number(form.number_of_sessions) >= 1;

  async function submit() {
    try {
      await create({ ...form, number_of_sessions: Math.max(1, Math.floor(Number(form.number_of_sessions)) || 1) }).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create period.");
    }
  }

  return (
    <div>
      <PageHead title="Periods" sub="Membership periods: members, sessions, and money." />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <section aria-label="New period" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
          <h2 className="mb-3 text-sm font-semibold">New period</h2>
          <div className="space-y-3">
            <Field label="Name">
              <input id="nama" className="w-full" placeholder="September 2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start">
                <input id="mulai" type="date" className="w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </Field>
              <Field label="End">
                <input id="selesai" type="date" className="w-full" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </Field>
            </div>
            <Field label="Sessions">
              <input id="jumlah-sesi" type="number" min={1} className="w-full" value={form.number_of_sessions} onChange={(e) => setForm({ ...form, number_of_sessions: e.target.value })} />
            </Field>
            <Field label="Member price (Rp)">
              <MoneyInput id="commitment-fee-rp" value={form.commitment_fee} onChange={(n) => setForm({ ...form, commitment_fee: n })} />
            </Field>
            <Field label="Contribution per session (Rp)">
              <MoneyInput id="kontribusi-per-sesi-rp" value={form.member_contribution} onChange={(n) => setForm({ ...form, member_contribution: n })} />
            </Field>
            <Field label="Non-member rate (Rp)">
              <MoneyInput id="tarif-non-member-rp" value={form.non_member_fee} onChange={(n) => setForm({ ...form, non_member_fee: n })} />
            </Field>
            <Field label="Court total per period (Rp)" hint="E.g. 762.000 for 5 sessions.">
              <MoneyInput id="lapangan-total" value={form.venue_cost_total} onChange={(n) => setForm({ ...form, venue_cost_total: n })} />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Shuttle/pack (Rp)">
                <MoneyInput id="kok-pack" value={form.shuttle_pack_price} onChange={(n) => setForm({ ...form, shuttle_pack_price: n })} />
              </Field>
              <Field label="Units/pack">
                <input id="kok-isi" type="number" min={1} className="w-full" value={form.shuttle_units_per_pack} onChange={(e) => setForm({ ...form, shuttle_units_per_pack: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Avg shuttles/session" hint="E.g. 24 pcs.">
              <input id="kok-per-sesi" type="number" min={0} className="w-full" value={form.shuttle_per_session} onChange={(e) => setForm({ ...form, shuttle_per_session: Number(e.target.value) })} />
            </Field>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Btn disabled={!valid || createState.isLoading} onClick={submit}>
              {createState.isLoading ? "Saving…" : "Create period"}
            </Btn>
          </div>
        </section>

        <section aria-label="Period list" className="h-fit rounded-xl border border-line bg-white shadow-card">
          {list.isFetching && !list.data ? (
            <Loading />
          ) : list.isError ? (
            <div className="p-3"><ErrorBox message="Could not load periods." onRetry={() => list.refetch()} /></div>
          ) : (list.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text="No periods yet." /></div>
          ) : (
            <table className="data">
              <thead>
                <tr><th>Period</th><th>Dates</th><th className="text-right">Sessions</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {(list.data ?? []).map((p: Period) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="whitespace-nowrap">{dateId(p.start_date)} – {dateId(p.end_date)}</td>
                    <td className="text-right tabular-nums">{p.number_of_sessions}</td>
                    <td><Badge status={p.status} /></td>
                    <td className="text-right"><OpenLink to={`/periods/${p.id}`} /></td>
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

export { PeriodDetailPage } from "./PeriodDetail";
