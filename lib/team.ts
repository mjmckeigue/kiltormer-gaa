import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { Team } from "@/lib/types";

/** Loads a team the signed-in user coaches (club admins can open any team). Anyone else gets a 404. */
export async function requireTeam(id: string) {
  const ctx = await requireUser();
  const [{ data: team }, { data: me }] = await Promise.all([
    ctx.supabase.from("teams").select("*").eq("id", id).maybeSingle<Team>(),
    ctx.supabase.from("team_members").select("role").eq("team_id", id).eq("user_id", ctx.user.id).maybeSingle(),
  ]);
  const isAdmin = ctx.profile.role === "admin";
  if (!team || (!me && !isAdmin)) notFound();
  return { ...ctx, team, isOwner: me?.role === "owner" || isAdmin, viewingAsAdmin: !me && isAdmin };
}
