import Link from "next/link";
import NewEventForm from "@/components/team/NewEventForm";
import { formatDate, result, scoreLine } from "@/lib/gaa";
import { requireTeam } from "@/lib/team";
import type { TeamEvent } from "@/lib/types";

type Ev = TeamEvent & { attendance: { status: string }[] };

function Row({ e, id }: { e: Ev; id: string }) {
  const avail = e.attendance.filter((a) => a.status === "available").length;
  const r = result(e);
  return (
    <Link href={`/teams/${id}/events/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
      <span className={`w-20 shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold uppercase ${e.kind === "match" ? "bg-club text-white" : "bg-club-light text-club-dark"}`}>{e.kind}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{e.kind === "match" ? `v ${e.title || "TBC"}` : e.title || "Training"}</span>
        <span className="block text-xs text-slate-500">{formatDate(e.event_date)}{e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}{e.competition ? ` · ${e.competition}` : ""}</span>
      </span>
      {e.kind === "match" && r && (
        <span className="text-right text-xs">
          <span className={`mr-1 rounded px-1.5 py-0.5 font-bold text-white ${r === "W" ? "bg-green-600" : r === "L" ? "bg-red-600" : "bg-slate-500"}`}>{r}</span>
          {scoreLine(e.our_goals, e.our_points).split(" ")[0]} – {scoreLine(e.opp_goals, e.opp_points).split(" ")[0]}
        </span>
      )}
      <span className="w-16 shrink-0 text-right text-xs text-slate-500">{e.attendance.length ? `${avail} avail.` : "not taken"}</span>
    </Link>
  );
}


export default async function TeamSessions({ params }: PageProps<"/teams/[id]">) {
  const { id } = await params;
  const { supabase, team } = await requireTeam(id);
  const { data } = await supabase.from("events").select("*, attendance(status)").eq("team_id", id).order("event_date", { ascending: false }).order("start_time", { ascending: false });
  const events = (data ?? []) as Ev[];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.event_date > today).reverse();
  const past = events.filter((e) => e.event_date <= today).slice(0, 6);

  return (
    <div className="space-y-5">
      <NewEventForm teamId={id} defaultFormat={team.default_format} />
      {upcoming.length > 0 && (
        <section><h2 className="h2 mb-2">Upcoming</h2><div className="card divide-y p-0">{upcoming.map((e) => <Row key={e.id} e={e} id={id} />)}</div></section>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between"><h2 className="h2">Recent</h2><Link href={`/teams/${id}/history`} className="text-sm font-semibold text-club">Full history →</Link></div>
        {past.length ? <div className="card divide-y p-0">{past.map((e) => <Row key={e.id} e={e} id={id} />)}</div> : <p className="card muted">No sessions logged yet. Add your squad, then log your first session above.</p>}
      </section>
    </div>
  );
}
