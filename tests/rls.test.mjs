// Runs the real migration in an in-memory Postgres (PGlite) with stand-ins for
// Supabase's auth/storage schemas, then checks the access rules as different users.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema auth, storage, public to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
`);
await db.exec(readFileSync(new URL("../supabase/migrations/0001_schema.sql", import.meta.url), "utf8"));
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to authenticated;
  revoke update on public.profiles from authenticated; grant update (full_name) on public.profiles to authenticated;
  grant usage on all sequences in schema public to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
`);

const U = {
  mark:   "00000000-0000-0000-0000-00000000000a", // first user -> admin
  aoife:  "00000000-0000-0000-0000-00000000000b", // U14 owner
  sean:   "00000000-0000-0000-0000-00000000000c", // U15 owner
  pat:    "00000000-0000-0000-0000-00000000000d", // pending
  nora:   "00000000-0000-0000-0000-00000000000e", // content editor
};
for (const [n, id] of Object.entries(U))
  await db.query(`insert into auth.users values ($1, $2, $3)`, [id, `${n}@x.ie`, { full_name: n }]);

async function as(user, sql, params = []) {
  await db.exec(`reset role; set request.jwt.claim.sub = '${user ?? ""}'; set role ${user ? "authenticated" : "anon"};`);
  try { return (await db.query(sql, params)).rows; } finally { await db.exec("reset role;"); }
}
async function fails(user, sql, params = []) {
  try { await as(user, sql, params); } catch { return true; }
  return false;
}
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log("  ✓", m); };

const roles = (await db.query(`select email, role from profiles order by email`)).rows;
ok(roles.find(r => r.email === "mark@x.ie").role === "admin", "first sign-up becomes admin");
ok(roles.find(r => r.email === "aoife@x.ie").role === "pending", "later sign-ups start pending");

ok((await as(U.aoife, `select * from resources`)).length === 0 && (await as(U.aoife, `select * from age_groups`)).length === 0, "pending user sees no hub content");
ok(await fails(U.aoife, `select set_user_role($1, 'admin')`, [U.aoife]), "pending user cannot promote themselves");
ok(await fails(U.aoife, `update profiles set role = 'admin' where id = $1`, [U.aoife]), "users cannot edit their own role column");

await as(U.mark, `select set_user_role($1, 'coach')`, [U.aoife]);
await as(U.mark, `select set_user_role($1, 'coach')`, [U.sean]);
ok(await fails(U.sean, `select set_user_role($1, 'editor')`, [U.nora]), "coach cannot hand out the editor role");
await as(U.mark, `select set_user_role($1, 'editor')`, [U.nora]);
ok((await as(U.aoife, `select * from age_groups`)).length > 10, "approved coach can read tags");

// Resources
await as(U.mark, `insert into resources (id, title, kind, url) values ('10000000-0000-0000-0000-000000000001', 'Grip drill', 'link', 'https://youtu.be/x')`);
ok((await as(U.aoife, `select * from resources`)).length === 1, "coach sees resources");
ok(await fails(U.aoife, `insert into resources (title, kind, url) values ('x','link','y')`), "coach cannot upload resources");
ok((await as(U.pat, `select * from resources`)).length === 0, "pending user still sees nothing");
await as(U.nora, `insert into resources (title, kind, url) values ('Editor drill', 'link', 'https://x.ie')`);
ok((await as(U.aoife, `select * from resources`)).length === 2, "editor can add resources");
await as(U.nora, `insert into categories (name) values ('Hurling skills – advanced')`);
ok((await as(U.nora, `select * from categories where name like 'Hurling skills%'`)).length === 1, "editor can manage categories");
ok(await fails(U.nora, `select set_user_role($1, 'admin')`, [U.nora]), "editor cannot change roles");
await as(U.nora, `insert into storage.objects (bucket_id, name) values ('resources', 'b.pdf')`);
ok((await as(U.aoife, `select * from storage.objects`)).length === 1, "editor can upload files");
ok(await fails(U.aoife, `insert into storage.objects (bucket_id, name) values ('resources', 'a.pdf')`), "coach cannot upload files to storage");
await as(U.mark, `insert into storage.objects (bucket_id, name) values ('resources', 'a.pdf')`);
ok((await as(U.aoife, `select * from storage.objects`)).length >= 1, "coach can read stored files");
ok((await as(U.pat, `select * from storage.objects`)).length === 0, "pending user cannot read stored files");

// Teams
const T14 = "20000000-0000-0000-0000-000000000014", T15 = "20000000-0000-0000-0000-000000000015";
await as(U.aoife, `insert into teams (id, name, owner_id) values ($1, 'U14 Hurling', $2)`, [T14, U.aoife]);
await as(U.sean,  `insert into teams (id, name, owner_id) values ($1, 'U15 Hurling', $2)`, [T15, U.sean]);
ok(await fails(U.aoife, `insert into teams (name, owner_id) values ('x', $1)`, [U.sean]), "cannot create a team in someone else's name");
ok((await as(U.aoife, `select * from teams`)).length === 1, "coach sees only own team");
ok((await as(U.mark, `select * from teams`)).length === 2, "admin sees team list");

