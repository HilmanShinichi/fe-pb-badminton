export interface Player {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  status: string;
  grade: string | null;
  gender: string | null;
  created_at: string;
}

export const GRADES = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"] as const;

export interface GenReferee {
  player_id: string;
  name: string;
}

export interface GenTeamPlayer {
  player_id: string;
  name: string;
  grade: string | null;
  gender: string | null;
}

export type GenStrategy = "leveling" | "rest";

export type ParticipantType = "MEMBER" | "NON_MEMBER";
export type ParticipantStatus = "REGISTERED" | "WAITING" | "CANCELLED" | "AUTO_FILLED";
export type CancellationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface OpenPlaySession {
  id: string;
  name: string;
  description: string | null;
  schedule_date: string;
  start_time: string;
  end_time: string | null;
  venue_id: string | null;
  max_members: number;
  max_non_members: number;
  max_waiting_list: number;
  cancellation_window_hours: number;
  min_non_member_fee: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  registered_member_count?: number;
  registered_non_member_count?: number;
  waiting_list_count?: number;
}

export interface Participant {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  participant_type: ParticipantType;
  participant_status: ParticipantStatus;
  joined_at: string;
  filled_from_waiting_at: string | null;
}

export interface CancellationRequest {
  id: string;
  participant_id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  reason: string;
  request_status: CancellationStatus;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requested_at: string;
  created_at: string;
}

export interface ParticipantListResponse {
  members: Participant[] | null;
  non_members: Participant[] | null;
  waiting_list: Participant[] | null;
}

export interface GenMatch {
  id: string;
  event_id: string;
  wave: number;
  team1: GenTeamPlayer[];
  team2: GenTeamPlayer[];
  referee: GenReferee | null;
  status: string;
  court: number;
  started_at: string | null;
  ended_at: string | null;
  shuttlecock_used: number;
  created_at: string;
  updated_at: string;
}

export interface MatchEventRow {
  id: string;
  name: string;
  status: string;
  court_count: number;
  base_played: number;
  max_rounds: number;
  is_public: boolean;
  created_at: string;
  players: number;
  matches: number;
}

export interface PlayerCount {
  player_id: string;
  name: string;
  grade: string | null;
  gender: string | null;
  arrival: number;
  played: number;
  refereed: number;
  max_played: number | null;
}

export interface MatchEventDetail {
  event: { id: string; name: string; status: string; court_count: number; base_played: number; max_rounds: number; is_public: boolean; show_grades: boolean; use_referee?: boolean; player_ids: string[]; source_session_id?: string | null; created_at: string };
  matches: GenMatch[];
  counts: PlayerCount[];
}

export interface GenerateAIMeta {
  label: string;
  provider: string;
  model: string;
  fallback: boolean;
  local_fallback: boolean;
  error?: string | null;
}

export interface GenerateMatchesResponse {
  matches: GenMatch[];
  ai?: GenerateAIMeta | null;
}

export interface Period {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  number_of_sessions: number;
  max_members: number | null;
  commitment_fee: number;
  member_contribution: number;
  non_member_fee: number;
  venue_cost_total: number;
  shuttle_pack_price: number;
  shuttle_units_per_pack: number;
  shuttle_per_session: number;
  status: string;
  is_registration_open: boolean;
  registration_notes?: string | null;
  registration_expires_at?: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  period_id: string;
  player_id: string;
  player_name: string;
  commitment_fee: number;
  joined_at: string;
  status: string;
  attendance_count: number;
  total_bill: number;
  non_member_cost: number;
  benefit: number;
  paid: Record<string, number>;
}

export interface MabarSession {
  id: string;
  type: string;
  period_id: string | null;
  period_name: string | null;
  venue_id: string | null;
  venue_name: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  description: string | null;
  venue_description: string | null;
  court_cost: number;
  pricing_mode: string | null;
  shuttlecock_price: number;
  shuttle_pack_price: number;
  shuttle_units_per_pack: number;
  registration_opens_at: string | null;
  member_registration_closes_at: string | null;
  registration_closes_at: string | null;
  max_members: number;
  max_non_members: number;
  max_waiting_list: number;
  status: string;
  admin_note?: string | null;
  created_at: string;
}

