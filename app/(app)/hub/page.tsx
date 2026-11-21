import type { Metadata } from "next";
import HubBrowser from "@/components/HubBrowser";
import { requireUser } from "@/lib/supabase/server";
import type { Resource, Tag } from "@/lib/types";

export const metadata: Metadata = { title: "Resource Hub" };

export default async function HubPage({ searchParams }: PageProps<"/hub">) {
  const { supabase, profile } = await requireUser();
  const sp = await searchParams;
  const [{ data: resources }, { data: ages }, { data: cats }] = await Promise.all([
    supabase.from("resources").select("*, resource_age_groups(age_group_id), resource_categories(category_id)").order("created_at", { ascending: false }),
    supabase.from("age_groups").select("*").order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  const num = (v: string | string[] | undefined) => (typeof v === "string" && v ? Number(v) : null);
  return (
    <HubBrowser
      resources={(resources ?? []) as Resource[]}
      ages={(ages ?? []) as Tag[]}
      cats={(cats ?? []) as Tag[]}
      isAdmin={profile.role === "admin" || profile.role === "editor"}
      initial={{ age: num(sp.age), cat: num(sp.cat), kind: typeof sp.kind === "string" ? sp.kind : "" }}
    />
  );
}
