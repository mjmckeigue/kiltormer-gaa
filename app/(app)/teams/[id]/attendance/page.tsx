import Link from "next/link";
import { STATUSES, byName, playerName } from "@/lib/gaa";
import { requireTeam } from "@/lib/team";
import type { Player, Status, TeamEvent } from "@/lib/types";

export default async function AttendancePage({ params, searchParams }: PageProps<"/teams/[id]/attendance">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, team } = await requireTeam(id);
  const kind = sp.kind === "training" || sp.kind === "match" ? sp.kind : "all";
  const from = typeof sp.from === "string" && sp.from ? sp.from : `${team.season}-01-01`;
  const to = typeof sp.to === "string" && sp.to ? sp.to : `${team.season}-12-31`;

  let q = supabase.from("events").select("id, event_date, kind, title, attendance(player_id, status)").eq("team_id", id).gte("event_date", from).lte("event_date", to).order("event_date");
  if (kind !== "all") q = q.eq("kind", kind);
  const [{ data: evs }, { data: squad }] = await Promise.all([q, supabase.from("team_players").select("players(*)").eq("team_id", id)]);
  type Ev = Pick<TeamEvent, "id" | "event_date" | "kind" | "title"> & { attendance: { player_id: string; status: Status }[] };
  const events = ((evs ?? []) as Ev[]).filter((e) => e.attendance.length > 0);
  const players = (squad ?? []).map((r) => r.players as unknown as Player).filter(Boolean).sort(byName);
  const cell = new Map<string, Status>();
  events.forEach((e) => e.attendance.forEach((a) => cell.set(`${e.id}|${a.player_id}`, a.status)));

  const stats = players.map((p) => {
    const c: Record<Status, number> = { available: 0, injured: 0, sick: 0, excused: 0, absent: 0 };
    events.forEach((e) => { const s = cell.get(`${e.id}|${p.id}`); if (s) c[s]++; });
    const pct = events.length ? Math.round((c.available / events.length) * 100) : 0;
    return { p, c, pct };
  });
  const short = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-IE", { day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <form className="card flex flex-wrap items-end gap-3" method="get">
        <div><label className="label">Show</label>
          <select name="kind" defaultValue={kind} className="input"><option value="all">Training + matches</option><option value="training">Training only</option><option value="match">Matches only</option></select></div>
        <div><label className="label">From</label><input name="from" type="date" defaultValue={from} className="input" /></div>
        <div><label className="label">To</label><input name="to" type="date" defaultValue={to} className="input" /></div>
        <button className="btn">Update</button>
      </form>
      <p className="muted">{events.length} session{events.length === 1 ? "" : "s"} with attendance taken. % = sessions marked available ÷ all sessions in range.</p>
      {events.length === 0 || players.length === 0 ? <p className="card muted">Nothing recorded in this range yet.</p> : (
        <div className="card overflow-x-auto p-0">
          <table className="text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left">Player</th>
                <th className="px-2 py-2">%</th>
                {STATUSES.map((s) => <th key={s.key} className="px-2 py-2" title={s.label}>{s.short}</th>)}
                {events.map((e) => (
                  <th key={e.id} className="px-1 py-2 font-medium">
                    <Link href={`/teams/${id}/events/${e.id}`} className="block whitespace-nowrap hover:text-club" title={e.title}>
                      {short(e.event_date)}<br /><span className={e.kind === "match" ? "font-bold text-club" : ""}>{e.kind === "match" ? "M" : "T"}</span>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {stats.map(({ p, c, pct }) => (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 font-semibold"><Link href={`/players/${p.id}`} className="hover:text-club">{playerName(p)}</Link></td>
                  <td className={`px-2 text-center font-bold ${pct >= 75 ? "text-green-700" : pct >= 50 ? "text-yellow-700" : "text-red-700"}`}>{pct}%</td>
                  {STATUSES.map((s) => <td key={s.key} className="px-2 text-center text-slate-600">{c[s.key] || ""}</td>)}
                  {events.map((e) => {
                    const s = cell.get(`${e.id}|${p.id}`);
                    const info = s ? STATUSES.find((x) => x.key === s)! : null;
                    return <td key={e.id} className="px-1 py-1 text-center">{info ? <span title={info.label} className={`inline-block h-5 w-5 rounded text-[10px] leading-5 font-bold ${info.cls}`}>{s === "available" ? "✓" : info.short[0]}</span> : <span className="text-slate-300">·</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
