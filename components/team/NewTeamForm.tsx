"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CODES, FORMATS } from "@/lib/gaa";
import type { Tag } from "@/lib/types";

export default function NewTeamForm({ ages, userId }: { ages: Tag[]; userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const year = new Date().getFullYear();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    setBusy(true);
    const { error } = await createClient().from("teams").insert({
      id, owner_id: userId, name: String(f.get("name")).trim(), season: Number(f.get("season")),
      code: String(f.get("code")), default_format: Number(f.get("format")),
      age_group_id: f.get("age") ? Number(f.get("age")) : null,
    });
    setBusy(false);
    if (error) return alert(error.message);
    router.push(`/teams/${id}/squad`);
  }

  if (!open) return <button className="btn" onClick={() => setOpen(true)}>+ Set up a new team</button>;
  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="h2 sm:col-span-2">New team</h2>
      <div className="sm:col-span-2"><label className="label">Team name</label><input name="name" required className="input" placeholder={`e.g. U12 Hurling ${year}`} /></div>
      <div><label className="label">Age group</label>
        <select name="age" className="input"><option value="">—</option>{ages.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      <div><label className="label">Code</label><select name="code" className="input">{CODES.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><label className="label">Season</label><input name="season" type="number" defaultValue={year} className="input" /></div>
      <div><label className="label">Usual match format</label>
        <select name="format" className="input" defaultValue={15}>{FORMATS.map((n) => <option key={n} value={n}>{n}-a-side</option>)}</select></div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create team"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
