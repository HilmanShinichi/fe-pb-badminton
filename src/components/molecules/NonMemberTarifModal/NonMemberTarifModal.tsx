import { useEffect, useState } from "react";
import { rupiah } from "../../../format";
import { Btn } from "../../atoms/Button";
import { MoneyInput } from "../../atoms/MoneyInput";

export interface NonMemberTarifModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  defaultFee: number;
  currentCustomFee?: number | null;
  currentNotes?: string | null;
  isLoading?: boolean;
  onSave: (customFee: number | null, notes: string | null) => Promise<void>;
}

export function NonMemberTarifModal({
  isOpen,
  onClose,
  playerName,
  defaultFee,
  currentCustomFee,
  currentNotes,
  isLoading,
  onSave,
}: NonMemberTarifModalProps) {
  const [isCustom, setIsCustom] = useState(currentCustomFee != null);
  const [fee, setFee] = useState<number>(currentCustomFee ?? (defaultFee > 0 ? defaultFee : 25000));
  const [notes, setNotes] = useState(currentNotes ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsCustom(currentCustomFee != null);
      setFee(currentCustomFee ?? (defaultFee > 0 ? defaultFee : 25000));
      setNotes(currentNotes ?? "");
      setError("");
    }
  }, [isOpen, currentCustomFee, currentNotes, defaultFee]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!isCustom) {
        await onSave(null, null);
      } else {
        if (fee < 0) {
          setError("Nominal tarif tidak boleh negatif.");
          return;
        }
        await onSave(fee, notes.trim() || null);
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan tarif.");
    }
  }

  const QUICK_FEES = [10000, 15000, 20000, 25000];
  const QUICK_NOTES = ["Main 1x", "Sakit", "Cedera", "Hanya 1 Match", "Datang Terlambat"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="non-member-tarif-title"
    >
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
        onClick={() => !isLoading && onClose()}
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <h3 id="non-member-tarif-title" className="text-base font-bold text-ink flex items-center gap-2">
              <span className="text-lg">💰</span> Atur Tarif & Note Non-Member
            </h3>
            <p className="mt-1 text-xs text-ink-soft">
              Pemain: <span className="font-semibold text-ink">{playerName}</span>
            </p>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-court hover:text-ink transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-xs rounded-md bg-rose-50 border border-rose-200 p-2 text-rose-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink uppercase tracking-wider">Pilih Opsi Tarif</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCustom(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !isCustom
                    ? "border-pine bg-pine/5 ring-2 ring-pine/30 shadow-xs"
                    : "border-line bg-paper hover:bg-court/40"
                }`}
              >
                <div className="font-bold text-xs text-ink">Tarif Default</div>
                <div className="text-sm font-extrabold text-pine mt-0.5">{rupiah(defaultFee > 0 ? defaultFee : 25000)}</div>
                <div className="text-[11px] text-ink-faint mt-1">Standar non-member</div>
              </button>

              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isCustom
                    ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-400/40 shadow-xs"
                    : "border-line bg-paper hover:bg-court/40"
                }`}
              >
                <div className="font-bold text-xs text-amber-900">Tarif Dinamis</div>
                <div className="text-sm font-extrabold text-amber-700 mt-0.5">Custom / Khusus</div>
                <div className="text-[11px] text-ink-faint mt-1">Main 1x, sakit, dsb.</div>
              </button>
            </div>
          </div>

          {/* Dynamic input fields when Custom is selected */}
          {isCustom && (
            <div className="space-y-3.5 rounded-xl border border-amber-200/80 bg-amber-50/30 p-3.5">
              <div>
                <label htmlFor="custom-fee-input" className="block text-xs font-semibold text-ink mb-1">
                  Nominal Bayar (Rp)
                </label>
                <div className="bg-white rounded-lg border border-line focus-within:border-pine focus-within:ring-1 focus-within:ring-pine">
                  <MoneyInput
                    id="custom-fee-input"
                    value={fee}
                    onChange={(val) => setFee(Math.max(0, val))}
                  />
                </div>
                {/* Quick fee shortcut chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-ink-faint font-medium">Cepat:</span>
                  {QUICK_FEES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setFee(q)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        fee === q
                          ? "bg-amber-600 text-white border-amber-600 font-semibold"
                          : "bg-white border-line text-ink-soft hover:bg-amber-100/60"
                      }`}
                    >
                      {rupiah(q)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="custom-notes-input" className="block text-xs font-semibold text-ink mb-1">
                  Note / Keterangan Alasan
                </label>
                <input
                  id="custom-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Main 1x, Sakit, Cedera, dsb."
                  className="w-full text-xs rounded-lg border border-line bg-white px-3 py-2 font-medium text-ink focus:border-pine focus:outline-hidden"
                />
                {/* Quick note shortcut chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-ink-faint font-medium">Saran note:</span>
                  {QUICK_NOTES.map((qn) => (
                    <button
                      key={qn}
                      type="button"
                      onClick={() => setNotes(qn)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                        notes === qn
                          ? "bg-amber-100 border-amber-300 text-amber-900 font-semibold"
                          : "bg-white border-line text-ink-soft hover:bg-neutral-50"
                      }`}
                    >
                      {qn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <Btn variant="plain" type="button" disabled={isLoading} onClick={onClose}>
              Batal
            </Btn>
            <Btn type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan…" : "Simpan Tarif"}
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}
