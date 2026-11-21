import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* called from a Server Component: the proxy refreshes sessions */
          }
        },
      },
    },
  );
}

/** Loads the signed-in user's profile; sends them to login / pending as needed. */
/** opts.admin: club admin only. opts.content: admin or content editor. */
export async function requireUser(opts: { admin?: boolean; content?: boolean } = {}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile || profile.role === "pending" || profile.role === "disabled") redirect("/pending");
  if (opts.admin && profile.role !== "admin") redirect("/");
  if (opts.content && profile.role !== "admin" && profile.role !== "editor") redirect("/");
  return { supabase, user, profile };
}
