"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";

const BADGE: Record<Role, string> = {
  pending: "bg-yellow-100 text-yellow-800", coach: "bg-green-100 text-green-800", editor: "bg-purple-100 text-purple-800",
  admin: "bg-club-light text-club-dark", disabled: "bg-slate-200 text-slate-600",
};

export default function AdminUsers({ users, me }: { users: Profile[]; me: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const order: Role[] = ["pending", "admin", "editor", "coach", "disabled"];
  const LABEL: Record<Role, string> = { pending: "pending", coach: "coach", editor: "content editor", admin: "club admin", disabled: "revoked" };
  const sorted = [...users].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.full_name.localeCompare(b.full_name));

  async function setRole(id: string, role: Role) {
    if (role === "admin" && !confirm("Make this person a club admin? They will see inside every team (players, attendance, results) and can manage users.")) return;
    setBusy(id);
    const { error } = await createClient().rpc("set_user_role", { target: id, new_role: role });
    setBusy(null);
    if (error) alert(error.message); else router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="muted">New sign-ups wait here until approved. Approve only people you know are club coaches with Garda vetting in place.</p>
      <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
        <p className="rounded-lg bg-white p-2 ring-1 ring-slate-200"><b>Coach</b>: Resource Hub plus the teams they create or are added to.</p>
        <p className="rounded-lg bg-white p-2 ring-1 ring-slate-200"><b>Content editor</b>: coach, plus adds and edits Resource Hub content and tags. Cannot see inside other teams.</p>
        <p className="rounded-lg bg-white p-2 ring-1 ring-slate-200"><b>Club admin</b>: everything, including inside every team, approving users and the player register.</p>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Access</th><th className="px-4 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((u) => (
              <tr key={u.id} className={u.role === "pending" ? "bg-yellow-50/50" : ""}>
                <td className="px-4 py-2 font-semibold">{u.full_name || "—"}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BADGE[u.role]}`}>{LABEL[u.role]}</span></td>
                <td className="px-4 py-2">
                  {u.id === me ? <span className="block text-right muted">You</span> : (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {u.role === "pending" && <button disabled={busy === u.id} onClick={() => setRole(u.id, "coach")} className="btn px-3 py-1">Approve</button>}
                      {u.role === "disabled" && <button disabled={busy === u.id} onClick={() => setRole(u.id, "coach")} className="btn px-3 py-1">Restore</button>}
                      {(u.role === "editor" || u.role === "admin") && <button disabled={busy === u.id} onClick={() => setRole(u.id, "coach")} className="btn-ghost px-3 py-1">Make coach only</button>}
                      {(u.role === "coach" || u.role === "admin") && <button disabled={busy === u.id} onClick={() => setRole(u.id, "editor")} className="btn-ghost px-3 py-1">Make content editor</button>}
                      {(u.role === "coach" || u.role === "editor") && <button disabled={busy === u.id} onClick={() => setRole(u.id, "admin")} className="btn-ghost px-3 py-1">Make club admin</button>}
                      {u.role !== "disabled" && <button disabled={busy === u.id} onClick={() => setRole(u.id, "disabled")} className="btn-danger px-3 py-1">{u.role === "pending" ? "Reject" : "Revoke"}</button>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
