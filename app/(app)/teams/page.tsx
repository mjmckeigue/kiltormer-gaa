import type { Metadata } from "next";
import Link from "next/link";
import NewTeamForm from "@/components/team/NewTeamForm";
import { requireUser } from "@/lib/supabase/server";
import type { Tag, Team } from "@/lib/types";

export const metadata: Metadata = { title: "My Teams" };

type Row = { role: string; teams: Team & { team_players: { count: number }[] } };

function Grid({ items }: { items: Row[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ teams: t, role }) => (
        <Link key={t.id} href={`/teams/${t.id}`} className="card border-l-4 border-l-club hover:shadow-md">
          <div className="flex items-start justify-between">
            <h3 className="font-bold">{t.name}</h3>
            <span className="text-xs font-semibold uppercase text-slate-400">{role}</span>
          </div>
          <p className="muted">{t.code} · {t.season} · {t.team_players?.[0]?.count ?? 0} players</p>
        </Link>
      ))}
    </div>
  );
}

export default async function TeamsPage() {
  const { supabase, user, profile } = await requireUser();
  const [{ data: rows }, { data: ages }] = await Promise.all([
    supabase.from("team_members").select("role, teams(*, team_players(count))").eq("user_id", user.id),
    supabase.from("age_groups").select("*").order("sort_order"),
  ]);
  const list = ((rows ?? []) as unknown as Row[]).filter((r) => r.teams)
    .sort((a, b) => b.teams.season - a.teams.season || a.teams.name.localeCompare(b.teams.name));
  const active = list.filter((r) => !r.teams.archived), archived = list.filter((r) => r.teams.archived);
  let clubTeams: Row[] = [];
  if (profile.role === "admin") {
    const mine = new Set(list.map((r) => r.teams.id));
    const { data } = await supabase.from("teams").select("*, team_players(count)").order("season", { ascending: false }).order("name");
    clubTeams = ((data ?? []) as Row["teams"][]).filter((t) => !mine.has(t.id)).map((t) => ({ role: "admin view", teams: t }));
  }

  return (
    <div className="space-y-6">
      <div><h1 className="h1">My teams</h1><p className="muted">Only the coaches added to a team can see it.</p></div>
      {active.length ? <Grid items={active} /> : <p className="card muted">You&apos;re not on any team yet.</p>}
      <NewTeamForm ages={(ages ?? []) as Tag[]} userId={user.id} />
      {clubTeams.length > 0 && (
        <section className="space-y-2">
          <h2 className="h2">All other club teams</h2>
          <p className="muted">Visible to you as club admin.</p>
          <Grid items={clubTeams} />
        </section>
      )}
      {archived.length > 0 && (<details><summary className="cursor-pointer font-semibold text-slate-600">Archived teams ({archived.length})</summary><div className="mt-3"><Grid items={archived} /></div></details>)}
    </div>
  );
}
