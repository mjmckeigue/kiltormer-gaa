import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteResource from "@/components/DeleteResource";
import { requireUser } from "@/lib/supabase/server";
import type { Resource } from "@/lib/types";
import { embedUrl } from "@/lib/video";

export default async function ResourcePage({ params }: PageProps<"/hub/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.from("resources")
    .select("*, resource_age_groups(age_groups(name)), resource_categories(categories(name))").eq("id", id).single();
  if (!data) notFound();
  const r = data as unknown as Omit<Resource, "resource_age_groups" | "resource_categories"> & {
    resource_age_groups: { age_groups: { name: string } }[];
    resource_categories: { categories: { name: string } }[];
  };
  let fileUrl: string | null = null;
  if (r.storage_path) {
    const { data: s } = await supabase.storage.from("resources").createSignedUrl(r.storage_path, 60 * 60);
    fileUrl = s?.signedUrl ?? null;
  }
  const embed = embedUrl(r.url);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link href="/hub" className="text-sm font-semibold text-club">← Resource Hub</Link>
      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="h1">{r.title}</h1>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.resource_categories.map((c, i) => <span key={i} className="tag">{c.categories?.name}</span>)}
              {r.resource_age_groups.map((a, i) => <span key={i} className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{a.age_groups?.name}</span>)}
            </div>
          </div>
          {(profile.role === "admin" || profile.role === "editor") && (
            <div className="flex gap-2">
              <Link href={`/hub/${r.id}/edit`} className="btn-ghost">Edit</Link>
              <DeleteResource id={r.id} path={r.storage_path} />
            </div>
          )}
        </div>
        {r.description && <p className="whitespace-pre-wrap text-slate-700">{r.description}</p>}
      </div>

      <div className="card">
        {embed ? (
          <iframe src={embed} className="aspect-video w-full rounded-lg" allow="fullscreen; picture-in-picture" allowFullScreen title={r.title} />
        ) : r.kind === "video" && fileUrl ? (
          <video src={fileUrl} controls playsInline className="w-full rounded-lg bg-black" />
        ) : r.kind === "pdf" && fileUrl ? (
          <iframe src={fileUrl} className="h-[75vh] w-full rounded-lg border" title={r.title} />
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {fileUrl && <a href={fileUrl} target="_blank" rel="noopener" className="btn">Open / download{r.file_name ? ` ${r.file_name}` : ""}</a>}
          {r.url && <a href={r.url} target="_blank" rel="noopener" className={fileUrl || embed ? "btn-ghost" : "btn"}>Open link ↗</a>}
        </div>
        {fileUrl && <p className="mt-2 text-xs text-slate-400">Download links are private and expire after an hour.</p>}
      </div>
    </div>
  );
}
