"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Resource, Tag } from "@/lib/types";
import { thumbnail } from "@/lib/video";

const KINDS = [
  { key: "pdf", label: "PDFs", icon: "📄", band: "bg-red-600" },
  { key: "video", label: "Videos", icon: "▶", band: "bg-club" },
  { key: "link", label: "Links", icon: "🔗", band: "bg-emerald-600" },
  { key: "file", label: "Other files", icon: "📁", band: "bg-slate-600" },
];
export const kindInfo = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[3];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`chip ${on ? "chip-on" : "chip-off"}`}>{children}</button>;
}

type Props = {
  resources: Resource[]; ages: Tag[]; cats: Tag[]; isAdmin: boolean;
  initial: { age: number | null; cat: number | null; kind: string };
};

export default function HubBrowser({ resources, ages, cats, isAdmin, initial }: Props) {
  const [age, setAge] = useState<number | null>(initial.age);
  const [cat, setCat] = useState<number | null>(initial.cat);
  const [kind, setKind] = useState(initial.kind);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "az">("new");

  const allAges = ages.find((a) => a.name.toLowerCase() === "all ages")?.id;
  const ageName = new Map(ages.map((a) => [a.id, a.name]));
  const catName = new Map(cats.map((c) => [c.id, c.name]));

  function sync(next: { age?: number | null; cat?: number | null; kind?: string }) {
    const p = new URLSearchParams();
    const a = next.age !== undefined ? next.age : age, c = next.cat !== undefined ? next.cat : cat, k = next.kind ?? kind;
    if (a) p.set("age", String(a)); if (c) p.set("cat", String(c)); if (k) p.set("kind", k);
    window.history.replaceState(null, "", `/hub${p.size ? `?${p}` : ""}`);
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return resources
      .filter((r) => {
        const rAges = r.resource_age_groups.map((x) => x.age_group_id);
        if (age && !rAges.includes(age) && !(allAges && rAges.includes(allAges))) return false;
        if (cat && !r.resource_categories.some((x) => x.category_id === cat)) return false;
        if (kind && r.kind !== kind) return false;
        if (term && !`${r.title} ${r.description}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) => (sort === "az" ? a.title.localeCompare(b.title) : b.created_at.localeCompare(a.created_at)));
  }, [resources, age, cat, kind, q, sort, allAges]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="h1">Resource Hub</h1>
          <p className="muted">Drills, session plans, videos and checklists. Filter by age group and category.</p>
        </div>
        {isAdmin && <Link href="/admin?tab=resources" className="btn">+ Add resource</Link>}
      </div>

      <div className="card space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className="input" placeholder="Search titles and descriptions…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input sm:w-44" value={sort} onChange={(e) => setSort(e.target.value as "new" | "az")}>
            <option value="new">Newest first</option>
            <option value="az">A–Z</option>
          </select>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Age group</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!age} onClick={() => { setAge(null); sync({ age: null }); }}>Any</Chip>
            {ages.filter((a) => a.id !== allAges).map((a) => (
              <Chip key={a.id} on={age === a.id} onClick={() => { const v = age === a.id ? null : a.id; setAge(v); sync({ age: v }); }}>{a.name}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Category</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!cat} onClick={() => { setCat(null); sync({ cat: null }); }}>Any</Chip>
            {cats.map((c) => (
              <Chip key={c.id} on={cat === c.id} onClick={() => { const v = cat === c.id ? null : c.id; setCat(v); sync({ cat: v }); }}>{c.name}</Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Type</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={!kind} onClick={() => { setKind(""); sync({ kind: "" }); }}>Any</Chip>
            {KINDS.map((k) => (
              <Chip key={k.key} on={kind === k.key} onClick={() => { const v = kind === k.key ? "" : k.key; setKind(v); sync({ kind: v }); }}>{k.icon} {k.label}</Chip>
            ))}
          </div>
        </div>
      </div>

      <p className="muted">{shown.length} resource{shown.length === 1 ? "" : "s"}{age ? ` for ${ageName.get(age)}` : ""}{cat ? ` · ${catName.get(cat)}` : ""}</p>

      {shown.length === 0 ? (
        <div className="card text-center muted">Nothing matches those filters yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => {
            const k = kindInfo(r.kind);
            const thumb = thumbnail(r.url);
            return (
              <Link key={r.id} href={`/hub/${r.id}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="aspect-video w-full object-cover" />
                ) : (
                  <div className={`flex aspect-[3/1] items-center justify-center text-4xl text-white ${k.band}`}>{k.icon}</div>
                )}
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold leading-snug group-hover:text-club">{r.title}</h3>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{r.kind}</span>
                  </div>
                  {r.description && <p className="line-clamp-2 text-sm text-slate-600">{r.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {r.resource_categories.map((c) => <span key={c.category_id} className="tag">{catName.get(c.category_id)}</span>)}
                    {r.resource_age_groups.map((a) => (
                      <span key={a.age_group_id} className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{ageName.get(a.age_group_id)}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
