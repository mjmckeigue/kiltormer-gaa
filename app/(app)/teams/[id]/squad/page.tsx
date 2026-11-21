import SquadManager from "@/components/team/SquadManager";
import { requireTeam } from "@/lib/team";
import type { Player } from "@/lib/types";

export default async function SquadPage({ params }: PageProps<"/teams/[id]/squad">) {
  const { id } = await params;
  const { supabase, user } = await requireTeam(id);
  const [{ data: squad }, { data: register }, { data: otherTeams }] = await Promise.all([
    supabase.from("team_players").select("players(*)").eq("team_id", id),
    supabase.from("players").select("*").eq("active", true).order("last_name"),
    supabase.from("team_members").select("teams(id, name, season)").eq("user_id", user.id).neq("team_id", id),
  ]);
  return (
    <SquadManager
      teamId={id}
      squad={(squad ?? []).map((r) => r.players as unknown as Player).filter(Boolean)}
      register={(register ?? []) as Player[]}
      otherTeams={(otherTeams ?? []).map((r) => r.teams as unknown as { id: string; name: string; season: number }).filter(Boolean)}
    />
  );
}
