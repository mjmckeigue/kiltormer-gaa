import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";

export default async function Pending() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (p && ["coach", "editor", "admin"].includes(p.role)) redirect("/");
  const disabled = p?.role === "disabled";
  const first = p?.full_name ? `, ${p.full_name.split(" ")[0]}` : "";
  return (
    <AuthShell title={disabled ? "Access paused" : "Awaiting approval"}>
      <p className="text-center text-sm text-slate-600">
        {disabled
          ? "Your access has been paused by a club admin. Contact the club if you think this is a mistake."
          : `Thanks${first}. Your account is registered. A club admin needs to approve it before you can see coaching resources and teams.`}
      </p>
      <form action="/auth/signout" method="post" className="mt-5">
        <button className="btn-ghost w-full">Sign out</button>
      </form>
    </AuthShell>
  );
}