const P = "30000000-0000-0000-0000-000000000001", P2 = "30000000-0000-0000-0000-000000000002";
await as(U.aoife, `insert into players (id, first_name, last_name, birth_year) values ($1, 'John', 'Doe', 2012)`, [P]);
await as(U.aoife, `insert into players (id, first_name, last_name, birth_year) values ($1, 'Jon', 'Doe', 2012)`, [P2]);
await as(U.aoife, `insert into team_players (team_id, player_id) values ($1, $2)`, [T14, P]);
ok(await fails(U.sean, `insert into team_players (team_id, player_id) values ($1, $2)`, [T14, P2]), "coach cannot add players to another team");
ok((await as(U.sean, `select * from team_players`)).length === 0, "other coach cannot see U14 squad");
ok((await as(U.mark, `select * from team_players`)).length === 1, "club admin can see inside every team");
ok((await as(U.nora, `select * from team_players`)).length === 0 && (await as(U.nora, `select * from teams`)).length === 0, "editor cannot see inside teams");
ok((await as(U.nora, `select * from player_history($1)`, [P])).length === 0, "editor cannot see player history");

const E = "40000000-0000-0000-0000-000000000001";
await as(U.aoife, `insert into events (id, team_id, kind, event_date) values ($1, $2, 'training', '2026-11-01')`, [E, T14]);
await as(U.aoife, `insert into attendance values ($1, $2, 'available')`, [E, P]);
await as(U.aoife, `insert into selections values ($1, $2, 'A', null)`, [E, P]);
ok((await as(U.sean, `select * from events`)).length === 0, "other coach cannot see U14 sessions");
ok((await as(U.mark, `select * from events`)).length === 1 && (await as(U.mark, `select * from player_history($1)`, [P])).length === 1, "club admin sees sessions and player history");
ok((await as(U.nora, `select * from events`)).length === 0 && (await as(U.nora, `select * from attendance`)).length === 0, "editor cannot see sessions or attendance");
ok((await as(U.sean, `select * from player_history($1)`, [P])).length === 0, "U15 coach can't see John's history before John is on U15");

// Coaches
const found = await as(U.aoife, `select * from find_coach('SEAN@x.ie')`);
ok(found.length === 1 && found[0].id === U.sean, "owner finds coach by email");
ok((await as(U.aoife, `select * from find_coach('pat@x.ie')`)).length === 0, "pending users are not findable as coaches");
await as(U.aoife, `insert into team_members (team_id, user_id) values ($1, $2)`, [T14, U.sean]);
ok((await as(U.sean, `select * from events`)).length === 1, "added coach now sees U14 sessions");
ok(await fails(U.sean, `insert into team_members (team_id, user_id) values ($1, $2)`, [T14, U.mark]), "non-owner coach cannot add coaches");
ok(await fails(U.sean, `insert into team_members (team_id, user_id, role) values ($1, $2, 'owner')`, [T15, U.aoife]) , "owner cannot be inserted directly");
await as(U.aoife, `delete from team_members where team_id = $1 and user_id = $2`, [T14, U.sean]);
ok((await as(U.sean, `select * from events`)).length === 0, "removed coach loses access");

// Cross-team history: John moves up to U15 too
await as(U.sean, `insert into team_players (team_id, player_id) values ($1, $2)`, [T15, P]);
const h = await as(U.sean, `select * from player_history($1)`, [P]);
ok(h.length === 1 && h[0].team_name === "U14 Hurling", "U15 coach sees John's U14 history once he's on U15");
ok((await as(U.sean, `select * from attendance`)).length === 0, "...but not the rest of the U14 attendance");

// Disabled user
await as(U.mark, `select set_user_role($1, 'disabled')`, [U.aoife]);
ok((await as(U.aoife, `select * from teams`)).length === 0, "disabled coach loses team access");
await as(U.mark, `select set_user_role($1, 'coach')`, [U.aoife]);

// Transfer & merge
ok(await fails(U.sean, `select transfer_team($1, $2)`, [T14, U.sean]), "non-owner cannot take a team");
await as(U.mark, `select transfer_team($1, $2)`, [T14, U.sean]);
ok((await as(U.sean, `select * from team_members where team_id = $1 and role='owner'`, [T14]))[0].user_id === U.sean, "admin can reassign an orphaned team");
await as(U.sean, `insert into team_players values ($1, $2)`, [T14, P2]);
await as(U.sean, `insert into attendance values ($1, $2, 'injured')`, [E, P2]);
ok(await fails(U.sean, `select merge_players($1, $2)`, [P, P2]), "coach cannot merge players");
await as(U.mark, `select merge_players($1, $2)`, [P, P2]);
const left = (await db.query(`select count(*)::int c from players`)).rows[0].c;
ok(left === 1, "admin merge removes the duplicate and keeps history");
ok(await fails(null, `select * from players`) || (await as(null, `select * from players`)).length === 0, "anonymous visitors see nothing");

console.log(`\nAll ${n} access checks passed.`);
