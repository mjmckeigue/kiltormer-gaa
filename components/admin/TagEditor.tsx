"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

export default function TagEditor({ table, title, tags }: { table: "age_groups" | "categories"; title: string; tags: Tag[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const supabase = createClient();
  const done = (error: { message: string } | null) => (error ? alert(error.message) : router.refresh());

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const max = Math.max(0, ...tags.map((t) => t.sort_order));
    const { error } = await supabase.from(table).insert({ name: name.trim(), sort_order: max + 1 });
    setName(""); done(error);
  }
  async function rename(t: Tag) {
    const n = prompt("Rename", t.name);
    if (n && n.trim() !== t.name) done((await supabase.from(table).update({ name: n.trim() }).eq("id", t.id)).error);
  }
  async function move(i: number, dir: -1 | 1) {
    const a = tags[i], b = tags[i + dir];
    if (!b) return;
    await supabase.from(table).update({ sort_order: b.sort_order }).eq("id", a.id);
    done((await supabase.from(table).update({ sort_order: a.sort_order }).eq("id", b.id)).error);
  }
  async function remove(t: Tag) {
    if (confirm(`Delete "${t.name}"? Resources keep their other tags.`)) done((await supabase.from(table).delete().eq("id", t.id)).error);
  }

  return (
    <section className="card">
      <h2 className="h2 mb-3">{title}</h2>
      <ul className="mb-3 divide-y">
        {tags.map((t, i) => (
          <li key={t.id} className="flex items-center justify-between py-1.5 text-sm">
            <span className="font-medium">{t.name}</span>
            <span className="flex gap-1 text-slate-500">
              <button onClick={() => move(i, -1)} className="px-1.5 hover:text-club" title="Move up">↑</button>
              <button onClick={() => move(i, 1)} className="px-1.5 hover:text-club" title="Move down">↓</button>
              <button onClick={() => rename(t)} className="px-1.5 hover:text-club">Rename</button>
              <button onClick={() => remove(t)} className="px-1.5 text-red-600">Delete</button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase().replace(/s$/, "")}`} />
        <button className="btn">Add</button>
      </form>
    </section>
  );
}
