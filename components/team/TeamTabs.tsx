"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeamTabs({ id, isOwner }: { id: string; isOwner: boolean }) {
  const path = usePathname();
  const base = `/teams/${id}`;
  const tabs = [
    { href: base, label: "Sessions" },
    { href: `${base}/history`, label: "History" },
    { href: `${base}/squad`, label: "Squad" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/results`, label: "Results" },
    { href: `${base}/coaches`, label: "Coaches" },
    { href: `${base}/settings`, label: isOwner ? "Settings" : "Team info" },
  ];
  return (
    <div className="flex overflow-x-auto border-b">
      {tabs.map((t) => {
        const on = t.href === base ? path === base || path.startsWith(`${base}/events`) : path.startsWith(t.href);
        return <Link key={t.href} href={t.href} className={`tab ${on ? "border-club text-club" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</Link>;
      })}
    </div>
  );
}
