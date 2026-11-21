"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { playerName } from "@/lib/gaa";
import type { Player } from "@/lib/types";

export default function PlayerMerge({ players }: { players: Player[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [keep, setKeep] = useState("");
  const [drop, setDrop] = useState("");

  const dupes = useMemo(() => {
    const groups = new Map<string, Player[]>();
    players.forEach((p) => {
      const k = `${p.last_name.trim().toLowerCase()}|${p.birth_year ?? ""}`;
      groups.set(k, [...(groups.get(k) ?? []), p]);
    });
    return [...groups.values()].filter((g) => g.length > 1);
  }, [players]);
  const shown = players.filter((p) => playerName(p).toLowerCase().includes(q.toLowerCase())).slice(0, 200);
  const label = (p: Player) => `${playerName(p)}${p.birth_year ? ` (${p.birth_year})` : ""}`;

  async function merge() {
    const k = players.find((p) => p.id === keep), d = players.find((p) => p.id === drop);
    if (!k || !d || !confirm(`Merge "${label(d)}" into "${label(k)}"? All squads, attendance and picks move across. This can't be undone.`)) return;
    const { error } = await createClient().rpc("merge_players", { keep_id: keep, drop_id: drop });
    if (error) return alert(error.message);
    setKeep(""); setDrop(""); router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-3">
        <h2 className="h2">Merge duplicate players</h2>
        <p className="muted">If the same child was added twice (e.g. &ldquo;Jon&rdquo; and &ldquo;John&rdquo;), merge them so their history stays in one place.</p>
        <div><label className="label">Keep this record</label>
          <select className="input" value={keep} onChange={(e) => setKeep(e.target.value)}>
            <option value="">Select…</option>{players.map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
          </select></div>
        <div><label className="label">Merge in and remove this duplicate</label>
          <select className="input" value={drop} onChange={(e) => setDrop(e.target.value)}>
            <option value="">Select…</option>{players.filter((p) => p.id !== keep).map((p) => <option key={p.id} value={p.id}>{label(p)}</option>)}
          </select></div>
        <button className="btn" disabled={!keep || !drop} onClick={merge}>Merge</button>
        {dupes.length > 0 && (
          <div className="rounded-lg bg-yellow-50 p-3 text-sm">
            <p className="mb-1 font-semibold text-yellow-900">Possible duplicates (same surname and birth year)</p>
            <ul className="list-disc pl-5 text-yellow-900">{dupes.map((g, i) => <li key={i}>{g.map(label).join(" / ")}</li>)}</ul>
          </div>
        )}
      </section>
      <section className="card space-y-3">
        <h2 className="h2">Register ({players.length})</h2>
        <input className="input" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-96 divide-y overflow-y-auto text-sm">
          {shown.map((p) => <li key={p.id} className="py-1.5"><Link href={`/players/${p.id}`} className="hover:text-club">{label(p)}</Link></li>)}
        </ul>
      </section>
    </div>
  );
}
