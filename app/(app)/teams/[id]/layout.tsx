import Link from "next/link";
import TeamTabs from "@/components/team/TeamTabs";
import { requireTeam } from "@/lib/team";

export default async function TeamLayout({ children, params }: LayoutProps<"/teams/[id]">) {
  const { id } = await params;
  const { team, isOwner, viewingAsAdmin } = await requireTeam(id);
  return (
    <div className="space-y-4">
      <div>
        <Link href="/teams" className="text-sm font-semibold text-club">← My teams</Link>
        <h1 className="h1 mt-1">{team.name} {team.archived && <span className="text-sm font-semibold text-slate-400">(archived)</span>}</h1>
        <p className="muted">{team.code} · {team.season} season</p>
        {viewingAsAdmin && <p className="mt-2 inline-block rounded-lg bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-900 ring-1 ring-gold">Viewing as club admin. You&apos;re not on this team&apos;s management.</p>}
      </div>
      <TeamTabs id={team.id} isOwner={isOwner} />
      {children}
    </div>
  );
}
