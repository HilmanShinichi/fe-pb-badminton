import { useEffect } from "react";
import { rupiah } from "../../../format";
import { useI18n } from "../../../i18n";
import type { DashboardData, DashboardSession } from "../../../store/services";
import { Badge } from "../../atoms/Badge";
import { Btn } from "../../atoms/Button";

interface ProfitDetailModalProps {
  session: DashboardSession;
  courtFund?: DashboardData["court_fund"];
  onClose: () => void;
}

export function ProfitDetailModal({
  session,
  courtFund,
  onClose,
}: ProfitDetailModalProps) {
  const { t, dateFormatted } = useI18n();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isPeriod = session.type === "PERIOD";
  const fundSessions = courtFund?.sessions ?? [];
  const stepIndex = fundSessions.findIndex((cs) => cs.date === session.date);
  const step = stepIndex >= 0 ? fundSessions[stepIndex] : undefined;
  const opProfit = session.operational_profit ?? (isPeriod && step ? step.profit : session.profit);
  const prevRemainder =
    stepIndex === 0
      ? (courtFund?.gap ?? 0)
      : stepIndex > 0
      ? fundSessions[stepIndex - 1].remainder
      : (courtFund?.gap ?? 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profit-detail-title"
    >
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="profit-detail-title" className="text-base font-bold text-ink">
                {t("dashboard.profitModalTitle")}
              </h3>
              <Badge status={session.type} />
            </div>
            <p className="mt-0.5 text-xs text-ink-soft">
              {dateFormatted(session.date)} {session.venue_name ? `· ${session.venue_name}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint hover:bg-court hover:text-ink transition-colors"
            aria-label={t("common.close")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="mt-4 space-y-4">
          {/* Operational profit breakdown */}
          <div className="rounded-xl border border-line bg-paper/60 p-3.5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {t("dashboard.profitDetailNet")}
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-ink">
                <span>{t("dashboard.profitDetailRevenue")}</span>
                <span className="font-semibold tabular-nums text-emerald-700">+{rupiah(session.revenue)}</span>
              </div>
              {(session.other_expense ?? 0) > 0 && (
                <>
                  <div className="flex justify-between items-center text-ink">
                    <span>{t("dashboard.profitDetailOtherExpense")}</span>
                    <span className="font-semibold tabular-nums text-rose-700">−{rupiah(session.other_expense)}</span>
                  </div>
                  <div className="flex justify-between items-center rounded bg-court/40 px-2 py-0.5 text-[11px] text-ink font-medium">
                    <span>{t("dashboard.profitDetailNetRevenue")}</span>
                    <span className="font-semibold tabular-nums text-emerald-800">
                      +{rupiah(session.revenue - (session.other_expense ?? 0))}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center text-ink">
                <span>{t("dashboard.profitDetailShuttle", { count: session.shuttlecock_used })}</span>
                <span className="font-semibold tabular-nums text-rose-700">−{rupiah(session.shuttlecock_cost)}</span>
              </div>
              <div className="flex justify-between items-center text-ink">
                <span>{t("dashboard.profitDetailCourt")}</span>
                {isPeriod ? (
                  <span className="text-[11px] font-medium text-pine">
                    {t("dashboard.profitDetailCourtPrepaid")}
                  </span>
                ) : (
                  <span className="font-semibold tabular-nums text-rose-700">−{rupiah(session.court_cost)}</span>
                )}
              </div>
              <div className="border-t border-line/70 pt-2 flex justify-between items-center">
                <span className="font-bold text-ink">
                  {isPeriod && courtFund && (courtFund.gap ?? 0) < 0
                    ? t("dashboard.courtFundSessionProfitLabel")
                    : t("dashboard.colProfit")}
                </span>
                <span className={`text-base font-extrabold tabular-nums ${
                  opProfit > 0 ? "text-emerald-700" : opProfit < 0 ? "text-rose-700" : "text-ink"
                }`}>
                  {opProfit >= 0 ? "+" : ""}{rupiah(opProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Court Fund Cross-subsidy breakdown (for PERIOD sessions) */}
          {isPeriod && courtFund && (
            <div className="rounded-xl border border-pine/30 bg-pine/5 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-pine uppercase tracking-wider">
                  {t("dashboard.courtFundCardTitle")}
                </h4>
                {courtFund.period_name && (
                  <span className="text-[11px] font-semibold text-pine-deep bg-pine/10 px-2 py-0.5 rounded-full">
                    {courtFund.period_name}
                  </span>
                )}
              </div>

              {/* Exact Step display banner */}
              {step && (
                <div className="rounded-lg bg-white border border-pine/30 p-2.5 shadow-2xs">
                  <p className="text-xs font-mono font-bold text-pine-deep text-center">
                    {t("dashboard.courtFundStepDetail", {
                      date: dateFormatted(step.date),
                      profit: `${opProfit >= 0 ? "+" : ""}${rupiah(opProfit)}`,
                      remainder: rupiah(step.remainder),
                    })}
                  </p>
                </div>
              )}

              {/* Math breakdown */}
              <div className="space-y-1.5 text-xs text-ink-soft">
                <div className="flex justify-between items-center">
                  <span>{t("dashboard.courtFundPrevDeficitLabel")}</span>
                  <span className="font-semibold tabular-nums text-rose-700">{rupiah(prevRemainder)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t("dashboard.courtFundSessionProfitLabel")}</span>
                  <span className="font-semibold tabular-nums text-emerald-700">+{rupiah(opProfit)}</span>
                </div>
                <div className="border-t border-pine/20 pt-1.5 flex justify-between items-center font-bold text-ink">
                  <span>{t("dashboard.courtFundRemainingLabel")}</span>
                  <span className={`tabular-nums ${step && step.remainder < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {step ? rupiah(step.remainder) : rupiah(courtFund.gap)}
                  </span>
                </div>
              </div>

              {/* Explanatory note */}
              <div className="rounded-lg bg-white/70 p-2.5 text-[11px] leading-relaxed text-ink-soft border border-pine/20">
                <p>
                  💡 {t("dashboard.courtFundWhyDeficit", { gap: rupiah(courtFund.gap) })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <Btn variant="primary" onClick={onClose}>
            {t("common.close")}
          </Btn>
        </div>
      </div>
    </div>
  );
}
