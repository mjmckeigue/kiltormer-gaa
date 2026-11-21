"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FORMATIONS, FORMATS, STATUSES, byName, formatDate, formationFor, playerName, splitSides } from "@/lib/gaa";
import Pitch from "./Pitch";
import type { Grp, Player, Selection, Status, TeamEvent } from "@/lib/types";

type Props = { event: TeamEvent; teamName: string; players: Player[]; initialAttendance: Record<string, Status>; initialSelections: Selection[] };

export default function EventManager({ event, teamName, players, initialAttendance, initialSelections }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [att, setAtt] = useState(initialAttendance);
  const [err, setErr] = useState("");
  const sorted = useMemo(() => [...players].sort(byName), [players]);
  const available = sorted.filter((p) => att[p.id] === "available");
  const isMatch = event.kind === "match";

  async function setStatus(ids: string[], status: Status | null) {
    const prev = att;
    const next = { ...att };
    ids.forEach((id) => { if (status) next[id] = status; else delete next[id]; });
    setAtt(next); setErr("");
    const { error } = status
      ? await supabase.from("attendance").upsert(ids.map((player_id) => ({ event_id: event.id, player_id, status })))
      : await supabase.from("attendance").delete().eq("event_id", event.id).in("player_id", ids);
    if (error) { setAtt(prev); setErr(`Couldn't save attendance: ${error.message}`); }
  }

  const counts = STATUSES.map((s) => ({ ...s, n: Object.values(att).filter((v) => v === s.key).length }));
  const unmarked = sorted.filter((p) => !att[p.id]);

  return (
    <div className="space-y-5">
      <EventDetails event={event} onDeleted={() => { router.push(`/teams/${event.team_id}`); router.refresh(); }} />

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">{isMatch ? "Availability" : "Attendance"}</h2>
          <div className="flex gap-2">
            {unmarked.length > 0 && <button className="btn px-3 py-1.5" onClick={() => setStatus(unmarked.map((p) => p.id), "available")}>Mark {unmarked.length} unmarked as available</button>}
            <button className="btn-ghost px-3 py-1.5" onClick={() => setStatus(sorted.map((p) => p.id), "available")}>All available</button>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {counts.map((c) => <span key={c.key} className={`rounded-full px-2.5 py-1 font-semibold ${c.cls}`}>{c.label}: {c.n}</span>)}
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">Not marked: {unmarked.length}</span>
        </div>
        {err && <p className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700">{err}</p>}
        {sorted.length === 0 ? <p className="muted">Add players on the Squad tab first.</p> : (
          <ul className="divide-y">
            {sorted.map((p) => (
              <li key={p.id} className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold">{playerName(p)}</span>
                <span className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button key={s.key} title={s.label} onClick={() => setStatus([p.id], att[p.id] === s.key ? null : s.key)}
                      className={`min-w-11 rounded-md border px-2 py-1.5 text-xs font-bold ${att[p.id] === s.key ? `${s.cls} border-transparent` : "border-slate-200 bg-white text-slate-500 hover:border-slate-400"}`}>
                      {s.short}
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-slate-400">✓ Available · Inj Injured · Sick · Exc Excused (gave notice) · ✗ Absent. Tap again to clear. Saves automatically.</p>
      </section>

      {isMatch
        ? <MatchPicker event={event} teamName={teamName} available={available} all={sorted} initial={initialSelections} />
        : <SidesPicker event={event} available={available} all={sorted} initial={initialSelections} />}

      {isMatch && <ScoreCard event={event} />}
    </div>
  );
}

/* ---------------- Details ---------------- */
function EventDetails({ event, onDeleted }: { event: TeamEvent; onDeleted: () => void }) {
  const router = useRouter();
  const [edit, setEdit] = useState(false);
  const supabase = createClient();
  const isMatch = event.kind === "match";

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("events").update({
      event_date: f.get("date"), start_time: f.get("time") || null, title: String(f.get("title") ?? "").trim(),
      competition: String(f.get("competition") ?? "").trim(), notes: String(f.get("notes") ?? ""),
      ...(isMatch ? { venue: f.get("venue"), is_competitive: f.get("competitive") === "on" } : {}),
    }).eq("id", event.id);
    if (error) return alert(error.message);
    setEdit(false); router.refresh();
  }
  async function del() {
    if (!confirm("Delete this session, its attendance and team picks?")) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) alert(error.message); else onDeleted();
  }

  if (!edit) return (
    <section className="card flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-club">{isMatch ? (event.is_competitive ? "Competitive match" : "Challenge match") : "Training"}</p>
        <h2 className="text-xl font-bold">{isMatch ? `v ${event.title}` : event.title || "Training session"}</h2>
        <p className="muted">{formatDate(event.event_date)}{event.start_time ? ` · ${event.start_time.slice(0, 5)}` : ""}{event.venue ? ` · ${event.venue}` : ""}{event.competition ? ` · ${event.competition}` : ""}</p>
        {event.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{event.notes}</p>}
      </div>
      <div className="flex gap-2"><button className="btn-ghost px-3 py-1.5" onClick={() => setEdit(true)}>Edit / notes</button><button className="btn-danger" onClick={del}>Delete</button></div>
    </section>
  );
  return (
    <form onSubmit={save} className="card grid gap-3 sm:grid-cols-4">
      <div><label className="label">Date</label><input name="date" type="date" defaultValue={event.event_date} className="input" required /></div>
      <div><label className="label">Time</label><input name="time" type="time" defaultValue={event.start_time?.slice(0, 5) ?? ""} className="input" /></div>
      <div className="sm:col-span-2"><label className="label">{isMatch ? "Opponent" : "Focus / title"}</label><input name="title" defaultValue={event.title} className="input" /></div>
      {isMatch && (<>
        <div><label className="label">Venue</label><select name="venue" defaultValue={event.venue ?? "home"} className="input"><option value="home">Home</option><option value="away">Away</option><option value="neutral">Neutral</option></select></div>
        <div className="sm:col-span-2"><label className="label">Competition</label><input name="competition" defaultValue={event.competition} className="input" /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input name="competitive" type="checkbox" defaultChecked={event.is_competitive} /> Competitive</label>
      </>)}
      <div className="sm:col-span-4"><label className="label">Notes (session content, what went well, match report…)</label><textarea name="notes" rows={4} defaultValue={event.notes} className="input" /></div>
      <div className="flex gap-2 sm:col-span-4"><button className="btn">Save</button><button type="button" className="btn-ghost" onClick={() => setEdit(false)}>Cancel</button></div>
    </form>
  );
}

/* ---------------- Match team picker ---------------- */
function MatchPicker({ event, teamName, available, all, initial }: { event: TeamEvent; teamName: string; available: Player[]; all: Player[]; initial: Selection[] }) {
  const supabase = createClient();
  const [format, setFormat] = useState(event.format ?? 15);
  const [slots, setSlots] = useState<Record<number, string>>(() =>
    Object.fromEntries(initial.filter((s) => s.grp === "starter" && s.slot).map((s) => [s.slot!, s.player_id])));
  const [subs, setSubs] = useState<string[]>(initial.filter((s) => s.grp === "sub").map((s) => s.player_id));
  const [saved, setSaved] = useState<string>("");
  const byId = new Map(all.map((p) => [p.id, p]));
  const used = new Set([...Object.values(slots), ...subs]);
  const rows = FORMATIONS[format] ?? FORMATIONS[15];
  const pickable = available; // only players marked available

  function setSlot(slot: number, pid: string) {
    setSaved("");
    setSlots((s) => { const n = { ...s }; if (pid) n[slot] = pid; else delete n[slot]; return n; });
    setSubs((s) => s.filter((x) => x !== pid));
  }
  function autoSubs() {
    const starters = new Set(Object.values(slots));
    setSubs(available.filter((p) => !starters.has(p.id)).map((p) => p.id)); setSaved("");
  }

  async function save() {
    const rowsToSave = [
      ...Object.entries(slots).filter(([s]) => Number(s) <= format).map(([s, pid]) => ({ event_id: event.id, player_id: pid, grp: "starter" as Grp, slot: Number(s) })),
      ...subs.map((pid) => ({ event_id: event.id, player_id: pid, grp: "sub" as Grp, slot: null })),
    ];
    const d = await supabase.from("selections").delete().eq("event_id", event.id);
    if (d.error) return alert(d.error.message);
    if (rowsToSave.length) { const r = await supabase.from("selections").insert(rowsToSave); if (r.error) return alert(r.error.message); }
    if (format !== event.format) await supabase.from("events").update({ format }).eq("id", event.id);
    setSaved("Team saved ✓");
  }

  function shareText() {
    const lines = [`${teamName} v ${event.title} – ${formatDate(event.event_date)}${event.start_time ? ` ${event.start_time.slice(0, 5)}` : ""}`, ""];
    rows.forEach((r) => lines.push(r.slots.map((s) => `${s}. ${slots[s] ? playerName(byId.get(slots[s])!) : "—"}`).join("   ")));
    if (subs.length) lines.push("", `Subs: ${subs.map((id) => playerName(byId.get(id)!)).join(", ")}`);
    lines.push("", "Up Kiltormer! 💙🤍");
    navigator.clipboard.writeText(lines.join("\n")).then(() => setSaved("Copied – paste into WhatsApp"));
  }

  const filled = Object.keys(slots).filter((s) => Number(s) <= format).length;
  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="h2">Pick the team</h2>
        <select className="input w-auto" value={format} onChange={(e) => { setFormat(Number(e.target.value)); setSaved(""); }}>
          {FORMATS.map((n) => <option key={n} value={n}>{n}-a-side</option>)}
        </select>
      </div>
      {available.length === 0 && <p className="rounded bg-yellow-50 p-2 text-sm text-yellow-900">Mark players as available above to pick from them.</p>}
      <Pitch rows={rows} render={(s) => (
        <label className="block rounded-lg bg-white/95 p-1 shadow sm:p-1.5">
          <span className="block text-center text-[11px] font-bold text-club">{s}</span>
          <select className="w-full bg-transparent text-center text-xs font-semibold sm:text-sm" value={slots[s] ?? ""} onChange={(e) => setSlot(s, e.target.value)}>
            <option value="">—</option>
            {pickable.filter((p) => !used.has(p.id) || slots[s] === p.id).map((p) => <option key={p.id} value={p.id}>{playerName(p)}</option>)}
          </select>
        </label>
      )} />
      <div>
        <div className="mb-1 flex items-center justify-between">
          <p className="font-semibold">Subs ({subs.length})</p>
          <button className="text-sm font-semibold text-club" onClick={autoSubs}>Add all remaining available</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pickable.filter((p) => !Object.values(slots).includes(p.id)).map((p) => (
            <button key={p.id} onClick={() => { setSubs((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])); setSaved(""); }}
              className={`chip ${subs.includes(p.id) ? "chip-on" : "chip-off"}`}>{playerName(p)}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={save}>Save team ({filled}/{format})</button>
        <button className="btn-ghost" onClick={shareText}>Copy for WhatsApp</button>
        {saved && <span className="text-sm font-semibold text-green-700">{saved}</span>}
      </div>
    </section>
  );
}

/* ---------------- Training sides picker ---------------- */
type Spot = { side: number; slot: number | null };
const SIDE_KEYS: Grp[] = ["A", "B", "C", "D"];
const SIDE_NAMES = ["Blues", "Whites", "Bibs", "Greens"];
const SIDE_HEAD = ["bg-club text-white", "bg-white text-slate-900 ring-1 ring-slate-300", "bg-orange-500 text-white", "bg-emerald-600 text-white"];
const SIDE_DOT = ["bg-club", "bg-white ring-1 ring-slate-400", "bg-orange-500", "bg-emerald-600"];

function SidesPicker({ event, available, all, initial }: { event: TeamEvent; available: Player[]; all: Player[]; initial: Selection[] }) {
  const supabase = createClient();
  const byId = new Map(all.map((p) => [p.id, p]));
  const [assign, setAssign] = useState<Record<string, Spot>>(() => Object.fromEntries(
    initial.filter((s) => SIDE_KEYS.includes(s.grp)).map((s) => [s.player_id, { side: SIDE_KEYS.indexOf(s.grp), slot: s.slot }])));
  const [n, setN] = useState(() => Math.max(2, ...Object.values(assign).map((a) => a.side + 1)));
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  // Only players currently marked available take part.
  const availIds = new Set(available.map((p) => p.id));
  const live = Object.entries(assign).filter(([pid, a]) => availIds.has(pid) && a.side < n);
  const sides = Array.from({ length: n }, (_, i) => {
    const members = live.filter(([, a]) => a.side === i).map(([pid]) => pid);
    const rows = formationFor(members.length);
    const placed = new Map<number, string>();
    members.forEach((pid) => { const sl = assign[pid].slot; if (sl && sl <= members.length && !placed.has(sl)) placed.set(sl, pid); });
    const bench = members.filter((pid) => ![...placed.values()].includes(pid));
    return { members, rows, placed, bench };
  });
  const unassigned = available.filter((p) => !live.some(([pid]) => pid === p.id));

  const update = (next: Record<string, Spot>) => { setAssign(next); setMsg(""); };

  function pick(mode: "random" | "age") {
    const split = splitSides(available, n, mode);
    const next: Record<string, Spot> = {};
    split.forEach((side, i) => side.forEach((p, j) => { next[p.id] = { side: i, slot: j + 1 }; }));
    update(next); setSelected(null);
  }
  function tapPlayer(pid: string) {
    if (!selected) return setSelected(pid);
    if (selected === pid) return setSelected(null);
    const a = assign[selected], b = assign[pid];
    const next = { ...assign };
    if (b) next[selected] = { ...b }; else delete next[selected];
    if (a) next[pid] = { ...a }; else delete next[pid];
    update(next); setSelected(null);
  }
  function tapEmpty(side: number, slot: number | null) {
    if (!selected) return;
    update({ ...assign, [selected]: { side, slot } }); setSelected(null);
  }
  function autoFill(i: number) {
    const s = sides[i];
    const free = s.rows.flatMap((r) => r.slots).filter((x) => !s.placed.has(x));
    const next = { ...assign };
    s.bench.forEach((pid, k) => { if (free[k]) next[pid] = { side: i, slot: free[k] }; });
    update(next);
  }
  async function save() {
    const rows = live.map(([pid, a]) => {
      const s = sides[a.side];
      const slot = a.slot && s.placed.get(a.slot) === pid ? a.slot : null;
      return { event_id: event.id, player_id: pid, grp: SIDE_KEYS[a.side], slot };
    });
    const d = await supabase.from("selections").delete().eq("event_id", event.id);
    if (d.error) return alert(d.error.message);
    if (rows.length) { const r = await supabase.from("selections").insert(rows); if (r.error) return alert(r.error.message); }
    setMsg("Sides saved ✓");
  }
  function copy() {
    const text = sides.map((s, i) => {
      const placed = s.rows.flatMap((r) => r.slots).filter((x) => s.placed.has(x)).map((x) => `${x}. ${playerName(byId.get(s.placed.get(x)!)!)}`);
      const bench = s.bench.map((pid) => playerName(byId.get(pid)!));
      return `${SIDE_NAMES[i]} (${s.members.length})\n${placed.join("\n")}${bench.length ? `\n+ ${bench.join(", ")}` : ""}`;
    }).join("\n\n");
    navigator.clipboard.writeText(text).then(() => setMsg("Copied"));
  }

  const chip = (pid: string, side: number | null) => {
    const p = byId.get(pid)!;
    return (
      <button key={pid} onClick={() => tapPlayer(pid)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${selected === pid ? "border-yellow-400 bg-yellow-300 text-black" : "border-slate-300 bg-white hover:border-club"}`}>
        {side !== null && <span className={`h-2.5 w-2.5 rounded-full ${SIDE_DOT[side]}`} />}{playerName(p)}
      </button>
    );
  };
  const sel = selected ? byId.get(selected) : null;

  return (
    <section className="card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="h2">Pick sides</h2>
        <span className="muted">{available.length} available</span>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div><label className="label">Number of teams</label>
          <select className="input w-auto" value={n} onChange={(e) => { setN(Number(e.target.value)); setMsg(""); }}>{[2, 3, 4].map((x) => <option key={x} value={x}>{x} teams</option>)}</select></div>
        <button className="btn" disabled={available.length < n} onClick={() => pick("random")}>Random even sides</button>
        <button className="btn-ghost" disabled={available.length < n} onClick={() => pick("age")}>Balance by age</button>
      </div>

      <div className={`sticky top-0 z-20 rounded-lg px-3 py-2 text-sm ${sel ? "bg-yellow-100 text-yellow-900 ring-1 ring-yellow-300" : "bg-slate-50 text-slate-600"}`}>
        {sel
          ? <>Moving <b>{playerName(sel)}</b>: tap another player to swap them (same or other side), tap an empty position, or tap a side&apos;s &ldquo;Not placed&rdquo; box. <button className="ml-1 font-semibold underline" onClick={() => setSelected(null)}>Cancel</button></>
          : "Tap a player to select them, then tap where they should go. Tapping another player swaps the two, across sides and positions."}
      </div>

      {live.length > 0 && (
        <div className={`grid gap-4 ${n === 2 ? "lg:grid-cols-2" : "md:grid-cols-2"}`}>
          {sides.map((s, i) => (
            <div key={i} className="space-y-2">
              <div className={`flex items-center justify-between rounded-lg px-3 py-2 font-bold ${SIDE_HEAD[i]}`}>
                <span>{SIDE_NAMES[i]} · {s.members.length}</span>
                {s.bench.length > 0 && s.placed.size < s.members.length && <button onClick={() => autoFill(i)} className="text-xs font-semibold underline">Fill empty positions</button>}
              </div>
              {s.members.length > 0 ? (
                <Pitch compact rows={s.rows} render={(slot) => {
                  const pid = s.placed.get(slot);
                  const on = pid && pid === selected;
                  return (
                    <button onClick={() => (pid ? tapPlayer(pid) : tapEmpty(i, slot))}
                      className={`block w-full rounded-md px-1 py-1 text-center shadow ${on ? "bg-yellow-300 ring-2 ring-yellow-500" : pid ? "bg-white/95 hover:bg-white" : selected ? "border-2 border-dashed border-yellow-300 bg-white/30" : "bg-white/40"}`}>
                      <span className="block text-[10px] font-bold text-club">{slot}</span>
                      <span className="block truncate text-[11px] font-semibold sm:text-xs">{pid ? playerName(byId.get(pid)!) : selected ? "Place here" : "—"}</span>
                    </button>
                  );
                }} />
              ) : <p className="rounded-xl bg-green-700/10 p-4 text-center text-sm text-slate-500">No players yet</p>}
              <div onClick={() => selected && !s.members.includes(selected) && tapEmpty(i, null)}
                className={`min-h-10 rounded-lg border border-dashed p-2 ${selected && !s.members.includes(selected) ? "cursor-pointer border-yellow-400 bg-yellow-50" : "border-slate-300"}`}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Not placed{selected && !s.members.includes(selected) ? ": tap here to move to " + SIDE_NAMES[i] : ""}</p>
                <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>{s.bench.map((pid) => chip(pid, i))}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {unassigned.length > 0 && live.length > 0 && (
        <div>
          <p className="mb-1 text-sm font-semibold">Not on a side yet ({unassigned.length})</p>
          <div className="flex flex-wrap gap-1">{unassigned.map((p) => chip(p.id, null))}</div>
        </div>
      )}
      {live.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn" onClick={save}>Save sides</button>
          <button className="btn-ghost" onClick={copy}>Copy for WhatsApp</button>
          {msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}
        </div>
      )}
    </section>
  );
}

/* ---------------- Score ---------------- */
function Box({ name, v }: { name: string; v: number | null }) {
  return <input name={name} type="number" min={0} defaultValue={v ?? ""} className="input w-16 text-center text-lg font-bold" />;
}

function ScoreCard({ event }: { event: TeamEvent }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = (k: string) => (f.get(k) === "" ? null : Number(f.get(k)));
    const { error } = await createClient().from("events").update({
      our_goals: n("og"), our_points: n("op"), opp_goals: n("tg"), opp_points: n("tp"),
    }).eq("id", event.id);
    if (error) return alert(error.message);
    setMsg("Score saved ✓"); router.refresh();
  }
  return (
    <form onSubmit={save} className="card space-y-3">
      <h2 className="h2">Final score</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><p className="mb-1 text-sm font-semibold">Kiltormer</p><div className="flex items-center gap-1"><Box name="og" v={event.our_goals} /><span className="font-bold">–</span><Box name="op" v={event.our_points} /><span className="ml-1 text-xs text-slate-500">goals – points</span></div></div>
        <div><p className="mb-1 text-sm font-semibold">{event.title || "Opposition"}</p><div className="flex items-center gap-1"><Box name="tg" v={event.opp_goals} /><span className="font-bold">–</span><Box name="tp" v={event.opp_points} /></div></div>
      </div>
      <div className="flex items-center gap-2"><button className="btn">Save score</button>{msg && <span className="text-sm font-semibold text-green-700">{msg}</span>}</div>
    </form>
  );
}
