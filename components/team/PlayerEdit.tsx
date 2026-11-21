"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Player } from "@/lib/types";

export default function PlayerEdit({ player }: { player: Player }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().from("players").update({
      first_name: String(f.get("first")).trim(), last_name: String(f.get("last")).trim(),
      birth_year: f.get("year") ? Number(f.get("year")) : null,
    }).eq("id", player.id);
    if (error) return alert(error.message);
    setOpen(false); router.refresh();
  }
  if (!open) return <button className="btn-ghost" onClick={() => setOpen(true)}>Edit details</button>;
  return (
    <form onSubmit={save} className="card flex flex-wrap items-end gap-2">
      <input name="first" defaultValue={player.first_name} className="input w-32" required />
      <input name="last" defaultValue={player.last_name} className="input w-36" required />
      <input name="year" type="number" defaultValue={player.birth_year ?? ""} className="input w-24" placeholder="Year" />
      <button className="btn">Save</button>
      <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
