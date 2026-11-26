import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../store/baseApi";
import {
  useAddMemberMutation,
  useCompletePeriodMutation,
  useCreatePlayerMutation,
  useCreateRevenueMutation,
  useDeletePeriodMutation,
  usePeriodAttendanceMatrixQuery,
  usePeriodMembersQuery,
  usePeriodSessionsQuery,
  usePeriodSummaryQuery,
  usePlayersAllQuery,
  useRemoveMemberMutation,
  useSessionBreakdownQuery,
  useShuttlecockMatrixQuery,
  useUpdatePeriodMutation,
  useAdminPeriodPaymentsQuery,
  useSetRegistrationStatusMutation,
  useUpdateRegistrationNotesMutation,
  useVerifyPaymentMutation,
  useDeletePaymentMutation,
  type MembershipPayment,
} from "../store/services";
import { buildRegistrationNotesTemplate, dateDmy, formatGmt7DateTime, gmt7InputToUtcIso, rupiah, utcIsoToGmt7Input } from "../format";
import { useI18n } from "../i18n";
import { Badge, Btn, ConfirmModal, DeleteRowButton, Empty, ErrorBox, Field, Loading, MoneyInput, OpenLink, PageHead } from "../ui";
import type { Membership, Period, PeriodAttendanceMatrixNonMember, PeriodAttendanceMatrixResponse } from "../types";

function paidOf(m: Membership): number {
  const p = m.paid ?? {};
  return (p.COMMITMENT_FEE ?? 0) + (p.ATTENDANCE_CONTRIBUTION ?? 0) + (p.NON_MEMBER_FEE ?? 0) + (p.VISIT_BILLS ?? 0);
}

function commitmentPaid(m: Membership): boolean {
  if (!m.commitment_fee) return true;
  return (m.paid?.COMMITMENT_FEE ?? 0) >= m.commitment_fee;
}

// ─── Admin Payments Panel ─────────────────────────────────────────────────────

const PAYMENT_STATUS_CLASS: Record<string, string> = {
  WAITING_PAYMENT: "bg-amber-100 text-amber-800",
  PENDING: "bg-blue-100 text-blue-800",
  PAID: "bg-paper text-lime-deep",
  FAILED: "bg-red-100 text-red-800",
};

