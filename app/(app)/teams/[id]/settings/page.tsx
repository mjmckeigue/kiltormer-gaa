import TeamSettings from "@/components/team/TeamSettings";
import { requireTeam } from "@/lib/team";
import type { Tag } from "@/lib/types";

export default async function SettingsPage({ params }: PageProps<"/teams/[id]/settings">) {
  const { id } = await params;
  const { supabase, team, isOwner, user } = await requireTeam(id);
  const [{ data: ages }, { data: members }] = await Promise.all([
    supabase.from("age_groups").select("*").order("sort_order"),
    supabase.from("team_members").select("user_id, role, profiles(full_name, email)").eq("team_id", id),
  ]);
  const coaches = (members ?? []).filter((m) => m.user_id !== user.id).map((m) => {
    const p = m.profiles as unknown as { full_name: string; email: string } | null;
    return { id: m.user_id as string, name: p?.full_name || p?.email || "" };
  });
  return <TeamSettings team={team} ages={(ages ?? []) as Tag[]} isOwner={isOwner} coaches={coaches} />;
}
