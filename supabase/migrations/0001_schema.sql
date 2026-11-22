-- =====================================================================
-- Kiltormer GAA Coaching Hub — database schema and access rules
-- Run once in the Supabase SQL editor (or `supabase db push`).
-- Every table has Row Level Security: the database itself enforces
-- who can see what, not just the web pages.
-- =====================================================================

-- ---------- Users & roles -------------------------------------------
-- Roles:
--   pending  : signed up, waiting for approval (sees nothing)
--   coach    : Resource Hub + their own teams
--   editor   : coach + manages Resource Hub content and tags (cannot see inside other teams)
--   admin    : everything, including inside every team, users and the player register
--   disabled : access revoked
create type public.user_role as enum ('pending', 'coach', 'editor', 'admin', 'disabled');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  role        public.user_role not null default 'pending',
  created_at  timestamptz not null default now()
);

-- New sign-ups get a 'pending' profile. The very first account becomes admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    case when exists (select 1 from public.profiles where role = 'admin')
         then 'pending'::public.user_role else 'admin'::public.user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Helper checks (used by the access rules) ----------------
create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('coach', 'editor', 'admin'));
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Admins and editors manage Resource Hub content.
create or replace function public.is_content_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'editor'));
$$;

-- ---------- Resource hub --------------------------------------------
create table public.age_groups (
  id          serial primary key,
  name        text not null unique,
  sort_order  int not null default 0
);

create table public.categories (
  id          serial primary key,
  name        text not null unique,
  sort_order  int not null default 0
);

create table public.resources (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null default '',
  kind          text not null check (kind in ('pdf', 'video', 'link', 'file')),
  storage_path  text,          -- for uploaded files (private bucket)
  url           text,          -- for links / YouTube / Vimeo
  file_name     text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (storage_path is not null or url is not null)
);

create table public.resource_age_groups (
  resource_id   uuid references public.resources (id) on delete cascade,
  age_group_id  int  references public.age_groups (id) on delete cascade,
  primary key (resource_id, age_group_id)
);

create table public.resource_categories (
  resource_id   uuid references public.resources (id) on delete cascade,
  category_id   int  references public.categories (id) on delete cascade,
  primary key (resource_id, category_id)
);

-- ---------- Teams ---------------------------------------------------
create table public.teams (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  season          int  not null default extract(year from now())::int,
  code            text not null default 'Hurling',
  age_group_id    int references public.age_groups (id) on delete set null,
  default_format  int not null default 15,
  archived        boolean not null default false,
  owner_id        uuid not null references public.profiles (id),
  created_at      timestamptz not null default now()
);

create table public.team_members (
  team_id   uuid references public.teams (id) on delete cascade,
  user_id   uuid references public.profiles (id) on delete cascade,
  role      text not null default 'coach' check (role in ('owner', 'coach')),
  added_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create or replace function public.is_team_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_approved()
     and exists (select 1 from team_members where team_id = t and user_id = auth.uid()));
$$;

