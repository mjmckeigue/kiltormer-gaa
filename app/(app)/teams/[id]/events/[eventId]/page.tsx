import { notFound } from "next/navigation";
import EventManager from "@/components/team/EventManager";
import { requireTeam } from "@/lib/team";
import type { Player, Selection, Status, TeamEvent } from "@/lib/types";

export default async function EventPage({ params }: PageProps<"/teams/[id]/events/[eventId]">) {
  const { id, eventId } = await params;
  const { supabase, team } = await requireTeam(id);
  const [{ data: ev }, { data: squad }, { data: att }, { data: sel }] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).eq("team_id", id).maybeSingle<TeamEvent>(),
    supabase.from("team_players").select("players(*)").eq("team_id", id),
    supabase.from("attendance").select("player_id, status, players(*)").eq("event_id", eventId),
    supabase.from("selections").select("*").eq("event_id", eventId),
  ]);
  if (!ev) notFound();
  const players = new Map<string, Player>();
  (squad ?? []).forEach((r) => { const p = r.players as unknown as Player; if (p) players.set(p.id, p); });
  (att ?? []).forEach((r) => { const p = r.players as unknown as Player; if (p) players.set(p.id, p); });
  const attendance: Record<string, Status> = {};
  (att ?? []).forEach((r) => { attendance[r.player_id] = r.status as Status; });
  return (
    <EventManager
      event={ev}
      teamName={team.name}
      players={[...players.values()]}
      initialAttendance={attendance}
      initialSelections={(sel ?? []) as Selection[]}
    />
  );
}
