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

export interface GenMatch {
  id: string;
  event_id: string;
  round: number;
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
  is_public: boolean;
  created_at: string;
  players: number;
  matches: number;
}

export interface MatchEventDetail {
  event: { id: string; name: string; status: string; court_count: number; base_played: number; is_public: boolean; show_grades: boolean; player_ids: string[]; source_session_id?: string | null; created_at: string };
  matches: GenMatch[];
  counts: { player_id: string; name: string; grade: string | null; gender: string | null; arrival: number; played: number; refereed: number }[];
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
  status: string;
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
}

export interface PeriodAttendanceMatrixNonMember {
  session_id: string;
  player_id: string;
  player_name: string;
  fee: number;
  paid: boolean;
  note: string;
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

