import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  usePublicRegistrationInfoQuery,
  useInitiatePaymentMutation,
  useSubmitPaymentProofMutation,
  usePublicRegistrationPeriodsQuery,
  type MembershipPayment,
  type PeriodRegistrationInfo,
  type RegisteredMemberItem,
  type PendingPaymentItem,
} from "../store/services";
import { toApiError } from "../store/baseApi";
import { compressImage } from "../utils/imageCompression";
import { dateId, rupiah } from "../format";
import { useI18n } from "../i18n";
import { LanguageSwitcher } from "../components/atoms/LanguageSwitcher/LanguageSwitcher";

// ─── SVG Icons (Anti-slop: semantic SVG, no emoji icons) ──────────────────────

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconClock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconLock({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconUpload({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function IconArrowLeft({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function IconAlertTriangle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

// ─── Helpers & Countdown ──────────────────────────────────────────────────────

function formatCountdown(secs: number): string {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function useCountdown(expiresAt: string | undefined, initialSecs: number) {
  const [secs, setSecs] = useState(initialSecs);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(rem);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

// ─── Status Badges (Metro Transit Style) ──────────────────────────────────────

function StatusBadge({ status }: { status: MembershipPayment["status"] | string }) {
  const { isEn } = useI18n();

  switch (status) {
    case "WAITING_PAYMENT":
      return (
        <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {isEn ? "Awaiting Payment" : "Menunggu Pembayaran"}
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          {isEn ? "Verification Pending" : "Menunggu Verifikasi"}
        </span>
      );
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1 border border-line bg-paper px-2 py-0.5 text-xs font-semibold text-lime-deep rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-lime" />
          {isEn ? "Confirmed Paid" : "Lunas"}
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {isEn ? "Expired / Failed" : "Kadaluarsa"}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 rounded">
          {status}
        </span>
      );
  }
}

// ─── Slot Capacity Card (Metro Design System) ─────────────────────────────────

function SlotCapacityCard({ info }: { info: PeriodRegistrationInfo }) {
  const { isEn } = useI18n();
  const max = info.period.max_members;
  const current = info.current_members;
  const remaining = info.remaining_slots ?? (max && max > 0 ? Math.max(0, max - current) : null);
  const pendingCount = info.pending_payments?.length ?? 0;

  const pct = max && max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3 mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
            {isEn ? "Metro Transit Board" : "Papan Kuota Periode"}
          </span>
          <h2 className="text-base font-bold text-[#111827]">
            {isEn ? "Member Slot Availability" : "Kapasitas & Ketersediaan Slot"}
          </h2>
        </div>
        {max && max > 0 ? (
          remaining === 0 ? (
            <span className="inline-flex items-center border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800 rounded">
              {isEn ? "Sold Out" : "Kuota Penuh"}
            </span>
          ) : (
            <span className="inline-flex items-center border border-line bg-paper px-2.5 py-1 text-xs font-bold text-lime-deep rounded">
              {isEn ? `${remaining} Slots Left` : `Sisa ${remaining} Slot`}
            </span>
          )
        ) : (
          <span className="inline-flex items-center border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 rounded">
            {isEn ? "Unlimited Quota" : "Tanpa Batas Kuota"}
          </span>
        )}
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Remaining Slots */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {isEn ? "Remaining Slots" : "Sisa Slot"}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-[#111827]">
              {max && max > 0 ? remaining : "∞"}
            </span>
            {max && max > 0 && (
              <span className="text-xs text-[#6b7280]">
                {isEn ? `/ ${max}` : `/ ${max}`}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {max && max > 0
              ? isEn
                ? `${remaining} available for booking`
                : `${remaining} dapat didaftar sekarang`
              : isEn
                ? "Open for all active players"
                : "Terbuka bagi seluruh pemain"}
          </p>
        </div>

        {/* Metric 2: Registered Members */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {isEn ? "Confirmed Members" : "Member Terdaftar"}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-[#111827]">{current}</span>
            <span className="text-xs text-[#6b7280]">{isEn ? "players" : "pemain"}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {isEn ? "Joined & commitment paid" : "Lunas iuran komitmen"}
          </p>
        </div>

        {/* Metric 3: Pending Verification */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {isEn ? "Pending Review" : "Menunggu Verifikasi"}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-sky-800">{pendingCount}</span>
            <span className="text-xs text-[#6b7280]">{isEn ? "proofs" : "bukti"}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {isEn ? "In admin review queue" : "Menunggu verifikasi admin"}
          </p>
        </div>

        {/* Metric 4: Commitment Fee */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {isEn ? "Commitment Fee" : "Iuran Komitmen"}
          </span>
          <div className="mt-1">
            <span className="text-lg font-black tracking-tight text-[#111827]">
              {rupiah(info.period.commitment_fee)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {isEn ? "Per player / period" : "Per pemain / periode"}
          </p>
        </div>
      </div>

      {/* Progress Bar (Only when max quota is specified) */}
      {max && max > 0 && (
        <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between text-xs text-[#4b5563] mb-1.5">
            <span className="font-medium">
              {isEn ? "Capacity Filled" : "Kapasitas Terisi"}: {pct}%
            </span>
            <span className="font-mono text-[#6b7280]">
              {current} / {max} {isEn ? "members" : "member"}
            </span>
          </div>
          <div className="h-2.5 w-full bg-[#e5e7eb] rounded overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                pct >= 100 ? "bg-red-600" : pct >= 80 ? "bg-amber-600" : "bg-[#141518]"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Detail Card (After user initiates payment) ──────────────────────

function PaymentCard({
  payment,
  onProofSubmitted,
}: {
  payment: MembershipPayment;
  onProofSubmitted: (p: MembershipPayment) => void;
}) {
  const { isEn } = useI18n();
  const secs = useCountdown(payment.expires_at, payment.remaining_seconds);
  const [submitProof, submitState] = useSubmitPaymentProofMutation();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const expired = secs <= 0 && payment.status === "WAITING_PAYMENT";
  const canUpload = payment.status === "WAITING_PAYMENT" && !expired;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  async function handleSubmit() {
    if (!file || submitState.isLoading) return;
    setError("");
    try {
      const compressed = await compressImage(file);
      const fd = new FormData();
      fd.append("proof", compressed);
      fd.append("paid_at", paidAt);
      if (note.trim()) fd.append("note", note.trim());
      const result = await submitProof({ paymentId: payment.id, periodId: payment.period_id, formData: fd }).unwrap();
      onProofSubmitted(result);
    } catch (e) {
      setError(toApiError(e).message);
    }
  }

  function copyAmount() {
    navigator.clipboard.writeText(String(payment.total_amount)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (payment.status === "PAID") {
    return (
      <div className="rounded-xl border border-line bg-paper p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-paper text-lime-deep mb-3">
          <IconCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-lime-deep">
          {isEn ? "Payment Confirmed!" : "Pembayaran Dikonfirmasi!"}
        </h3>
        <p className="mt-1 text-sm text-lime-deep">
          <strong>{payment.player_name}</strong>{" "}
          {isEn
            ? "is now officially registered as an active member."
            : "telah resmi terdaftar sebagai member aktif periode ini."}
        </p>
      </div>
    );
  }

  if (payment.status === "PENDING") {
    return (
      <div className="rounded-xl border border-sky-300 bg-sky-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-sky-800 mb-3">
          <IconClock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-sky-900">
          {isEn ? "Proof Submitted — Pending Verification" : "Bukti Diterima — Menunggu Verifikasi"}
        </h3>
        <p className="mt-1 text-sm text-sky-800">
          {isEn
            ? "Your payment proof has been submitted. Admins will verify and activate your membership shortly."
            : "Bukti transfer telah diterima. Pengurus akan memeriksa dan mengaktifkan keanggotaan Anda."}
        </p>
        <div className="mt-3 inline-block rounded border border-sky-200 bg-white px-3 py-1.5 text-xs font-mono text-sky-900">
          {isEn ? "Amount" : "Nominal"}: <strong>{rupiah(payment.total_amount)}</strong> ·{" "}
          {isEn ? "Unique Code" : "Kode Unik"}: <strong>+{payment.unique_code}</strong>
        </div>
      </div>
    );
  }

  if (payment.status === "FAILED" || expired) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-800 mb-3">
          <IconAlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-red-900">
          {isEn ? "Payment Session Expired" : "Waktu Pembayaran Habis"}
        </h3>
        <p className="mt-1 text-sm text-red-800">
          {isEn
            ? "The 30-minute payment window has expired. Please initiate registration again."
            : "Batas waktu transfer 30 menit telah berakhir. Silakan pilih kembali nama untuk mendaftar ulang."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3 mb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] block">
            {isEn ? "Payment for" : "Pendaftaran Atas Nama"}
          </span>
          <p className="text-base font-bold text-[#111827]">{payment.player_name}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Transfer Amount Card */}
      <div className="mb-4 rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-4 text-center">
        <span className="text-xs font-medium text-[#6b7280] block">
          {isEn ? "Transfer Exact Amount to PB Kecebong" : "Transfer tepat sesuai nominal berikut"}
        </span>
        <div className="mt-1 text-3xl font-black tracking-tight text-[#111827]">
          {rupiah(payment.total_amount)}
        </div>
        <p className="mt-1 text-xs text-[#4b5563]">
          {isEn ? "Base fee" : "Iuran"} {rupiah(payment.base_amount)} +{" "}
          <span className="font-semibold text-amber-800">
            {isEn ? "unique code" : "kode unik"} +{payment.unique_code}
          </span>
        </p>
        <button
          type="button"
          onClick={copyAmount}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#f5f6f8] transition-colors"
        >
          <IconCopy className="w-3.5 h-3.5 text-[#6b7280]" />
          {copied ? (isEn ? "Copied!" : "Disalin!") : isEn ? "Copy exact amount" : "Salin nominal"}
        </button>
      </div>

      {/* Countdown Timer */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-[#e5e7eb] px-3.5 py-2.5 bg-white">
        <div className="flex items-center gap-2 text-xs font-medium text-[#4b5563]">
          <IconClock className="w-4 h-4 text-[#6b7280]" />
          <span>{isEn ? "Payment Time Remaining" : "Sisa Waktu Pembayaran"}</span>
        </div>
        <span
          className={`font-mono text-base font-bold ${
            secs <= 120 ? "text-red-700 font-black" : "text-[#111827]"
          }`}
        >
          {formatCountdown(secs)}
        </span>
      </div>

      {/* Upload Proof Form */}
      {canUpload && (
        <div className="space-y-3.5 pt-2 border-t border-[#e5e7eb]">
          {/* QRIS Payment Section */}
          <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-4">
            <div className="mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wide text-[#374151] mb-2">
                {isEn ? "📱 Scan to Pay (QRIS)" : "📱 Bayar dengan QRIS"}
              </h4>
              <p className="text-xs text-[#6b7280] mb-3">
                {isEn
                  ? "Scan the QR code below using any banking app or e-wallet:"
                  : "Pindai QR code di bawah menggunakan aplikasi perbankan atau e-wallet:"}
              </p>
            </div>

            {/* Static QRIS QR Code */}
            <div className="flex flex-col items-center gap-2 mb-3">
              <div className="bg-white p-3 rounded border border-[#e5e7eb]">
                <img
                  src="/assets/qris.jpeg"
                  alt="QRIS Code"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <a
                href="/assets/qris.jpeg"
                download="PB-Kecebong-QRIS.jpeg"
                className="text-xs px-3 py-1.5 rounded bg-[#374151] text-white hover:bg-[#1f2937] transition-colors"
              >
                {isEn ? "⬇ Download QRIS" : "⬇ Unduh QRIS"}
              </a>
            </div>

            <div className="text-center text-xs text-[#6b7280] mb-3">
              <p className="font-medium text-[#111827] mb-1">
                {isEn ? "PB Kecebong" : "PB Kecebong"}
              </p>
              <p className="font-mono text-[#374151]">NMID: ID1021066584504</p>
            </div>

            <div className="rounded bg-white p-3 border border-[#e5e7eb]">
              <p className="text-[11px] text-[#6b7280] mb-1">
                {isEn ? "Total amount to transfer:" : "Total nominal transfer:"}
              </p>
              <p className="text-sm font-bold text-[#111827]">
                {rupiah(payment.total_amount)}{" "}
                <span className="text-xs font-normal text-amber-800">
                  ({isEn ? "includes unique code" : "sudah termasuk kode unik"} +{payment.unique_code})
                </span>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-[#e5e7eb] bg-blue-50 p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#111827] mb-2">
              {isEn ? "✓ Next Steps" : "✓ Langkah Berikutnya"}
            </h4>
            <ol className="text-xs text-[#4b5563] space-y-1.5 list-decimal list-inside">
              <li>
                {isEn
                  ? "Transfer the exact amount above within 30 minutes"
                  : "Transfer nominal di atas dalam waktu 30 menit"}
              </li>
              <li>
                {isEn
                  ? "Fill in the transfer date below"
                  : "Isi tanggal transfer pada form di bawah"}
              </li>
              <li>
                {isEn
                  ? "Upload a clear screenshot/photo of the transfer proof"
                  : "Unggah foto bukti transfer (screenshot atau foto slip)"}
              </li>
              <li>
                {isEn
                  ? "Click 'Submit Payment Proof' — admins will verify within 15 minutes"
                  : "Klik 'Kirim Bukti' — pengurus akan verifikasi dalam 15 menit"}
              </li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1">
              {isEn ? "Transfer Date" : "Tanggal Transfer"}
            </label>
            <input
              type="date"
              className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] focus:border-[#141518] focus:outline-hidden"
              value={paidAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1">
              {isEn ? "Proof of Payment Image" : "Foto Bukti Transfer"}
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-md border-2 border-dashed border-[#d1d5db] bg-[#f5f6f8] py-4 px-3 text-center text-sm font-medium text-[#374151] hover:border-[#141518] hover:bg-white transition-colors"
            >
              <div className="flex flex-col items-center gap-1.5">
                <IconUpload className="w-5 h-5 text-[#6b7280]" />
                <span>
                  {file
                    ? file.name
                    : isEn
                      ? "Select transfer receipt photo"
                      : "Pilih foto bukti transfer (JPG / PNG)"}
                </span>
                <span className="text-[11px] text-[#6b7280]">
                  {isEn ? "Max 2MB, will be compressed automatically" : "Maks 2MB, dikompres otomatis"}
                </span>
              </div>
            </button>
            {preview && (
              <div className="mt-2.5 rounded-md border border-[#e5e7eb] p-2 bg-[#f5f6f8]">
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-48 w-full rounded object-contain bg-white"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1">
              {isEn ? "Note (Optional)" : "Catatan / Bank Pengirim (Opsional)"}
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#141518] focus:outline-hidden"
              placeholder={isEn ? "e.g. BCA from account John" : "Contoh: Transfer via BCA a.n. Budi"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!file || submitState.isLoading}
            onClick={handleSubmit}
            className="w-full rounded-md bg-[#141518] py-2.5 text-sm font-bold text-white hover:bg-[#27272a] disabled:opacity-50 transition-colors"
          >
            {submitState.isLoading
              ? isEn
                ? "Uploading proof…"
                : "Mengunggah bukti…"
              : isEn
                ? "Submit Payment Proof"
                : "Kirim Bukti Pembayaran"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Registration Form (Choose Player and Initiate) ───────────────────────────

function RegistrationForm({
  info,
  onPaymentCreated,
}: {
  info: PeriodRegistrationInfo;
  onPaymentCreated: (p: MembershipPayment) => void;
}) {
  const { isEn } = useI18n();
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [initiatePayment, initState] = useInitiatePaymentMutation();
  const [error, setError] = useState("");
  const [activePayment, setActivePayment] = useState<MembershipPayment | null>(null);

  const players = info.eligible_players ?? [];
  const filteredPlayers = players.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedPlayerName = players.find((p) => p.id === selectedPlayer)?.name;
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer || initState.isLoading) return;
    setError("");
    try {
      const result = await initiatePayment({
        periodId: info.period.id,
        player_id: selectedPlayer,
      }).unwrap();
      onPaymentCreated(result);
    } catch (e) {
      const err = toApiError(e);
      if (err.code === "ACTIVE_PAYMENT_EXISTS" && err.payload) {
        setActivePayment(err.payload as MembershipPayment);
        return;
      }
      setError(err.message);
    }
  }

  if (activePayment) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3.5">
          <div className="flex items-start gap-2">
            <IconAlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {isEn ? "Active Payment Session Found" : "Pembayaran Aktif Ditemukan"}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {isEn
                  ? "A payment for this player is already in progress. Complete this payment or wait until it expires."
                  : "Pemain ini masih memiliki transaksi pembayaran yang sedang berjalan. Selesaikan pembayaran atau tunggu hingga kadaluarsa."}
              </p>
            </div>
          </div>
        </div>

        <PaymentCard payment={activePayment} onProofSubmitted={(p) => setActivePayment(p)} />

        <button
          type="button"
          className="text-xs font-semibold text-[#4b5563] hover:text-[#111827] underline"
          onClick={() => setActivePayment(null)}
        >
          {isEn ? "← Back to player selection" : "← Kembali ke pilihan pemain"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={dropdownRef}>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
          {isEn ? "Select Player Name" : "Pilih Nama Pemain"}
        </label>
        
        <div className="relative">
          <input
            type="text"
            placeholder={isEn ? "Type to search players..." : "Ketik untuk cari pemain..."}
            value={selectedPlayer ? selectedPlayerName || searchQuery : searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedPlayer) setSelectedPlayer("");
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#a5b4fc] focus:outline-hidden focus:ring-1 focus:ring-[#a5b4fc]"
            required={!selectedPlayer}
            disabled={players.length === 0}
          />

          {dropdownOpen && players.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border border-[#d1d5db] bg-white shadow-lg z-10">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlayer(p.id);
                      setSearchQuery("");
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 text-sm text-[#111827] hover:bg-[#f5f6f8] border-b border-[#f3f4f6] last:border-b-0 transition-colors"
                  >
                    {p.name}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2.5 text-sm text-[#6b7280]">
                  {isEn ? "No players match your search" : "Tidak ada pemain yang sesuai"}
                </div>
              )}
            </div>
          )}

          {selectedPlayer && !dropdownOpen && (
            <button
              type="button"
              onClick={() => setDropdownOpen(true)}
              className="absolute right-3 top-2.5 text-[#9ca3af] hover:text-[#111827]"
            >
              ▼
            </button>
          )}
        </div>

        {players.length === 0 ? (
          <p className="mt-1 text-xs text-[#6b7280]">
            {isEn
              ? "All active players are already registered in this period."
              : "Semua pemain aktif sudah terdaftar di periode ini."}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {isEn
              ? `${players.length} players available to register • Type to search`
              : `${players.length} pemain belum terdaftar • Ketik untuk cari`}
          </p>
        )}
      </div>

      {/* Pricing Breakdown Card */}
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5 text-xs">
        <span className="font-bold text-[#111827] uppercase tracking-wide block mb-2">
          {isEn ? "Payment Breakdown" : "Rincian Pembayaran"}
        </span>
        <div className="space-y-1.5 text-[#4b5563]">
          <div className="flex justify-between">
            <span>{isEn ? "Commitment Fee" : "Iuran Komitmen"}</span>
            <span className="font-semibold text-[#111827]">{rupiah(info.period.commitment_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span>{isEn ? "Unique 3-digit Code" : "Kode Unik (3 digit)"}</span>
            <span className="font-mono font-semibold text-amber-800">+ Rp 001–999</span>
          </div>
          <div className="border-t border-[#e5e7eb] pt-1.5 flex justify-between font-bold text-[#111827]">
            <span>{isEn ? "Approximate Total" : "Perkiraan Total"}</span>
            <span>≈ {rupiah(info.period.commitment_fee + 500)}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#6b7280]">
          {isEn
            ? "Exact nominal with unique code will be generated upon clicking 'Register & Pay'."
            : "Nominal pasti dengan 3 digit unik akan dibuat setelah klik 'Daftar & Bayar'."}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedPlayer || initState.isLoading || players.length === 0}
        className="w-full rounded-md bg-[#141518] py-3 text-sm font-bold text-white hover:bg-[#27272a] disabled:opacity-50 transition-colors"
      >
        {initState.isLoading
          ? isEn
            ? "Generating payment…"
            : "Menyiapkan pembayaran…"
          : isEn
            ? "Register & Pay"
            : "Daftar & Bayar"}
      </button>
    </form>
  );
}

// ─── Registered Members Table (Metro Transit Roster) ──────────────────────────

function RegisteredMembersTable({ members }: { members?: RegisteredMemberItem[] }) {
  const { isEn } = useI18n();
  const list = members ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-6 text-center text-xs text-[#6b7280]">
        {isEn
          ? "No members have officially registered for this period yet."
          : "Belum ada member yang terdaftar pada periode ini."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#f5f6f8] border-b border-[#e5e7eb] text-[#374151]">
          <tr>
            <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
            <th className="py-2.5 px-3 font-bold">{isEn ? "Player Name" : "Nama Pemain"}</th>
            <th className="py-2.5 px-3 font-bold">{isEn ? "Tier" : "Tier"}</th>
            <th className="py-2.5 px-3 font-bold">{isEn ? "Joined Date" : "Tanggal Masuk"}</th>
            <th className="py-2.5 px-3 font-bold text-right">{isEn ? "Status" : "Status"}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e5e7eb] bg-white">
          {list.map((m, idx) => (
            <tr key={m.player_id} className="hover:bg-[#f5f6f8]/60 transition-colors">
              <td className="py-2 px-3 text-center font-mono text-[#6b7280]">{idx + 1}</td>
              <td className="py-2 px-3 font-semibold text-[#111827]">{m.name}</td>
              <td className="py-2 px-3 text-[#6b7280]">
                {m.tier ? (
                  <span className="inline-block rounded border border-[#e5e7eb] bg-[#f5f6f8] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#374151]">
                    {m.tier}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-2 px-3 text-[#4b5563]">{dateId(m.joined_at)}</td>
              <td className="py-2 px-3 text-right">
                <span className="inline-flex items-center gap-1 border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold text-lime-deep rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                  {isEn ? "Member" : "Member"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pending Payments Table ───────────────────────────────────────────────────

function PendingPaymentsTable({ items }: { items?: PendingPaymentItem[] }) {
  const { isEn } = useI18n();
  const list = items ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-6 text-center text-xs text-[#6b7280]">
        {isEn
          ? "There are currently no payment proofs waiting for verification."
          : "Tidak ada bukti transfer yang sedang menunggu verifikasi saat ini."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <span className="font-bold">
          {isEn ? "Review in progress" : "Sedang dalam antrean verifikasi"}
        </span>
        :{" "}
        {isEn
          ? "The following players have submitted transfer receipts. Admins will confirm payments and roster seats shortly."
          : "Pemain di bawah ini telah mengirim bukti transfer dan sedang menunggu pengecekan mutasi bank oleh admin."}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f5f6f8] border-b border-[#e5e7eb] text-[#374151]">
            <tr>
              <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
              <th className="py-2.5 px-3 font-bold">{isEn ? "Player Name" : "Nama Pemain"}</th>
              <th className="py-2.5 px-3 font-bold">{isEn ? "Transfer Date" : "Tanggal Transfer"}</th>
              <th className="py-2.5 px-3 font-bold">{isEn ? "Submitted" : "Waktu Pengajuan"}</th>
              <th className="py-2.5 px-3 font-bold text-right">{isEn ? "Status" : "Status"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] bg-white">
            {list.map((it, idx) => (
              <tr key={it.payment_id} className="hover:bg-[#f5f6f8]/60 transition-colors">
                <td className="py-2 px-3 text-center font-mono text-[#6b7280]">{idx + 1}</td>
                <td className="py-2 px-3 font-semibold text-[#111827]">{it.name}</td>
                <td className="py-2 px-3 text-[#4b5563]">{it.paid_at ? dateId(it.paid_at) : "—"}</td>
                <td className="py-2 px-3 text-[#6b7280]">{dateId(it.created_at)}</td>
                <td className="py-2 px-3 text-right">
                  <span className="inline-flex items-center gap-1 border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {isEn ? "Reviewing" : "Menunggu Admin"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Period Detail Registration Page ─────────────────────────────────────────

function PeriodRegistrationPage({ id }: { id: string }) {
  const { isEn } = useI18n();
  const info = usePublicRegistrationInfoQuery(id, { pollingInterval: 30_000 });
  const [payment, setPayment] = useState<MembershipPayment | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "pending">("members");

  if (info.isFetching && !info.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="text-center text-[#6b7280]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#e5e7eb] mb-2">
            <IconClock className="w-5 h-5 text-[#111827]" />
          </div>
          <p className="text-sm font-medium">
            {isEn ? "Loading registration board…" : "Memuat data pendaftaran…"}
          </p>
        </div>
      </div>
    );
  }

  if (info.isError || !info.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4">
        <div className="max-w-md w-full rounded-xl border border-[#e5e7eb] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-800 mb-3">
            <IconAlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#111827]">
            {isEn ? "Period Not Found" : "Periode Tidak Ditemukan"}
          </h2>
          <p className="mt-1.5 text-sm text-[#4b5563]">
            {isEn
              ? "This registration link is invalid, expired, or has been removed."
              : "Link pendaftaran ini tidak valid atau sudah tidak aktif."}
          </p>
          <Link
            to="/register-member"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#141518] px-4 py-2 text-xs font-semibold text-white hover:bg-[#27272a] transition-colors"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            {isEn ? "View Active Periods" : "Lihat Periode Aktif"}
          </Link>
        </div>
      </div>
    );
  }

  const d = info.data;
  const isRegistrationClosed = !d.can_register && !payment;

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#111827] pb-16">
      {/* Top Transit Header */}
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/register-member"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#4b5563] hover:text-[#111827]"
            >
              <IconArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{isEn ? "All Periods" : "Semua Periode"}</span>
            </Link>
            <span className="text-[#d1d5db]">|</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] block">
                PB Kecebong · Metro Pass
              </span>
              <span className="text-xs font-bold text-[#111827]">
                {isEn ? "Online Membership Registration" : "Pendaftaran Member Online"}
              </span>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Period Title & Date Banner */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 border-b border-[#e5e7eb] pb-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#111827]">{d.period.name}</h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              {isEn ? "Period Schedule" : "Jadwal Periode"}: {dateId(d.period.start_date)} —{" "}
              {dateId(d.period.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[#6b7280]">
              {isEn ? "Status" : "Status"}:
            </span>
            <span className="font-semibold text-[#111827]">{d.period.status}</span>
          </div>
        </div>

        {/* 1. Slot Capacity & Statistics Card */}
        <SlotCapacityCard info={d} />

        {/* Closed or Full Alert Notice */}
        {isRegistrationClosed && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <IconLock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {isEn ? "Registration Closed" : "Pendaftaran Ditutup"}
                </h3>
                <p className="mt-0.5 text-xs text-amber-800">
                  {d.close_reason ||
                    (isEn
                      ? "This period is currently not accepting new member registrations."
                      : "Pendaftaran member untuk periode ini saat ini sedang tidak dibuka.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2-Column Grid: Left (Form/Payment) & Right (Roster/Pending) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Registration Action Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs">
              <div className="border-b border-[#e5e7eb] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280] block">
                    {isEn ? "Step 1 & 2" : "Langkah 1 & 2"}
                  </span>
                  <h2 className="text-base font-bold text-[#111827]">
                    {payment
                      ? isEn
                        ? "Payment Details"
                        : "Detail Pembayaran"
                      : isEn
                        ? "Register New Member"
                        : "Formulir Pendaftaran"}
                  </h2>
                </div>
                {payment && (payment.status === "FAILED" || payment.status === "PAID") && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#111827] underline"
                    onClick={() => setPayment(null)}
                  >
                    {isEn ? "Register another" : "Daftar lagi"}
                  </button>
                )}
              </div>

              {payment ? (
                <PaymentCard payment={payment} onProofSubmitted={setPayment} />
              ) : !d.can_register ? (
                <div className="py-6 text-center text-xs text-[#6b7280]">
                  <p>
                    {isEn
                      ? "Registration is currently unavailable for this period."
                      : "Pendaftaran baru tidak dapat dilakukan untuk periode ini."}
                  </p>
                </div>
              ) : (
                <RegistrationForm info={d} onPaymentCreated={setPayment} />
              )}
            </div>
          </div>

          {/* Right Column: Roster Tabs (Registered Members & Pending Verifications) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs">
              {/* Tab Navigation */}
              <div className="border-b border-[#e5e7eb] flex items-center justify-between mb-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
                      activeTab === "members"
                        ? "border-[#141518] text-[#111827]"
                        : "border-transparent text-[#6b7280] hover:text-[#111827]"
                    }`}
                  >
                    {isEn ? "Registered Members" : "Member Terdaftar"} (
                    {d.registered_members?.length ?? d.current_members})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("pending")}
                    className={`pb-2.5 text-xs font-bold transition-colors border-b-2 ${
                      activeTab === "pending"
                        ? "border-[#141518] text-[#111827]"
                        : "border-transparent text-[#6b7280] hover:text-[#111827]"
                    }`}
                  >
                    {isEn ? "Pending Review" : "Menunggu Verifikasi"} (
                    {d.pending_payments?.length ?? 0})
                  </button>
                </div>
                <span className="text-[11px] font-mono text-[#6b7280]">
                  {activeTab === "members" ? `${d.current_members} confirmed` : "queue"}
                </span>
              </div>

              {/* Tab Panels */}
              {activeTab === "members" ? (
                <div>
                  <div className="mb-3 text-xs text-[#4b5563]">
                    {isEn
                      ? "List of confirmed players who have joined this period and completed their commitment fee."
                      : "Daftar pemain yang telah resmi bergabung dan melunasi iuran komitmen pada periode ini."}
                  </div>
                  <RegisteredMembersTable members={d.registered_members} />
                </div>
              ) : (
                <div>
                  <PendingPaymentsTable items={d.pending_payments} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Registration Index Page (List of Open Periods) ───────────────────────────

function RegistrationIndexPage() {
  const navigate = useNavigate();
  const { isEn } = useI18n();
  const periods = usePublicRegistrationPeriodsQuery();

  if (periods.isFetching && !periods.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="text-center text-[#6b7280]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#e5e7eb] mb-2">
            <IconClock className="w-5 h-5 text-[#111827]" />
          </div>
          <p className="text-sm font-medium">
            {isEn ? "Loading active periods…" : "Memuat daftar periode aktif…"}
          </p>
        </div>
      </div>
    );
  }

  const list = periods.data ?? [];

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#111827] pb-16">
      {/* Top Transit Header */}
      <header className="border-b border-[#e5e7eb] bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] block">
              PB Kecebong · Metro Pass
            </span>
            <span className="text-xs font-bold text-[#111827]">
              {isEn ? "Online Membership Registration" : "Pendaftaran Member Online"}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div className="border-b border-[#e5e7eb] pb-4 text-center sm:text-left">
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            {isEn ? "Select Registration Period" : "Pilih Periode Pendaftaran"}
          </h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            {isEn
              ? "Choose an active membership period below to view slot quota and proceed with registration."
              : "Pilih periode badminton aktif di bawah ini untuk melihat ketersediaan slot dan mendaftar."}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f6f8] text-[#6b7280] mb-3">
              <IconLock className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#111827]">
              {isEn ? "No Open Registration Periods" : "Tidak Ada Pendaftaran Aktif"}
            </h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              {isEn
                ? "Currently there are no periods accepting member registrations."
                : "Saat ini belum ada periode yang membuka pendaftaran member baru."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {list.map((item) => {
              const max = item.period.max_members;
              const current = item.current_members;
              const remaining =
                item.remaining_slots ?? (max && max > 0 ? Math.max(0, max - current) : null);

              return (
                <button
                  key={item.period.id}
                  type="button"
                  onClick={() => navigate(`/register-member/${item.period.id}`)}
                  className="w-full rounded-xl border border-[#e5e7eb] bg-white p-5 text-left shadow-xs hover:border-[#141518] transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-[#111827] group-hover:text-black">
                          {item.period.name}
                        </h3>
                        {item.is_full ? (
                          <span className="border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800 rounded">
                            {isEn ? "Sold Out" : "Penuh"}
                          </span>
                        ) : (
                          <span className="border border-line bg-paper px-2 py-0.5 text-[11px] font-bold text-lime-deep rounded">
                            {isEn ? "Open" : "Buka"}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {dateId(item.period.start_date)} — {dateId(item.period.end_date)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs sm:text-right">
                      <div>
                        <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">
                          {isEn ? "Capacity" : "Kapasitas"}
                        </span>
                        <span className="font-mono font-bold text-[#111827]">
                          {max && max > 0
                            ? isEn
                              ? `${remaining} slots left (${current}/${max})`
                              : `Sisa ${remaining} slot (${current}/${max})`
                            : isEn
                              ? `${current} members (Unlimited)`
                              : `${current} member (Tanpa batas)`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">
                          {isEn ? "Fee" : "Iuran"}
                        </span>
                        <span className="font-bold text-[#111827]">
                          {rupiah(item.period.commitment_fee)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Exported Page Router ─────────────────────────────────────────────────────

export function RegisterMemberPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <PeriodRegistrationPage id={id} />;
  return <RegistrationIndexPage />;
}
