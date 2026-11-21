export type Role = "pending" | "coach" | "editor" | "admin" | "disabled";
export type Profile = { id: string; full_name: string; email: string; role: Role; created_at: string };
export type Tag = { id: number; name: string; sort_order: number };
export type ResourceKind = "pdf" | "video" | "link" | "file";
export type Resource = {
  id: string; title: string; description: string; kind: ResourceKind;
  storage_path: string | null; url: string | null; file_name: string | null; created_at: string;
  resource_age_groups: { age_group_id: number }[];
  resource_categories: { category_id: number }[];
};
export type Team = {
  id: string; name: string; season: number; code: string; age_group_id: number | null;
  default_format: number; archived: boolean; owner_id: string; created_at: string;
};
export type Player = { id: string; first_name: string; last_name: string; birth_year: number | null; active: boolean };
export type EventKind = "training" | "match";
export type TeamEvent = {
  id: string; team_id: string; kind: EventKind; event_date: string; start_time: string | null;
  title: string; venue: "home" | "away" | "neutral" | null; competition: string; is_competitive: boolean;
  format: number | null; our_goals: number | null; our_points: number | null;
  opp_goals: number | null; opp_points: number | null; notes: string;
};
export type Status = "available" | "injured" | "sick" | "excused" | "absent";
export type Grp = "starter" | "sub" | "A" | "B" | "C" | "D";
export type Selection = { event_id: string; player_id: string; grp: Grp; slot: number | null };
