"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { byName, playerName } from "@/lib/gaa";
import type { Player } from "@/lib/types";

type Props = { teamId: string; squad: Player[]; register: Player[]; otherTeams: { id: string; name: string; season: number }[] };

export default function SquadManager({ teamId, squad, register, otherTeams }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulk, setBulk] = useState("");
  const inSquad = useMemo(() => new Set(squad.map((p) => p.id)), [squad]);
  const sorted = [...squad].sort(byName);
  const label = (p: Player) => `${playerName(p)}${p.birth_year ? ` (${p.birth_year})` : ""}`;

  const matches = q.trim().length >= 2
    ? register.filter((p) => !inSquad.has(p.id) && playerName(p).toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : [];

  async function run(fn: () => Promise<{ error: { message: string } | null }>) {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) alert(error.message); else router.refresh();
  }
  const addExisting = (p: Player) => run(async () => supabase.from("team_players").insert({ team_id: teamId, player_id: p.id })).then(() => setQ(""));

  async function createNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const first = String(f.get("first")).trim(), last = String(f.get("last")).trim();
    const year = f.get("year") ? Number(f.get("year")) : null;
    const similar = register.find((p) => p.last_name.toLowerCase() === last.toLowerCase() && p.first_name.toLowerCase().slice(0, 3) === first.toLowerCase().slice(0, 3));
    if (similar && !confirm(`${label(similar)} is already in the club register. Create a separate new player anyway?\n\n(Cancel, then search above to add the existing record.)`)) return;
    const id = crypto.randomUUID();
    await run(async () => {
      const r = await supabase.from("players").insert({ id, first_name: first, last_name: last, birth_year: year });
      if (r.error) return r;
      return supabase.from("team_players").insert({ team_id: teamId, player_id: id });
    });
    form.reset();
  }

  async function bulkAdd() {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((l) => {
      const m = l.match(/^(.+?)[,\s]+(\d{4})$/);
      const name = (m ? m[1] : l).replace(/,$/, "").trim();
      const parts = name.split(/\s+/);
      return { first: parts[0], last: parts.slice(1).join(" ") || "-", year: m ? Number(m[2]) : null };
    });
    await run(async () => {
      for (const p of parsed) {
        const existing = register.find((r) => r.first_name.toLowerCase() === p.first.toLowerCase() && r.last_name.toLowerCase() === p.last.toLowerCase() && (!p.year || r.birth_year === p.year));
        const id = existing?.id ?? crypto.randomUUID();
        if (!existing) {
          const r = await supabase.from("players").insert({ id, first_name: p.first, last_name: p.last, birth_year: p.year });
          if (r.error) return r;
        }
        if (!inSquad.has(id)) {
          const r = await supabase.from("team_players").upsert({ team_id: teamId, player_id: id }, { ignoreDuplicates: true });
          if (r.error) return r;
        }
      }
      return { error: null };
    });
    setBulk("");
  }

  async function copyFrom(otherId: string) {
    if (!otherId || !confirm("Add every player from that team to this squad?")) return;
    await run(async () => {
      const { data, error } = await supabase.from("team_players").select("player_id").eq("team_id", otherId);
      if (error) return { error };
      const rows = (data ?? []).filter((r) => !inSquad.has(r.player_id)).map((r) => ({ team_id: teamId, player_id: r.player_id }));
      return rows.length ? supabase.from("team_players").insert(rows) : { error: null };
    });
  }

  const remove = (p: Player) => confirm(`Remove ${playerName(p)} from this squad? Their history is kept.`) &&
    run(async () => supabase.from("team_players").delete().eq("team_id", teamId).eq("player_id", p.id));

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <section className="card">
        <h2 className="h2 mb-2">Squad ({squad.length})</h2>
        {sorted.length === 0 ? <p className="muted">No players yet. Add them using the panel alongside.</p> : (
          <ul className="divide-y">
            {sorted.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link href={`/players/${p.id}`} className="font-semibold hover:text-club">{playerName(p)} {p.birth_year && <span className="font-normal text-slate-500">· {p.birth_year}</span>}</Link>
                <button onClick={() => remove(p)} className="text-sm text-red-600" disabled={busy}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-4">
        <section className="card space-y-2">
          <h3 className="font-bold">Add from club register</h3>
          <p className="muted">Search first so each child keeps one record across teams and years.</p>
          <input className="input" placeholder="Type a name…" value={q} onChange={(e) => setQ(e.target.value)} />
          {matches.map((p) => (
            <button key={p.id} onClick={() => addExisting(p)} disabled={busy} className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:border-club">
              <span>{label(p)}</span><span className="font-semibold text-club">Add</span>
            </button>
          ))}
          {q.trim().length >= 2 && !matches.length && <p className="text-sm text-slate-500">No match in the register. Add them as a new player below.</p>}
        </section>

        <form onSubmit={createNew} className="card space-y-2">
          <h3 className="font-bold">New player</h3>
          <div className="grid grid-cols-2 gap-2">
            <input name="first" required className="input" placeholder="First name" />
            <input name="last" required className="input" placeholder="Surname" />
          </div>
          <input name="year" type="number" min={1950} max={2100} className="input" placeholder="Year of birth (for age grade)" />
          <button className="btn w-full" disabled={busy}>Add new player</button>
        </form>

        {otherTeams.length > 0 && (
          <section className="card space-y-2">
            <h3 className="font-bold">Copy squad from another team</h3>
            <p className="muted">Handy at the start of a season: bring last year&apos;s group up.</p>
            <select className="input" value="" onChange={(e) => copyFrom(e.target.value)}>
              <option value="">Choose team…</option>
              {otherTeams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.season})</option>)}
            </select>
          </section>
        )}

        <details className="card">
          <summary className="cursor-pointer font-bold">Paste a list</summary>
          <p className="muted my-2">One per line, e.g. <code>John Doe, 2013</code>. Existing register entries are reused.</p>
          <textarea className="input font-mono" rows={6} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button className="btn mt-2" disabled={busy || !bulk.trim()} onClick={bulkAdd}>Add all</button>
        </details>
      </div>
    </div>
  );
}
