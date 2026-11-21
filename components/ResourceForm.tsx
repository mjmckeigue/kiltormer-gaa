"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Resource, ResourceKind, Tag } from "@/lib/types";

type Props = { ages: Tag[]; cats: Tag[]; existing?: Resource };

export default function ResourceForm({ ages, cats, existing }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState<ResourceKind>(existing?.kind ?? "pdf");
  const [videoSource, setVideoSource] = useState<"link" | "upload">(existing?.storage_path ? "upload" : "link");
  const [ageIds, setAgeIds] = useState<number[]>(existing?.resource_age_groups.map((a) => a.age_group_id) ?? []);
  const [catIds, setCatIds] = useState<number[]>(existing?.resource_categories.map((c) => c.category_id) ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const needsFile = kind === "pdf" || kind === "file" || (kind === "video" && videoSource === "upload");
  const toggle = (list: number[], set: (v: number[]) => void, id: number) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const file = f.get("file") as File | null;
    if (!ageIds.length || !catIds.length) return setErr("Pick at least one age group and one category.");
    if (needsFile && !existing?.storage_path && (!file || !file.size)) return setErr("Choose a file to upload.");
    setBusy(true); setErr("");
    const supabase = createClient();
    try {
      const id = existing?.id ?? crypto.randomUUID();
      let storage_path = needsFile ? existing?.storage_path ?? null : null;
      let file_name = needsFile ? existing?.file_name ?? null : null;
      if (needsFile && file && file.size) {
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${id}/${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from("resources").upload(path, file, { contentType: file.type || undefined });
        if (error) throw new Error(`Upload failed: ${error.message}`);
        if (existing?.storage_path) await supabase.storage.from("resources").remove([existing.storage_path]);
        storage_path = path; file_name = file.name;
      } else if (!needsFile && existing?.storage_path) {
        await supabase.storage.from("resources").remove([existing.storage_path]);
      }
      const row = {
        id, kind, storage_path, file_name,
        title: String(f.get("title")).trim(),
        description: String(f.get("description") ?? "").trim(),
        url: needsFile ? (String(f.get("url") ?? "").trim() || null) : String(f.get("url") ?? "").trim(),
      };
      const { error } = await supabase.from("resources").upsert(row);
      if (error) throw error;
      await supabase.from("resource_age_groups").delete().eq("resource_id", id);
      await supabase.from("resource_categories").delete().eq("resource_id", id);
      const r1 = await supabase.from("resource_age_groups").insert(ageIds.map((a) => ({ resource_id: id, age_group_id: a })));
      const r2 = await supabase.from("resource_categories").insert(catIds.map((c) => ({ resource_id: id, category_id: c })));
      if (r1.error || r2.error) throw r1.error ?? r2.error;
      router.push(`/hub/${id}`); router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Title</label>
          <input name="title" required defaultValue={existing?.title} className="input" placeholder="e.g. U8 first touch – roll & lift" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description / coaching points</label>
          <textarea name="description" rows={3} defaultValue={existing?.description} className="input" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ResourceKind)}>
            <option value="pdf">PDF document</option>
            <option value="video">Video</option>
            <option value="link">External link</option>
            <option value="file">Other file (Word, Excel, image…)</option>
          </select>
        </div>
        {kind === "video" && (
          <div>
            <label className="label">Video source</label>
            <select className="input" value={videoSource} onChange={(e) => setVideoSource(e.target.value as "link" | "upload")}>
              <option value="link">YouTube / Vimeo link (recommended)</option>
              <option value="upload">Upload a short clip</option>
            </select>
          </div>
        )}
        {needsFile ? (
          <div className="sm:col-span-2">
            <label className="label">File {existing?.file_name && <span className="font-normal text-slate-500">(current: {existing.file_name}, leave empty to keep)</span>}</label>
            <input name="file" type="file" className="input" accept={kind === "pdf" ? "application/pdf" : kind === "video" ? "video/*" : undefined} />
            {kind === "video" && <p className="mt-1 text-xs text-slate-500">Keep uploads short. Long videos are better as unlisted YouTube links.</p>}
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="label">{kind === "video" ? "YouTube or Vimeo link" : "Link"}</label>
            <input name="url" type="url" required defaultValue={existing?.url ?? ""} className="input" placeholder="https://" />
          </div>
        )}
      </div>

      <div>
        <p className="label">Age groups</p>
        <div className="flex flex-wrap gap-1.5">
          {ages.map((a) => (
            <button type="button" key={a.id} onClick={() => toggle(ageIds, setAgeIds, a.id)} className={`chip ${ageIds.includes(a.id) ? "chip-on" : "chip-off"}`}>{a.name}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Categories</p>
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button type="button" key={c.id} onClick={() => toggle(catIds, setCatIds, c.id)} className={`chip ${catIds.includes(c.id) ? "chip-on" : "chip-off"}`}>{c.name}</button>
          ))}
        </div>
      </div>
      {err && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : existing ? "Save changes" : "Add to hub"}</button>
    </form>
  );
}
