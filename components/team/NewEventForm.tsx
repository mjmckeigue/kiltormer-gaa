"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FORMATS } from "@/lib/gaa";
import type { EventKind } from "@/lib/types";

export default function NewEventForm({ teamId, defaultFormat }: { teamId: string; defaultFormat: number }) {
  const router = useRouter();
  const [kind, setKind] = useState<EventKind | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = crypto.randomUUID();
    setBusy(true);
    const { error } = await createClient().from("events").insert({
      id, team_id: teamId, kind,
      event_date: String(f.get("date")), start_time: f.get("time") || null,
      title: String(f.get("title") ?? "").trim(), competition: String(f.get("competition") ?? "").trim(),
      venue: kind === "match" ? String(f.get("venue")) : null,
      is_competitive: kind === "match" && f.get("competitive") === "on",
      format: kind === "match" ? Number(f.get("format")) : null,
    });
    setBusy(false);
    if (error) return alert(error.message);
    router.push(`/teams/${teamId}/events/${id}`);
  }

  if (!kind) return (
    <div className="flex flex-wrap gap-2">
      <button className="btn" onClick={() => setKind("training")}>+ Log training</button>
      <button className="btn-ghost" onClick={() => setKind("match")}>+ Add match</button>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={submit} className="card grid gap-3 sm:grid-cols-4">
      <h2 className="h2 sm:col-span-4">{kind === "match" ? "New match" : "New training session"}</h2>
      <div><label className="label">Date</label><input name="date" type="date" required defaultValue={today} className="input" /></div>
      <div><label className="label">Time</label><input name="time" type="time" className="input" /></div>
      <div className="sm:col-span-2"><label className="label">{kind === "match" ? "Opponent" : "Focus / title (optional)"}</label>
        <input name="title" required={kind === "match"} className="input" placeholder={kind === "match" ? "e.g. Killimordaly" : "e.g. Striking off both sides"} /></div>
      {kind === "match" && (<>
        <div><label className="label">Venue</label><select name="venue" className="input"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></div>
        <div><label className="label">Format</label><select name="format" defaultValue={defaultFormat} className="input">{FORMATS.map((n) => <option key={n} value={n}>{n}-a-side</option>)}</select></div>
        <div><label className="label">Competition</label><input name="competition" className="input" placeholder="e.g. League Div 2" /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input name="competitive" type="checkbox" defaultChecked className="h-4 w-4" /> Competitive game</label>
      </>)}
      <div className="flex gap-2 sm:col-span-4">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : "Create and take attendance"}</button>
        <button type="button" className="btn-ghost" onClick={() => setKind(null)}>Cancel</button>
      </div>
    </form>
  );
}
