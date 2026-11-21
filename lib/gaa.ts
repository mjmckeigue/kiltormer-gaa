import type { Player, Status, TeamEvent } from "./types";

export const STATUSES: { key: Status; label: string; short: string; cls: string }[] = [
  { key: "available", label: "Available", short: "✓", cls: "bg-green-600 text-white" },
  { key: "injured", label: "Injured", short: "Inj", cls: "bg-orange-500 text-white" },
  { key: "sick", label: "Sick", short: "Sick", cls: "bg-yellow-400 text-black" },
  { key: "excused", label: "Excused", short: "Exc", cls: "bg-slate-400 text-white" },
  { key: "absent", label: "Absent", short: "✗", cls: "bg-red-600 text-white" },
];
export const statusInfo = (s: Status) => STATUSES.find((x) => x.key === s)!;

export const CODES = ["Hurling", "Camogie", "Football", "Ladies Football"];
export const FORMATS = [15, 13, 11, 9, 7];

/** Rows of positions from goalkeeper outwards, for each players-a-side format. */
export const FORMATIONS: Record<number, { label: string; slots: number[] }[]> = {
  15: [
    { label: "Goalkeeper", slots: [1] }, { label: "Full-back line", slots: [2, 3, 4] },
    { label: "Half-back line", slots: [5, 6, 7] }, { label: "Midfield", slots: [8, 9] },
    { label: "Half-forward line", slots: [10, 11, 12] }, { label: "Full-forward line", slots: [13, 14, 15] },
  ],
  13: [
    { label: "Goalkeeper", slots: [1] }, { label: "Full-back line", slots: [2, 3, 4] },
    { label: "Half-back line", slots: [5, 6] }, { label: "Midfield", slots: [7, 8] },
    { label: "Half-forward line", slots: [9, 10] }, { label: "Full-forward line", slots: [11, 12, 13] },
  ],
  11: [
    { label: "Goalkeeper", slots: [1] }, { label: "Backs", slots: [2, 3, 4] },
    { label: "Half-backs", slots: [5, 6] }, { label: "Midfield", slots: [7, 8] }, { label: "Forwards", slots: [9, 10, 11] },
  ],
  9: [
    { label: "Goalkeeper", slots: [1] }, { label: "Backs", slots: [2, 3, 4] },
    { label: "Midfield", slots: [5, 6] }, { label: "Forwards", slots: [7, 8, 9] },
  ],
  7: [
    { label: "Goalkeeper", slots: [1] }, { label: "Backs", slots: [2, 3] },
    { label: "Midfield", slots: [4, 5] }, { label: "Forwards", slots: [6, 7] },
  ],
};

type Row = { label: string; slots: number[] };
const LINE_LABELS: Record<number, string[]> = {
  1: ["Outfield"],
  2: ["Backs", "Forwards"],
  3: ["Backs", "Midfield", "Forwards"],
  4: ["Full-back line", "Half-back line", "Midfield", "Forwards"],
  5: ["Full-back line", "Half-back line", "Midfield", "Half-forward line", "Full-forward line"],
};
/** Positions for any number of players (training sides can be any size). Standard GAA shapes where they exist. */
export function formationFor(n: number): Row[] {
  if (n <= 0) return [];
  if (FORMATIONS[n]) return FORMATIONS[n];
  if (n === 1) return [{ label: "Goalkeeper", slots: [1] }];
  const rem = Math.min(n, 30) - 1;
  const lines = rem <= 3 ? 1 : rem <= 5 ? 2 : rem <= 8 ? 3 : rem <= 11 ? 4 : 5;
  const sizes = Array(lines).fill(Math.floor(rem / lines));
  const order = [0, lines - 1, 1, lines - 2, 2];
  for (let i = 0; i < rem % lines; i++) sizes[order[i]]++;
  const rows: Row[] = [{ label: "Goalkeeper", slots: [1] }];
  let next = 2;
  sizes.forEach((size, i) => {
    rows.push({ label: LINE_LABELS[lines][i], slots: Array.from({ length: size }, () => next++) });
  });
  return rows;
}

export const playerName = (p: Pick<Player, "first_name" | "last_name">) => `${p.first_name} ${p.last_name}`;
export const byName = (a: Player, b: Player) =>
  a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name);

export function scoreLine(g: number | null, p: number | null) {
  if (g == null && p == null) return "–";
  const goals = g ?? 0, points = p ?? 0;
  return `${goals}-${String(points).padStart(2, "0")} (${goals * 3 + points})`;
}

export function result(e: TeamEvent): "W" | "D" | "L" | null {
  if (e.our_goals == null && e.our_points == null) return null;
  const us = (e.our_goals ?? 0) * 3 + (e.our_points ?? 0);
  const them = (e.opp_goals ?? 0) * 3 + (e.opp_points ?? 0);
  return us > them ? "W" : us < them ? "L" : "D";
}

export function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Split players into n even sides. 'age' mode deals oldest→youngest in a snake so sides are age-balanced. */
export function splitSides(players: Player[], n: number, mode: "random" | "age"): Player[][] {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const ordered = mode === "age" ? shuffled.sort((a, b) => (a.birth_year ?? 9999) - (b.birth_year ?? 9999)) : shuffled;
  const sides: Player[][] = Array.from({ length: n }, () => []);
  ordered.forEach((p, i) => {
    const round = Math.floor(i / n), pos = i % n;
    sides[round % 2 === 0 ? pos : n - 1 - pos].push(p);
  });
  return sides;
}
