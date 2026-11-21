"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; role: string; name: string; email: string };

export default function CoachManager({ teamId, members, isOwner, me }: { teamId: string; members: Member[]; isOwner: boolean; me: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const { data, error } = await supabase.rpc("find_coach", { lookup_email: email });
    if (error) return setMsg(error.message);
    const found = (data as { id: string; full_name: string }[])?.[0];
    if (!found) return setMsg("No approved coach with that email. They need to sign up and be approved by a club admin first.");
    if (members.some((m) => m.id === found.id)) return setMsg("Already on this team.");
    const r = await supabase.from("team_members").insert({ team_id: teamId, user_id: found.id, role: "coach" });
    if (r.error) return setMsg(r.error.message);
    setEmail(""); setMsg(`${found.full_name || email} added.`); router.refresh();
  }
  async function remove(m: Member) {
    const self = m.id === me;
    if (!confirm(self ? "Leave this team? You'll lose access to it." : `Remove ${m.name || m.email} from this team?`)) return;
    const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", m.id);
    if (error) return alert(error.message);
    if (self) router.push("/teams"); else router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card">
        <h2 className="h2 mb-2">Management team</h2>
        <ul className="divide-y">
          {members.sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name))).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span><span className="font-semibold">{m.name || m.email}</span> <span className="text-xs font-semibold uppercase text-slate-400">{m.role}</span><br /><span className="text-xs text-slate-500">{m.email}</span></span>
              {m.role !== "owner" && (isOwner || m.id === me) && (
                <button onClick={() => remove(m)} className="text-sm text-red-600">{m.id === me ? "Leave" : "Remove"}</button>
              )}
            </li>
          ))}
        </ul>
      </section>
      {isOwner ? (
        <form onSubmit={add} className="card space-y-2">
          <h2 className="h2">Add a coach</h2>
          <p className="muted">They must have signed up and been approved. Only coaches you add can see this team.</p>
          <input type="email" required className="input" placeholder="coach@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn">Add to team</button>
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </form>
      ) : (
        <p className="card muted">Only the team owner can add or remove coaches.</p>
      )}
    </div>
  );
}
