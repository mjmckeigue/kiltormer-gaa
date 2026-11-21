"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ adminLabel }: { adminLabel: string | null }) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Home" },
    { href: "/hub", label: "Resource Hub" },
    { href: "/teams", label: "My Teams" },
    ...(adminLabel ? [{ href: "/admin", label: adminLabel }] : []),
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {links.map((l) => {
        const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap ${on ? "bg-white text-club" : "text-white/90 hover:bg-white/15"}`}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
