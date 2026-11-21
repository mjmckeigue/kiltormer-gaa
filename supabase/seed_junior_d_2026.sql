-- =====================================================================
-- Demo squad: Junior D 2026
-- Run in the Supabase SQL editor AFTER you have signed up (your account
-- becomes club admin and owner of this team). Safe to run more than once.
-- Also creates one demo match with the 1–15 and subs already picked.
-- Delete the demo match (or the whole team) from the app whenever you like.
-- =====================================================================
do $$
declare
  owner uuid;
  team uuid;
  ev uuid;
  pid uuid;
  r record;
begin
  select id into owner from public.profiles where role = 'admin' order by created_at limit 1;
  if owner is null then
    raise exception 'Sign up on the site first so there is a club admin to own the team.';
  end if;

  select id into team from public.teams where name = 'Junior D 2026' limit 1;
  if team is null then
    insert into public.teams (name, season, code, age_group_id, default_format, owner_id)
    values ('Junior D 2026', 2026, 'Hurling',
            (select id from public.age_groups where name = 'Adult'), 15, owner)
    returning id into team;
  end if;

  select id into ev from public.events where team_id = team and title = 'Demo match' limit 1;
  if ev is not null then ev := null; else
  insert into public.events (team_id, kind, event_date, title, competition, is_competitive, format, venue, notes, created_by)
  values (team, 'match', date '2026-11-29', 'Demo match', 'Demo – delete when finished', false, 15, 'home',
          'Demo match with the team already picked, so coaches can see how it works.', owner)
  returning id into ev;
  end if;

  -- squad number → position (1–15 start, 17+ subs)
  for r in
    select * from (values
      (1, 'Emmett', 'Goode'), (2, 'Shane', 'Muldoon'), (3, 'Ronan', 'Kenny'),
      (4, 'Oisín', 'Donnelly'), (5, 'Derek', 'Dervan'), (6, 'Michael', 'Callaghan'),
      (7, 'Ger', 'Glynn'), (8, 'Enda', 'Fenton'), (9, 'Ben', 'Bleahen'),
      (10, 'Diarmuid', 'Claffey'), (11, 'Martin', 'Kilkenny'), (12, 'Alan', 'Egan'),
      (13, 'Cathal', 'Dolan'), (14, 'David', 'Hayes'), (15, 'Martin', 'Mannion'),
      (17, 'Cathal', 'Whyte'), (18, 'Dermot', 'Gilcreast'), (19, 'Jack', 'Kilkenny'),
      (20, 'Luke', 'Donnelly'), (21, 'Kyle', 'Campbell'), (22, 'Andrew', 'Hynes'),
      (23, 'Liam', 'Tully'), (24, 'Joe', 'Kenny'), (25, 'Conor', 'O''Droma'),
      (26, 'Patrick', 'Kenny'), (27, 'Ciaran', 'Craughwell')
    ) as t(num, first_name, last_name)
  loop
    select id into pid from public.players
      where lower(first_name) = lower(r.first_name) and lower(last_name) = lower(r.last_name) limit 1;
    if pid is null then
      insert into public.players (first_name, last_name, created_by)
      values (r.first_name, r.last_name, owner) returning id into pid;
    end if;
    insert into public.team_players (team_id, player_id) values (team, pid) on conflict do nothing;
    if ev is not null then
      insert into public.attendance (event_id, player_id, status) values (ev, pid, 'available');
      insert into public.selections (event_id, player_id, grp, slot)
        values (ev, pid, case when r.num <= 15 then 'starter' else 'sub' end,
                case when r.num <= 15 then r.num end);
    end if;
  end loop;
end $$;