function AdminPaymentsPanel({
  periodId,
  period,
  isRegistrationOpen,
  done,
  maxMembers,
  currentMembers,
}: {
  periodId: string;
  period: Period;
  isRegistrationOpen: boolean;
  done: boolean;
  maxMembers: number | null;
  currentMembers: number;
}) {
  const { t, lang } = useI18n();
  const paymentStatusLabel: Record<string, string> = {
    WAITING_PAYMENT: t("periods.regStatusWaiting"),
    PENDING: t("periods.regStatusPending"),
    PAID: t("periods.regStatusPaid"),
    FAILED: t("periods.regStatusFailed"),
  };

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verifyTarget, setVerifyTarget] = useState<MembershipPayment | null>(null);
  const [verifyAction, setVerifyAction] = useState<"PAID" | "FAILED">("PAID");
  const [rejectionReason, setRejectionReason] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [regError, setRegError] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(period.registration_notes ?? "");
  const [notesError, setNotesError] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState(() => utcIsoToGmt7Input(period.registration_expires_at));
  const [deadlineError, setDeadlineError] = useState("");
  const [deadlineSaved, setDeadlineSaved] = useState(false);
  const [proofViewerOpen, setProofViewerOpen] = useState(false);
  const [proofTarget, setProofTarget] = useState<MembershipPayment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MembershipPayment | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const payments = useAdminPeriodPaymentsQuery({ periodId, status: statusFilter }, { pollingInterval: 30_000 });
  const [setRegStatus, regState] = useSetRegistrationStatusMutation();
  const [updateNotes, notesState] = useUpdateRegistrationNotesMutation();
  const [verifyPayment, verifyState] = useVerifyPaymentMutation();
  const [deletePayment, deleteState] = useDeletePaymentMutation();

  useEffect(() => {
    setNotesDraft(period.registration_notes ?? "");
  }, [period.registration_notes]);

  useEffect(() => {
    setDeadlineDraft(utcIsoToGmt7Input(period.registration_expires_at));
  }, [period.registration_expires_at]);

  const savedNotes = period.registration_notes ?? "";
  const notesDirty = notesDraft.trim() !== savedNotes.trim();
  const savedDeadlineInput = utcIsoToGmt7Input(period.registration_expires_at);
  const deadlineDirty = deadlineDraft !== savedDeadlineInput;
  const isDeadlineExpired = Boolean(
    period.registration_expires_at && Date.parse(period.registration_expires_at) <= Date.now()
  );

  async function saveDeadline(nextDraft: string) {
    if (regState.isLoading) return;
    setDeadlineError("");
    setDeadlineSaved(false);
    const utcPayload = nextDraft ? gmt7InputToUtcIso(nextDraft) : "";
    if (nextDraft && !utcPayload) {
      setDeadlineError(t("periods.regErrSaveDeadline"));
      return;
    }
    try {
      await setRegStatus({
        periodId,
        registration_expires_at: utcPayload ?? "",
      }).unwrap();
      setDeadlineSaved(true);
      setTimeout(() => setDeadlineSaved(false), 2500);
    } catch (e) {
      setDeadlineError(e instanceof ApiError ? e.message : t("periods.regErrSaveDeadline"));
    }
  }

  async function saveNotes() {
    if (notesState.isLoading) return;
    setNotesError("");
    setNotesSaved(false);
    try {
      await updateNotes({
        periodId,
        registration_notes: notesDraft.trim() || null,
      }).unwrap();
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (e) {
      setNotesError(e instanceof ApiError ? e.message : t("periods.regErrSaveNotes"));
    }
  }

  const regLink = `${window.location.origin}/register-member/${periodId}`;
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(regLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function toggleRegistration() {
    setRegError("");
    try {
      await setRegStatus({ periodId, is_registration_open: !isRegistrationOpen }).unwrap();
    } catch (e) {
      setRegError(e instanceof ApiError ? e.message : t("periods.regErrToggle"));
    }
  }

  function openProofViewer(p: MembershipPayment) {
    setProofTarget(p);
    setProofViewerOpen(true);
  }

  function openVerify(p: MembershipPayment, action: "PAID" | "FAILED") {
    setProofViewerOpen(false);
    setProofTarget(null);
    setVerifyTarget(p);
    setVerifyAction(action);
    setRejectionReason("");
    setVerifyError("");
  }

  function openDelete(p: MembershipPayment) {
    setDeleteTarget(p);
    setDeleteError("");
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteState.isLoading) return;
    setDeleteError("");
    try {
      await deletePayment({
        periodId,
        paymentId: deleteTarget.id,
      }).unwrap();
      if (proofTarget?.id === deleteTarget.id) {
        setProofViewerOpen(false);
        setProofTarget(null);
      }
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : t("periods.regErrDelete"));
    }
  }

  async function confirmVerify() {
    if (!verifyTarget || verifyState.isLoading) return;
    setVerifyError("");
    try {
      await verifyPayment({
        periodId,
        paymentId: verifyTarget.id,
        status: verifyAction,
        rejection_reason: rejectionReason.trim() || undefined,
      }).unwrap();
      setVerifyTarget(null);
    } catch (e) {
      setVerifyError(e instanceof ApiError ? e.message : t("periods.regErrVerify"));
    }
  }

  const list = payments.data ?? [];
  const pendingCount = list.filter((p) => p.status === "PENDING").length;

  return (
    <section aria-label="Member registration payments" className="mt-5 rounded-xl border border-line bg-white shadow-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-ink">
            {t("periods.regPanelTitle")}
            {pendingCount > 0 && (
              <span className="ml-2 inline-block rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {t("periods.regPendingBadge", { count: pendingCount })}
              </span>
            )}
          </h2>
          <p className="text-xs text-ink-faint mt-0.5">
            {t("periods.regStatusLabel")}{" "}
            <span className={`font-semibold ${isRegistrationOpen ? "text-lime" : "text-red-700"}`}>
              {isRegistrationOpen ? t("periods.regStatusOpen") : t("periods.regStatusClosed")}
            </span>
            {" · "}
            {t("periods.regSlotLabel")}{" "}
            <span className={`font-semibold ${maxMembers && currentMembers >= maxMembers ? "text-red-700" : "text-ink"}`}>
              {currentMembers}{maxMembers ? `/${maxMembers}` : ""} {t("periods.regSlotUnit")}
            </span>
            {maxMembers && currentMembers >= maxMembers && (
              <span className="ml-1 text-[10px] font-bold text-red-600">{t("periods.regSlotFull")}</span>
            )}
          </p>
        </div>
        {!done && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-court/30 transition-colors"
            >
              {copied ? t("periods.regLinkCopied") : t("periods.regCopyLink")}
            </button>
            <button
              type="button"
              disabled={regState.isLoading}
              onClick={toggleRegistration}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${
                isRegistrationOpen
                  ? "bg-red-100 text-red-700 hover:bg-red-200"
                  : "bg-paper text-lime hover:bg-lime-200"
              }`}
            >
              {regState.isLoading ? "…" : isRegistrationOpen ? t("periods.regCloseBtn") : t("periods.regOpenBtn")}
            </button>
          </div>
        )}
      </div>

      {regError && <p className="px-4 py-2 text-xs text-red-600">{regError}</p>}

      {/* Registration Expiration Deadline (GMT+7 / WIB) */}
      <div className="border-b border-line bg-court/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink">{t("periods.regDeadlineLabel")}:</span>
            {period.registration_expires_at ? (
              <>
                <span className="text-xs font-semibold text-ink">
                  {formatGmt7DateTime(period.registration_expires_at, lang)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isDeadlineExpired ? "bg-red-100 text-red-800" : "bg-paper text-lime-deep"
                  }`}
                >
                  {isDeadlineExpired ? t("periods.regDeadlineExpiredBadge") : t("periods.regDeadlineActiveBadge")}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-faint">{t("periods.regDeadlineNone")}</span>
            )}
            {deadlineSaved && (
              <span className="text-[11px] font-semibold text-lime-deep">✓ {t("periods.regDeadlineSaved")}</span>
            )}
          </div>
          {!done && (
            <button
              type="button"
              onClick={() => {
                setDeadlineOpen((v) => !v);
                setDeadlineError("");
              }}
              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-court/30 transition-colors"
            >
              {deadlineOpen ? t("periods.regDeadlineCloseEditor") : t("periods.regDeadlineEditBtn")}
            </button>
          )}
        </div>

        {deadlineOpen && !done && (
          <div className="mt-3 flex flex-wrap items-end gap-2.5">
            <div className="min-w-[230px] flex-1 max-w-xs">
              <label htmlFor="reg-deadline-input" className="block text-[11px] font-semibold text-ink-soft mb-1">
                {t("periods.regDeadlineInputLabel")}
              </label>
              <input
                id="reg-deadline-input"
                type="datetime-local"
                className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-xs text-ink focus:border-pine focus:outline-none"
                value={deadlineDraft}
                onChange={(e) => {
                  setDeadlineDraft(e.target.value);
                  setDeadlineError("");
                  setDeadlineSaved(false);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {period.registration_expires_at && (
                <button
                  type="button"
                  disabled={regState.isLoading}
                  onClick={() => {
                    setDeadlineDraft("");
                    saveDeadline("");
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {t("periods.regDeadlineClearBtn")}
                </button>
              )}
              <Btn disabled={regState.isLoading || !deadlineDirty} onClick={() => saveDeadline(deadlineDraft)}>
                {regState.isLoading ? t("periods.btnSavingSettings") : t("periods.regDeadlineSaveBtn")}
              </Btn>
            </div>
            <p className="w-full text-[11px] text-ink-faint">{t("periods.hintRegExpiresAt")}</p>
            {deadlineError && <p className="w-full text-xs text-red-600">{deadlineError}</p>}
          </div>
        )}
      </div>

      {/* Custom Member Registration Notes / S&K */}
      <div className="border-b border-line bg-court/15 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink">{t("periods.regNotesTitle")}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                savedNotes.trim() ? "bg-paper text-lime-deep" : "bg-gray-100 text-ink-faint"
              }`}
            >
              {savedNotes.trim() ? t("periods.regNotesActive") : t("periods.regNotesEmpty")}
            </span>
          </div>
          {!done && (
            <button
              type="button"
              onClick={() => {
                setNotesOpen((v) => !v);
                setNotesError("");
              }}
              className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-court/30 transition-colors"
            >
              {notesOpen
                ? t("periods.regNotesCloseEditor")
                : savedNotes.trim()
                ? t("periods.regNotesEditBtn")
                : t("periods.regNotesAddBtn")}
            </button>
          )}
        </div>

        {!notesOpen && savedNotes.trim() && (
          <div className="mt-2 rounded-lg border border-line/80 bg-white px-3 py-2 text-xs leading-relaxed text-ink-soft whitespace-pre-line">
            {savedNotes}
          </div>
        )}

        {notesOpen && !done && (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-ink-faint">
                {t("periods.regNotesEditorHint")}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotesDraft(
                      buildRegistrationNotesTemplate({
                        start_date: period.start_date,
                        end_date: period.end_date,
                        number_of_sessions: period.number_of_sessions,
                        max_members: period.max_members,
                        member_contribution: period.member_contribution,
                        non_member_fee: period.non_member_fee,
                      })
                    );
                    setNotesSaved(false);
                  }}
                  className="text-xs font-semibold text-pine hover:underline"
                >
                  {t("periods.btnFillTemplate")}
                </button>
                {notesDraft.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft("");
                      setNotesSaved(false);
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    {t("periods.regNotesClear")}
                  </button>
                )}
              </div>
            </div>
            <textarea
              rows={8}
              value={notesDraft}
              onChange={(e) => {
                setNotesDraft(e.target.value);
                setNotesSaved(false);
              }}
              placeholder={t("periods.regNotesPlaceholder")}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs leading-relaxed text-ink focus:border-pine focus:outline-none"
            />
            {notesError && <p className="text-xs text-red-600">{notesError}</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-ink-faint">
                {notesSaved ? t("periods.regNotesSaved") : notesDirty ? t("periods.regNotesDirty") : ""}
              </span>
              <div className="flex items-center gap-2">
                {notesDirty && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(savedNotes);
                      setNotesError("");
                    }}
                    className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-court/30 transition-colors"
                  >
                    {t("periods.btnCancel")}
                  </button>
                )}
                <Btn disabled={notesState.isLoading || !notesDirty} onClick={saveNotes}>
                  {notesState.isLoading ? t("periods.btnSavingSettings") : t("periods.regNotesSaveBtn")}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1 border-b border-line px-4 py-2">
        {["ALL", "WAITING_PAYMENT", "PENDING", "PAID", "FAILED"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
              statusFilter === s ? "bg-pine text-white" : "bg-court/30 text-ink-soft hover:bg-court/60"
            }`}
          >
            {s === "ALL" ? t("periods.regFilterAll") : paymentStatusLabel[s] ?? s}
          </button>
        ))}
      </div>

      {payments.isFetching && !payments.data ? (
        <Loading />
      ) : list.length === 0 ? (
        <div className="p-4"><Empty text={t("periods.regEmptyPayments")} /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>{t("periods.regColPlayer")}</th>
                <th className="text-right">{t("periods.regColAmount")}</th>
                <th>{t("periods.regColStatus")}</th>
                <th>{t("periods.regColPaidAt")}</th>
                <th>{t("periods.regColProof")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="font-medium">{p.player_name}</span>
                    {p.player_phone && <span className="block text-xs text-ink-faint">{p.player_phone}</span>}
                  </td>
                  <td className="whitespace-nowrap text-right tabular-nums">
                    {rupiah(p.total_amount)}
                    <span className="block text-[10px] text-ink-faint">+{p.unique_code}</span>
                  </td>
                  <td>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_STATUS_CLASS[p.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {paymentStatusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs">{p.paid_at ?? "—"}</td>
                  <td>
                    {p.proof_url ? (
                      <button
                        type="button"
                        onClick={() => openProofViewer(p)}
                        className="text-xs text-pine underline hover:text-pine-dark transition-colors"
                      >
                        {t("periods.regViewProof")}
                      </button>
                    ) : "—"}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1">
                      {p.status === "PENDING" && (
                        <>
                          <button
                            type="button"
                            onClick={() => openVerify(p, "PAID")}
                            className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-lime-deep hover:bg-lime-200 transition-colors"
                          >
                            {t("periods.regActionPaid")}
                          </button>
                          <button
                            type="button"
                            onClick={() => openVerify(p, "FAILED")}
                            className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 hover:bg-red-200 transition-colors"
                          >
                            {t("periods.regActionReject")}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openDelete(p)}
                        className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 hover:bg-red-100 hover:text-red-800 transition-colors"
                        title={t("periods.regDeleteBtnTitle")}
                      >
                        {t("periods.regActionDelete")}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {proofViewerOpen && proofTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-ink">{t("periods.regProofTitle", { name: proofTarget.player_name ?? "" })}</h3>
              <button
                type="button"
                onClick={() => {
                  setProofViewerOpen(false);
                  setProofTarget(null);
                }}
                className="rounded-full p-1 hover:bg-court/30 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Image */}
              {proofTarget.proof_url ? (
                <div className="rounded-lg border border-line bg-gray-50 overflow-hidden">
                  <img
                    src={proofTarget.proof_url}
                    alt={t("periods.regColProof")}
                    className="w-full h-auto max-h-[500px] object-contain"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-line bg-gray-50 p-8 text-center text-sm text-ink-faint">
                  {t("periods.regProofUnavailable")}
                </div>
              )}

              {/* Payment Details */}
              <div className="rounded-lg border border-line bg-white p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-faint">{t("periods.regColPlayer")}</span>
                  <span className="font-medium text-ink">{proofTarget.player_name}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-line pt-2">
                  <span className="text-ink-faint">{t("periods.regColAmount")}</span>
                  <div className="text-right">
                    <div className="font-bold text-ink tabular-nums">{rupiah(proofTarget.total_amount)}</div>
                    <div className="text-xs text-ink-faint">+{String(proofTarget.unique_code).padStart(3, "0")}</div>
                  </div>
                </div>
                {proofTarget.paid_at && (
                  <div className="flex justify-between text-sm border-t border-line pt-2">
                    <span className="text-ink-faint">{t("periods.regColPaidAt")}</span>
                    <span className="font-medium text-ink">{proofTarget.paid_at}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t border-line pt-2">
                  <span className="text-ink-faint">{t("periods.regColStatus")}</span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAYMENT_STATUS_CLASS[proofTarget.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {paymentStatusLabel[proofTarget.status] ?? proofTarget.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                {proofTarget.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      onClick={() => openVerify(proofTarget, "PAID")}
                      className="flex-1 rounded-lg bg-paper px-4 py-2 font-semibold text-lime-deep hover:bg-lime-200 transition-colors"
                    >
                      ✓ {t("periods.regActionPaid")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openVerify(proofTarget, "FAILED")}
                      className="flex-1 rounded-lg bg-red-100 px-4 py-2 font-semibold text-red-800 hover:bg-red-200 transition-colors"
                    >
                      ✕ {t("periods.regActionReject")}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setProofViewerOpen(false);
                    openDelete(proofTarget);
                  }}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 transition-colors"
                >
                  {t("periods.regActionDelete")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {verifyTarget && (
        <ConfirmModal
          title={
            verifyAction === "PAID"
              ? `${t("periods.regVerifyPaidTitle")} — ${verifyTarget.player_name}`
              : `${t("periods.regVerifyRejectTitle")} — ${verifyTarget.player_name}`
          }
          body={
            <>
              <p className="text-sm">
                {verifyAction === "PAID"
                  ? t("periods.regVerifyPaidBody", {
                      name: verifyTarget.player_name ?? "",
                      amount: rupiah(verifyTarget.total_amount),
                    })
                  : t("periods.regVerifyRejectBody", { name: verifyTarget.player_name ?? "" })}
              </p>
              {verifyAction === "FAILED" && (
                <div className="mt-3">
                  <Field label={t("periods.regRejectReasonLabel")}>
                    <input
                      className="w-full"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder={t("periods.regRejectReasonPlaceholder")}
                    />
                  </Field>
                </div>
              )}
              {verifyError && <p className="mt-2 text-xs text-red-600">{verifyError}</p>}
            </>
          }
          confirmLabel={
            verifyState.isLoading
              ? t("periods.btnSavingSettings")
              : verifyAction === "PAID"
              ? t("periods.regConfirmPaidBtn")
              : t("periods.regConfirmRejectBtn")
          }
          busy={verifyState.isLoading}
          onConfirm={confirmVerify}
          onCancel={() => setVerifyTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title={`${t("periods.regDeleteTitle")} — ${deleteTarget.player_name}`}
          body={
            <>
              <p className="text-sm">
                {t("periods.regDeleteBody", { name: deleteTarget.player_name ?? "" })}
              </p>
              {deleteTarget.status === "PAID" ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {t("periods.regDeleteWarnPaid")}
                </div>
              ) : deleteTarget.status === "PENDING" ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  {t("periods.regDeleteWarnPending")}
                </div>
              ) : (
                <div className="mt-3 text-xs text-ink-faint">
                  {t("periods.regDeleteWarnDefault")}
                </div>
              )}
              {deleteError && <p className="mt-2 text-xs text-red-600 font-semibold">{deleteError}</p>}
            </>
          }
          confirmLabel={deleteState.isLoading ? t("periods.btnDeleting") : t("periods.regConfirmDeleteBtn")}
          confirmVariant="danger"
          busy={deleteState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteTarget(null);
            setDeleteError("");
          }}
        />
      )}
    </section>
  );
}

export function PeriodDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t, dateFormatted } = useI18n();
  const [error, setError] = useState("");
  const [pick, setPick] = useState("");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [forceArmed, setForceArmed] = useState(false);

  const summary = usePeriodSummaryQuery(id);
  const members = usePeriodMembersQuery(id);
  const sessions = usePeriodSessionsQuery(id);
  const breakdown = useSessionBreakdownQuery(id);
  const matrix = useShuttlecockMatrixQuery(id);
  const players = usePlayersAllQuery();
  const [addMember, addState] = useAddMemberMutation();
  const [removeMember, withdrawState] = useRemoveMemberMutation();
  const [withdrawFor, setWithdrawFor] = useState<Membership | null>(null);
  const [withdrawError, setWithdrawError] = useState("");

  async function confirmWithdraw() {
    if (!withdrawFor) return;
    try {
      await removeMember({ periodId: id, playerId: withdrawFor.player_id }).unwrap();
      setWithdrawFor(null);
      setWithdrawError("");
    } catch (e) {
      setWithdrawError(e instanceof ApiError ? e.message : t("periods.errorWithdrawMember"));
    }
  }
  const [createPlayer, createState] = useCreatePlayerMutation();
  const [complete, completeState] = useCompletePeriodMutation();
  const [update, updateState] = useUpdatePeriodMutation();
  const [remove, removeState] = useDeletePeriodMutation();
  const [recordPayment, payState] = useCreateRevenueMutation();
  const [payFor, setPayFor] = useState<Membership | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");

  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    number_of_sessions: 5,
    commitment_fee: 0,
    member_contribution: 0,
    non_member_fee: 0,
    venue_cost_total: 0,
    shuttle_pack_price: 125000,
    shuttle_units_per_pack: 12,
    shuttle_per_session: 24,
    status: "DRAFT",
    max_members: null as number | null,
    registration_notes: "",
    registration_expires_at: "",
  });

  useEffect(() => {
    if (summary.data) {
      const p = summary.data.period;
      setForm({
        name: p.name,
        start_date: p.start_date,
        end_date: p.end_date,
        number_of_sessions: p.number_of_sessions || 5,
        commitment_fee: p.commitment_fee,
        member_contribution: p.member_contribution,
        non_member_fee: p.non_member_fee,
        venue_cost_total: p.venue_cost_total ?? 0,
        shuttle_pack_price: p.shuttle_pack_price ?? 125000,
        shuttle_units_per_pack: p.shuttle_units_per_pack ?? 12,
        shuttle_per_session: p.shuttle_per_session ?? 24,
        status: p.status || "DRAFT",
        max_members: p.max_members ?? null,
        registration_notes: p.registration_notes ?? "",
        registration_expires_at: utcIsoToGmt7Input(p.registration_expires_at),
      });
    }
  }, [summary.data]);

  if (summary.isFetching && !summary.data) return <Loading />;
  if (summary.isError || !summary.data) return <ErrorBox message={t("periods.errorLoadPeriod")} onRetry={() => summary.refetch()} />;

  const s = summary.data;
  const proj = s.projection;
  const done = s.period.status === "COMPLETED";
  const candidates = (players.data ?? []).filter(
    (p) => p.status !== "ARCHIVED" && !(members.data ?? []).some((m) => m.player_id === p.id)
  );

  // Session progress: a session counts as held once its date has passed.
  // Future-dated entries are scheduled, not held yet.
  const today = new Date().toISOString().slice(0, 10);
  const orderedSessions = [...(sessions.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const heldSessions = orderedSessions.filter((x) => x.date <= today);
  const upcomingSessions = orderedSessions.filter((x) => x.date > today);
  const plannedSessions = Math.max(1, proj.sessions || s.period.number_of_sessions || 1);
  const remainingSessions = Math.max(0, plannedSessions - heldSessions.length);
  const lastHeldDate = heldSessions.length ? heldSessions[heldSessions.length - 1].date : null;
  const progressPct = Math.min(100, Math.round((heldSessions.length / plannedSessions) * 100));

  // Session breakdown totals — per-session operating cost in a PERIOD reflects
  // shuttlecock usage, because court costs are pre-funded upfront by commitment
  // fees (iuran). The court line below charges the whole period's court budget
  // (all planned sessions), so the net already includes nights not yet played.
  const bRows = breakdown.data ?? [];
  const sumRevenue = bRows.reduce((a, r) => a + r.revenue, 0);
  const sumShuttleCost = bRows.reduce((a, r) => a + (r.shuttlecock_cost ?? 0), 0);
  const courtUsed = bRows.reduce((a, r) => a + (r.court_cost ?? 0), 0);
  const courtBudget = Math.max(proj.venue_total ?? 0, courtUsed);
  const courtRemaining = Math.max(0, courtBudget - courtUsed);
  const sessionProfitOf = (r: { revenue: number; shuttlecock_cost?: number; operating_cost?: number }) =>
    r.revenue - (r.shuttlecock_cost ?? r.operating_cost ?? 0);
  const sumSessionProfit = bRows.reduce((a, r) => a + sessionProfitOf(r), 0);
  const totalIn = sumRevenue + s.total_revenue;
  const totalOut = sumShuttleCost + courtBudget;
  const netProfit = totalIn - totalOut;

  async function submitMember() {
    if (!pick) return;
    try {
      await addMember({ periodId: id, player_id: pick }).unwrap();
      setPick("");
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("periods.errorAddMember"));
    }
  }

  const memberBusy = addState.isLoading || createState.isLoading;

  const memberRows = members.data ?? [];
  const billedTotal = memberRows.reduce((a, m) => a + m.total_bill, 0);
  const collectedTotal = memberRows.reduce((a, m) => a + paidOf(m), 0);

  function openPay(m: Membership) {
    const commitDue = Math.max(0, m.commitment_fee - (m.paid?.COMMITMENT_FEE ?? 0));
    setPayFor(m);
    setPayAmount(commitDue);
    setPayNote("");
    setPayError("");
  }

  async function submitPayment() {
    if (!payFor || !payAmount || payAmount <= 0 || payState.isLoading) return;
    try {
      await recordPayment({
        source: "COMMITMENT_FEE",
        amount: Math.round(payAmount),
        period_id: id,
        player_id: payFor.player_id,
        session_id: null,
        note: payNote.trim() || null,
      }).unwrap();
      setPayFor(null);
      setPayAmount(0);
      setPayNote("");
      setPayError("");
    } catch (e) {
      setPayError(e instanceof ApiError ? e.message : t("periods.errorRecordPayment"));
    }
  }

  async function submitNewMember() {
    const name = newName.trim();
    if (!name || memberBusy) return;
    const alreadyMember = (members.data ?? []).find(
      (m) => m.player_name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyMember) {
      setError(t("periods.errorAlreadyMember", { name: alreadyMember.player_name }));
      return;
    }
    try {
      const memberIds = new Set((members.data ?? []).map((m) => m.player_id));
      const existing = (players.data ?? []).find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.status !== "ARCHIVED" && !memberIds.has(p.id),
      );
      if (existing) {
        await addMember({ periodId: id, player_id: existing.id }).unwrap();
      } else {
        const created = await createPlayer({ name, phone: null, notes: null }).unwrap();
        await addMember({ periodId: id, player_id: created.id }).unwrap();
      }
      setNewName("");
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("periods.errorAddNewMember"));
    }
  }

  async function confirmComplete() {
    try {
      await complete(id).unwrap();
      setPendingComplete(false);
      setError("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t("periods.errorCompletePeriod"));
      setPendingComplete(false);
    }
  }

  async function confirmDelete() {
    try {
      await remove({ id, force: forceArmed }).unwrap();
      navigate("/periods");
    } catch (e) {
      if (e instanceof ApiError && e.code === "PERIOD_HAS_HISTORY" && !forceArmed) {
        setForceArmed(true);
      } else {
        setError(e instanceof ApiError ? e.message : t("periods.errorDeletePeriod"));
        setPendingDelete(false);
        setForceArmed(false);
      }
    }
  }

  return (
    <div>
      <PageHead
        title={s.period.name}
        sub={t("periods.subSessionsCount", {
          dates: `${dateFormatted(s.period.start_date)} – ${dateFormatted(s.period.end_date)}`,
          count: s.sessions,
        })}
        right={
          <>
            <Badge status={s.period.status} />
            {s.period.status === "DRAFT" && (
              <Btn
                disabled={updateState.isLoading}
                onClick={async () => {
                  try {
                    await update({
                      id,
                      body: {
                        ...form,
                        name: form.name.trim(),
                        status: "ACTIVE",
                        registration_expires_at: form.registration_expires_at
                          ? (gmt7InputToUtcIso(form.registration_expires_at) ?? "")
                          : "",
                      },
                    }).unwrap();
                    setError("");
                  } catch (e) {
                    setError(e instanceof ApiError ? e.message : t("periods.errorActivatePeriod"));
                  }
                }}
              >
                {updateState.isLoading ? t("periods.btnActivating") : t("periods.btnActivatePeriod")}
              </Btn>
            )}
            {!done && s.period.status !== "DRAFT" && (
              <Btn
                variant="plain"
                disabled={completeState.isLoading}
                onClick={() => setPendingComplete(true)}
              >
                {t("periods.btnCompletePeriod")}
              </Btn>
            )}
            <DeleteRowButton onClick={() => { setPendingDelete(true); setForceArmed(false); }} />
          </>
        }
      />
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}

      <section aria-label={t("periods.projTitle", { members: s.member_count, sessions: proj.sessions })} className="mb-5 rounded-xl border border-pine/30 bg-white shadow-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pine/20 bg-gradient-to-r from-pine to-pine-deep px-4 py-3 text-paper">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-lime animate-pulse" />
            <h2 className="text-sm font-bold tracking-tight">
              {t("periods.projTitle", { members: s.member_count, sessions: proj.sessions })}
            </h2>
          </div>
          {!done && (
            <button
              type="button"
              className="rounded-lg border border-paper/25 bg-white/10 px-3 py-1 text-xs font-semibold text-paper hover:bg-white/20 transition-colors"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? t("periods.btnCloseSettings") : t("periods.btnEditPeriod")}
            </button>
          )}
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line/70 sm:grid-cols-4 bg-gradient-to-b from-lime-50/25 to-white">
          <Cell
            label={t("periods.projProfitFull")}
            value={rupiah(proj.profit_full)}
            sub={t("periods.projFullAttendanceSub", { status: t(`status.${proj.status_full}`) })}
            highlight={proj.profit_full >= 0 ? "lime" : "rose"}
          />
          <Cell
            label={t("periods.projRevenueFull")}
            value={rupiah(proj.revenue_full)}
            sub={t("periods.projMemberPriceSub", { amount: rupiah(s.commitment_total) })}
          />
          <Cell
            label={t("periods.projProjectedCost")}
            value={rupiah(proj.operating_cost)}
            sub={t("periods.projCostSub", { courts: rupiah(proj.venue_total), shuttles: rupiah(proj.shuttle_cost) })}
          />
          <Cell
            label={t("periods.projProjectedShuttles")}
            value={`${proj.shuttle_units} pcs`}
            sub={t("periods.projShuttlesSub", { perSession: proj.shuttle_per_session, used: s.shuttlecock_used })}
          />
        </dl>
        <dl className="grid grid-cols-2 divide-x divide-line/70 border-t border-line/70 sm:grid-cols-4 bg-white">
          <Cell
            label={t("periods.projBilledSoFar")}
            value={rupiah(proj.revenue_billed)}
            sub={t("periods.projBilledSub", { memberVisits: s.member_present, nonMemberVisits: s.non_member_present })}
          />
          <Cell
            label={t("periods.projRunningProfit")}
            value={rupiah(proj.profit_billed)}
            sub={t("periods.projRunningSub")}
            highlight={proj.profit_billed >= 0 ? "lime" : "rose"}
          />
          <Cell
            label={t("periods.projActualCash")}
            value={rupiah(s.cash_flow)}
            sub={t("periods.projCashSub", { in: rupiah(s.cash_in), out: rupiah(s.cash_out) })}
          />
          <Cell
            label={t("periods.projActualProfit")}
            value={rupiah(s.operating_profit)}
            sub={t("periods.projActualSub", { iuran: rupiah(s.total_revenue), cost: rupiah(s.operating_cost) })}
            highlight={s.operating_profit >= 0 ? "lime" : "rose"}
          />
        </dl>
        {editing && !done && (
          <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-4">
            <Field label={t("periods.editName")}>
              <input id="edit-nama" className="w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={t("periods.editStatus")}>
              <select
                id="edit-status"
                className="w-full"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="DRAFT">{t("periods.editStatusDraft")}</option>
                <option value="ACTIVE">{t("periods.editStatusActive")}</option>
              </select>
            </Field>
            <Field label={t("periods.fieldQuota")} hint={t("periods.editQuotaHint")}>
              <input
                id="edit-max-members"
                type="number"
                min={0}
                className="w-full"
                value={form.max_members ?? ""}
                placeholder={t("periods.placeholderUnlimited")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_members: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label={t("periods.fieldRegExpiresAt")} hint={t("periods.hintRegExpiresAt")}>
              <input
                id="edit-reg-expires-at"
                type="datetime-local"
                className="w-full"
                value={form.registration_expires_at}
                onChange={(e) => setForm({ ...form, registration_expires_at: e.target.value })}
              />
            </Field>
            <Field label={t("periods.editStart")}>
              <input id="edit-mulai" type="date" className="w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </Field>
            <Field label={t("periods.editEnd")}>
              <input id="edit-selesai" type="date" className="w-full" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </Field>
            <Field label={t("periods.editSessions")} hint={t("periods.editSessionsHint")}>
              <input id="edit-sesi" type="number" min={1} className="w-full" value={form.number_of_sessions} onChange={(e) => setForm({ ...form, number_of_sessions: Number(e.target.value) })} />
            </Field>
            <Field label={t("periods.editMemberPrice")}>
              <MoneyInput id="edit-komitmen" value={form.commitment_fee} onChange={(n) => setForm({ ...form, commitment_fee: n })} />
            </Field>
            <Field label={t("periods.editContribution")}>
              <MoneyInput id="edit-kontribusi" value={form.member_contribution} onChange={(n) => setForm({ ...form, member_contribution: n })} />
            </Field>
            <Field label={t("periods.editNonMember")}>
              <MoneyInput id="edit-nonmember" value={form.non_member_fee} onChange={(n) => setForm({ ...form, non_member_fee: n })} />
            </Field>
            <Field label={t("periods.editTotalCourt")}>
              <MoneyInput id="edit-lapangan" value={form.venue_cost_total} onChange={(n) => setForm({ ...form, venue_cost_total: n })} />
            </Field>
            <Field label={t("periods.editShuttlePack")}>
              <MoneyInput id="edit-kok" value={form.shuttle_pack_price} onChange={(n) => setForm({ ...form, shuttle_pack_price: n })} />
            </Field>
            <Field label={t("periods.editUnitsPack")}>
              <input id="edit-isi" type="number" min={1} className="w-full" value={form.shuttle_units_per_pack} onChange={(e) => setForm({ ...form, shuttle_units_per_pack: Number(e.target.value) })} />
            </Field>
            <Field label={t("periods.editShuttlesSession")}>
              <input id="edit-koksesi" type="number" min={0} className="w-full" value={form.shuttle_per_session} onChange={(e) => setForm({ ...form, shuttle_per_session: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="edit-registration-notes" className="text-xs font-semibold text-ink-soft">
                  {t("periods.fieldNotes")}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      registration_notes: buildRegistrationNotesTemplate({
                        start_date: form.start_date,
                        end_date: form.end_date,
                        number_of_sessions: form.number_of_sessions,
                        max_members: form.max_members,
                        member_contribution: form.member_contribution,
                        non_member_fee: form.non_member_fee,
                      }),
                    })
                  }
                  className="text-xs font-semibold text-pine hover:underline"
                >
                  {t("periods.btnFillTemplate")}
                </button>
              </div>
              <textarea
                id="edit-registration-notes"
                rows={5}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs leading-relaxed text-ink focus:border-pine focus:outline-none"
                placeholder={t("periods.placeholderNotes")}
                value={form.registration_notes}
                onChange={(e) => setForm({ ...form, registration_notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-4">
              <Btn
                disabled={updateState.isLoading || !form.name.trim() || !form.start_date || !form.end_date}
                onClick={() => {
                  let expiresUtc = "";
                  if (form.registration_expires_at) {
                    const converted = gmt7InputToUtcIso(form.registration_expires_at);
                    if (!converted) {
                      setError(t("periods.regErrSaveDeadline"));
                      return;
                    }
                    expiresUtc = converted;
                  }
                  update({
                    id,
                    body: {
                      ...form,
                      name: form.name.trim(),
                      max_members: form.max_members ? Number(form.max_members) : 0,
                      registration_notes: form.registration_notes.trim() || "",
                      registration_expires_at: expiresUtc,
                    },
                  })
                    .unwrap()
                    .then(() => {
                      setEditing(false);
                      setError("");
                    })
                    .catch((e: unknown) => setError(e instanceof ApiError ? e.message : t("periods.errorSaveSettings")));
                }}
              >
                {updateState.isLoading ? t("periods.btnSavingSettings") : t("periods.btnSaveSettings")}
              </Btn>
            </div>
          </div>
        )}
      </section>

      <section aria-label={t("periods.financesTitle")} className="mb-5 rounded-xl border border-line bg-white shadow-card overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/30 to-white px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t("periods.financesTitle")}</h2>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4 bg-white">
          <Cell
            label={t("periods.financesProfit")}
            value={rupiah(s.operating_profit)}
            sub={`${t(`status.${s.status}`)} · ${t("periods.financesProfitSub")}`}
            highlight={s.operating_profit >= 0 ? "lime" : "rose"}
          />
          <Cell label={t("periods.financesFees")} value={rupiah(s.total_revenue)} sub={t("periods.financesFeesSub")} />
          <Cell
            label={t("periods.financesCost")}
            value={rupiah(s.operating_cost)}
            sub={
              s.total_venue_cost > 0
                ? t("periods.financesCostWithCourtSub", { court: rupiah(s.total_venue_cost) })
                : t("periods.financesCostNoCourtSub")
            }
          />
          <Cell
            label={t("periods.financesCashFlow")}
            value={rupiah(s.cash_flow)}
            sub={t("periods.financesCashFlowSub")}
          />
        </dl>
        <p className="border-t border-line/70 bg-paper/30 px-4 py-2 text-[11px] leading-relaxed text-ink-faint">
          {t("periods.detailFinancesNote")}
        </p>
      </section>

      <div className="flex flex-col gap-5">
        <section aria-label={t("periods.perSessionTitle")} className="h-fit rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">{t("periods.perSessionTitle")}</h2>
              <span className="text-xs font-semibold text-pine">
                {t("periods.perSessionHeldPct", { held: heldSessions.length, total: plannedSessions, pct: progressPct })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-ink-faint">
              {t("periods.perSessionSubtitle")}
              {remainingSessions > 0
                ? ` ${t("periods.perSessionRemaining", { count: remainingSessions })}`
                : ` ${t("periods.perSessionAllHeld")}`}
              {upcomingSessions.length > 0 && ` · ${t("periods.perSessionScheduled", { count: upcomingSessions.length })}`}
              {lastHeldDate && ` · ${t("periods.perSessionLastHeld", { date: dateFormatted(lastHeldDate) })}`}
              {` · ${t("periods.perSessionEnds", { date: dateFormatted(s.period.end_date) })}`}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {t("periods.detailSessionNote")}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {t("periods.perSessionWholeNote", { count: plannedSessions })}
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-court/80 border border-line/40"
              role="progressbar"
              aria-valuenow={heldSessions.length}
              aria-valuemin={0}
              aria-valuemax={plannedSessions}
              aria-label={t("periods.perSessionTitle")}
            >
              <div className="h-full rounded-full bg-gradient-to-r from-pine via-lime-600 to-lime transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {breakdown.isFetching && !breakdown.data ? (
            <Loading />
          ) : (breakdown.data ?? []).length === 0 ? (
            <div className="p-3"><Empty text={t("periods.emptySessions")} /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("periods.colDate")}</th>
                  <th className="text-right">{t("periods.colPresent")}</th>
                  <th className="text-right">{t("periods.colRevenue")}</th>
                  <th className="text-right">{t("periods.colShuttles")}</th>
                  <th className="text-right">{t("periods.colSessionProfit")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bRows.map((row) => {
                  const sCost = row.shuttlecock_cost ?? row.operating_cost;
                  const sProfit = sessionProfitOf(row);
                  return (
                    <tr key={row.session_id}>
                      <td className="whitespace-nowrap">{dateFormatted(row.date)}</td>
                      <td className="text-right tabular-nums">{row.players_present}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(row.revenue)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(sCost)}</td>
                      <td className={`whitespace-nowrap text-right font-semibold tabular-nums ${sProfit < 0 ? "text-red-700" : "text-lime"}`}>
                        {sProfit >= 0 ? "+" : ""}{rupiah(sProfit)}
                      </td>
                      <td className="text-right"><OpenLink to={`/mabar/${row.session_id}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-3 py-2 text-xs font-semibold text-ink-soft">
                    {t("periods.sessionsSubtotal", { count: bRows.length })}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {bRows.reduce((a, r) => a + r.players_present, 0)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {rupiah(sumRevenue)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums">
                    {rupiah(sumShuttleCost)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums ${sumSessionProfit < 0 ? "text-red-700" : "text-lime"}`}>
                    {sumSessionProfit >= 0 ? "+" : ""}{rupiah(sumSessionProfit)}
                  </td>
                  <td />
                </tr>
                <tr className="bg-court/5">
                  <td className="px-3 py-2 text-xs text-ink-soft" colSpan={2}>
                    {t("periods.detailIuranRow")}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-ink-soft">
                    {rupiah(s.total_revenue)}
                  </td>
                  <td />
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums text-lime">
                    +{rupiah(s.total_revenue)}
                  </td>
                  <td />
                </tr>
                {courtBudget > 0 && (
                  <tr className="bg-court/5">
                    <td className="px-3 py-2 text-xs text-ink-soft" colSpan={2}>
                      {t("periods.detailCourtRow", { count: plannedSessions })}
                      {courtRemaining > 0 && (
                        <span className="block text-[11px] text-ink-faint">
                          {t("periods.detailCourtSplit", {
                            used: rupiah(courtUsed),
                            held: bRows.length,
                            planned: plannedSessions,
                          })}
                        </span>
                      )}
                    </td>
                    <td />
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs tabular-nums text-ink-soft">
                      {rupiah(courtBudget)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-semibold tabular-nums text-red-700">
                      −{rupiah(courtBudget)}
                    </td>
                    <td />
                  </tr>
                )}
                <tr className="border-t-2 border-line bg-paper/50">
                  <td className="px-3 py-2.5 text-xs font-bold text-ink" colSpan={4}>
                    {t("periods.detailNetRow")}
                    <span className="block text-[11px] font-normal text-ink-faint tabular-nums">
                      {t("periods.detailNetFormula", { in: rupiah(totalIn), out: rupiah(totalOut) })}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2.5 text-right text-sm font-extrabold tabular-nums ${netProfit < 0 ? "text-red-700" : "text-lime"}`}>
                    {netProfit >= 0 ? "+" : ""}{rupiah(netProfit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>
          )}
          {(breakdown.data ?? []).length > 0 && (
            <p className="border-t border-line/70 bg-paper/30 px-4 py-2 text-[11px] leading-relaxed text-ink-faint">
              {t("periods.detailNetNote", {
                budget: rupiah(courtBudget),
                planned: plannedSessions,
                used: rupiah(courtUsed),
                held: bRows.length,
              })}
            </p>
          )}
        </section>

        <section aria-label={t("periods.membersTitle")} className="h-fit rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <div className="border-b border-line bg-gradient-to-r from-court/70 via-court/35 to-white px-4 py-3">
            <h2 className="text-sm font-bold text-ink">
              {t("periods.membersTitle")} · {memberRows.length}
              {memberRows.length > 0 && (
                <span className="font-normal text-ink-soft">
                  {" · "}
                  {t("periods.membersCollected", {
                    collected: `${rupiah(collectedTotal)} / ${rupiah(billedTotal)}`,
                  })}
                </span>
              )}
            </h2>
          </div>
          {members.isFetching && !members.data ? (
            <Loading />
          ) : memberRows.length === 0 ? (
            <div className="p-3"><Empty text={t("periods.emptyMembers")} /></div>
          ) : (
            <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("periods.colName")}</th>
                  <th className="text-right">{t("periods.colAttended")}</th>
                  <th className="text-right">{t("periods.colBill")}</th>
                  <th className="text-right">{t("periods.colPaid")}</th>
                  <th className="text-right">{t("periods.colSaved")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {memberRows.map((m) => {
                  const paid = paidOf(m);
                  const commitDone = commitmentPaid(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="font-medium">{m.player_name}</span>
                        <span className={`block text-xs ${commitDone ? "text-lime" : "text-amber-700"}`}>
                          {m.commitment_fee
                            ? (commitDone
                              ? t("periods.memberPricePaid")
                              : `${t("periods.memberPriceUnpaid")} (${rupiah(m.commitment_fee)})`)
                            : t("periods.noMemberPrice")}
                        </span>
                      </td>
                      <td className="text-right tabular-nums">{m.attendance_count}×</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(m.total_bill)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(paid)}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">{rupiah(m.benefit)}</td>
                      <td className="whitespace-nowrap text-right">
                        {!done && (
                          <span className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-pine to-pine-deep px-3 py-1 text-xs font-semibold text-paper hover:brightness-110 shadow-2xs transition-all"
                            title={t("periods.btnMemberPriceTitle")}
                            onClick={() => openPay(m)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
                              <rect x="2.8" y="6.5" width="18.4" height="11" rx="2" />
                              <circle cx="12" cy="12" r="2.6" />
                              <path d="M6.1 12h.01M17.9 12h.01" />
                            </svg>
                            {t("periods.btnMemberPrice")}
                          </button>
                          <DeleteRowButton label={t("common.delete")} onClick={() => { setWithdrawFor(m); setWithdrawError(""); }} />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
          {payFor && !done && (
            <ConfirmModal
              title={t("periods.payModalTitle", { name: payFor.player_name })}
              body={
                <>
                  <Field label={t("periods.payModalAmount")}>
                    <MoneyInput id="pay-amount" value={payAmount} onChange={setPayAmount} />
                  </Field>
                  <div className="mt-3">
                    <Field label={t("periods.payModalNote")} hint={t("periods.payModalNoteHint")}>
                      <input id="pay-note" className="w-full" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                    </Field>
                  </div>
                  {payError && <p role="alert" className="mt-2 text-sm text-red-700">{payError}</p>}
                  <p className="mt-2 text-xs text-ink-faint">{t("periods.payModalTip")}</p>
                </>
              }
              confirmLabel={payState.isLoading ? t("periods.btnSavingSettings") : `${t("periods.payModalConfirm")} (${rupiah(payAmount || 0)})`}
              cancelLabel={t("periods.btnCancel")}
              busy={payState.isLoading}
              onConfirm={submitPayment}
              onCancel={() => setPayFor(null)}
            />
          )}
          {withdrawFor && !done && (
            <ConfirmModal
              title={t("periods.withdrawModalTitle")}
              body={
                <>
                  <p>{t("periods.withdrawModalBody", { name: withdrawFor.player_name })}</p>
                  {withdrawError && <p role="alert" className="mt-2 text-sm text-red-700">{withdrawError}</p>}
                </>
              }
              confirmLabel={withdrawState.isLoading ? t("periods.btnDeleting") : t("periods.withdrawModalConfirm")}
              busy={withdrawState.isLoading}
              onConfirm={confirmWithdraw}
              onCancel={() => setWithdrawFor(null)}
            />
          )}
          {!done && (
            <div className="space-y-2 border-t border-line p-3">
              <div className="flex gap-2">
                <label htmlFor="tambah-member" className="sr-only">{t("periods.selectAddMember")}</label>
                <select id="tambah-member" className="min-w-0 flex-1" value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">{t("periods.selectAddMember")}</option>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Btn disabled={!pick || addState.isLoading} onClick={submitMember}>{t("periods.btnAdd")}</Btn>
              </div>
              <div className="flex gap-2">
                <label htmlFor="tambah-member-baru" className="sr-only">{t("periods.placeholderNewMember")}</label>
                <input
                  id="tambah-member-baru"
                  className="min-w-0 flex-1"
                  placeholder={t("periods.placeholderNewMember")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNewMember(); }}
                />
                <Btn disabled={!newName.trim() || memberBusy} onClick={submitNewMember}>
                  {createState.isLoading ? t("periods.btnSavingSettings") : t("periods.btnAddNew")}
                </Btn>
              </div>
              <p className="text-xs text-ink-faint">{t("periods.hintNewMember")}</p>
            </div>
          )}
        </section>
      </div>

      <AdminPaymentsPanel
        periodId={id}
        period={s.period}
        isRegistrationOpen={s.period.is_registration_open ?? false}
        done={done}
        maxMembers={s.period.max_members}
        currentMembers={memberRows.length}
      />

      <MemberAttendanceMatrixSection periodId={id} periodName={s.period.name} />

      {(matrix.data?.rows.length ?? 0) > 0 && (
      <section aria-label={t("periods.shuttleMatrixTitle")} className="mt-5 rounded-xl border border-line bg-white shadow-card">
        <h2 className="border-b border-line px-3 py-2 text-sm font-semibold">
          {t("periods.shuttleMatrixTitle")} · {matrix.data?.total ?? 0} pcs ({matrix.data?.avg_per_session ?? 0}/sesi)
        </h2>
        <p className="border-b border-line bg-court/40 px-3 py-1.5 text-xs text-ink-soft">
          {t("periods.shuttleMatrixNote")}
        </p>
        {matrix.isFetching && !matrix.data ? (
          <Loading />
        ) : !matrix.data || matrix.data.rows.length === 0 ? (
          <div className="p-3"><Empty text={t("periods.emptyShuttleMatrix")} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("periods.colPlayer")}</th>
                  {matrix.data.dates.map((d) => (
                    <th key={d} className="text-right">{dateFormatted(d)}</th>
                  ))}
                  <th className="text-right">{t("periods.colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {matrix.data.rows.map((r) => (
                  <tr key={r.name}>
                    <td className="font-medium">{r.name}</td>
                    {(matrix.data?.dates ?? []).map((d) => (
                      <td key={d} className="text-right tabular-nums">{r.cells[d] ?? "–"}</td>
                    ))}
                    <td className="text-right font-semibold tabular-nums">{r.total}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          </div>
        )}
      </section>
      )}
      {pendingComplete && (
        <ConfirmModal
          title={t("periods.completeModalTitle")}
          body={
            <p>
              {t("periods.completeModalBody", { name: s.period.name })}
            </p>
          }
          confirmLabel={t("periods.completeModalConfirm")}
          busy={completeState.isLoading}
          onConfirm={confirmComplete}
          onCancel={() => setPendingComplete(false)}
        />
      )}
      {pendingDelete && (
        <ConfirmModal
          title={forceArmed ? t("periods.deleteModalForceTitle") : t("periods.deleteModalTitle")}
          body={
            forceArmed ? (
              <>
                <p>
                  {t("periods.deleteModalForceBody1", { name: s.period.name })}
                </p>
                <p className="mt-2">{t("periods.deleteModalForceBody2")}</p>
              </>
            ) : (
              <p>
                {t("periods.deleteModalBody", { name: s.period.name })}
              </p>
            )
          }
          confirmLabel={forceArmed ? t("periods.deleteModalForceConfirm") : t("periods.deleteModalConfirm")}
          busy={removeState.isLoading}
          onConfirm={confirmDelete}
          onCancel={() => { setPendingDelete(false); setForceArmed(false); }}
        />
      )}
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: "lime" | "rose";
}) {
  return (
    <div className="px-3.5 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">{label}</dt>
      <dd
        className={`mt-1 text-base font-bold tabular-nums ${
          highlight === "lime"
            ? "text-lime-deep"
            : highlight === "rose"
            ? "text-rose-700"
            : "text-ink"
        }`}
      >
        {value}
      </dd>
      {sub && <dd className="mt-0.5 text-xs text-ink-soft">{sub}</dd>}
    </div>
  );
}

async function copyTableImage(
  data: PeriodAttendanceMatrixResponse,
  periodName: string
): Promise<boolean> {
  const { sessions, rows, commitment_fee, member_contribution, total_lapangan_paid } = data;

  const feeLabel = commitment_fee >= 1000 && commitment_fee % 1000 === 0
    ? `LAPANGAN ${commitment_fee / 1000}K`
    : commitment_fee > 0
    ? `LAPANGAN ${rupiah(commitment_fee)}`
    : `LAPANGAN`;

  const scale = 2;
  const noColWidth = 50;
  const nameColWidth = 160;
  const lapanganColWidth = 140;
  const sessionColWidth = 140;

  const sessCount = Math.max(1, sessions.length);
  const totalColsWidth = noColWidth + nameColWidth + lapanganColWidth + sessCount * sessionColWidth;
  const padX = 24;
  const padY = 24;
  const bannerHeight = 70;
  const headerRowHeight = 40;
  const rowHeight = 32;
  const footerRowHeight = 38;

  const canvasWidth = totalColsWidth + padX * 2;
  const tableHeight = headerRowHeight + rows.length * rowHeight + footerRowHeight;
  const canvasHeight = padY * 2 + bannerHeight + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title Banner
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("PB KECEBONG — REKAP KAS KOK & LAPANGAN", padX, padY + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    `Period: ${periodName}  ·  Tarif Lapangan: ${feeLabel}  ·  Kas Kok: ${rupiah(member_contribution)}/pertemuan`,
    padX,
    padY + 44
  );

  const startX = padX;
  const startY = padY + bannerHeight;

  // Column X boundary coordinates
  const colXs: number[] = [
    startX,
    startX + noColWidth,
    startX + noColWidth + nameColWidth,
    startX + noColWidth + nameColWidth + lapanganColWidth,
  ];
  for (let i = 0; i < sessCount; i++) {
    colXs.push(colXs[colXs.length - 1] + sessionColWidth);
  }

  // Header Background
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(startX, startY, totalColsWidth, headerRowHeight);

  // Header Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";

  // NO
  ctx.textAlign = "center";
  ctx.fillText("NO", colXs[0] + noColWidth / 2, startY + headerRowHeight / 2);

  // LIST MEM
  ctx.textAlign = "left";
  ctx.fillText("LIST MEM", colXs[1] + 12, startY + headerRowHeight / 2);

  // LAPANGAN
  ctx.textAlign = "center";
  ctx.fillText(feeLabel, colXs[2] + lapanganColWidth / 2, startY + headerRowHeight / 2);

  // Sessions
  if (sessions.length === 0) {
    ctx.fillText("Belum ada pertemuan", colXs[3] + sessionColWidth / 2, startY + headerRowHeight / 2);
  } else {
    sessions.forEach((s, sIdx) => {
      ctx.fillText(`Kas Kok (${dateDmy(s.date)})`, colXs[3 + sIdx] + sessionColWidth / 2, startY + headerRowHeight / 2);
    });
  }

  // Header Vertical Lines (White for high contrast on dark blue)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + headerRowHeight);
    ctx.stroke();
  }

  // Header Bottom Border Line (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY + headerRowHeight);
  ctx.lineTo(startX + totalColsWidth, startY + headerRowHeight);
  ctx.stroke();

  // Rows
  let curY = startY + headerRowHeight;
  rows.forEach((r, idx) => {
    // Row background
    ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(startX, curY, totalColsWidth, rowHeight);

    // NO
    ctx.fillStyle = "#475569";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(idx + 1), colXs[0] + noColWidth / 2, curY + rowHeight / 2);

    // LIST MEM
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(r.player_name, colXs[1] + 12, curY + rowHeight / 2);

    // LAPANGAN Cell
    if (r.commitment_paid) {
      ctx.fillStyle = "#059669";
      ctx.fillRect(colXs[2] + 4, curY + 3, lapanganColWidth - 8, rowHeight - 6);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LUNAS", colXs[2] + lapanganColWidth / 2, curY + rowHeight / 2);
    } else {
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(colXs[2] + 4, curY + 3, lapanganColWidth - 8, rowHeight - 6);
      ctx.fillStyle = "#92400e";
      ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(r.commitment_amount_paid > 0 ? "KURANG" : "BELUM", colXs[2] + lapanganColWidth / 2, curY + rowHeight / 2);
    }

    // Sessions Attendance Cells
    if (sessions.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("—", colXs[3] + sessionColWidth / 2, curY + rowHeight / 2);
    } else {
      sessions.forEach((s, sIdx) => {
        const isPresent = r.attendances[s.id] === "PRESENT";
        const sessX = colXs[3 + sIdx];
        if (isPresent) {
          ctx.fillStyle = "#059669";
          ctx.fillRect(sessX + 4, curY + 3, sessionColWidth - 8, rowHeight - 6);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✓", sessX + sessionColWidth / 2, curY + rowHeight / 2);
        } else {
          ctx.fillStyle = "#dc2626";
          ctx.fillRect(sessX + 4, curY + 3, sessionColWidth - 8, rowHeight - 6);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("TIDAK HADIR", sessX + sessionColWidth / 2, curY + rowHeight / 2);
        }
      });
    }

    // Row Bottom Border Line (Solid Black)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, curY + rowHeight);
    ctx.lineTo(startX + totalColsWidth, curY + rowHeight);
    ctx.stroke();

    // Column Separator Lines (Solid Black)
    for (const x of colXs) {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + rowHeight);
      ctx.stroke();
    }

    curY += rowHeight;
  });

  // Footer Row (TOTAL)
  ctx.fillStyle = "#fde047";
  ctx.fillRect(startX, curY, totalColsWidth, footerRowHeight);

  // Footer Top Border (Thick Black Line)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, curY);
  ctx.lineTo(startX + totalColsWidth, curY);
  ctx.stroke();

  // Footer Bottom Border (Black Line)
  ctx.beginPath();
  ctx.moveTo(startX, curY + footerRowHeight);
  ctx.lineTo(startX + totalColsWidth, curY + footerRowHeight);
  ctx.stroke();

  // Footer Vertical Column Separator Lines (Solid Black)
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, curY);
    ctx.lineTo(x, curY + footerRowHeight);
    ctx.stroke();
  }

  // Footer Text
  ctx.fillStyle = "#000000";
  ctx.font = "900 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", colXs[1] + 12, curY + footerRowHeight / 2);

  // Total Lapangan
  ctx.textAlign = "center";
  ctx.fillText(rupiah(total_lapangan_paid), colXs[2] + lapanganColWidth / 2, curY + footerRowHeight / 2);

  // Total each session
  if (sessions.length === 0) {
    ctx.fillText("—", colXs[3] + sessionColWidth / 2, curY + footerRowHeight / 2);
  } else {
    sessions.forEach((s, sIdx) => {
      ctx.fillText(rupiah(s.total_kas_kok), colXs[3 + sIdx] + sessionColWidth / 2, curY + footerRowHeight / 2);
    });
  }

  // Outer Border (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, totalColsWidth, tableHeight);

  return new Promise<boolean>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          resolve(true);
        } else {
          throw new Error("Clipboard API not supported");
        }
      } catch (err) {
        console.warn("ClipboardItem write failed, fallback to download:", err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rekap-kas-kok-${periodName.toLowerCase().replace(/\s+/g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(true);
      }
    }, "image/png");
  });
}

// payment_method masih ikut terisi saat status UNPAID (defaultnya CASH),
// jadi NOTE harus diganti label statusnya — kalau tidak, pemain yang belum
// bayar justru tampil "CASH".
// Baris carry_over = tunggakan dari sesi SEBELUM period ini; tanggal openplay
// lamanya dicantumkan sebagai pembeda dari tagihan pertemuan berjalan.
function nonMemberNote(nm: PeriodAttendanceMatrixNonMember): string {
  if (nm.carry_over) return `BELUM LUNAS SEJAK ${dateDmy(nm.session_date)}`;
  if (!nm.paid) return "BELUM LUNAS";
  return nm.note || "LUNAS";
}

// Memotong teks canvas agar tidak melewati batas kolomnya, dengan ellipsis.
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

async function copyNonMemberTableImage(
  items: PeriodAttendanceMatrixNonMember[],
  sessionDate: string,
  fee: number,
  periodName: string
): Promise<boolean> {
  const feeLabel = fee >= 1000 && fee % 1000 === 0 ? `INCLUDE KOK ${fee / 1000}K` : `INCLUDE KOK ${rupiah(fee)}`;

  const scale = 2;
  const noColWidth = 50;
  const nameColWidth = 180;
  const feeColWidth = 160;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  // Lebar kolom NOTE dihitung dari label terpanjang ("BELUM LUNAS SEJAK
  // 25/10/2026" pada baris carry-over) — lebar tetap 140px membuat teksnya
  // meluber keluar row. Dibatasi 320px; sisa kelebihannya dipotong fitText().
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const longestNote = items.reduce(
    (max, nm) => Math.max(max, ctx.measureText(nonMemberNote(nm)).width),
    0
  );
  const noteColWidth = Math.min(320, Math.max(140, Math.ceil(longestNote) + 24));

  const totalColsWidth = noColWidth + nameColWidth + feeColWidth + noteColWidth;
  const padX = 24;
  const padY = 24;
  const bannerHeight = 70;
  const headerRowHeight = 40;
  const rowHeight = 32;
  const footerRowHeight = 38;

  const canvasWidth = totalColsWidth + padX * 2;
  const unpaidCount = items.filter((i) => !i.paid).length;
  const footerRows = unpaidCount > 0 ? 2 : 1;
  const tableHeight = headerRowHeight + items.length * rowHeight + footerRowHeight * footerRows;
  const canvasHeight = padY * 2 + bannerHeight + tableHeight;

  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;

  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Title Banner
  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("PB KECEBONG — LIST NON MEMBER", padX, padY + 20);

  ctx.fillStyle = "#64748b";
  ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(
    `Period: ${periodName}  ·  Pertemuan: ${dateDmy(sessionDate)}  ·  Tarif: ${feeLabel}`,
    padX,
    padY + 44
  );

  const startX = padX;
  const startY = padY + bannerHeight;

  const colXs = [
    startX,
    startX + noColWidth,
    startX + noColWidth + nameColWidth,
    startX + noColWidth + nameColWidth + feeColWidth,
    startX + totalColsWidth,
  ];

  // Header Background
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(startX, startY, totalColsWidth, headerRowHeight);

  // Header Text
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textBaseline = "middle";

  // NO
  ctx.textAlign = "center";
  ctx.fillText("NO", colXs[0] + noColWidth / 2, startY + headerRowHeight / 2);

  // LIST NON MEMBER
  ctx.textAlign = "left";
  ctx.fillText("LIST NON MEMBER", colXs[1] + 12, startY + headerRowHeight / 2);

  // INCLUDE KOK
  ctx.textAlign = "center";
  ctx.fillText(feeLabel, colXs[2] + feeColWidth / 2, startY + headerRowHeight / 2);

  // NOTE
  ctx.textAlign = "left";
  ctx.fillText("NOTE", colXs[3] + 12, startY + headerRowHeight / 2);

  // Header Vertical Lines (White for high contrast against dark blue header)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1;
  for (const x of colXs) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + headerRowHeight);
    ctx.stroke();
  }

  // Header Bottom Border Line (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(startX, startY + headerRowHeight);
  ctx.lineTo(startX + totalColsWidth, startY + headerRowHeight);
  ctx.stroke();

  // Body Rows
  let curY = startY + headerRowHeight;
  items.forEach((nm, idx) => {
    // Row background (white or subtle alternating); tunggakan carry-over
    // selalu merah muda supaya menonjol dari tagihan pertemuan ini
    ctx.fillStyle = nm.carry_over ? "#fee2e2" : idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    ctx.fillRect(startX, curY, totalColsWidth, rowHeight);

    // Fee cell background: lime when settled, red while still unpaid
    ctx.fillStyle = nm.paid ? "#00e600" : "#ef4444";
    ctx.fillRect(colXs[2], curY, feeColWidth, rowHeight);

    // Text: NO
    ctx.fillStyle = "#475569";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(idx + 1), colXs[0] + noColWidth / 2, curY + rowHeight / 2);

    // Text: LIST NON MEMBER
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, nm.player_name, nameColWidth - 20), colXs[1] + 12, curY + rowHeight / 2);

    // Text: FEE
    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(nm.fee), colXs[2] + feeColWidth / 2, curY + rowHeight / 2);

    // Text: NOTE
    ctx.fillStyle = nm.paid ? "#475569" : "#b91c1c";
    ctx.font = `${nm.paid ? "" : "bold "}11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(fitText(ctx, nonMemberNote(nm), noteColWidth - 20), colXs[3] + 12, curY + rowHeight / 2);

    // Row Bottom Border Line (Solid Black)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, curY + rowHeight);
    ctx.lineTo(startX + totalColsWidth, curY + rowHeight);
    ctx.stroke();

    // Column Separator Lines (Solid Black)
    for (const x of colXs) {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + rowHeight);
      ctx.stroke();
    }

    curY += rowHeight;
  });

  // Footer: TOTAL hanya yang lunas, yang belum dicatat terpisah
  const paidTotal = items.filter((i) => i.paid).reduce((a, b) => a + b.fee, 0);
  const unpaidTotal = items.filter((i) => !i.paid).reduce((a, b) => a + b.fee, 0);
  const footerLines: Array<{ label: string; amount: number; count: number; bg: string; fg: string }> = [
    { label: "TOTAL", amount: paidTotal, count: items.length - unpaidCount, bg: "#fde047", fg: "#000000" },
  ];
  if (unpaidCount > 0) {
    footerLines.push({ label: "BELUM LUNAS", amount: unpaidTotal, count: unpaidCount, bg: "#fee2e2", fg: "#b91c1c" });
  }

  footerLines.forEach((line) => {
    ctx.fillStyle = line.bg;
    ctx.fillRect(startX, curY, totalColsWidth, footerRowHeight);

    // Footer Top Border (Thick Black Line)
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, curY);
    ctx.lineTo(startX + totalColsWidth, curY);
    ctx.stroke();

    // Footer Bottom Border (Black Line)
    ctx.beginPath();
    ctx.moveTo(startX, curY + footerRowHeight);
    ctx.lineTo(startX + totalColsWidth, curY + footerRowHeight);
    ctx.stroke();

    // Footer Vertical Column Separator Lines (Solid Black)
    ctx.lineWidth = 1;
    for (const x of colXs) {
      ctx.beginPath();
      ctx.moveTo(x, curY);
      ctx.lineTo(x, curY + footerRowHeight);
      ctx.stroke();
    }

    // Footer Text
    ctx.fillStyle = line.fg;
    ctx.font = "900 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(line.label, colXs[1] + 12, curY + footerRowHeight / 2);

    ctx.textAlign = "center";
    ctx.fillText(rupiah(line.amount), colXs[2] + feeColWidth / 2, curY + footerRowHeight / 2);

    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${line.count} org`, startX + totalColsWidth - 12, curY + footerRowHeight / 2);

    curY += footerRowHeight;
  });

  // Outer Border (Solid Black)
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(startX, startY, totalColsWidth, tableHeight);

  return new Promise<boolean>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          resolve(true);
        } else {
          throw new Error("Clipboard API not supported");
        }
      } catch (err) {
        console.warn("ClipboardItem write failed, fallback to download:", err);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rekap-non-member-${dateDmy(sessionDate).replace(/\//g, "-")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        resolve(true);
      }
    }, "image/png");
  });
}

function MemberAttendanceMatrixSection({ periodId, periodName }: { periodId: string; periodName: string }) {
  const { t } = useI18n();
  const { data, isFetching, isError, refetch } = usePeriodAttendanceMatrixQuery(periodId);
  const [activeTab, setActiveTab] = useState<"member" | "non_member">("member");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);

  useEffect(() => {
    if (data?.sessions && data.sessions.length > 0 && !selectedSessionId) {
      const sessWithNonMember = data.sessions.find((s) =>
        (data.non_members ?? []).some((nm) => nm.session_id === s.id)
      );
      setSelectedSessionId(sessWithNonMember ? sessWithNonMember.id : data.sessions[0].id);
    }
  }, [data, selectedSessionId]);

  if (isFetching && !data) return <Loading />;
  if (isError || !data) {
    return (
      <section aria-label={t("periods.matrixMemberTitle")} className="mt-5 rounded-xl border border-line bg-white shadow-card p-4">
        <h2 className="text-sm font-semibold mb-2">{t("periods.matrixMemberTitle")}</h2>
        <ErrorBox
          message={t("periods.matrixError")}
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  const { sessions, rows, commitment_fee, member_contribution, total_lapangan_paid } = data;

  const feeLabel = commitment_fee >= 1000 && commitment_fee % 1000 === 0
    ? `LAPANGAN ${commitment_fee / 1000}K`
    : commitment_fee > 0
    ? `LAPANGAN ${rupiah(commitment_fee)}`
    : `LAPANGAN`;

  const nonMemberFeeLabel = data.non_member_fee >= 1000 && data.non_member_fee % 1000 === 0
    ? `INCLUDE KOK ${data.non_member_fee / 1000}K`
    : `INCLUDE KOK ${rupiah(data.non_member_fee || 25000)}`;

  const currentSession = sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  // Tunggakan carry-over (tagihan non-member dari sesi sebelum period ini yang
  // masih UNPAID) selalu tampil di semua pertemuan, bukan hanya pada sesi asalnya.
  const carryOverNonMembers = (data.non_members ?? []).filter((nm) => nm.carry_over);
  const sessionNonMembers = (data.non_members ?? []).filter(
    (nm) => !nm.carry_over && nm.session_id === (currentSession?.id ?? "")
  );
  const filteredNonMembers = [...carryOverNonMembers, ...sessionNonMembers];
  // Yang belum lunas tidak ikut dihitung ke TOTAL.
  const paidNonMembers = filteredNonMembers.filter((nm) => nm.paid);
  const unpaidNonMembers = filteredNonMembers.filter((nm) => !nm.paid);
  const unpaidNonMemberTotal = unpaidNonMembers.reduce((a, b) => a + b.fee, 0);
  const totalNonMember = paidNonMembers.reduce((a, b) => a + b.fee, 0);

  if (rows.length === 0 && (data.non_members ?? []).length === 0) {
    return (
      <section aria-label={t("periods.matrixEmptyTitle")} className="mt-5 rounded-xl border border-line bg-white shadow-card p-4">
        <h2 className="text-sm font-semibold mb-1">{t("periods.matrixEmptyTitle")}</h2>
        <p className="text-xs text-ink-faint mb-3">{t("periods.matrixEmptyHint")}</p>
        <Empty text={t("periods.matrixEmptyDesc")} />
      </section>
    );
  }

  async function handleCopyMemberImage() {
    if (!data || copyingImage) return;
    setCopyingImage(true);
    try {
      const ok = await copyTableImage(data, periodName);
      if (ok) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (e) {
      console.error("Could not copy table image:", e);
    } finally {
      setCopyingImage(false);
    }
  }

  async function handleCopyNonMemberImage() {
    if (!currentSession || filteredNonMembers.length === 0 || copyingImage) return;
    setCopyingImage(true);
    try {
      const ok = await copyNonMemberTableImage(
        filteredNonMembers,
        currentSession.date,
        data?.non_member_fee || 25000,
        periodName
      );
      if (ok) {
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      }
    } catch (e) {
      console.error("Could not copy non-member image:", e);
    } finally {
      setCopyingImage(false);
    }
  }

  function handleCopyMemberWhatsApp() {
    if (!data) return;
    let text = `*REKAP KAS KOK & LAPANGAN*\n`;
    text += `*Period:* ${periodName}\n`;
    text += `*Tarif Lapangan:* ${feeLabel} | *Kas Kok:* ${rupiah(member_contribution)}/kehadiran\n`;
    text += `──────────────────────\n`;

    rows.forEach((r, idx) => {
      const lap = r.commitment_paid ? "LUNAS" : "BELUM";
      const fastBadge = (r.fastest_count ?? 0) > 0 ? ` (⚡${r.fastest_count}x tercepat)` : "";
      let rowText = `${idx + 1}. *${r.player_name}*${fastBadge} [Lap: ${lap}]`;
      sessions.forEach((s) => {
        const hadir = r.attendances[s.id] === "PRESENT";
        rowText += ` | ${dateDmy(s.date).slice(0, 5)}: ${hadir ? "✓" : "TH"}`;
      });
      text += rowText + "\n";
    });

    text += `──────────────────────\n`;
    text += `*TOTAL:*\n`;
    text += `• Lapangan: ${rupiah(total_lapangan_paid)}\n`;
    sessions.forEach((s) => {
      text += `• Kas Kok (${dateDmy(s.date)}): ${rupiah(s.total_kas_kok)} (${s.present_count} hadir)\n`;
    });
    text += `• Total Kas Kok: ${rupiah(data.total_kas_kok)}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleCopyNonMemberWhatsApp() {
    if (!currentSession) return;
    let text = `*LIST NON MEMBER - PB KECEBONG*\n`;
    text += `*Period:* ${periodName}\n`;
    text += `*Pertemuan:* ${dateDmy(currentSession.date)}\n`;
    text += `*Tarif:* ${nonMemberFeeLabel}\n`;
    text += `──────────────────────\n`;

    filteredNonMembers.forEach((nm, idx) => {
      text += `${idx + 1}. *${nm.player_name}* - ${rupiah(nm.fee)} (${nonMemberNote(nm)})\n`;
      // Pisahkan blok tunggakan lama dari tagihan pertemuan ini
      if (nm.carry_over && !filteredNonMembers[idx + 1]?.carry_over) {
        text += `──────────────────────\n`;
      }
    });

    text += `──────────────────────\n`;
    text += `*TOTAL: ${rupiah(totalNonMember)}* (${paidNonMembers.length} orang)\n`;
    if (unpaidNonMembers.length > 0) {
      text += `*BELUM LUNAS: ${rupiah(unpaidNonMemberTotal)}* (${unpaidNonMembers.length} orang)\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleExportMemberCSV() {
    if (!data) return;
    const headers = ["NO", "LIST MEM", feeLabel, ...sessions.map((s) => `Kas Kok (${dateDmy(s.date)})`)];
    const csvRows: string[][] = [];

    rows.forEach((r, idx) => {
      const lap = r.commitment_paid ? "LUNAS" : "BELUM";
      const sessionCells = sessions.map((s) => (r.attendances[s.id] === "PRESENT" ? "HADIR" : "TIDAK HADIR"));
      csvRows.push([String(idx + 1), r.player_name, lap, ...sessionCells]);
    });

    const totalRow = ["", "TOTAL", String(total_lapangan_paid), ...sessions.map((s) => String(s.total_kas_kok))];
    csvRows.push(totalRow);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekap-member-${periodName.toLowerCase().replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportNonMemberCSV() {
    if (!currentSession) return;
    const headers = ["NO", "LIST NON MEMBER", nonMemberFeeLabel, "NOTE"];
    const csvRows: string[][] = [];

    filteredNonMembers.forEach((nm, idx) => {
      csvRows.push([String(idx + 1), nm.player_name, String(nm.fee), nonMemberNote(nm)]);
    });

    if (unpaidNonMembers.length > 0) {
      csvRows.push(["", "BELUM LUNAS", String(unpaidNonMemberTotal), `${unpaidNonMembers.length} orang`]);
    }
    csvRows.push(["", "TOTAL", String(totalNonMember), ""]);

    const csvContent = [headers, ...csvRows]
      .map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `rekap-non-member-${dateDmy(currentSession.date).replace(/\//g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <section aria-label={t("periods.matrixEmptyTitle")} className="mt-5 rounded-xl border border-line bg-white shadow-card overflow-hidden">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 bg-gradient-to-r from-court/75 via-court/40 to-white">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">
              {activeTab === "member" ? t("periods.matrixMemberTitle") : t("periods.matrixNonMemberTitle")}
            </h2>
            <span className="text-xs font-medium text-ink-soft">
              · {activeTab === "member"
                ? `${t("periods.matrixMemberCountSub", { count: rows.length })} · ${t("periods.sessionsCount", { count: sessions.length })}`
                : carryOverNonMembers.length > 0
                  ? t("periods.matrixNonMemberCarryOverSub", { count: sessionNonMembers.length, carry: carryOverNonMembers.length })
                  : t("periods.matrixNonMemberCountSub", { count: sessionNonMembers.length })}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">
            {activeTab === "member"
              ? t("periods.matrixMemberDesc")
              : t("periods.matrixNonMemberDesc")}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/90 border border-line p-1 rounded-lg shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("member")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "member"
                ? "bg-gradient-to-r from-pine to-pine-deep text-paper shadow-2xs"
                : "text-ink-soft hover:text-ink hover:bg-court/40"
            }`}
          >
            {t("periods.matrixTabMember", { count: rows.length })}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("non_member")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === "non_member"
                ? "bg-gradient-to-r from-pine to-pine-deep text-paper shadow-2xs"
                : "text-ink-soft hover:text-ink hover:bg-court/40"
            }`}
          >
            {t("periods.matrixTabNonMember", { count: (data.non_members ?? []).length })}
          </button>
        </div>
      </div>

      {activeTab === "non_member" ? (
        <div>
          {/* Non-Member Session Filter & Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-court/40 via-court/20 to-white border-b border-line">
            <div className="flex items-center gap-2">
              <label htmlFor="filter-sesi-nonmember" className="text-xs font-semibold text-ink whitespace-nowrap">
                {t("periods.matrixPickSession")}
              </label>
              <select
                id="filter-sesi-nonmember"
                className="text-xs bg-white border border-line rounded-md px-2.5 py-1.5 font-medium text-ink focus:border-pine focus:outline-hidden"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessions.map((s, idx) => {
                  const count = (data.non_members ?? []).filter((nm) => nm.session_id === s.id).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {t("periods.matrixSessionOption", { idx: idx + 1, date: dateDmy(s.date) })} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Btn
                variant="plain"
                onClick={handleCopyNonMemberImage}
                disabled={copyingImage || filteredNonMembers.length === 0}
                className="border-line/80 bg-gradient-to-r from-lime-50 to-white text-lime-950 hover:from-lime-100 hover:to-lime-50 font-semibold shadow-2xs"
                title={t("periods.matrixCopyImg")}
              >
                <span className="inline-flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                    <path d="M21 15l-5-5L5 21" strokeWidth="2" />
                  </svg>
                  {copiedImage ? t("periods.matrixCopiedImg") : copyingImage ? t("periods.matrixCopyingImg") : t("periods.matrixCopyImg")}
                </span>
              </Btn>
              <Btn
                variant="plain"
                onClick={handleCopyNonMemberWhatsApp}
                disabled={filteredNonMembers.length === 0}
                title={t("periods.matrixCopyWa")}
              >
                {copied ? t("periods.matrixCopiedWa") : t("periods.matrixCopyWa")}
              </Btn>
              <Btn
                variant="plain"
                onClick={handleExportNonMemberCSV}
                disabled={filteredNonMembers.length === 0}
                title={t("periods.matrixDownloadCsv")}
              >
                {t("periods.matrixDownloadCsv")}
              </Btn>
            </div>
          </div>

          {/* Non-Member Table */}
          {filteredNonMembers.length === 0 ? (
            <div className="p-6">
              <Empty text={t("periods.matrixEmptySessionNonMember")} />
            </div>
          ) : (
            <div className="overflow-x-auto max-w-2xl mx-auto sm:mx-0 p-3">
              <table className="w-full text-xs border-collapse border border-neutral-400 shadow-xs">
                <thead className="bg-[#1e3a8a] text-white tracking-wider uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 border border-white/40 w-12 text-center">NO</th>
                    <th className="py-2.5 px-3 border border-white/40 text-left min-w-[160px]">LIST NON MEMBER</th>
                    <th className="py-2.5 px-3 border border-white/40 text-center min-w-[150px] bg-blue-900/80">
                      {nonMemberFeeLabel}
                    </th>
                    <th className="py-2.5 px-3 border border-white/40 text-left min-w-[120px]">NOTE</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredNonMembers.map((nm, idx) => (
                    <tr
                      key={`${nm.session_id}-${nm.player_id}`}
                      className={
                        nm.carry_over
                          ? "bg-red-100 hover:bg-red-200"
                          : idx % 2 === 0
                          ? "bg-white hover:bg-neutral-50"
                          : "bg-neutral-50/70 hover:bg-neutral-100"
                      }
                    >
                      <td className="py-2 px-3 border border-neutral-400 font-medium text-neutral-600 text-center">{idx + 1}</td>
                      <td className="py-2 px-3 border border-neutral-400 text-left font-semibold text-neutral-900">{nm.player_name}</td>
                      <td
                        className={`py-2 px-3 border border-neutral-400 text-black font-bold text-center ${
                          nm.paid ? "bg-[#00e600]" : "bg-[#ef4444]"
                        }`}
                      >
                        {nm.fee}
                      </td>
                      <td
                        className={`py-2 px-3 border border-neutral-400 text-left text-[11px] ${
                          nm.paid ? "text-neutral-600" : "font-semibold text-red-700"
                        }`}
                      >
                        {nonMemberNote(nm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="font-bold border-t-2 border-neutral-900 bg-yellow-300 text-neutral-900 text-sm">
                  {unpaidNonMembers.length > 0 && (
                    <tr className="bg-red-50 text-red-700">
                      <td className="py-2.5 px-3 border border-neutral-400"></td>
                      <td className="py-2.5 px-3 border border-neutral-400 text-left font-black tracking-wider">
                        BELUM LUNAS
                      </td>
                      <td className="py-2.5 px-3 border border-neutral-400 font-black text-center whitespace-nowrap">
                        {rupiah(unpaidNonMemberTotal)}
                      </td>
                      <td className="py-2.5 px-3 border border-neutral-400 text-center">{unpaidNonMembers.length} org</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2.5 px-3 border border-neutral-400"></td>
                    <td className="py-2.5 px-3 border border-neutral-400 text-left font-black tracking-wider">TOTAL</td>
                    <td className="py-2.5 px-3 border border-neutral-400 font-black text-center whitespace-nowrap">
                      {rupiah(totalNonMember)}
                    </td>
                    <td className="py-2.5 px-3 border border-neutral-400 text-center">{paidNonMembers.length} org</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Member Table */
        <div>
          <div className="flex justify-end gap-2 p-3.5 bg-gradient-to-r from-court/40 via-court/20 to-white border-b border-line">
            <Btn
              variant="plain"
              onClick={handleCopyMemberImage}
              disabled={copyingImage}
              className="border-line/80 bg-gradient-to-r from-lime-50 to-white text-lime-950 hover:from-lime-100 hover:to-lime-50 font-semibold shadow-2xs"
              title={t("periods.matrixCopyImg")}
            >
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="2" />
                  <path d="M21 15l-5-5L5 21" strokeWidth="2" />
                </svg>
                {copiedImage ? t("periods.matrixCopiedImg") : copyingImage ? t("periods.matrixCopyingImg") : t("periods.matrixCopyImg")}
              </span>
            </Btn>
            <Btn variant="plain" onClick={handleCopyMemberWhatsApp} title={t("periods.matrixCopyWa")}>
              {copied ? t("periods.matrixCopiedWa") : t("periods.matrixCopyWa")}
            </Btn>
            <Btn variant="plain" onClick={handleExportMemberCSV} title={t("periods.matrixDownloadCsv")}>
              {t("periods.matrixDownloadCsv")}
            </Btn>
          </div>

          <div className="overflow-x-auto p-3">
            <table className="w-full text-xs text-center border-collapse border border-neutral-400 shadow-xs">
              <thead className="bg-[#1e3a8a] text-white tracking-wider uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3 border border-white/40 w-12 text-center">NO</th>
                  <th className="py-2.5 px-3 border border-white/40 text-left min-w-[130px]">LIST MEM</th>
                  <th className="py-2.5 px-3 border border-white/40 min-w-[130px] whitespace-nowrap bg-blue-900/80">
                    {feeLabel}
                  </th>
                  {sessions.map((s) => (
                    <th key={s.id} className="py-2.5 px-3 border border-white/40 min-w-[140px] whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Kas Kok ({dateDmy(s.date)})</span>
                        <OpenLink to={`/mabar/${s.id}`} />
                      </div>
                    </th>
                  ))}
                  {sessions.length === 0 && (
                    <th className="py-2.5 px-3 border border-white/40 text-xs italic font-normal text-blue-200">
                      {t("periods.matrixNoSessions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((r, idx) => (
                  <tr key={r.player_id} className={idx % 2 === 0 ? "bg-white hover:bg-neutral-50" : "bg-neutral-50/70 hover:bg-neutral-100"}>
                    <td className="py-2 px-3 border border-neutral-400 font-medium text-neutral-600">{idx + 1}</td>
                    <td className="py-2 px-3 border border-neutral-400 text-left font-semibold text-neutral-900">
                      <div className="flex items-center justify-between gap-1.5">
                        <span>{r.player_name}</span>
                        {(r.fastest_count ?? 0) > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 shadow-2xs"
                            title={t("periods.matrixFastestBadge", { count: r.fastest_count ?? 0 })}
                          >
                            {t("periods.matrixFastestBadge", { count: r.fastest_count ?? 0 })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 border border-neutral-400">
                      {r.commitment_paid ? (
                        <span className="inline-block w-full py-1 font-bold text-xs bg-lime text-white rounded shadow-sm">
                          LUNAS
                        </span>
                      ) : (
                        <span className="inline-block w-full py-1 font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300 rounded">
                          {r.commitment_amount_paid > 0
                            ? t("periods.matrixRemainingFee", {
                                amount: rupiah(Math.max(0, (r.commitment_fee || commitment_fee) - r.commitment_amount_paid)),
                              })
                            : t("periods.matrixUnpaidBadge")}
                        </span>
                      )}
                    </td>
                    {sessions.map((s) => {
                      const status = r.attendances[s.id];
                      const isPresent = status === "PRESENT";
                      return isPresent ? (
                        <td
                          key={s.id}
                          className="py-2 px-3 border border-neutral-400 bg-lime text-white font-bold text-sm"
                          title={`${r.player_name}: Hadir`}
                        >
                          ✓
                        </td>
                      ) : (
                        <td
                          key={s.id}
                          className="py-2 px-3 border border-neutral-400 bg-red-600 text-white font-bold text-[11px] whitespace-nowrap"
                          title={`${r.player_name}: ${status ? status : "Tidak Hadir"}`}
                        >
                          TIDAK HADIR
                        </td>
                      );
                    })}
                    {sessions.length === 0 && (
                      <td className="py-2 px-3 border border-neutral-400 text-neutral-400 italic">
                        —
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-bold border-t-2 border-neutral-900 bg-yellow-300 text-neutral-900">
                <tr className="text-sm">
                  <td className="py-2.5 px-3 border border-neutral-400"></td>
                  <td className="py-2.5 px-3 border border-neutral-400 text-left font-black tracking-wider">TOTAL</td>
                  <td className="py-2.5 px-3 border border-neutral-400 font-black whitespace-nowrap">
                    {rupiah(total_lapangan_paid)}
                  </td>
                  {sessions.map((s) => (
                    <td key={s.id} className="py-2.5 px-3 border border-neutral-400 font-black whitespace-nowrap">
                      {rupiah(s.total_kas_kok)}
                    </td>
                  ))}
                  {sessions.length === 0 && (
                    <td className="py-2.5 px-3 border border-neutral-400 text-neutral-600">
                      —
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

