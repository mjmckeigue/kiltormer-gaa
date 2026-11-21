import CoachManager from "@/components/team/CoachManager";
import { requireTeam } from "@/lib/team";

export default async function CoachesPage({ params }: PageProps<"/teams/[id]/coaches">) {
  const { id } = await params;
  const { supabase, isOwner, user } = await requireTeam(id);
  const { data } = await supabase.from("team_members").select("user_id, role, profiles(full_name, email)").eq("team_id", id);
  const members = (data ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; email: string } | null;
    return { id: m.user_id as string, role: m.role as string, name: p?.full_name ?? "", email: p?.email ?? "" };
  });
  return <CoachManager teamId={id} members={members} isOwner={isOwner} me={user.id} />;
}
