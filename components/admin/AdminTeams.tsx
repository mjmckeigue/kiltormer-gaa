"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Row = { id: string; name: string; season: number; code: string; archived: boolean; owner_name: string; owner_email: string; coaches: number };

export default function AdminTeams({ teams, coaches }: { teams: Row[]; coaches: Profile[] }) {
  const router = useRouter();
  async function transfer(team: Row, newOwner: string) {
    const c = coaches.find((x) => x.id === newOwner);
    if (!c || !confirm(`Make ${c.full_name || c.email} the owner of ${team.name}?`)) return;
    const { error } = await createClient().rpc("transfer_team", { t: team.id, new_owner: newOwner });
    if (error) alert(error.message); else router.refresh();
  }
  return (
    <div className="space-y-3">
      <p className="muted">As club admin you can open any team. Content editors and other coaches can&apos;t. Reassign the owner here if a coach steps away.</p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-2">Team</th><th className="px-4 py-2">Season</th><th className="px-4 py-2">Owner</th><th className="px-4 py-2">Coaches</th><th className="px-4 py-2">Reassign owner</th></tr>
          </thead>
          <tbody className="divide-y">
            {teams.map((t) => (
              <tr key={t.id} className={t.archived ? "text-slate-400" : ""}>
                <td className="px-4 py-2 font-semibold"><Link href={`/teams/${t.id}`} className="hover:text-club">{t.name}</Link> <span className="font-normal text-slate-500">· {t.code}</span></td>
                <td className="px-4 py-2">{t.season}</td>
                <td className="px-4 py-2">{t.owner_name || t.owner_email}</td>
                <td className="px-4 py-2">{t.coaches}</td>
                <td className="px-4 py-2">
                  <select className="input py-1" value="" onChange={(e) => transfer(t, e.target.value)}>
                    <option value="">Choose coach…</option>
                    {coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!teams.length && <tr><td colSpan={5} className="px-4 py-6 text-center muted">No teams yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
