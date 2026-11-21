import { notFound } from "next/navigation";
import PlayerEdit from "@/components/team/PlayerEdit";
import { formatDate, playerName, statusInfo } from "@/lib/gaa";
import { requireUser } from "@/lib/supabase/server";
import type { Player, Status } from "@/lib/types";

type H = { event_id: string; event_date: string; kind: string; title: string; team_id: string; team_name: string; season: number; status: Status; grp: string | null; slot: number | null; is_competitive: boolean };

export default async function PlayerPage({ params }: PageProps<"/players/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const [{ data: player }, { data: teams }, { data: hist }] = await Promise.all([
    supabase.from("players").select("*").eq("id", id).maybeSingle<Player>(),
    supabase.rpc("player_teams", { p: id }),
    supabase.rpc("player_history", { p: id }),
  ]);
  if (!player || (!teams?.length && profile.role !== "admin")) notFound(); // only coaches of this player can view their history
  const history = (hist ?? []) as H[];

  const groups = new Map<string, { team: string; season: number; sessions: number; present: number; matches: number; avail: number; starts: number; subs: number }>();
  history.forEach((h) => {
    const g = groups.get(h.team_id) ?? { team: h.team_name, season: h.season, sessions: 0, present: 0, matches: 0, avail: 0, starts: 0, subs: 0 };
    if (h.kind === "training") { g.sessions++; if (h.status === "available") g.present++; }
    else { g.matches++; if (h.status === "available") g.avail++; if (h.grp === "starter") g.starts++; if (h.grp === "sub") g.subs++; }
    groups.set(h.team_id, g);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{playerName(player)}</h1>
          <p className="muted">{player.birth_year ? `Born ${player.birth_year}` : "Year of birth not set"} · {((teams ?? []) as { team_name: string; season: number }[]).map((t) => `${t.team_name} (${t.season})`).join(", ")}</p>
        </div>
        <PlayerEdit player={player} />
      </div>

      <section>
        <h2 className="h2 mb-2">By team and season</h2>
        {groups.size === 0 ? <p className="card muted">No sessions recorded yet.</p> : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-2">Team</th><th className="px-4 py-2">Training attended</th><th className="px-4 py-2">Matches available</th><th className="px-4 py-2">Started</th><th className="px-4 py-2">Sub</th></tr>
              </thead>
              <tbody className="divide-y">
                {[...groups.values()].sort((a, b) => b.season - a.season).map((g) => (
                  <tr key={g.team + g.season}>
                    <td className="px-4 py-2 font-semibold">{g.team} <span className="font-normal text-slate-500">{g.season}</span></td>
                    <td className="px-4 py-2">{g.present}/{g.sessions}{g.sessions ? ` (${Math.round((g.present / g.sessions) * 100)}%)` : ""}</td>
                    <td className="px-4 py-2">{g.avail}/{g.matches}</td>
                    <td className="px-4 py-2">{g.starts}</td>
                    <td className="px-4 py-2">{g.subs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="h2 mb-2">History</h2>
        <div className="card divide-y p-0">
          {history.slice(0, 100).map((h) => {
            const s = statusInfo(h.status);
            return (
              <div key={h.event_id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className={`w-16 rounded px-1.5 py-0.5 text-center text-xs font-bold ${s.cls}`}>{s.label}</span>
                <span className="flex-1"><b>{h.kind === "match" ? `v ${h.title}` : h.title || "Training"}</b> <span className="text-slate-500">· {h.team_name}</span></span>
                <span className="text-xs text-slate-500">{h.grp === "starter" ? `Started #${h.slot}` : h.grp === "sub" ? "Sub" : h.grp ? `Team ${h.grp}` : ""}</span>
                <span className="w-32 text-right text-xs text-slate-500">{formatDate(h.event_date)}</span>
              </div>
            );
          })}
          {!history.length && <p className="p-4 muted">Nothing yet.</p>}
        </div>
      </section>
    </div>
  );
}
