# Kiltormer GAA Coaching Hub

Private web app for Cill Tormóir coaches, at **kiltormergaa.ie**.

- **Resource Hub**: PDFs, videos, links and files, tagged by age group and category and shown as filterable tiles (e.g. *U8 + S&C*). Admins and content editors upload; approved coaches view.
- **Team management**: set up teams, add your own management team, keep a squad from one club-wide player register, log training and matches, mark attendance in one tap per child, pick match teams (15/13/11/9/7-a-side), and split training into even sides (each with its own pitch, with tap-to-swap across sides and positions). Record scores and browse a History tab of every past session: who was there, the teams picked, notes and results. A player's record follows them across teams and years.

Built with Next.js 16 and Supabase (logins, Postgres database, file storage). It runs on the free tiers of Supabase and Vercel.

---

## Who can see what

Five roles: **pending** (just signed up), **coach**, **content editor**, **club admin**, **revoked**.

| | Pending | Coach | Content editor | Club admin |
|---|---|---|---|---|
| Resource Hub (view) | – | ✓ | ✓ | ✓ |
| Upload / edit resources, age groups, categories | – | – | ✓ | ✓ |
| Create a team; run teams they're on | – | ✓ | ✓ | ✓ |
| See inside **other** teams (squad, sessions, history, results) | – | – | – | ✓ |
| A player's full history | – | coaches of any team the player is on | same as coach | ✓ all players |
| Approve sign-ups, change roles | – | – | – | ✓ |
| Merge duplicate players, reassign team owners | – | – | – | ✓ |

These rules are enforced **inside the database** (Row Level Security), not just by hiding buttons. `npm run test:db` runs 43 checks against them.

- The **first account to sign up becomes club admin** (that's you). Everyone after that waits for approval.
- Give someone content rights without team access: **Admin → Coaches & access → Make content editor**.
- When a club admin opens a team they're not on, a banner says so. Admins can edit as well as view.

---

## Setting it up (about an hour, once)

### 1. Supabase (database, logins, files)
1. Create a free account at supabase.com → **New project**. Region: **West EU (Ireland)**. Save the database password somewhere safe.
2. **SQL Editor** → New query → paste all of `supabase/migrations/0001_schema.sql` → **Run**.
3. **Authentication → URL Configuration**
   - Site URL: `https://kiltormergaa.ie`
   - Redirect URLs: add `https://kiltormergaa.ie/**` and `http://localhost:3000/**`
4. **Authentication → Emails**: optionally edit the "Confirm signup" and "Reset password" templates to mention Kiltormer GAA. The built-in sender only allows a few emails an hour. Before inviting lots of coaches, connect a proper email sender under **Authentication → Emails → SMTP Settings** (e.g. Resend or Brevo, which have free tiers; use an address like `noreply@kiltormergaa.ie`).
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

### 2. Put the code on GitHub
Create a private repo (e.g. `kiltormer-gaa`) and upload this folder (without `node_modules`).

### 3. Vercel (hosting)
1. vercel.com → sign in with GitHub → **Add New → Project** → import the repo.
2. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key
3. Deploy. You'll get a `*.vercel.app` address to test on.
4. **Settings → Domains** → add `kiltormergaa.ie` and `www.kiltormergaa.ie`. Vercel shows the exact DNS records to add at the registrar where you bought the domain. HTTPS is automatic.

### 4. First login
Go to `/signup` and create **your** account first (it becomes admin). Confirm your email, log in, then:
- **Admin → Coaches & access**: approve coaches as they sign up. Use **Make content editor** for people who'll look after the Resource Hub, and **Make club admin** only for people who should see inside every team.
- **Demo squad (optional):** back in Supabase → SQL Editor, run `supabase/seed_junior_d_2026.sql`. It creates the **Junior D 2026** team (owned by you) with its 26 players. It also adds a "Demo match" with the 1–15 and subs already picked, so coaches can see how it works. Delete the demo match from the app when you're done with it.
- **Admin → Age groups & categories**: adjust the starter tags.
- **Admin → Resources**: start uploading.

### Running it on your own computer (optional)
```bash
cp .env.example .env.local   # fill in the two values
npm install
npm run dev                  # http://localhost:3000
npm run test:db              # re-run the access-rule tests
npm run test:seed            # check the demo-squad script
```

---

## Videos and storage
- **Best option for video:** upload to the club YouTube channel as **Unlisted** and add the link as a *Video* resource. It plays inside the hub and costs nothing.
- Uploaded files go to a **private** storage bucket and are served through links that expire after an hour. The Supabase free plan has a modest storage allowance and a per-file size cap. That's fine for PDFs and short clips; for lots of video uploads you'd need the paid plan.

## Data protection (children's data)
The app is designed to hold as little as possible about children:
- Player records hold **first name, surname and year of birth only**. That's enough for age grades. No addresses, phone numbers, medical info or photos; those stay in Foireann / with parents.
- Data is hosted in the EU (Supabase Ireland region).
- Only approved, vetted coaches get in, and only the coaches on a team see that team.

Before going live, the club should: name who is responsible for data (usually the Club Secretary/Children's Officer), mention the coaching app in the club's privacy notice / registration consent, and agree how long records are kept (e.g. remove players who have left after X years; admins can delete players).

## Ideas for phase 2
- Scorers per match (who got the goals and points) and player match stats
- Email to admins when someone signs up
- Session planner that pulls drills from the hub into a printable plan
- Skills assessments recorded per player (scores over time)
- Parent-facing view or export of fixtures
- Install as an app on phones (PWA)

## Project layout
```
supabase/migrations/0001_schema.sql   tables, access rules, functions, starter tags
supabase/seed_junior_d_2026.sql        optional demo squad (Junior D 2026)
tests/rls.test.mjs                     access-rule tests (in-memory Postgres)
proxy.ts                               sends logged-out visitors to /login
app/(auth)/…                           login, sign-up, forgot password
app/(app)/hub                          Resource Hub
app/(app)/teams/[id]/…                 sessions, history, squad, attendance, results, coaches, settings
app/(app)/players/[id]                 player history across teams and years
app/(app)/admin                        coaches, resources, tags, teams, player register
components/                            UI pieces (EventManager = attendance + match/training pickers + score; Pitch = green pitch)
lib/gaa.ts                             formations, statuses, score maths, side-splitting
```
