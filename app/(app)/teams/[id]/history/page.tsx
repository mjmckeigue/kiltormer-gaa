import Link from "next/link";
import { FORMATIONS, STATUSES, formatDate, formationFor, playerName, result, scoreLine } from "@/lib/gaa";
import { requireTeam } from "@/lib/team";
import type { Grp, Status, TeamEvent } from "@/lib/types";

type Name = { first_name: string; last_name: string };
type Ev = TeamEvent & {
  attendance: { player_id: string; status: Status; players: Name | null }[];
  selections: { player_id: string; grp: Grp; slot: number | null; players: Name | null }[];
};
const SIDE_NAMES: Record<string, string> = { A: "Blues", B: "Whites", C: "Bibs", D: "Greens" };

export default async function HistoryPage({ params, searchParams }: PageProps<"/teams/[id]/history">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, team } = await requireTeam(id);
  const kind = sp.kind === "training" || sp.kind === "match" ? sp.kind : "all";
  const season = typeof sp.season === "string" && /^\d{4}$/.test(sp.season) ? sp.season : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase.from("events")
    .select("*, attendance(player_id, status, players(first_name, last_name)), selections(player_id, grp, slot, players(first_name, last_name))")
    .eq("team_id", id).lte("event_date", today)
    .order("event_date", { ascending: false }).order("start_time", { ascending: false });
  if (kind !== "all") query = query.eq("kind", kind);
  if (season) query = query.gte("event_date", `${season}-01-01`).lte("event_date", `${season}-12-31`);
  const { data } = await query;
  let events = (data ?? []) as Ev[];
  if (q) {
    const t = q.toLowerCase();
    events = events.filter((e) => `${e.title} ${e.competition} ${e.notes}`.toLowerCase().includes(t));
  }
  const nm = (n: Name | null) => (n ? playerName(n) : "Removed player");

  return (
    <div className="space-y-4">
      <form method="get" className="card flex flex-wrap items-end gap-3">
        <div><label className="label">Show</label>
          <select name="kind" defaultValue={kind} className="input"><option value="all">Training + matches</option><option value="training">Training only</option><option value="match">Matches only</option></select></div>
        <div><label className="label">Year</label><input name="season" defaultValue={season} placeholder={String(team.season)} className="input w-24" /></div>
        <div className="min-w-48 flex-1"><label className="label">Search opponent, focus or notes</label><input name="q" defaultValue={q} className="input" /></div>
        <button className="btn">Filter</button>
      </form>
      <p className="muted">{events.length} past session{events.length === 1 ? "" : "s"}. Tap one to see who was there, the teams picked and notes.</p>

      {events.length === 0 && <p className="card muted">Nothing to show yet.</p>}
      <div className="space-y-2">
        {events.map((e) => {
          const r = result(e);
          const byStatus = STATUSES.map((s) => ({ ...s, names: e.attendance.filter((a) => a.status === s.key).map((a) => nm(a.players)).sort() }));
          const avail = byStatus[0].names.length;
          const starters = e.selections.filter((s) => s.grp === "starter").sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));
          const subs = e.selections.filter((s) => s.grp === "sub");
          const sides = ["A", "B", "C", "D"].map((g) => ({ g, list: e.selections.filter((s) => s.grp === g).sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99)) })).filter((x) => x.list.length);
          const rows = e.kind === "match" ? FORMATIONS[e.format ?? 15] ?? FORMATIONS[15] : null;
          return (
            <details key={e.id} className="card group p-0">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <span className={`w-20 shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold uppercase ${e.kind === "match" ? "bg-club text-white" : "bg-club-light text-club-dark"}`}>{e.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.kind === "match" ? `v ${e.title}` : e.title || "Training"}</span>
                  <span className="block text-xs text-slate-500">{formatDate(e.event_date)}{e.competition ? ` · ${e.competition}` : ""}</span>
                </span>
                {r && <span className="text-right text-xs"><span className={`mr-1 rounded px-1.5 py-0.5 font-bold text-white ${r === "W" ? "bg-green-600" : r === "L" ? "bg-red-600" : "bg-slate-500"}`}>{r}</span>{scoreLine(e.our_goals, e.our_points).split(" ")[0]} – {scoreLine(e.opp_goals, e.opp_points).split(" ")[0]}</span>}
                <span className="w-20 shrink-0 text-right text-xs text-slate-500">{e.attendance.length ? `${avail} of ${e.attendance.length}` : "no register"}</span>
                <span className="text-slate-400 transition group-open:rotate-90">›</span>
              </summary>
              <div className="space-y-4 border-t px-4 py-4 text-sm">
                {e.attendance.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {byStatus.filter((s) => s.names.length).map((s) => (
                      <div key={s.key}><span className={`mb-1 inline-block rounded px-2 py-0.5 text-xs font-bold ${s.cls}`}>{s.label} ({s.names.length})</span><p className="text-slate-700">{s.names.join(", ")}</p></div>
                    ))}
                  </div>
                )}
                {rows && starters.length > 0 && (
                  <div>
                    <p className="mb-1 font-semibold">Team ({e.format ?? 15}-a-side)</p>
                    <div className="space-y-0.5 text-slate-700">
                      {rows.map((row) => (
                        <p key={row.label}><span className="text-xs text-slate-400">{row.label}: </span>
                          {row.slots.map((n) => { const s = starters.find((x) => x.slot === n); return `${n}. ${s ? nm(s.players) : "—"}`; }).join("   ")}</p>
                      ))}
                      {subs.length > 0 && <p><span className="text-xs text-slate-400">Subs: </span>{subs.map((s) => nm(s.players)).join(", ")}</p>}
                    </div>
                  </div>
                )}
                {sides.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sides.map(({ g, list }) => (
                      <div key={g}><p className="mb-1 font-semibold">{SIDE_NAMES[g]} ({list.length})</p>
                        <p className="text-slate-700">{list.map((s) => `${s.slot ? `${s.slot}. ` : ""}${nm(s.players)}`).join(", ")}</p>
                        {list.some((s) => s.slot) && <p className="text-xs text-slate-400">{formationFor(list.length).map((r) => r.label).join(" · ")}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {e.notes && <div><p className="mb-1 font-semibold">Notes</p><p className="whitespace-pre-wrap text-slate-700">{e.notes}</p></div>}
                <Link href={`/teams/${id}/events/${e.id}`} className="inline-block font-semibold text-club">Open / edit this session →</Link>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