create or replace function public.is_team_owner(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or (public.is_approved()
     and exists (select 1 from team_members where team_id = t and user_id = auth.uid() and role = 'owner'));
$$;

-- The creator of a team automatically becomes its owner.
create or replace function public.handle_new_team()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into team_members (team_id, user_id, role) values (new.id, new.owner_id, 'owner');
  return new;
end $$;

create trigger on_team_created after insert on public.teams
  for each row execute function public.handle_new_team();

-- ---------- Players (one club-wide register) -------------------------
-- Data minimisation: name + year of birth only (enough for GAA age grades).
-- No contact, medical or address details for children here.
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  birth_year  int check (birth_year between 1940 and 2100),
  active      boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index players_name_idx on public.players (lower(last_name), lower(first_name));

create table public.team_players (
  team_id    uuid references public.teams (id) on delete cascade,
  player_id  uuid references public.players (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (team_id, player_id)
);
create index team_players_player_idx on public.team_players (player_id);

-- ---------- Sessions & matches --------------------------------------
create table public.events (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null references public.teams (id) on delete cascade,
  kind           text not null check (kind in ('training', 'match')),
  event_date     date not null,
  start_time     time,
  title          text not null default '',   -- opponent for matches
  venue          text check (venue in ('home', 'away', 'neutral')),
  competition    text not null default '',
  is_competitive boolean not null default false,
  format         int,                         -- players a side for matches
  our_goals      int, our_points int,
  opp_goals      int, opp_points int,
  notes          text not null default '',
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index events_team_date_idx on public.events (team_id, event_date desc);

create table public.attendance (
  event_id   uuid references public.events (id) on delete cascade,
  player_id  uuid references public.players (id) on delete cascade,
  status     text not null check (status in ('available', 'injured', 'sick', 'excused', 'absent')),
  primary key (event_id, player_id)
);
create index attendance_player_idx on public.attendance (player_id);

-- Team picks. grp: 'starter' (with slot), 'sub', or training sides 'A','B','C','D'.
create table public.selections (
  event_id   uuid references public.events (id) on delete cascade,
  player_id  uuid references public.players (id) on delete cascade,
  grp        text not null check (grp in ('starter', 'sub', 'A', 'B', 'C', 'D')),
  slot   int,
  primary key (event_id, player_id)
);
create unique index selections_slot_uq on public.selections (event_id, slot)
  where grp = 'starter' and slot is not null;

create or replace function public.event_team(e uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from events where id = e;
$$;

-- A coach may see a player's full history if the player is on any team they coach. Admins see all.
create or replace function public.can_view_player(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.is_approved() and exists (
    select 1 from team_players tp
    join team_members tm on tm.team_id = tp.team_id
    where tp.player_id = p and tm.user_id = auth.uid());
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.age_groups          enable row level security;
alter table public.categories          enable row level security;
alter table public.resources           enable row level security;
alter table public.resource_age_groups enable row level security;
alter table public.resource_categories enable row level security;
alter table public.teams               enable row level security;
alter table public.team_members        enable row level security;
alter table public.players             enable row level security;
alter table public.team_players        enable row level security;
alter table public.events              enable row level security;
alter table public.attendance          enable row level security;
alter table public.selections          enable row level security;

-- Profiles: see yourself, fellow coaches on your teams; admins see everyone.
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or public.is_admin() or exists (
    select 1 from public.team_members a join public.team_members b on a.team_id = b.team_id
    where a.user_id = auth.uid() and b.user_id = profiles.id)
);
-- Users can change their own name only; roles change via set_user_role().
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- Tags: everyone approved reads; admins and editors manage.
create policy age_groups_read  on public.age_groups for select using (public.is_approved());
create policy age_groups_admin on public.age_groups for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy categories_read  on public.categories for select using (public.is_approved());
create policy categories_admin on public.categories for all using (public.is_content_admin()) with check (public.is_content_admin());

-- Resources: approved users read; admins and editors manage.
create policy resources_read  on public.resources for select using (public.is_approved());
create policy resources_admin on public.resources for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy rag_read  on public.resource_age_groups for select using (public.is_approved());
create policy rag_admin on public.resource_age_groups for all using (public.is_content_admin()) with check (public.is_content_admin());
create policy rc_read   on public.resource_categories for select using (public.is_approved());
create policy rc_admin  on public.resource_categories for all using (public.is_content_admin()) with check (public.is_content_admin());

-- Teams: only the team's coaches (and club admins) see a team and everything in it.
-- Editors do NOT see inside teams they're not on.
create policy teams_select on public.teams for select using (public.is_team_member(id));
create policy teams_insert on public.teams for insert with check (public.is_approved() and owner_id = auth.uid());
create policy teams_update on public.teams for update using (public.is_team_owner(id)) with check (public.is_team_owner(id));
create policy teams_delete on public.teams for delete using (public.is_team_owner(id));

create policy tm_select on public.team_members for select using (public.is_team_member(team_id));
create policy tm_insert on public.team_members for insert with check (public.is_team_owner(team_id) and role = 'coach');
create policy tm_delete on public.team_members for delete using (
  role = 'coach' and (public.is_team_owner(team_id) or user_id = auth.uid()));

-- Players register: approved coaches can search names and add players.
create policy players_select on public.players for select using (public.is_approved());
create policy players_insert on public.players for insert with check (public.is_approved());
create policy players_update on public.players for update using (public.can_view_player(id) or public.is_admin());
create policy players_delete on public.players for delete using (public.is_admin());

create policy tp_all on public.team_players for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy ev_all on public.events for all
  using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));
create policy att_all on public.attendance for all
  using (public.is_team_member(public.event_team(event_id))) with check (public.is_team_member(public.event_team(event_id)));
create policy sel_all on public.selections for all
  using (public.is_team_member(public.event_team(event_id))) with check (public.is_team_member(public.event_team(event_id)));

-- =====================================================================
-- Functions called from the app
-- =====================================================================

-- Admin: approve / promote / disable users.
create or replace function public.set_user_role(target uuid, new_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can change roles'; end if;
  if target = auth.uid() and new_role <> 'admin' then raise exception 'You cannot remove your own admin access'; end if;
  update profiles set role = new_role where id = target;
end $$;

-- Team owner: find an approved coach by exact email (no browsing of all users).
create or replace function public.find_coach(lookup_email text)
returns table (id uuid, full_name text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.email from profiles p
  where public.is_approved() and lower(p.email) = lower(trim(lookup_email)) and p.role in ('coach', 'editor', 'admin');
$$;

-- Owner (or admin, for orphaned teams) hands a team to another coach.
create or replace function public.transfer_team(t uuid, new_owner uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_team_owner(t) then raise exception 'Not allowed'; end if;
  if not exists (select 1 from profiles where id = new_owner and role in ('coach', 'editor', 'admin')) then
    raise exception 'New owner must be an approved coach';
  end if;
  update team_members set role = 'coach' where team_id = t and role = 'owner';
  insert into team_members (team_id, user_id, role) values (t, new_owner, 'owner')
    on conflict (team_id, user_id) do update set role = 'owner';
  update teams set owner_id = new_owner where id = t;
end $$;

-- Admin: list all teams with owner name (team contents stay private).
create or replace function public.admin_team_list()
returns table (id uuid, name text, season int, code text, archived boolean, owner_name text, owner_email text, coaches bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.season, t.code, t.archived, p.full_name, p.email,
         (select count(*) from team_members m where m.team_id = t.id)
  from teams t join profiles p on p.id = t.owner_id
  where public.is_admin()
  order by t.season desc, t.name;
$$;

-- A player's full history across every team and year — only for coaches of that player.
create or replace function public.player_history(p uuid)
returns table (event_id uuid, event_date date, kind text, title text, team_id uuid, team_name text,
               season int, status text, grp text, slot int, is_competitive boolean)
language sql stable security definer set search_path = public as $$
  select e.id, e.event_date, e.kind, e.title, t.id, t.name, t.season, a.status, s.grp, s.slot, e.is_competitive
  from attendance a
  join events e on e.id = a.event_id
  join teams t on t.id = e.team_id
  left join selections s on s.event_id = e.id and s.player_id = a.player_id
  where a.player_id = p and public.can_view_player(p)
  order by e.event_date desc;
$$;

create or replace function public.player_teams(p uuid)
returns table (team_id uuid, team_name text, season int, code text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.season, t.code from team_players tp join teams t on t.id = tp.team_id
  where tp.player_id = p and public.can_view_player(p)
  order by t.season desc, t.name;
$$;

-- Admin: merge a duplicate player record into the one to keep.
create or replace function public.merge_players(keep_id uuid, drop_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only admins can merge players'; end if;
  if keep_id = drop_id then raise exception 'Pick two different players'; end if;
  insert into team_players (team_id, player_id, added_at)
    select team_id, keep_id, added_at from team_players where player_id = drop_id
    on conflict do nothing;
  insert into attendance (event_id, player_id, status)
    select event_id, keep_id, status from attendance where player_id = drop_id
    on conflict do nothing;
  insert into selections (event_id, player_id, grp, slot)
    select event_id, keep_id, grp, case when exists (
      select 1 from selections s2 where s2.event_id = s.event_id and s2.slot = s.slot and s2.grp = 'starter')
      then null else slot end
    from selections s where player_id = drop_id
    on conflict do nothing;
  delete from players where id = drop_id;
end $$;

-- Explicit grants (newer Supabase projects may not expose new tables to the API automatically).
-- Row Level Security above still decides which rows each user can touch.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

-- =====================================================================
-- File storage: private bucket, signed links only
-- =====================================================================
insert into storage.buckets (id, name, public) values ('resources', 'resources', false)
  on conflict (id) do nothing;

create policy "resources read"   on storage.objects for select using (bucket_id = 'resources' and public.is_approved());
create policy "resources insert" on storage.objects for insert with check (bucket_id = 'resources' and public.is_content_admin());
create policy "resources update" on storage.objects for update using (bucket_id = 'resources' and public.is_content_admin());
create policy "resources delete" on storage.objects for delete using (bucket_id = 'resources' and public.is_content_admin());

-- =====================================================================
-- Starter tags (edit any time in Admin → Tags)
-- =====================================================================
insert into public.age_groups (name, sort_order) values
  ('All ages', 0), ('Nursery (U6)', 1), ('U7', 2), ('U8', 3), ('U9', 4), ('U10', 5), ('U11', 6),
  ('U12', 7), ('U13', 8), ('U14', 9), ('U15', 10), ('U16', 11), ('Minor (U17)', 12),
  ('U19/U20', 13), ('Adult', 14);

insert into public.categories (name, sort_order) values
  ('Skills', 1), ('Skills assessment', 2), ('Warm-ups & movement', 3), ('S&C', 4),
  ('Games-based drills', 5), ('Tactics & match play', 6), ('Goalkeeping', 7),
  ('Session plans', 8), ('Checklists & admin', 9), ('Nutrition & wellbeing', 10),
  ('Safeguarding', 11), ('Injury prevention', 12);
