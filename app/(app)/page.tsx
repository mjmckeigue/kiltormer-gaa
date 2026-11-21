import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

export default async function Home() {
  const { supabase, profile, user } = await requireUser();
  const [{ data: memberships }, { data: latest }, pending] = await Promise.all([
    supabase.from("team_members").select("role, teams(*)").eq("user_id", user.id),
    supabase.from("resources").select("id, title, kind, created_at").order("created_at", { ascending: false }).limit(5),
    profile.role === "admin"
      ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "pending")
      : Promise.resolve({ count: 0 }),
  ]);
  const teams = (memberships ?? [])
    .map((m) => ({ role: m.role as string, team: m.teams as unknown as Team }))
    .filter((m) => m.team && !m.team.archived);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Fáilte, {profile.full_name.split(" ")[0] || "coach"}</h1>
        <p className="muted">Everything you need to plan sessions and run your teams.</p>
      </div>
      {!!pending.count && (
        <Link href="/admin" className="block rounded-xl border border-gold bg-yellow-50 p-3 text-sm font-semibold text-yellow-900">
          {pending.count} coach{pending.count > 1 ? "es are" : " is"} waiting for approval →
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h2">My teams</h2>
            <Link href="/teams" className="text-sm font-semibold text-club">All teams →</Link>
          </div>
          {teams.length === 0 ? (
            <p className="muted">You&apos;re not on any team yet. <Link href="/teams" className="text-club font-semibold">Create one</Link> or ask a team owner to add you.</p>
          ) : (
            <ul className="divide-y">
              {teams.map(({ team, role }) => (
                <li key={team.id}>
                  <Link href={`/teams/${team.id}`} className="flex items-center justify-between py-2 hover:text-club">
                    <span className="font-semibold">{team.name}</span>
                    <span className="muted">{team.season} · {role}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h2">New in the Resource Hub</h2>
            <Link href="/hub" className="text-sm font-semibold text-club">Browse →</Link>
          </div>
          {!latest?.length ? <p className="muted">No resources yet.</p> : (
            <ul className="divide-y">
              {latest.map((r) => (
                <li key={r.id}>
                  <Link href={`/hub/${r.id}`} className="flex items-center justify-between py-2 hover:text-club">
                    <span className="font-semibold">{r.title}</span>
                    <span className="tag uppercase">{r.kind}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
