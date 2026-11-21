import type { Metadata } from "next";
import Link from "next/link";
import ResourceForm from "@/components/ResourceForm";
import AdminUsers from "@/components/admin/AdminUsers";
import TagEditor from "@/components/admin/TagEditor";
import AdminTeams from "@/components/admin/AdminTeams";
import PlayerMerge from "@/components/admin/PlayerMerge";
import { requireUser } from "@/lib/supabase/server";
import type { Player, Profile, Tag } from "@/lib/types";

export const metadata: Metadata = { title: "Admin" };
const TABS = [
  { key: "users", label: "Coaches & access", adminOnly: true },
  { key: "resources", label: "Resources", adminOnly: false },
  { key: "tags", label: "Age groups & categories", adminOnly: false },
  { key: "teams", label: "Teams", adminOnly: true },
  { key: "players", label: "Player register", adminOnly: true },
];

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const { supabase, user, profile } = await requireUser({ content: true });
  const isAdmin = profile.role === "admin";
  const tabs = TABS.filter((t) => isAdmin || !t.adminOnly);
  const sp = await searchParams;
  const tab = tabs.some((t) => t.key === sp.tab) ? String(sp.tab) : tabs[0].key;

  let body: React.ReactNode = null;
  if (tab === "users") {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    body = <AdminUsers users={(data ?? []) as Profile[]} me={user.id} />;
  } else if (tab === "resources") {
    const [{ data: ages }, { data: cats }, { data: list }] = await Promise.all([
      supabase.from("age_groups").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("resources").select("id, title, kind, created_at").order("created_at", { ascending: false }),
    ]);
    body = (
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div><h2 className="h2 mb-2">Add a resource</h2><ResourceForm ages={(ages ?? []) as Tag[]} cats={(cats ?? []) as Tag[]} /></div>
        <div>
          <h2 className="h2 mb-2">All resources ({list?.length ?? 0})</h2>
          <ul className="card divide-y p-0">
            {(list ?? []).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm">
                <Link href={`/hub/${r.id}`} className="font-semibold hover:text-club">{r.title}</Link>
                <span className="flex items-center gap-2"><span className="tag uppercase">{r.kind}</span><Link href={`/hub/${r.id}/edit`} className="text-club">Edit</Link></span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  } else if (tab === "tags") {
    const [{ data: ages }, { data: cats }] = await Promise.all([
      supabase.from("age_groups").select("*").order("sort_order"),
      supabase.from("categories").select("*").order("sort_order"),
    ]);
    body = (
      <div className="grid gap-6 md:grid-cols-2">
        <TagEditor table="age_groups" title="Age groups" tags={(ages ?? []) as Tag[]} />
        <TagEditor table="categories" title="Categories" tags={(cats ?? []) as Tag[]} />
      </div>
    );
  } else if (tab === "teams") {
    const [{ data: teams }, { data: coaches }] = await Promise.all([
      supabase.rpc("admin_team_list"),
      supabase.from("profiles").select("*").in("role", ["coach", "editor", "admin"]).order("full_name"),
    ]);
    body = <AdminTeams teams={teams ?? []} coaches={(coaches ?? []) as Profile[]} />;
  } else {
    const { data } = await supabase.from("players").select("*").order("last_name").order("first_name");
    body = <PlayerMerge players={(data ?? []) as Player[]} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="h1">{isAdmin ? "Club admin" : "Manage content"}</h1>
      <div className="flex overflow-x-auto border-b">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin?tab=${t.key}`} className={`tab ${t.key === tab ? "border-club text-club" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</Link>
        ))}
      </div>
      {body}
    </div>
  );
}
