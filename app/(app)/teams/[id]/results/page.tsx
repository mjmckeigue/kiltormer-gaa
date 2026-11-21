import Link from "next/link";
import { formatDate, result, scoreLine } from "@/lib/gaa";
import { requireTeam } from "@/lib/team";
import type { TeamEvent } from "@/lib/types";

export default async function ResultsPage({ params, searchParams }: PageProps<"/teams/[id]/results">) {
  const { id } = await params;
  const sp = await searchParams;
  const all = sp.all === "1";
  const { supabase } = await requireTeam(id);
  let q = supabase.from("events").select("*").eq("team_id", id).eq("kind", "match").order("event_date", { ascending: false });
  if (!all) q = q.eq("is_competitive", true);
  const { data } = await q;
  const matches = (data ?? []) as TeamEvent[];
  const played = matches.filter((m) => result(m));
  const rec = { W: 0, D: 0, L: 0 };
  let pf = 0, pa = 0;
  played.forEach((m) => { rec[result(m)!]++; pf += (m.our_goals ?? 0) * 3 + (m.our_points ?? 0); pa += (m.opp_goals ?? 0) * 3 + (m.opp_points ?? 0); });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Link href={`/teams/${id}/results`} className={`chip ${!all ? "chip-on" : "chip-off"}`}>Competitive only</Link>
          <Link href={`/teams/${id}/results?all=1`} className={`chip ${all ? "chip-on" : "chip-off"}`}>All matches</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[["Played", played.length], ["Won", rec.W], ["Drawn", rec.D], ["Lost", rec.L], ["Score diff", (pf - pa > 0 ? "+" : "") + (pf - pa)]].map(([k, v]) => (
          <div key={k} className="card text-center"><p className="text-2xl font-bold text-club">{v}</p><p className="muted">{k}</p></div>
        ))}
      </div>
      {matches.length === 0 ? <p className="card muted">No matches recorded yet.</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-2">Date</th><th className="px-4 py-2">Opponent</th><th className="px-4 py-2">Competition</th><th className="px-4 py-2">Score</th><th className="px-4 py-2">Result</th></tr>
            </thead>
            <tbody className="divide-y">
              {matches.map((m) => {
                const r = result(m);
                return (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2">{formatDate(m.event_date)}</td>
                    <td className="px-4 py-2 font-semibold"><Link href={`/teams/${id}/events/${m.id}`} className="hover:text-club">{m.title}</Link> <span className="text-xs text-slate-400">{m.venue}</span></td>
                    <td className="px-4 py-2 text-slate-600">{m.competition}</td>
                    <td className="whitespace-nowrap px-4 py-2">{r ? `${scoreLine(m.our_goals, m.our_points)} – ${scoreLine(m.opp_goals, m.opp_points)}` : <span className="text-slate-400">not entered</span>}</td>
                    <td className="px-4 py-2">{r && <span className={`rounded px-2 py-0.5 text-xs font-bold text-white ${r === "W" ? "bg-green-600" : r === "L" ? "bg-red-600" : "bg-slate-500"}`}>{r}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
