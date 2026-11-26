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
import { formatGmt7DateTime, rupiah } from "../format";
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

function IconFileText({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function IconWhatsApp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.79 14.01c-.24.68-1.41 1.3-1.95 1.38-.5.08-1.13.11-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.79-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1.01-2.41.26-.29.58-.36.77-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.38-.43.51-.14.14-.29.3-.13.59.17.29.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.33 1.44.29.14.46.12.63-.07.17-.19.72-.84.91-1.13.19-.29.39-.24.65-.14.26.1 1.68.79 1.97.94.29.14.48.22.55.34.07.12.07.69-.17 1.37z" />
    </svg>
  );
}

const ADMIN_CONTACTS = [
  {
    number: 1,
    name: "Hilman",
    phoneDisplay: "+62 813-2054-6022",
    waUrl: "https://wa.me/6281320546022",
  },
  {
    number: 2,
    name: "P_Tri",
    phoneDisplay: "+62 857-8053-4995",
    waUrl: "https://wa.me/6285780534995",
  },
] as const;

function AdminHelpCard() {
  const { t } = useI18n();

  return (
    <section
      aria-label={t("registerMember.adminHelpAria")}
      className="rounded-xl border border-line bg-white p-5 shadow-xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3 mb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
            {t("registerMember.adminHelpEyebrow")}
          </span>
          <h2 className="text-sm font-bold text-ink">
            {t("registerMember.adminHelpTitle")}
          </h2>
        </div>
        <p className="text-xs text-ink-soft">
          {t("registerMember.adminHelpDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ADMIN_CONTACTS.map((admin) => (
          <div
            key={admin.name}
            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper/60 px-4 py-3"
          >
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
                {t("registerMember.adminRoleLabel")} {admin.number}
              </span>
              <p className="text-sm font-bold text-ink truncate">{admin.name}</p>
              <p className="text-xs font-mono text-ink-soft">{admin.phoneDisplay}</p>
            </div>

            <a
              href={admin.waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("registerMember.adminChatAria", { name: admin.name })}
              title={`WhatsApp ${admin.name}`}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pine text-white hover:bg-pine-deep transition-colors focus:outline-hidden focus:ring-2 focus:ring-pine/40"
            >
              <IconWhatsApp className="w-5 h-5" />
            </a>
          </div>
        ))}
      </div>
    </section>
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

function getRemainingParts(expiresAt: string | null | undefined) {
  if (!expiresAt) return null;
  const targetMs = new Date(expiresAt).getTime();
  if (isNaN(targetMs)) return null;
  const totalSeconds = Math.max(0, Math.floor((targetMs - Date.now()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalSeconds, days, hours, minutes, seconds, isExpired: totalSeconds <= 0 };
}

function useDeadlineCountdown(expiresAt: string | null | undefined) {
  const [parts, setParts] = useState(() => getRemainingParts(expiresAt));

  useEffect(() => {
    const update = () => setParts(getRemainingParts(expiresAt));
    update();
    if (!expiresAt) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return parts;
}

function RegistrationCountdownCard({
  periodId,
  expiresAt,
  canRegister,
  onExpired,
}: {
  periodId: string;
  expiresAt: string;
  canRegister: boolean;
  onExpired: () => void;
}) {
  const { t, lang } = useI18n();
  const parts = useDeadlineCountdown(expiresAt);
  const autoRefetchedRef = useRef<string | null>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    if (!parts || !parts.isExpired || !canRegister) return;
    const key = `${periodId}:${expiresAt}`;
    if (autoRefetchedRef.current === key) return;
    autoRefetchedRef.current = key;
    onExpiredRef.current();
  }, [parts, canRegister, periodId, expiresAt]);

  if (!parts) return null;

  const isUrgent = !parts.isExpired && parts.totalSeconds <= 3600;
  const isWarning = !parts.isExpired && !isUrgent && parts.totalSeconds <= 86400;
  const formattedDeadline = formatGmt7DateTime(expiresAt, lang);
  const pad2 = (n: number) => String(n).padStart(2, "0");

  return (
    <section
      aria-label={t("registerMember.countdownEyebrow")}
      className={`rounded-xl border p-5 shadow-xs ${
        parts.isExpired
          ? "border-red-300 bg-red-50/70"
          : isUrgent
            ? "border-red-300 bg-white"
            : isWarning
              ? "border-amber-300 bg-white"
              : "border-[#e5e7eb] bg-white"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <IconClock
              className={`w-4 h-4 ${
                parts.isExpired || isUrgent
                  ? "text-red-700"
                  : isWarning
                    ? "text-amber-700"
                    : "text-[#6b7280]"
              }`}
            />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b7280]">
              {t("registerMember.countdownEyebrow")}
            </span>
          </div>
          <h2
            className={`text-base font-bold ${
              parts.isExpired ? "text-red-900" : "text-[#111827]"
            }`}
          >
            {parts.isExpired
              ? t("registerMember.countdownExpiredTitle")
              : t("registerMember.countdownTitle")}
          </h2>
          <p className="text-xs text-[#4b5563]">
            {t("registerMember.countdownDeadlineLabel")}:{" "}
            <span className="font-semibold text-[#111827]">{formattedDeadline}</span>
          </p>
        </div>

        {parts.isExpired ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-100/80 px-3.5 py-2 text-xs font-semibold text-red-900 self-start md:self-center">
            <IconLock className="w-4 h-4 shrink-0" />
            <span>
              {canRegister
                ? t("registerMember.countdownExpiredDesc")
                : t("registerMember.indexClosedNow")}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:gap-2.5 self-start md:self-center">
            {[
              { value: String(parts.days), label: t("registerMember.countdownDays") },
              { value: pad2(parts.hours), label: t("registerMember.countdownHours") },
              { value: pad2(parts.minutes), label: t("registerMember.countdownMinutes") },
              { value: pad2(parts.seconds), label: t("registerMember.countdownSeconds") },
            ].map((cell) => (
              <div
                key={cell.label}
                className={`min-w-[60px] sm:min-w-[68px] rounded-lg border px-2.5 py-2 text-center ${
                  isUrgent
                    ? "border-red-200 bg-red-50/70"
                    : isWarning
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-[#e5e7eb] bg-[#f5f6f8]"
                }`}
              >
                <div
                  className={`font-mono text-xl sm:text-2xl font-black tracking-tight tabular-nums ${
                    isUrgent
                      ? "text-red-800"
                      : isWarning
                        ? "text-amber-900"
                        : "text-[#111827]"
                  }`}
                >
                  {cell.value}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
                  {cell.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function IndexDeadlineLine({ expiresAt }: { expiresAt: string }) {
  const { t, lang } = useI18n();
  const parts = useDeadlineCountdown(expiresAt);
  if (!parts) return null;

  const formatted = formatGmt7DateTime(expiresAt, lang);
  let remainingText = t("registerMember.indexClosedNow");
  if (!parts.isExpired) {
    const dLabel = t("registerMember.countdownDays").toLowerCase();
    const hLabel = t("registerMember.countdownHours").toLowerCase();
    const mLabel = t("registerMember.countdownMinutes").toLowerCase();
    const compact =
      parts.days > 0
        ? `${parts.days} ${dLabel} ${parts.hours} ${hLabel}`
        : parts.hours > 0
          ? `${parts.hours} ${hLabel} ${parts.minutes} ${mLabel}`
          : `${Math.max(1, parts.minutes)} ${mLabel}`;
    remainingText = t("registerMember.indexTimeLeft", { time: compact });
  }

  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#4b5563]">
      <IconClock className="w-3.5 h-3.5 text-[#6b7280] shrink-0" />
      <span>
        {t("registerMember.indexDeadlineLabel")}:{" "}
        <span className="font-medium text-[#111827]">{formatted}</span>
      </span>
      <span className="text-[#d1d5db]">·</span>
      <span
        className={`font-semibold ${
          parts.isExpired
            ? "text-red-700"
            : parts.totalSeconds <= 86400
              ? "text-amber-800"
              : "text-pine-deep"
        }`}
      >
        {remainingText}
      </span>
    </p>
  );
}

// ─── Status Badges (Metro Transit Style) ──────────────────────────────────────

function StatusBadge({ status }: { status: MembershipPayment["status"] | string }) {
  const { t } = useI18n();

  switch (status) {
    case "WAITING_PAYMENT":
      return (
        <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {t("registerMember.statusWaiting")}
        </span>
      );
    case "PENDING":
      return (
        <span className="inline-flex items-center gap-1 border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          {t("registerMember.statusPending")}
        </span>
      );
    case "PAID":
      return (
        <span className="inline-flex items-center gap-1 border border-line bg-paper px-2 py-0.5 text-xs font-semibold text-lime-deep rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-lime" />
          {t("registerMember.statusPaid")}
        </span>
      );
    case "FAILED":
      return (
        <span className="inline-flex items-center gap-1 border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-900 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {t("registerMember.statusFailed")}
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
  const { t } = useI18n();
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
            {t("registerMember.quotaEyebrow")}
          </span>
          <h2 className="text-base font-bold text-[#111827]">
            {t("registerMember.quotaTitle")}
          </h2>
        </div>
        {max && max > 0 ? (
          remaining === 0 ? (
            <span className="inline-flex items-center border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-800 rounded">
              {t("registerMember.quotaSoldOut")}
            </span>
          ) : (
            <span className="inline-flex items-center border border-line bg-paper px-2.5 py-1 text-xs font-bold text-lime-deep rounded">
              {t("registerMember.quotaSlotsLeft", { count: remaining ?? 0 })}
            </span>
          )
        ) : (
          <span className="inline-flex items-center border border-blue-300 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 rounded">
            {t("registerMember.quotaUnlimited")}
          </span>
        )}
      </div>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Remaining Slots */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {t("registerMember.metricRemainingTitle")}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-[#111827]">
              {max && max > 0 ? remaining : "∞"}
            </span>
            {max && max > 0 && (
              <span className="text-xs text-[#6b7280]">
                / {max}
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {max && max > 0
              ? t("registerMember.metricRemainingAvailable", { max })
              : t("registerMember.metricRemainingOpen")}
          </p>
        </div>

        {/* Metric 2: Registered Members */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {t("registerMember.metricMembersTitle")}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-[#111827]">{current}</span>
            <span className="text-xs text-[#6b7280]">{t("registerMember.metricMembersUnit")}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {t("registerMember.metricMembersDesc")}
          </p>
        </div>

        {/* Metric 3: Pending Verification */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {t("registerMember.metricPendingTitle")}
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight text-sky-800">{pendingCount}</span>
            <span className="text-xs text-[#6b7280]">{t("registerMember.metricPendingUnit")}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {t("registerMember.metricPendingDesc")}
          </p>
        </div>

        {/* Metric 4: Commitment Fee */}
        <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6b7280] block">
            {t("registerMember.metricFeeTitle")}
          </span>
          <div className="mt-1">
            <span className="text-lg font-black tracking-tight text-[#111827]">
              {rupiah(info.period.commitment_fee)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {t("registerMember.metricFeeDesc")}
          </p>
        </div>
      </div>

      {/* Progress Bar (Only when max quota is specified) */}
      {max && max > 0 && (
        <div className="mt-4 pt-3 border-t border-[#e5e7eb]">
          <div className="flex items-center justify-between text-xs text-[#4b5563] mb-1.5">
            <span className="font-medium">
              {t("registerMember.capacityFilled", { pct })}
            </span>
            <span className="font-mono text-[#6b7280]">
              {t("registerMember.capacityMembersCount", { current, max })}
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
  const { t } = useI18n();
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
          {t("registerMember.paidConfirmedTitle")}
        </h3>
        <p className="mt-1 text-sm text-lime-deep">
          <strong>{payment.player_name}</strong> — {t("registerMember.paidConfirmedDesc")}
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
          {t("registerMember.pendingSubmittedTitle")}
        </h3>
        <p className="mt-1 text-sm text-sky-800">
          {t("registerMember.pendingSubmittedDesc")}
        </p>
        <div className="mt-3 inline-block rounded border border-sky-200 bg-white px-3 py-1.5 text-xs font-mono text-sky-900">
          {t("registerMember.amountLabel")}: <strong>{rupiah(payment.total_amount)}</strong> ·{" "}
          {t("registerMember.uniqueCodeShort", { code: payment.unique_code })}
        </div>
      </div>
    );
  }

  if (payment.status === "FAILED" || expired) {
    const hasReason = payment.status === "FAILED" && Boolean(payment.rejection_reason?.trim());
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-800 mb-3">
          <IconAlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-red-900">
          {hasReason
            ? t("registerMember.failedTitle")
            : t("registerMember.expiredTitle")}
        </h3>
        <p className="mt-1 text-sm text-red-800">
          {hasReason
            ? payment.rejection_reason
            : t("registerMember.expiredDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3 mb-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6b7280] block">
            {t("registerMember.paymentForLabel")}
          </span>
          <p className="text-base font-bold text-[#111827]">{payment.player_name}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Transfer Amount Card */}
      <div className="mb-4 rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-4 text-center">
        <span className="text-xs font-medium text-[#6b7280] block">
          {t("registerMember.transferExactLabel")}
        </span>
        <div className="mt-1 text-3xl font-black tracking-tight text-[#111827]">
          {rupiah(payment.total_amount)}
        </div>
        <p className="mt-1 text-xs text-[#4b5563]">
          {t("registerMember.baseFeeLabel", { amount: rupiah(payment.base_amount) })} +{" "}
          <span className="font-semibold text-amber-800">
            {t("registerMember.uniqueCodeLower", { code: payment.unique_code })}
          </span>
        </p>
        <button
          type="button"
          onClick={copyAmount}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-semibold text-[#111827] hover:bg-[#f5f6f8] transition-colors"
        >
          <IconCopy className="w-3.5 h-3.5 text-[#6b7280]" />
          {copied ? t("registerMember.copiedLabel") : t("registerMember.copyExactAmount")}
        </button>
      </div>

      {/* Countdown Timer */}
      <div className="mb-4 flex items-center justify-between rounded-md border border-[#e5e7eb] px-3.5 py-2.5 bg-white">
        <div className="flex items-center gap-2 text-xs font-medium text-[#4b5563]">
          <IconClock className="w-4 h-4 text-[#6b7280]" />
          <span>{t("registerMember.timeRemainingLabel")}</span>
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
                {t("registerMember.qrisTitle")}
              </h4>
              <p className="text-xs text-[#6b7280] mb-3">
                {t("registerMember.qrisDesc")}
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
                {t("registerMember.downloadQris")}
              </a>
            </div>

            <div className="text-center text-xs text-[#6b7280] mb-3">
              <p className="font-medium text-[#111827] mb-1">
                {t("registerMember.headerBrand")}
              </p>
              <p className="font-mono text-[#374151]">NMID: ID1021066584504</p>
            </div>

            <div className="rounded bg-white p-3 border border-[#e5e7eb]">
              <p className="text-[11px] text-[#6b7280] mb-1">
                {t("registerMember.totalToTransferLabel")}
              </p>
              <p className="text-sm font-bold text-[#111827]">
                {rupiah(payment.total_amount)}{" "}
                <span className="text-xs font-normal text-amber-800">
                  ({t("registerMember.includesUniqueCode", { code: payment.unique_code })})
                </span>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border border-[#e5e7eb] bg-blue-50 p-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wide text-[#111827] mb-2">
              {t("registerMember.nextStepsTitle")}
            </h4>
            <ol className="text-xs text-[#4b5563] space-y-1.5 list-decimal list-inside">
              <li>{t("registerMember.nextStep1")}</li>
              <li>{t("registerMember.nextStep2")}</li>
              <li>{t("registerMember.nextStep3")}</li>
              <li>{t("registerMember.nextStep4")}</li>
            </ol>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#374151] uppercase tracking-wide mb-1">
              {t("registerMember.transferDateLabel")}
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
              {t("registerMember.proofImageLabel")}
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
                  {file ? file.name : t("registerMember.selectProofPhoto")}
                </span>
                <span className="text-[11px] text-[#6b7280]">
                  {t("registerMember.proofSizeHint")}
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
              {t("registerMember.noteLabel")}
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#141518] focus:outline-hidden"
              placeholder={t("registerMember.notePlaceholder")}
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
              ? t("registerMember.uploadingProof")
              : t("registerMember.submitProofBtn")}
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
  const { t } = useI18n();
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [initiatePayment, initState] = useInitiatePaymentMutation();
  const [error, setError] = useState("");
  const [activePayment, setActivePayment] = useState<MembershipPayment | null>(null);
  const hasNotes = Boolean(info.period.registration_notes?.trim());

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
    if (!selectedPlayer || initState.isLoading || (hasNotes && !acceptedTerms)) return;
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
                {t("registerMember.activePaymentTitle")}
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {t("registerMember.activePaymentDesc")}
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
          {t("registerMember.backToPlayers")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div ref={dropdownRef}>
        <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] mb-1.5">
          {t("registerMember.selectPlayerLabel")}
        </label>
        
        <div className="relative">
          <input
            type="text"
            placeholder={t("registerMember.searchPlayersPlaceholder")}
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
                  {t("registerMember.noPlayersMatch")}
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
            {t("registerMember.allPlayersRegistered")}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-[#6b7280]">
            {t("registerMember.playersAvailableHint", { count: players.length })}
          </p>
        )}
      </div>

      {/* Pricing Breakdown Card */}
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-3.5 text-xs">
        <span className="font-bold text-[#111827] uppercase tracking-wide block mb-2">
          {t("registerMember.breakdownTitle")}
        </span>
        <div className="space-y-1.5 text-[#4b5563]">
          <div className="flex justify-between">
            <span>{t("registerMember.commitmentFeeLabel")}</span>
            <span className="font-semibold text-[#111827]">{rupiah(info.period.commitment_fee)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("registerMember.uniqueCodeLabel")}</span>
            <span className="font-mono font-semibold text-amber-800">+ Rp 001–999</span>
          </div>
          <div className="border-t border-[#e5e7eb] pt-1.5 flex justify-between font-bold text-[#111827]">
            <span>{t("registerMember.approximateTotalLabel")}</span>
            <span>≈ {rupiah(info.period.commitment_fee + 500)}</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-[#6b7280]">
          {t("registerMember.breakdownHint")}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          {error}
        </div>
      )}

      {hasNotes && (
        <label className="flex items-start gap-2.5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs text-[#374151] cursor-pointer select-none hover:border-[#d1d5db] transition-colors">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#d1d5db] text-[#141518] focus:ring-[#141518]"
          />
          <span>
            {t("registerMember.agreeTermsLabel")}
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={!selectedPlayer || initState.isLoading || players.length === 0 || (hasNotes && !acceptedTerms)}
        className="w-full rounded-md bg-[#141518] py-3 text-sm font-bold text-white hover:bg-[#27272a] disabled:opacity-50 transition-colors"
      >
        {initState.isLoading
          ? t("registerMember.generatingPayment")
          : t("registerMember.registerAndPay")}
      </button>
    </form>
  );
}

// ─── Registered Members Table (Metro Transit Roster) ──────────────────────────

function RegisteredMembersTable({ members }: { members?: RegisteredMemberItem[] }) {
  const { t, dateFormatted } = useI18n();
  const list = members ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-6 text-center text-xs text-[#6b7280]">
        {t("registerMember.emptyMembers")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[#f5f6f8] border-b border-[#e5e7eb] text-[#374151]">
          <tr>
            <th className="py-2.5 px-3 font-bold w-12 text-center">{t("registerMember.colNumber")}</th>
            <th className="py-2.5 px-3 font-bold">{t("registerMember.colPlayerName")}</th>
            <th className="py-2.5 px-3 font-bold">{t("registerMember.colTier")}</th>
            <th className="py-2.5 px-3 font-bold">{t("registerMember.colJoinedDate")}</th>
            <th className="py-2.5 px-3 font-bold text-right">{t("registerMember.colStatus")}</th>
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
              <td className="py-2 px-3 text-[#4b5563]">{dateFormatted(m.joined_at)}</td>
              <td className="py-2 px-3 text-right">
                <span className="inline-flex items-center gap-1 border border-line bg-paper px-2 py-0.5 text-[11px] font-semibold text-lime-deep rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                  {t("registerMember.badgeMember")}
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
  const { t, dateFormatted } = useI18n();
  const list = items ?? [];

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] bg-[#f5f6f8] p-6 text-center text-xs text-[#6b7280]">
        {t("registerMember.emptyPending")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
        <span className="font-bold">
          {t("registerMember.pendingBannerTitle")}
        </span>
        : {t("registerMember.pendingBannerDesc")}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#e5e7eb]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#f5f6f8] border-b border-[#e5e7eb] text-[#374151]">
            <tr>
              <th className="py-2.5 px-3 font-bold w-12 text-center">{t("registerMember.colNumber")}</th>
              <th className="py-2.5 px-3 font-bold">{t("registerMember.colPlayerName")}</th>
              <th className="py-2.5 px-3 font-bold">{t("registerMember.colTransferDate")}</th>
              <th className="py-2.5 px-3 font-bold">{t("registerMember.colSubmittedAt")}</th>
              <th className="py-2.5 px-3 font-bold text-right">{t("registerMember.colStatus")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] bg-white">
            {list.map((it, idx) => (
              <tr key={it.payment_id} className="hover:bg-[#f5f6f8]/60 transition-colors">
                <td className="py-2 px-3 text-center font-mono text-[#6b7280]">{idx + 1}</td>
                <td className="py-2 px-3 font-semibold text-[#111827]">{it.name}</td>
                <td className="py-2 px-3 text-[#4b5563]">{it.paid_at ? dateFormatted(it.paid_at) : "—"}</td>
                <td className="py-2 px-3 text-[#6b7280]">{dateFormatted(it.created_at)}</td>
                <td className="py-2 px-3 text-right">
                  <span className="inline-flex items-center gap-1 border border-sky-300 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-900 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {t("registerMember.badgeReviewing")}
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
  const { t, dateFormatted } = useI18n();
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
            {t("registerMember.loadingBoard")}
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
            {t("registerMember.notFoundTitle")}
          </h2>
          <p className="mt-1.5 text-sm text-[#4b5563]">
            {t("registerMember.notFoundDesc")}
          </p>
          <Link
            to="/register-member"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-[#141518] px-4 py-2 text-xs font-semibold text-white hover:bg-[#27272a] transition-colors"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            {t("registerMember.viewActivePeriods")}
          </Link>
        </div>
      </div>
    );
  }

  const d = info.data;
  const isRegistrationClosed = !d.can_register && !payment;
  const periodStatusLabel = t(`status.${d.period.status}`);

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
              <span className="hidden sm:inline">{t("registerMember.allPeriods")}</span>
            </Link>
            <span className="text-[#d1d5db]">|</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] block">
                {t("registerMember.headerBrand")}
              </span>
              <span className="text-xs font-bold text-[#111827]">
                {t("registerMember.headerTitle")}
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
              {t("registerMember.periodSchedule")}: {dateFormatted(d.period.start_date)} —{" "}
              {dateFormatted(d.period.end_date)}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-[#6b7280]">
              {t("registerMember.statusLabel")}:
            </span>
            <span className="font-semibold text-[#111827]">
              {periodStatusLabel === `status.${d.period.status}` ? d.period.status : periodStatusLabel}
            </span>
          </div>
        </div>

        {/* 1. Slot Capacity & Statistics Card */}
        <SlotCapacityCard info={d} />

        {/* 1b. Registration Deadline Countdown (GMT+7 / WIB) */}
        {d.period.registration_expires_at && (
          <RegistrationCountdownCard
            periodId={d.period.id}
            expiresAt={d.period.registration_expires_at}
            canRegister={d.can_register}
            onExpired={() => {
              void info.refetch();
            }}
          />
        )}

        {/* Member Terms / S&K & Schedule Card (when customized in admin) */}
        {d.period.registration_notes?.trim() && (
          <section
            aria-label={t("registerMember.termsAria")}
            className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-xs"
          >
            <div className="flex items-center gap-2 border-b border-[#e5e7eb] pb-3 mb-3.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f3f4f6] text-[#111827]">
                <IconFileText className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280] block">
                  {t("registerMember.termsEyebrow")}
                </span>
                <h2 className="text-sm font-bold text-[#111827]">
                  {t("registerMember.termsTitle")}
                </h2>
              </div>
            </div>
            <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3.5 text-sm leading-relaxed text-[#374151] whitespace-pre-line">
              {d.period.registration_notes}
            </div>
          </section>
        )}

        {/* Closed or Full Alert Notice */}
        {isRegistrationClosed && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <IconLock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {t("registerMember.closedTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-amber-800">
                  {d.close_reason || t("registerMember.closedFallback")}
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
                    {t("registerMember.stepEyebrow", { step: payment ? 2 : 1 })}
                  </span>
                  <h2 className="text-base font-bold text-[#111827]">
                    {payment
                      ? t("registerMember.paymentDetailsTitle")
                      : t("registerMember.registerFormTitle")}
                  </h2>
                </div>
                {payment && (payment.status === "FAILED" || payment.status === "PAID") && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[#111827] underline"
                    onClick={() => setPayment(null)}
                  >
                    {t("registerMember.registerAnother")}
                  </button>
                )}
              </div>

              {payment ? (
                <PaymentCard payment={payment} onProofSubmitted={setPayment} />
              ) : !d.can_register ? (
                <div className="py-6 text-center text-xs text-[#6b7280]">
                  <p>{t("registerMember.registrationUnavailable")}</p>
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
                    {t("registerMember.tabMembers")} (
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
                    {t("registerMember.tabPending")} (
                    {d.pending_payments?.length ?? 0})
                  </button>
                </div>
                <span className="text-[11px] font-mono text-[#6b7280]">
                  {activeTab === "members"
                    ? t("registerMember.tabMembersCount", { count: d.current_members })
                    : t("registerMember.tabQueueLabel")}
                </span>
              </div>

              {/* Tab Panels */}
              {activeTab === "members" ? (
                <div>
                  <div className="mb-3 text-xs text-[#4b5563]">
                    {t("registerMember.membersTabDesc")}
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

        {/* Admin WhatsApp Help Section */}
        <AdminHelpCard />
      </main>
    </div>
  );
}

// ─── Registration Index Page (List of Open Periods) ───────────────────────────

function RegistrationIndexPage() {
  const navigate = useNavigate();
  const { t, dateFormatted } = useI18n();
  const periods = usePublicRegistrationPeriodsQuery();

  if (periods.isFetching && !periods.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8]">
        <div className="text-center text-[#6b7280]">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white border border-[#e5e7eb] mb-2">
            <IconClock className="w-5 h-5 text-[#111827]" />
          </div>
          <p className="text-sm font-medium">
            {t("registerMember.loadingPeriods")}
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
              {t("registerMember.headerBrand")}
            </span>
            <span className="text-xs font-bold text-[#111827]">
              {t("registerMember.headerTitle")}
            </span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-6">
        <div className="border-b border-[#e5e7eb] pb-4 text-center sm:text-left">
          <h1 className="text-2xl font-black tracking-tight text-[#111827]">
            {t("registerMember.selectPeriodTitle")}
          </h1>
          <p className="mt-1 text-sm text-[#4b5563]">
            {t("registerMember.selectPeriodSubtitle")}
          </p>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-[#e5e7eb] bg-white p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f6f8] text-[#6b7280] mb-3">
              <IconLock className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-[#111827]">
              {t("registerMember.noOpenTitle")}
            </h2>
            <p className="mt-1 text-xs text-[#6b7280]">
              {t("registerMember.noOpenDesc")}
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
                            {t("registerMember.badgeSoldOut")}
                          </span>
                        ) : (
                          <span className="border border-line bg-paper px-2 py-0.5 text-[11px] font-bold text-lime-deep rounded">
                            {t("registerMember.badgeOpen")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#6b7280]">
                        {dateFormatted(item.period.start_date)} — {dateFormatted(item.period.end_date)}
                      </p>
                      {item.period.registration_expires_at && (
                        <IndexDeadlineLine expiresAt={item.period.registration_expires_at} />
                      )}
                      {item.period.registration_notes?.trim() && (
                        <p className="mt-2 text-xs text-[#4b5563] line-clamp-2 whitespace-pre-line border-l-2 border-[#d1d5db] pl-2.5">
                          {item.period.registration_notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs sm:text-right">
                      <div>
                        <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">
                          {t("registerMember.capacityLabel")}
                        </span>
                        <span className="font-mono font-bold text-[#111827]">
                          {max && max > 0
                            ? `${t("registerMember.capacityLeft", { count: remaining ?? 0 })} (${current}/${max})`
                            : `${t("registerMember.capacityMembersCount", { current, max: "∞" })} · ${t("registerMember.capacityUnlimited")}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6b7280] block text-[10px] uppercase font-semibold">
                          {t("registerMember.feeLabel")}
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

        <AdminHelpCard />
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
