import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import {
  useMabarRegistrationInfoQuery,
  useRegisterMabarMutation,
  useCancelMabarMutation,
  useMabarListQuery,
} from "../store/services";
import type { MabarSession } from "../types";
import { toApiError } from "../store/baseApi";
import { buildMabarShareListTemplate, formatGmt7DateTime, statusClass, statusLabel, calculateCountdown } from "../format";
import { LanguageSwitcher } from "../components/atoms/LanguageSwitcher/LanguageSwitcher";

// ─── Semantic SVG Icons ───────────────────────────────────────────────────────

function IconCalendar({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

function IconLocation({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IconAlert({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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

function IconCopy({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

// ─── Status Badge Component ───────────────────────────────────────────────────

function WindowStatusBadge({
  status,
  hasMemberCutoff,
}: {
  status: string;
  hasMemberCutoff?: boolean;
}) {
  const { lang } = useI18n();
  const isId = lang === "id";

  switch (status) {
    case "UPCOMING":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {isId ? "Pendaftaran Belum Dibuka" : "Registration Upcoming"}
        </span>
      );
    case "MEMBER_ONLY":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {isId ? "Terbuka (Member & Non-Member)" : "Open (Member & Non-Member)"}
        </span>
      );
    case "OPEN":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          {hasMemberCutoff
            ? (isId ? "Terbuka (Non-Member)" : "Open (Non-Member Only)")
            : (isId ? "Pendaftaran Terbuka" : "Registration Open")}
        </span>
      );
    case "CLOSED":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          <span className="w-2 h-2 rounded-full bg-gray-500" />
          {isId ? "Pendaftaran Ditutup" : "Registration Closed"}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
          {isId ? "Belum Diatur" : "Not Configured"}
        </span>
      );
  }
}

// ─── Main Page Entry ──────────────────────────────────────────────────────────

export function OpenPlayPage() {
  const { id } = useParams<{ id?: string }>();

  if (id) {
    return <OpenPlayDetail sessionId={id} />;
  }

  return <OpenPlayList />;
}

// ─── Searchable Player Popover Picker ─────────────────────────────────────────

function PlayerPopPicker({
  value,
  onChange,
  players,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  isId,
}: {
  value: string;
  onChange: (id: string) => void;
  players: Array<{ id: string; name: string }>;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isId: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  const selected = players.find((m) => m.id === value);

  // Case-insensitive substring search (%LIKE%)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((m) => m.name.toLowerCase().includes(q));
  }, [players, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popRef.current && !popRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={popRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            setQuery("");
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all ${
          open
            ? "border-pine ring-2 ring-pine/20"
            : "border-line hover:border-line-deep"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-bg" : "cursor-pointer"}`}
      >
        <span className={`truncate font-medium ${selected ? "text-ink font-semibold" : "text-ink-soft"}`}>
          {selected ? selected.name : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="text-ink-soft hover:text-red-600 p-0.5 rounded text-xs leading-none"
              title={isId ? "Hapus pilihan" : "Clear selection"}
            >
              ✕
            </span>
          )}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-40 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          <div className="p-2 border-b border-line bg-bg/50">
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder || (isId ? "Cari nama pemain..." : "Search player name...")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink-soft focus:border-pine focus:outline-hidden"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-line/40">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-ink-soft">
                {emptyText || (isId ? "Tidak ada nama pemain yang cocok." : "No matching player name.")}
              </p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs rounded-lg transition-colors ${
                    m.id === value
                      ? "bg-pine/10 font-bold text-pine"
                      : "text-ink hover:bg-bg"
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  {m.id === value && <span className="text-pine font-bold ml-2">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Detail Session Registration View ─────────────────────────────────────────

function OpenPlayDetail({ sessionId }: { sessionId: string }) {
  const { lang } = useI18n();
  const isId = lang === "id";

  const { data: regInfo, isLoading, isError, refetch } = useMabarRegistrationInfoQuery(sessionId, {
    pollingInterval: 10000,
  });

  const [registerMabar, { isLoading: isRegistering }] = useRegisterMabarMutation();
  const [cancelMabar, { isLoading: isCancelling }] = useCancelMabarMutation();

  // Form states — ALL HOOKS BEFORE EARLY RETURNS
  const [activeTab, setActiveTab] = useState<"register" | "cancel">("register");
  const [participantType, setParticipantType] = useState<"MEMBER" | "NON_MEMBER">("MEMBER");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedNonMemberId, setSelectedNonMemberId] = useState("");
  const [cancelPlayerId, setCancelPlayerId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [rosterFilter, setRosterFilter] = useState<"ALL" | "MEMBER" | "NON_MEMBER" | "WAITING">("ALL");
  const [templateLang, setTemplateLang] = useState<"id" | "en">(lang === "en" ? "en" : "id");
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Countdown timers — force re-render every second
  const [countdownTick, setCountdownTick] = useState(0);

  useEffect(() => {
    setTemplateLang(lang === "en" ? "en" : "id");
  }, [lang]);

  // Tick every second to trigger countdown recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(tick => tick + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Calculate countdowns at render time
  const memberCountdown = useMemo(
    () => calculateCountdown(regInfo?.session?.member_registration_closes_at),
    [regInfo?.session?.member_registration_closes_at, countdownTick]
  );

  const overallCountdown = useMemo(
    () => calculateCountdown(regInfo?.session?.registration_closes_at),
    [regInfo?.session?.registration_closes_at, countdownTick]
  );

  const isMemberWindowClosedByDeadline = Boolean(
    regInfo &&
      regInfo.session.status === "OPEN" &&
      regInfo.session.member_registration_closes_at &&
      regInfo.session.member_registration_open === false,
  );

  // Switch off the Member tab automatically if member registration deadline has passed
  useEffect(() => {
    if (isMemberWindowClosedByDeadline && participantType === "MEMBER") {
      setParticipantType("NON_MEMBER");
    }
  }, [isMemberWindowClosedByDeadline, participantType]);

  // Extract from regInfo early (before early returns and before useMemo)
  const pMembersData = regInfo?.period_members ?? [];
  const nonMemberPlayersData = regInfo?.non_member_players ?? [];
  const partsData = regInfo?.participants ?? {
    members: [],
    non_members: [],
    waiting_list: [],
  };

  const shareTemplateText = useMemo(
    () =>
      buildMabarShareListTemplate({
        date: regInfo?.session.date,
        participants: [...(partsData.members ?? []), ...(partsData.non_members ?? [])],
        waitingList: partsData.waiting_list ?? [],
        lang: templateLang,
      }),
    [regInfo?.session.date, partsData.members, partsData.non_members, partsData.waiting_list, templateLang],
  );

  // Filtered members for dropdown (commitment_fee > 0, not registered)
  const eligibleMembers = useMemo(() => {
    return (pMembersData || [])
      .filter((pm: any) => pm.commitment_fee > 0 && !pm.is_registered)
      .map((pm: any) => ({ id: pm.id, name: pm.name }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [pMembersData]);

  // Existing non-member players (not period commitment-fee members, not already registered)
  const eligibleNonMembers = useMemo(() => {
    return (nonMemberPlayersData || [])
      .filter((nm) => !nm.is_registered)
      .map((nm) => ({ id: nm.id, name: nm.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [nonMemberPlayersData]);

  // Memoized roster items — before early returns
  const rosterItems = useMemo(() => {
    const list: Array<{
      id: string;
      player_id: string;
      name: string;
      isMember: boolean;
      status: string;
      time: string;
      isWaiting: boolean;
      waitingPos?: number;
    }> = [];

    regInfo?.participants?.members?.forEach((m: any) => {
      list.push({
        id: m.attendance_id,
        player_id: m.player_id,
        name: m.player_name,
        isMember: true,
        status: m.status,
        time: m.listed_at,
        isWaiting: false,
      });
    });

    regInfo?.participants?.non_members?.forEach((nm: any) => {
      list.push({
        id: nm.attendance_id,
        player_id: nm.player_id,
        name: nm.player_name,
        isMember: false,
        status: nm.status,
        time: nm.listed_at,
        isWaiting: false,
      });
    });

    regInfo?.participants?.waiting_list?.forEach((w: any, wIdx: number) => {
      list.push({
        id: w.attendance_id,
        player_id: w.player_id,
        name: w.player_name,
        isMember: w.is_member,
        status: "WAITING",
        time: w.listed_at,
        isWaiting: true,
        waitingPos: wIdx + 1,
      });
    });

    if (rosterFilter === "MEMBER") return list.filter((i) => i.isMember && !i.isWaiting);
    if (rosterFilter === "NON_MEMBER") return list.filter((i) => !i.isMember && !i.isWaiting);
    if (rosterFilter === "WAITING") return list.filter((i) => i.isWaiting);
    return list;
  }, [regInfo?.participants, rosterFilter]);

  // NOW early returns are safe
  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-pine border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-ink-soft">
            {isId ? "Memuat informasi open play..." : "Loading open play details..."}
          </p>
        </div>
      </div>
    );
  }

  if (isError || !regInfo) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-line p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto">
            <IconAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-ink">
            {isId ? "Sesi Tidak Ditemukan" : "Session Not Found"}
          </h2>
          <p className="text-sm text-ink-soft">
            {isId
              ? "Sesi open play tidak ditemukan atau link yang Anda tuju sudah tidak valid."
              : "The open play session could not be found or the link has expired."}
          </p>
          <Link
            to="/open-play"
            className="inline-flex items-center gap-2 px-4 py-2 bg-pine text-white text-sm font-medium rounded-lg hover:bg-pine-deep transition-colors"
          >
            <IconArrowLeft className="w-4 h-4" />
            {isId ? "Lihat Jadwal Tersedia" : "View Available Sessions"}
          </Link>
        </div>
      </div>
    );
  }

  // Now regInfo is guaranteed to exist
  const sess = regInfo.session;
  const quot = regInfo.quotas;

  const isClosed = sess.status === "CLOSED" || sess.status === "NOT_CONFIGURED";
  const isUpcoming = sess.status === "UPCOMING";
  const isMemberClosed =
    isClosed ||
    isUpcoming ||
    (sess.member_registration_open !== undefined
      ? !sess.member_registration_open
      : Boolean(sess.status === "OPEN" && sess.member_registration_closes_at));
  const isNonMemberClosed =
    isClosed ||
    isUpcoming ||
    (sess.non_member_registration_open !== undefined ? !sess.non_member_registration_open : false);

  const effectiveMaxNonMembers = quot.effective_max_non_members ?? quot.max_non_members;
  const bonusNonMemberSlots = quot.bonus_non_member_slots ?? 0;

  const totalActive = quot.member_count + quot.non_member_count;
  const maxActive = quot.max_members + quot.max_non_members;
  const isSelectedSlotFull =
    participantType === "MEMBER"
      ? quot.available_member_slots <= 0
      : quot.available_non_member_slots <= 0;
  const isWaitingAvailable = quot.waiting_count < quot.max_waiting_list;

  const allActiveParticipants = [
    ...(partsData.members?.map((m: any) => ({ ...m, type: "MEMBER" })) ?? []),
    ...(partsData.non_members?.map((nm: any) => ({ ...nm, type: "NON_MEMBER" })) ?? []),
    ...(partsData.waiting_list?.map((w: any) => ({ ...w, type: "WAITING" })) ?? []),
  ];

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    try {
      if (participantType === "MEMBER") {
        if (!selectedMemberId) {
          setMessage({
            type: "error",
            text: isId ? "Silakan pilih nama member terlebih dahulu." : "Please select your member name.",
          });
          return;
        }
        const res = await registerMabar({
          sessionId,
          participant_type: "MEMBER",
          player_id: selectedMemberId,
        }).unwrap();

        setMessage({
          type: "success",
          text: res.message || (isId ? "Pendaftaran berhasil!" : "Registration successful!"),
        });
        setSelectedMemberId("");
      } else {
        if (!selectedNonMemberId) {
          setMessage({
            type: "error",
            text: isId ? "Silakan pilih nama pemain terlebih dahulu." : "Please select your player name.",
          });
          return;
        }
        const res = await registerMabar({
          sessionId,
          participant_type: "NON_MEMBER",
          player_id: selectedNonMemberId,
        }).unwrap();

        setMessage({
          type: "success",
          text: res.message || (isId ? "Pendaftaran berhasil!" : "Registration successful!"),
        });
        setSelectedNonMemberId("");
      }
      refetch();
    } catch (err) {
      const apiErr = toApiError(err);
      setMessage({ type: "error", text: apiErr.message });
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!cancelPlayerId) {
      setMessage({
        type: "error",
        text: isId ? "Pilih nama pemain yang ingin dibatalkan." : "Select the player to cancel.",
      });
      return;
    }
    if (!cancelReason.trim()) {
      setMessage({
        type: "error",
        text: isId ? "Mohon cantumkan alasan pembatalan." : "Please provide a reason for cancellation.",
      });
      return;
    }

    try {
      const res = await cancelMabar({
        sessionId,
        player_id: cancelPlayerId,
        reason: cancelReason.trim(),
      }).unwrap();

      setMessage({
        type: "success",
        text: res.message || (isId ? "Permintaan pembatalan berhasil diajukan." : "Cancellation submitted."),
      });
      setCancelPlayerId("");
      setCancelReason("");
      refetch();
    } catch (err) {
      const apiErr = toApiError(err);
      setMessage({ type: "error", text: apiErr.message });
    }
  }


  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      {/* Top Navbar */}
      <header className="border-b border-line bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/open-play"
              className="text-xs font-semibold text-ink-soft hover:text-ink flex items-center gap-1 transition-colors"
            >
              <IconArrowLeft className="w-3.5 h-3.5" />
              {isId ? "Semua Sesi" : "All Sessions"}
            </Link>
            <span className="text-line">|</span>
            <span className="text-xs font-bold uppercase tracking-wider text-pine">PB Kecebong</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Session Banner Card */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-pine block">
                {sess.period_name || (isId ? "Sesi Open Play" : "Open Play Session")}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-ink tracking-tight mt-0.5">
                {sess.venue_name || "GOR Badminton"}
              </h1>
            </div>
            <div>
              <WindowStatusBadge
                status={sess.status}
                hasMemberCutoff={Boolean(sess.member_registration_closes_at)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-ink-soft">
            <div className="flex items-center gap-2">
              <IconCalendar className="w-4 h-4 text-pine shrink-0" />
              <span>{formatGmt7DateTime(sess.date, lang).split(",")[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock className="w-4 h-4 text-pine shrink-0" />
              <span>
                {sess.start_time?.slice(0, 5) || "—"} - {sess.end_time?.slice(0, 5) || "—"} WIB (GMT+7)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IconLocation className="w-4 h-4 text-pine shrink-0" />
              <span className="truncate">{sess.venue_description || "Court / Lapangan"}</span>
            </div>
          </div>

          {/* Registration Windows Timeline (GMT+7) */}
          <div className="bg-bg rounded-xl p-4 border border-line/60 text-xs space-y-2">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <IconClock className="w-3.5 h-3.5 text-pine" />
              <span>{isId ? "Jadwal Pendaftaran (Waktu Indonesia Barat / GMT+7):" : "Registration Schedule (GMT+7):"}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-ink-soft">
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-faint block">
                  {isId ? "Buka Pendaftaran" : "Opens At"}
                </span>
                <span className="font-medium text-ink">
                  {formatGmt7DateTime(sess.registration_opens_at, lang)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-faint block">
                  {isId ? "Batas Khusus Member" : "Member Cutoff"}
                </span>
                <span className="font-medium text-ink">
                  {formatGmt7DateTime(sess.member_registration_closes_at, lang)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-ink-faint block">
                  {isId ? "Tutup Pendaftaran" : "Closes At"}
                </span>
                <span className="font-medium text-ink">
                  {formatGmt7DateTime(sess.registration_closes_at, lang)}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown Timers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Member Registration Countdown */}
            {sess.member_registration_closes_at && !memberCountdown.isExpired && (
              <div className={`rounded-xl p-4 border ${memberCountdown.totalSeconds < 3600 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50"}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-2">
                  {isId ? "⏱️ Batas Member Tersisa" : "⏱️ Member Cutoff In"}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="flex gap-1 text-sm font-black">
                    {memberCountdown.days > 0 && (
                      <>
                        <span className="text-ink">{memberCountdown.days}d</span>
                        <span className="text-ink-soft">·</span>
                      </>
                    )}
                    <span className={memberCountdown.totalSeconds < 3600 ? "text-red-700" : "text-amber-900"}>
                      {String(memberCountdown.hours).padStart(2, "0")}:{String(memberCountdown.minutes).padStart(2, "0")}:{String(memberCountdown.seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft mt-1">
                  {isId
                    ? memberCountdown.totalSeconds < 3600
                      ? "Segera! Pendaftaran member akan ditutup!"
                      : "Jangan sampai terlewat untuk daftar sebagai member"
                    : memberCountdown.totalSeconds < 3600
                      ? "Hurry! Member registration closing soon!"
                      : "Don't miss out on member registration"}
                </p>
              </div>
            )}

            {/* Overall Registration Countdown */}
            {sess.registration_closes_at && !overallCountdown.isExpired && (
              <div className={`rounded-xl p-4 border ${overallCountdown.totalSeconds < 3600 ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50"}`}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint mb-2">
                  {isId ? "⏱️ Tutup Pendaftaran Tersisa" : "⏱️ Registration Closes In"}
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="flex gap-1 text-sm font-black">
                    {overallCountdown.days > 0 && (
                      <>
                        <span className="text-ink">{overallCountdown.days}d</span>
                        <span className="text-ink-soft">·</span>
                      </>
                    )}
                    <span className={overallCountdown.totalSeconds < 3600 ? "text-red-700" : "text-emerald-700"}>
                      {String(overallCountdown.hours).padStart(2, "0")}:{String(overallCountdown.minutes).padStart(2, "0")}:{String(overallCountdown.seconds).padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft mt-1">
                  {isId
                    ? overallCountdown.totalSeconds < 3600
                      ? "Waktu pendaftaran akan segera ditutup untuk semua!"
                      : "Kesempatan terakhir untuk mendaftar"
                    : overallCountdown.totalSeconds < 3600
                      ? "Registration closing very soon for all!"
                      : "Last chance to register"}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Admin Note / T&C (read-only for participants) */}
        {sess.admin_note && (
          <section aria-label={isId ? "Catatan Admin" : "Admin Note"} className="bg-amber-50/70 rounded-2xl border border-amber-200 p-4 sm:p-5 space-y-1.5">
            <h2 className="text-sm font-bold text-ink">{isId ? "Catatan Admin / S&K" : "Admin Note / T&C"}</h2>
            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{sess.admin_note}</p>
          </section>
        )}

        {/* Quota Counters */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
              {isId ? "Total Terisi" : "Total Active"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-ink">{totalActive}</span>
              <span className="text-xs text-ink-soft">/ {maxActive}</span>
            </div>
            <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-pine h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalActive / Math.max(1, maxActive)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
              {isId ? "Slot Member" : "Member Slots"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-indigo-700">{quot.member_count}</span>
              <span className="text-xs text-ink-soft">/ {quot.max_members}</span>
            </div>
            <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (quot.member_count / Math.max(1, quot.max_members)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
              {isId ? "Slot Non-Member" : "Non-Member"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-emerald-700">{quot.non_member_count}</span>
              <span className="text-xs text-ink-soft">/ {effectiveMaxNonMembers}</span>
              {bonusNonMemberSlots > 0 && (
                <span className="text-[10px] font-semibold text-emerald-700 ml-0.5">
                  ({quot.max_non_members}+{bonusNonMemberSlots})
                </span>
              )}
            </div>
            <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (quot.non_member_count / Math.max(1, effectiveMaxNonMembers)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-line p-3.5 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-ink-faint block">
              {isId ? "Waiting List" : "Waiting List"}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-amber-700">{quot.waiting_count}</span>
              <span className="text-xs text-ink-soft">/ {quot.max_waiting_list}</span>
            </div>
            <div className="mt-2 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (quot.waiting_count / Math.max(1, quot.max_waiting_list)) * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {/* Action Panel: Register vs Cancel */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex border-b border-line">
            <button
              type="button"
              onClick={() => {
                setActiveTab("register");
                setMessage(null);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "register"
                  ? "border-pine text-pine"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {isId ? "1. Formulir Pendaftaran" : "1. Registration Form"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("cancel");
                setMessage(null);
              }}
              className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors ${
                activeTab === "cancel"
                  ? "border-pine text-pine"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {isId ? "2. Ajukan Pembatalan" : "2. Cancellation Request"}
            </button>
          </div>

          {message && (
            <div
              className={`p-3.5 rounded-xl border text-sm flex items-start gap-2 ${
                message.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-red-50 border-red-300 text-red-900"
              }`}
            >
              {message.type === "success" ? (
                <IconCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <IconAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* TAB 1: REGISTRATION */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Registration Window Checks */}
              {isUpcoming && (
                <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-xs text-amber-900 space-y-1">
                  <p className="font-bold">{isId ? "Pendaftaran Belum Dibuka" : "Registration Not Started"}</p>
                  <p>
                    {isId
                      ? `Pendaftaran akan dibuka secara resmi pada ${formatGmt7DateTime(sess.registration_opens_at, lang)}.`
                      : `Registration opens officially at ${formatGmt7DateTime(sess.registration_opens_at, lang)}.`}
                  </p>
                </div>
              )}

              {isClosed && (
                <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 text-xs text-gray-800 space-y-1">
                  <p className="font-bold">{isId ? "Pendaftaran Sudah Ditutup" : "Registration Closed"}</p>
                  <p>
                    {isId
                      ? `Batas waktu pendaftaran telah berakhir pada ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`
                      : `Registration closed at ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`}
                  </p>
                </div>
              )}

              {/* Participant Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint mb-2">
                  {isId ? "Daftar Sebagai:" : "Register As:"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setParticipantType("MEMBER");
                      setMessage(null);
                    }}
                    disabled={isMemberClosed}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold text-left transition-all ${
                      participantType === "MEMBER"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/20"
                        : "border-line bg-white text-ink-soft hover:bg-bg"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{isId ? "Member Periode" : "Period Member"}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-semibold">
                        {quot.member_count}/{quot.max_members}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-ink-soft mt-1">
                      {!isClosed && !isUpcoming && isMemberClosed
                        ? isId ? "Batas waktu member berakhir" : "Member deadline ended"
                        : isId ? `Prioritas ${quot.max_members} slot member` : `Priority ${quot.max_members} member slots`}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setParticipantType("NON_MEMBER");
                      setMessage(null);
                    }}
                    disabled={isNonMemberClosed}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold text-left transition-all ${
                      participantType === "NON_MEMBER"
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20"
                        : "border-line bg-white text-ink-soft hover:bg-bg"
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{isId ? "Non-Member / Tamu" : "Non-Member / Guest"}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                        {quot.non_member_count}/{effectiveMaxNonMembers}
                      </span>
                    </div>
                    <p className="text-xs font-normal text-ink-soft mt-1">
                      {bonusNonMemberSlots > 0
                        ? isId
                          ? `${quot.max_non_members} slot + ${bonusNonMemberSlots} sisa member`
                          : `${quot.max_non_members} slots + ${bonusNonMemberSlots} member leftover`
                        : sess.member_registration_closes_at
                          ? isId
                            ? `${quot.max_non_members} slot (+ sisa member setelah cutoff)`
                            : `${quot.max_non_members} slots (+ member leftover after cutoff)`
                          : isId
                            ? `${quot.max_non_members} slot non-member`
                            : `${quot.max_non_members} non-member slots`}
                    </p>
                  </button>
                </div>
              </div>

              {/* Notice for Member Deadline / Quota Transfer */}
              {!isClosed && !isUpcoming && isMemberClosed && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                  <p className="font-semibold">
                    {isId
                      ? "Batas pendaftaran khusus Member telah berakhir."
                      : "Member registration deadline has ended."}
                  </p>
                  <p className="mt-0.5">
                    {bonusNonMemberSlots > 0
                      ? isId
                        ? `${bonusNonMemberSlots} sisa slot member ditambahkan ke kuota non-member (total ${effectiveMaxNonMembers} slot) hingga ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`
                        : `${bonusNonMemberSlots} remaining member slots have been added to non-member quota (${effectiveMaxNonMembers} total slots) until ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`
                      : isId
                        ? `Pendaftaran non-member tetap dibuka hingga ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`
                        : `Non-member registration remains open until ${formatGmt7DateTime(sess.registration_closes_at, lang)}.`}
                  </p>
                </div>
              )}

              {/* Form Input: Member */}
              {participantType === "MEMBER" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint">
                    {isId ? "Pilih Nama Member Anda:" : "Select Your Member Name:"}
                  </label>
                  {eligibleMembers.length === 0 ? (
                    <div className="p-3 bg-bg border border-line rounded-xl text-xs text-ink-soft">
                      {pMembersData?.length === 0
                        ? (isId ? "Tidak ada member terdaftar di periode ini." : "No period members found.")
                        : (isId ? "Semua member periode sudah terdaftar atau belum bayar komitmen." : "All eligible members have already registered or haven't paid commitment fee.")}
                    </div>
                  ) : (
                    <PlayerPopPicker
                      value={selectedMemberId}
                      onChange={(id) => setSelectedMemberId(id)}
                      players={eligibleMembers}
                      placeholder={isId ? "-- Pilih Nama Member Periode --" : "-- Select Period Member --"}
                      searchPlaceholder={isId ? "Cari nama member..." : "Search member name..."}
                      emptyText={isId ? "Tidak ada nama member yang cocok." : "No matching member name."}
                      disabled={isMemberClosed}
                      isId={isId}
                    />
                  )}
                </div>
              )}

              {/* Form Input: Non-Member */}
              {participantType === "NON_MEMBER" && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint">
                    {isId ? "Pilih Nama Pemain:" : "Select Player Name:"}
                  </label>
                  {eligibleNonMembers.length === 0 ? (
                    <div className="p-3 bg-bg border border-line rounded-xl text-xs text-ink-soft">
                      {isId
                        ? "Belum ada pemain non-member yang tersedia di daftar. Hubungi admin untuk menambahkan nama baru."
                        : "No non-member players available in the list yet. Contact an admin to add a new player."}
                    </div>
                  ) : (
                    <PlayerPopPicker
                      value={selectedNonMemberId}
                      onChange={(id) => setSelectedNonMemberId(id)}
                      players={eligibleNonMembers}
                      placeholder={isId ? "-- Pilih Nama Pemain Non-Member --" : "-- Select Non-Member Player --"}
                      searchPlaceholder={isId ? "Cari nama pemain..." : "Search player name..."}
                      emptyText={isId ? "Tidak ada nama pemain yang cocok." : "No matching player name."}
                      disabled={isNonMemberClosed}
                      isId={isId}
                    />
                  )}
                </div>
              )}

              {/* Status Indicator before submitting */}
              <div className="p-3 bg-bg rounded-xl border border-line/60 text-xs text-ink-soft space-y-1">
                {isSelectedSlotFull ? (
                  isWaitingAvailable ? (
                    <p className="text-amber-800 font-medium">
                      {isId
                        ? `ℹ️ Slot ${participantType === "MEMBER" ? "member" : "non-member"} sudah penuh (${participantType === "MEMBER" ? quot.max_members : effectiveMaxNonMembers} pemain). Pendaftaran Anda akan masuk ke Waiting List (Antrian #${quot.waiting_count + 1}).`
                        : `ℹ️ ${participantType === "MEMBER" ? "Member" : "Non-member"} slots are full (${participantType === "MEMBER" ? quot.max_members : effectiveMaxNonMembers} players). You will be placed in the Waiting List (Queue #${quot.waiting_count + 1}).`}
                    </p>
                  ) : (
                    <p className="text-red-800 font-medium">
                      {isId
                        ? "⚠️ Semua slot utama dan antrian waiting list telah terisi penuh."
                        : "⚠️ Both main slots and waiting list are completely full."}
                    </p>
                  )
                ) : (
                  <p className="text-emerald-800 font-medium">
                    {isId
                      ? "✅ Slot pendaftaran utama tersedia. Anda akan langsung terdaftar sebagai peserta aktif."
                      : "✅ Main slots available. You will be registered directly as an active player."}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isClosed ||
                  isUpcoming ||
                  isRegistering ||
                  (participantType === "MEMBER" && isMemberClosed) ||
                  (participantType === "NON_MEMBER" && isNonMemberClosed) ||
                  (isSelectedSlotFull && !isWaitingAvailable) ||
                  (participantType === "MEMBER" && (!selectedMemberId || eligibleMembers.length === 0)) ||
                  (participantType === "NON_MEMBER" && (!selectedNonMemberId || eligibleNonMembers.length === 0))
                }
                className="w-full py-3 px-4 rounded-xl bg-pine text-white text-sm font-bold hover:bg-pine-deep transition-colors disabled:opacity-50"
              >
                {isRegistering
                  ? isId ? "Memproses pendaftaran..." : "Registering..."
                  : isSelectedSlotFull && isWaitingAvailable
                    ? isId ? `Daftar ke Waiting List (Antrian #${quot.waiting_count + 1})` : `Join Waiting List (Queue #${quot.waiting_count + 1})`
                    : isId ? "Daftar Open Play Sekarang" : "Register for Open Play"}
              </button>
            </form>
          )}

          {/* TAB 2: CANCELLATION */}
          {activeTab === "cancel" && (
            <form onSubmit={handleCancel} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                <p className="font-bold">
                  {isId ? "Aturan Pengajuan Pembatalan:" : "Cancellation Policy:"}
                </p>
                <p>
                  {isId
                    ? "Pengajuan pembatalan slot utama akan ditinjau oleh Admin. Setelah disetujui, pemain di waiting list berikutnya akan otomatis mengisi slot yang Anda tinggalkan."
                    : "Active slot cancellation requests are reviewed by an Admin. Once approved, the next waiting list player is automatically promoted to your slot."}
                </p>
                <p className="text-[11px] text-amber-800">
                  {isId
                    ? "Catatan: Pembatalan bagi pemain yang berada di status Waiting List akan langsung disetujui otomatis."
                    : "Note: Cancellations for players on the Waiting List are approved automatically."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint mb-1">
                  {isId ? "Pilih Nama Pemain Anda:" : "Select Your Player Name:"}
                </label>
                {allActiveParticipants.length === 0 ? (
                  <p className="text-xs text-ink-soft bg-bg p-3 rounded-xl border border-line">
                    {isId ? "Belum ada pemain terdaftar." : "No players registered yet."}
                  </p>
                ) : (
                  <select
                    value={cancelPlayerId}
                    onChange={(e) => setCancelPlayerId(e.target.value)}
                    className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-pine focus:outline-hidden"
                  >
                    <option value="">
                      {isId ? "-- Pilih Nama Pemain Terdaftar --" : "-- Select Registered Player --"}
                    </option>
                    {allActiveParticipants.map((p) => (
                      <option key={p.player_id} value={p.player_id}>
                        {p.player_name} ({p.type === "WAITING" ? "Waiting List" : p.type === "MEMBER" ? "Member" : "Non-Member"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-faint mb-1">
                  {isId ? "Alasan Pembatalan *" : "Cancellation Reason *"}
                </label>
                <textarea
                  rows={3}
                  placeholder={isId ? "Contoh: Ada keperluan keluarga mendadak..." : "e.g. Urgent family matter..."}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm text-ink focus:border-pine focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isCancelling || !cancelPlayerId || !cancelReason.trim()}
                className="w-full py-3 px-4 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling
                  ? isId ? "Mengirim pengajuan..." : "Submitting..."
                  : isId ? "Kirim Pengajuan Pembatalan" : "Submit Cancellation Request"}
              </button>
            </form>
          )}
        </section>

        {/* Live Roster of Participants */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                {isId ? "Daftar Peserta Terdaftar" : "Registered Players Roster"}
              </h2>
              <p className="text-xs text-ink-soft">
                {isId
                  ? `${totalActive} peserta aktif · ${quot.waiting_count} waiting list`
                  : `${totalActive} active players · ${quot.waiting_count} waiting list`}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-bg p-1 rounded-lg border border-line text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRosterFilter("ALL")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  rosterFilter === "ALL" ? "bg-white text-ink shadow-xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                {isId ? "Semua" : "All"} ({allActiveParticipants.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter("MEMBER")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  rosterFilter === "MEMBER" ? "bg-white text-indigo-700 shadow-xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                Member ({quot.member_count})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter("NON_MEMBER")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  rosterFilter === "NON_MEMBER" ? "bg-white text-emerald-700 shadow-xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                Non-Member ({quot.non_member_count})
              </button>
              <button
                type="button"
                onClick={() => setRosterFilter("WAITING")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  rosterFilter === "WAITING" ? "bg-white text-amber-700 shadow-xs" : "text-ink-soft hover:text-ink"
                }`}
              >
                Waiting ({quot.waiting_count})
              </button>
            </div>
          </div>

          {rosterItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-soft">
              {isId ? "Belum ada pemain dalam daftar ini." : "No players in this list yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-b border-line bg-bg/50 text-ink-faint">
                  <tr>
                    <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                    <th className="py-2.5 px-3 font-bold">{isId ? "Nama Pemain" : "Player Name"}</th>
                    <th className="py-2.5 px-3 font-bold">{isId ? "Tipe" : "Type"}</th>
                    <th className="py-2.5 px-3 font-bold">{isId ? "Status" : "Status"}</th>
                    <th className="py-2.5 px-3 font-bold text-right">{isId ? "Waktu Daftar" : "Joined"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {rosterItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-bg/40 transition-colors">
                      <td className="py-2 px-3 text-center font-mono text-ink-soft">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-ink">{item.name}</td>
                      <td className="py-2 px-3">
                        {item.isMember ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                            Member
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            Non-Member
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {item.isWaiting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Waiting List #{item.waitingPos ?? idx + 1}
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${statusClass(item.status)}`}>
                            {statusLabel(item.status, lang)}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-ink-soft font-mono text-[11px]">
                        {formatGmt7DateTime(item.time, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Shareable WhatsApp / Text List Template */}
        <section className="bg-white rounded-2xl border border-line p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                {isId ? "Template Salin Daftar Peserta (WhatsApp)" : "Shareable Participant List Template"}
              </h2>
              <p className="text-xs text-ink-soft">
                {isId
                  ? "Otomatis mengikuti tanggal sesi & peserta terdaftar. Salin teks di bawah untuk dikirim ke grup WhatsApp."
                  : "Automatically updates with session date & joined participants. Copy from the text area to share on WhatsApp or other platforms."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-line bg-bg p-0.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTemplateLang("id")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    templateLang === "id" ? "bg-white text-ink shadow-xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateLang("en")}
                  className={`px-2 py-1 rounded-md transition-colors ${
                    templateLang === "en" ? "bg-white text-ink shadow-xs" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  EN
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareTemplateText);
                  } catch {
                    if (templateTextareaRef.current) {
                      templateTextareaRef.current.select();
                      document.execCommand("copy");
                    }
                  }
                  setCopiedTemplate(true);
                  setTimeout(() => setCopiedTemplate(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:bg-bg transition-colors"
              >
                {copiedTemplate ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{isId ? "Tersalin!" : "Copied!"}</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5 text-ink-soft" />
                    <span>{isId ? "Salin Teks" : "Copy Text"}</span>
                  </>
                )}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareTemplateText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <span>{isId ? "Kirim ke WhatsApp" : "Send via WhatsApp"}</span>
              </a>
            </div>
          </div>

          <textarea
            ref={templateTextareaRef}
            readOnly
            aria-label={isId ? "Template daftar peserta mabar" : "Mabar participant list template"}
            rows={Math.max(8, shareTemplateText.split("\n").length + 1)}
            value={shareTemplateText}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-xl border border-line bg-bg/60 p-3.5 font-mono text-xs leading-relaxed text-ink focus:border-pine focus:outline-hidden resize-y"
          />
        </section>
      </main>
    </div>
  );
}

// ─── Session List View (When visiting /open-play without ID) ──────────────────

function OpenPlayList() {
  const { lang } = useI18n();
  const isId = lang === "id";

  const { data: sessions, isLoading, isError } = useMabarListQuery("");

  // Filter sessions that are OPEN type or recent
  const openSessions = sessions?.filter((s) => s.type === "OPEN" || s.status === "OPEN") ?? sessions ?? [];

  return (
    <div className="min-h-screen bg-bg text-ink pb-16">
      <header className="border-b border-line bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-pine">PB Kecebong</span>
            <span className="text-line">/</span>
            <span className="text-xs font-bold text-ink">{isId ? "Jadwal Open Play" : "Open Play Schedule"}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center max-w-lg mx-auto space-y-2">
          <h1 className="text-2xl font-black text-ink tracking-tight">
            {isId ? "Pendaftaran Open Play PB Kecebong" : "PB Kecebong Open Play Registration"}
          </h1>
          <p className="text-sm text-ink-soft">
            {isId
              ? "Pilih jadwal mabar yang tersedia untuk mendaftar sebagai Member atau Non-Member."
              : "Select an available mabar session to register as a Member or Non-Member."}
          </p>
        </div>

        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-pine border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-ink-soft">{isId ? "Memuat sesi..." : "Loading sessions..."}</p>
          </div>
        ) : isError || openSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-line p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-ink">
              {isId ? "Belum ada sesi open play yang dibuka." : "No open play sessions available at the moment."}
            </p>
            <p className="text-xs text-ink-soft">
              {isId
                ? "Silakan pantau kembali nanti atau hubungi admin di grup WhatsApp."
                : "Please check back later or contact admin via the WhatsApp group."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openSessions.map((s: MabarSession) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-line p-5 shadow-sm hover:border-pine/60 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-pine">
                      {s.period_name || "Mabar Open Play"}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusClass(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink">{s.venue_name || "GOR Badminton"}</h3>
                  <div className="text-xs text-ink-soft space-y-1">
                    <p className="flex items-center gap-1.5">
                      <IconCalendar className="w-3.5 h-3.5 text-pine" />
                      <span>{formatGmt7DateTime(s.date, lang).split(",")[0]}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <IconClock className="w-3.5 h-3.5 text-pine" />
                      <span>
                        {s.start_time?.slice(0, 5) || "—"} - {s.end_time?.slice(0, 5) || "—"} WIB (GMT+7)
                      </span>
                    </p>
                  </div>
                </div>

                <Link
                  to={`/open-play/${s.id}`}
                  className="w-full text-center py-2.5 px-4 rounded-xl bg-pine text-white text-xs font-bold hover:bg-pine-deep transition-colors block"
                >
                  {isId ? "Lihat Detail & Daftar" : "View Details & Register"}
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
