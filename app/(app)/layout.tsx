import Image from "next/image";
import Link from "next/link";
import Nav from "@/components/Nav";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  return (
    <>
      <header className="bg-club text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/crest.png" alt="" width={34} height={42} />
            <span className="leading-tight">
              <span className="block text-base font-bold">Cill Tormóir</span>
              <span className="block text-[11px] uppercase tracking-widest text-white/80">Coaching Hub</span>
            </span>
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1"><Nav adminLabel={profile.role === "admin" ? "Admin" : profile.role === "editor" ? "Manage content" : null} /></div>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/90 md:inline">{profile.full_name || profile.email}</span>
            <form action="/auth/signout" method="post">
              <button className="rounded-lg border border-white/40 px-2.5 py-1 text-xs font-semibold hover:bg-white/15">Sign out</button>
            </form>
          </div>
        </div>
        <div className="h-1 bg-gold" />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="py-6 text-center text-xs text-slate-400">Kiltormer GAA · Cill Tormóir · For club coaches only</footer>
    </>
  );
}