export interface AttendanceRow {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  status: string;
  is_member: boolean;
  replacement_for_player_id: string | null;
  listed_at: string;
  cancelled_at: string | null;
  no_show_reason: string | null;
}

export interface MatchRow {
  id: string;
  session_id: string;
  court_id: string | null;
  sequence: number;
  started_at: string | null;
  ended_at: string | null;
  shuttlecock_used: number;
  players: string[];
}

export interface SimpleStatRow {
  session_id: string;
  player_id: string;
  player_name: string;
  play_count: number;
  shuttlecock_used: number;
}

export interface BillRow {
  player_id: string;
  player_name: string;
  court_share: number;
  shuttlecock_count: number;
  shuttlecock_contribution: number;
  other_charge: number;
  total: number;
  payment_status: string;
  payment_method: string;
}

export interface Product {
  id: string;
  name: string;
  unit_name: string;
  units_per_pack: number;
  purchase_price: number;
  purpose: string;
  active: boolean;
  stock: number;
}

export interface MabarRegistrationInfo {
  session: {
    id: string;
    type: string;
    period_id: string | null;
    period_name: string | null;
    venue_name: string | null;
    venue_description: string | null;
    date: string;
    start_time: string | null;
    end_time: string | null;
    description: string | null;
    admin_note?: string | null;
    registration_opens_at: string | null;
    member_registration_closes_at: string | null;
    registration_closes_at: string | null;
    max_members: number;
    max_non_members: number;
    max_waiting_list: number;
    server_time: string;
    status: "UPCOMING" | "MEMBER_ONLY" | "OPEN" | "CLOSED" | "NOT_CONFIGURED";
    member_registration_open?: boolean;
    non_member_registration_open?: boolean;
  };
  quotas: {
    max_members: number;
    max_non_members: number;
    effective_max_non_members?: number;
    bonus_non_member_slots?: number;
    max_waiting_list: number;
    member_count: number;
    non_member_count: number;
    waiting_count: number;
    available_member_slots: number;
    available_non_member_slots: number;
    available_waiting_slots: number;
  };
  period_members: {
    id: string;
    name: string;
    phone: string | null;
    attendance_status: string;
    is_registered: boolean;
    commitment_fee: number;
  }[];
  non_member_players?: {
    id: string;
    name: string;
    is_registered: boolean;
  }[];
  participants: {
    members: {
      attendance_id: string;
      player_id: string;
      player_name: string;
      status: string;
      listed_at: string;
    }[];
    non_members: {
      attendance_id: string;
      player_id: string;
      player_name: string;
      status: string;
      listed_at: string;
    }[];
    waiting_list: {
      attendance_id: string;
      player_id: string;
      player_name: string;
      is_member: boolean;
      status: string;
      listed_at: string;
    }[];
  };
}

export interface MabarCancellationItem {
  id: string;
  session_id: string;
  player_id: string;
  player_name: string;
  phone: string | null;
  is_member: boolean;
  attendance_status: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PeriodAttendanceMatrixSession {
  id: string;
  date: string;
  status: string;
  present_count: number;
  total_kas_kok: number;
}

export interface PeriodAttendanceMatrixRow {
  player_id: string;
  player_name: string;
  commitment_fee: number;
  commitment_paid: boolean;
  commitment_amount_paid: number;
  attendances: Record<string, string>;
  present_count: number;
  fastest_count?: number;
}

export interface PeriodAttendanceMatrixNonMember {
  session_id: string;
  /** Tanggal sesi tagihan (YYYY-MM-DD). Untuk carry_over: tanggal openplay lamanya. */
  session_date: string;
  player_id: string;
  player_name: string;
  fee: number;
  paid: boolean;
  note: string;
  /** true = tagihan non-member dari sesi sebelum period ini yang masih UNPAID. */
  carry_over?: boolean;
}

export interface PeriodAttendanceMatrixResponse {
  sessions: PeriodAttendanceMatrixSession[];
  rows: PeriodAttendanceMatrixRow[];
  non_members: PeriodAttendanceMatrixNonMember[];
  commitment_fee: number;
  member_contribution: number;
  non_member_fee: number;
  total_lapangan_paid: number;
  total_kas_kok: number;
}

