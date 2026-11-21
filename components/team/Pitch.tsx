import type { ReactNode } from "react";

/** Green pitch with position rows; goalkeeper at the bottom, forwards at the top. */
export default function Pitch({ rows, render, compact = false }: {
  rows: { label: string; slots: number[] }[];
  render: (slot: number) => ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-gradient-to-b from-green-700 to-green-600 ${compact ? "space-y-1.5 p-2" : "space-y-2 p-3"}`}>
      {[...rows].reverse().map((r) => (
        <div key={r.label}>
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-widest text-white/70">{r.label}</p>
          <div className={`flex justify-center ${compact ? "gap-1" : "gap-2"}`}>
            {r.slots.map((s) => <div key={s} className={`w-full min-w-0 ${compact ? "max-w-28" : "max-w-44"}`}>{render(s)}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
