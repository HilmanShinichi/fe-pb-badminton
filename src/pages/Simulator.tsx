import { useState } from "react";
import { ApiError } from "../store/baseApi";
import { useSimulateDailyMutation, useSimulatePeriodMutation } from "../store/services";
import { rupiah } from "../format";
import { Badge, Btn, Field, MoneyInput, PageHead } from "../ui";

const DEFAULT_PERIOD = {
  sessions: 5,
  members: 16,
  avg_member_attendance: 14,
  non_members: 4,
  commitment_fee: 45000,
  member_contribution: 10000,
  non_member_fee: 25000,
  venue_cost_per_session: 93000,
  shuttlecock_per_session: 22,
  pack_price: 125000,
  units_per_pack: 12,
};

const DEFAULT_DAILY = {
  venue_cost: 90000,
  players: 9,
  price_per_shuttlecock: 3000,
  shuttlecock_per_player: 3,
  pack_price: 125000,
  units_per_pack: 12,
};

type Scenario = { label: string; members: number; non_members: number; shuttlecock_per_session: number };

const SCENARIOS: Scenario[] = [
  { label: "Best", members: 16, non_members: 4, shuttlecock_per_session: 20 },
  { label: "Expected", members: 14, non_members: 4, shuttlecock_per_session: 22 },
  { label: "Worst", members: 10, non_members: 2, shuttlecock_per_session: 30 },
];

