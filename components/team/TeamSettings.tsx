"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CODES, FORMATS } from "@/lib/gaa";
import type { Tag, Team } from "@/lib/types";

export default function TeamSettings({ team, ages, isOwner, coaches }: { team: Team; ages: Tag[]; isOwner: boolean; coaches: { id: string; name: string }[] }) {
  const router = useRouter();
  const supabase = createClient();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("teams").update({
      name: String(f.get("name")).trim(), season: Number(f.get("season")), code: f.get("code"),
      default_format: Number(f.get("format")), age_group_id: f.get("age") ? Number(f.get("age")) : null,
      archived: f.get("archived") === "on",
    }).eq("id", team.id);
    if (error) alert(error.message); else router.refresh();
  }
  async function transfer(uid: string) {
    if (!uid || !confirm("Hand ownership of this team to that coach? You'll stay on as a coach.")) return;
    const { error } = await supabase.rpc("transfer_team", { t: team.id, new_owner: uid });
    if (error) alert(error.message); else router.refresh();
  }
  async function del() {
    if (prompt(`This permanently deletes the team, its sessions, attendance and results (players stay in the club register). Type the team name to confirm:`) !== team.name) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) alert(error.message); else { router.push("/teams"); router.refresh(); }
  }
  const ageName = ages.find((a) => a.id === team.age_group_id)?.name ?? "—";

  if (!isOwner) return (
    <div className="card max-w-xl space-y-1 text-sm">
      <p><b>Age group:</b> {ageName}</p><p><b>Code:</b> {team.code}</p><p><b>Season:</b> {team.season}</p><p><b>Usual format:</b> {team.default_format}-a-side</p>
      <p className="muted pt-2">Only the team owner can change these settings.</p>
    </div>
  );
  return (
    <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="card grid gap-3 sm:grid-cols-2">
        <h2 className="h2 sm:col-span-2">Team details</h2>
        <div className="sm:col-span-2"><label className="label">Name</label><input name="name" defaultValue={team.name} required className="input" /></div>
        <div><label className="label">Age group</label><select name="age" defaultValue={team.age_group_id ?? ""} className="input"><option value="">—</option>{ages.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <div><label className="label">Code</label><select name="code" defaultValue={team.code} className="input">{CODES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Season</label><input name="season" type="number" defaultValue={team.season} className="input" /></div>
        <div><label className="label">Usual format</label><select name="format" defaultValue={team.default_format} className="input">{FORMATS.map((n) => <option key={n} value={n}>{n}-a-side</option>)}</select></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="archived" defaultChecked={team.archived} /> Archive (season finished; history kept)</label>
        <button className="btn sm:col-span-2">Save</button>
      </form>
      <div className="space-y-4">
        <section className="card space-y-2">
          <h2 className="h2">Hand over the team</h2>
          {coaches.length ? (
            <select className="input" value="" onChange={(e) => transfer(e.target.value)}>
              <option value="">Choose a coach on this team…</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <p className="muted">Add another coach first.</p>}
        </section>
        <section className="card space-y-2 border-red-200">
          <h2 className="h2 text-red-700">Delete team</h2>
          <p className="muted">Usually better to archive instead.</p>
          <button className="btn-danger" onClick={del}>Delete permanently</button>
        </section>
      </div>
    </div>
  );
}
