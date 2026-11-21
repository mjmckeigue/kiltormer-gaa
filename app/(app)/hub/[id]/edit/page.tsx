import Link from "next/link";
import { notFound } from "next/navigation";
import ResourceForm from "@/components/ResourceForm";
import { requireUser } from "@/lib/supabase/server";
import type { Resource, Tag } from "@/lib/types";

export default async function EditResource({ params }: PageProps<"/hub/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireUser({ content: true });
  const [{ data: r }, { data: ages }, { data: cats }] = await Promise.all([
    supabase.from("resources").select("*, resource_age_groups(age_group_id), resource_categories(category_id)").eq("id", id).single(),
    supabase.from("age_groups").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  if (!r) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/hub/${id}`} className="text-sm font-semibold text-club">← Back</Link>
      <h1 className="h1">Edit resource</h1>
      <ResourceForm ages={(ages ?? []) as Tag[]} cats={(cats ?? []) as Tag[]} existing={r as Resource} />
    </div>
  );
}