export function SimulatorPage() {
  const [tab, setTab] = useState<"period" | "daily">("period");
  return (
    <div>
      <PageHead title="Simulator" sub="Test scenarios before spending. Nothing is saved." />
      <div className="mb-4 flex gap-1 border-b border-line pb-2">
        {(["period", "daily"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`border px-3 py-1.5 text-sm ${tab === t ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
          >
            {t === "period" ? "Period" : "Daily/Event"}
          </button>
        ))}
      </div>
      {tab === "period" ? <PeriodSim /> : <DailySim />}
    </div>
  );
}

function num(v: string): number {
  return Number(v) || 0;
}

function PeriodSim() {
  const [form, setForm] = useState({ ...DEFAULT_PERIOD });
  const [scenario, setScenario] = useState("Expected");
  const [error, setError] = useState("");
  const [run, runState] = useSimulatePeriodMutation();
  const set = (k: keyof typeof DEFAULT_PERIOD) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: num(e.target.value) });
  const setMoney = (k: keyof typeof DEFAULT_PERIOD) => (n: number) =>
    setForm({ ...form, [k]: n });

  function applyScenario(label: string) {
    setScenario(label);
    const s = SCENARIOS.find((x) => x.label === label);
    if (s) setForm({ ...form, members: s.members, non_members: s.non_members, shuttlecock_per_session: s.shuttlecock_per_session });
  }

  async function submit() {
    try {
      await run(form).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Simulation failed.");
    }
  }

  const r = runState.data as Record<string, number | string | Array<Record<string, number>>> | undefined;
  const table = (r?.attendance_table as Array<Record<string, number>> | undefined) ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section aria-label="Period simulation inputs" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
        <Field label="Scenario">
          <span className="flex gap-1">
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => applyScenario(s.label)}
                aria-pressed={scenario === s.label}
                className={`flex-1 border px-2 py-1.5 text-sm ${scenario === s.label ? "border-pine bg-pine text-paper" : "border-line bg-white hover:bg-court/60"}`}
              >
                {s.label}
              </button>
            ))}
          </span>
        </Field>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="Sessions"><input id="sim-sesi" type="number" min={1} className="w-full" value={form.sessions} onChange={set("sessions")} /></Field>
          <Field label="Members"><input id="sim-member" type="number" min={0} className="w-full" value={form.members} onChange={set("members")} /></Field>
          <Field label="Avg attendance"><input id="sim-hadir" type="number" min={0} className="w-full" value={form.avg_member_attendance} onChange={set("avg_member_attendance")} /></Field>
          <Field label="Non-members/session"><input id="sim-nonmember" type="number" min={0} className="w-full" value={form.non_members} onChange={set("non_members")} /></Field>
          <Field label="Member price (Rp)"><MoneyInput id="sim-commitment" value={form.commitment_fee} onChange={setMoney("commitment_fee")} /></Field>
          <Field label="Contribution (Rp)"><MoneyInput id="sim-kontribusi" value={form.member_contribution} onChange={setMoney("member_contribution")} /></Field>
          <Field label="Non-member rate (Rp)"><MoneyInput id="sim-tarif" value={form.non_member_fee} onChange={setMoney("non_member_fee")} /></Field>
          <Field label="Court/session (Rp)"><MoneyInput id="sim-lapangan" value={form.venue_cost_per_session} onChange={setMoney("venue_cost_per_session")} /></Field>
          <Field label="Shuttles/session"><input id="sim-kok" type="number" min={0} className="w-full" value={form.shuttlecock_per_session} onChange={set("shuttlecock_per_session")} /></Field>
          <Field label="Pack price (Rp)"><MoneyInput id="sim-pack" value={form.pack_price} onChange={setMoney("pack_price")} /></Field>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3">
          <Btn disabled={runState.isLoading} onClick={submit}>{runState.isLoading ? "Calculating…" : "Run simulation"}</Btn>
        </div>
      </section>

      <div>
        {!r ? (
          <p className="border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-ink-faint">
            Fill in the numbers, then run the simulation.
          </p>
        ) : (
          <>
            <section aria-label="Simulation result" className="rounded-xl border border-line bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <h2 className="text-sm font-semibold">Result · {scenario}</h2>
                <Badge status={String(r.status)} />
              </div>
              <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
                <Cell label="Operating profit" value={rupiah(Number(r.operating_profit))} />
                <Cell label="Revenue" value={rupiah(Number(r.revenue))} />
                <Cell label="Cash flow" value={rupiah(Number(r.cash_flow))} sub={`${r.packs_needed} pack`} />
                <Cell label="Member break-even" value={`${r.break_even_attendance}× visits`} sub={`Needs ${r.required_non_members} non-members/session`} />
              </dl>
            </section>
            <section aria-label="Member vs non-member" className="mt-5 rounded-xl border border-line bg-white shadow-card">
              <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">Member vs non-member by attendance</h2>
              <table className="data">
                <thead><tr><th className="text-right">Attended</th><th className="text-right">Member</th><th className="text-right">Non-member</th><th className="text-right">Saved</th></tr></thead>
                <tbody>
                  {table.map((row) => (
                    <tr key={row.attendance}>
                      <td className="text-right tabular-nums">{row.attendance}×</td>
                      <td className="text-right tabular-nums">{rupiah(row.member_total)}</td>
                      <td className="text-right tabular-nums">{rupiah(row.non_member_total)}</td>
                      <td className="text-right tabular-nums">{rupiah(row.member_benefit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function DailySim() {
  const [form, setForm] = useState({ ...DEFAULT_DAILY });
  const [error, setError] = useState("");
  const [run, runState] = useSimulateDailyMutation();
  const set = (k: keyof typeof DEFAULT_DAILY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: num(e.target.value) });
  const setMoney = (k: keyof typeof DEFAULT_DAILY) => (n: number) =>
    setForm({ ...form, [k]: n });

  async function submit() {
    try {
      await run(form).unwrap();
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Simulation failed.");
    }
  }

  const r = runState.data as Record<string, number | string | Record<string, number>> | undefined;
  const bill = (r?.example_bill as Record<string, number> | undefined);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <section aria-label="Daily simulation inputs" className="h-fit rounded-xl border border-line bg-white shadow-card p-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Court (Rp)"><MoneyInput id="d-lapangan" value={form.venue_cost} onChange={setMoney("venue_cost")} /></Field>
          <Field label="Players"><input id="d-pemain" type="number" min={1} className="w-full" value={form.players} onChange={set("players")} /></Field>
          <Field label="Rp/shuttle/player"><MoneyInput id="d-rpkok" value={form.price_per_shuttlecock} onChange={setMoney("price_per_shuttlecock")} /></Field>
          <Field label="Shuttles/player"><input id="d-kok" type="number" min={0} className="w-full" value={form.shuttlecock_per_player} onChange={set("shuttlecock_per_player")} /></Field>
          <Field label="Pack price (Rp)"><MoneyInput id="d-pack" value={form.pack_price} onChange={setMoney("pack_price")} /></Field>
          <Field label="Units/pack"><input id="d-isi" type="number" min={1} className="w-full" value={form.units_per_pack} onChange={set("units_per_pack")} /></Field>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-3">
          <Btn disabled={runState.isLoading} onClick={submit}>{runState.isLoading ? "Calculating…" : "Run simulation"}</Btn>
        </div>
      </section>
      <div>
        {!r ? (
          <p className="border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-ink-faint">
            Fill in the numbers, then run the simulation.
          </p>
        ) : (
          <section aria-label="Daily simulation result" className="rounded-xl border border-line bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-3 py-2">
              <h2 className="text-sm font-semibold">Result</h2>
              <Badge status={String(r.status)} />
            </div>
            <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4">
              <Cell label="Profit" value={rupiah(Number(r.operating_profit))} />
              <Cell label="Court share" value={rupiah(Number(r.court_share))} sub={`Total ${rupiah(Number(r.court_cost_total))}`} />
              <Cell label="Sample bill" value={rupiah(Number(bill?.total ?? 0))} sub={`${bill?.shuttlecock_count ?? 0} shuttles`} />
              <Cell label="Shuttle usage" value={`${r.shuttlecock_units} pc`} sub={`Cost ${rupiah(Number(r.shuttlecock_cost))}`} />
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-3 py-2.5">
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
      {sub && <dd className="text-xs text-ink-faint">{sub}</dd>}
    </div>
  );
}
