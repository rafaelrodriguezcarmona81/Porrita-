# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page web app for a **World Cup 2026 prediction pool** ("porra"). No framework, no
build step: static `index.html` + `css/styles.css` + `js/app.js`, served as-is. Persistence and
auth are handled by **Supabase** (Postgres REST + Google OAuth) called directly from the browser;
official match results live in a committed **`results.json`** that a daily GitHub Action
regenerates. UI text and team names are in **Spanish**.

Deployment is on **Vercel**, but since everything is static there is nothing Vercel-specific — any
static host (Netlify, GitHub Pages, etc.) serves it as-is.

## Commands

```bash
npm test                              # unit tests (node:test, no infra)
npm run test:integration              # integration vs a real local Supabase (testcontainers; needs Docker)
npm run test:coverage                 # unit + integration with V8 coverage
node --test test/render.test.js       # run a single unit test file
node --test --test-name-pattern="isLocked"   # run tests whose name matches

python3 .github/scripts/update_results.py    # regenerate results.json from the live API
```

No build/lint step. The **app** has zero runtime dependencies; unit tests use Node's built-in runner
(Node 22 in CI). The only dev dependency is **testcontainers**, used by the integration tests
(`npm run test:integration`) to spin a local Supabase stack in Docker — `npm ci` to install it.

### Running locally

Serve the files over HTTP (not `file://`, or the `fetch` of `results.json` fails):

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Note that `index.html` opens on the Google login screen, which can't complete locally (the OAuth
redirect is configured for the deployed domain).

## The match-key convention (most important invariant)

Every match is identified by the string **`"{GROUP}_{HOME}_{AWAY}"`** with **Spanish** team names,
e.g. `A_México_Sudáfrica`. This same key is the join key across *all* data:

- `GM` (fixtures), `MATCH_TIMES`, `LA1_MATCHES` in `js/app.js`
- `results` and `scores` maps in `results.json`
- each player's `group_predictions` object in the Supabase `porra_jugadores` table

Because results come from an English-language API, **`update_results.py` has a `TEAM_MAP`** that
translates English names to the exact Spanish strings used in `app.js`. **If the team strings in
`app.js` and `TEAM_MAP` ever diverge, results silently stop matching predictions** (no error, just
zero points). Any change to a team name must be mirrored in both files.

## Architecture

**State + render loop (`js/app.js`).** One mutable global `S` holds all UI state. `ss(patch)` does
`Object.assign(S, patch)` then calls `render()`. `render()` routes purely on state
(loading → linking → login → active tab) and rewrites `#app`'s `innerHTML` from template-literal
`render*` functions. There is no virtual DOM or diffing; every state change re-renders everything.

**Styling.** All CSS lives in `css/styles.css` as classes — there are **no inline styles** in the
JS. Dynamic/state-dependent styling is expressed with **modifier classes** (`pick--correct`,
`match--wrong`, `group-btn--active`, `tab--active`, `rank-banner--up`, …) chosen in JS. Keep this
split when editing: compute a class string in `app.js`, define the look in `styles.css`.

**Data flow.**
- Players: read/written via Supabase REST (`sbGet/sbPost/sbPatch`). Reads use the public anon key;
  **writes carry the logged-in user's JWT** (`getHDR` → `Bearer (_token||SB_KEY)`), so RLS can scope
  them to `auth.uid() = user_id`. See **Security model** below — the anon key alone must not be able
  to write.
- Results: fetched from the static `results.json` (cache-busted), regenerated daily — the app
  never writes results. `results.json` holds three maps: `results` and `scores` (keyed by
  match-key) plus `standings` (keyed by **group letter**, an ordered array of team rows with
  `mp/w/d/l/gf/ga/gd/pts`).
- Auth: Google OAuth via Supabase, **invite-only**. On login the callback checks for a
  `porra_jugadores` row by `user_id`: if it exists, you enter; if not, you only get in by presenting
  a valid invite (`?invite=<token>` in the URL), redeemed **server-side** via `/api/redeem-invite`
  (which provisions the row). No valid invite → `renderAccessDenied`. There is **no client-side
  provisioning or name-linking** (RLS blocks it); the admin generates invite links from the Admin
  tab (`/api/create-invite`).
- Scoring is computed in the browser: `gPts` (1 pt per correct 1/X/2) + `podiumBonus` (5/3/2 for
  champion/runner-up/third). The **group standings table**, by contrast, is precomputed in the
  updater and read straight from `results.json` (`renderStandings` does no calculation).

## Security model

The app is a **static client with a public `anon` key** (it ships in `app.js`). So **any control
that lives only in the client is bypassable** — an attacker can hit the Supabase REST API directly.
Security is enforced in two places only, and new code must respect this:

- **RLS (database)** — `supabase/migrations/*` lock `porra_jugadores`: **reads only for members**
  (`using (public.es_miembro())` — a `security definer` helper; merely being authenticated, e.g. via
  open Google login, is NOT enough → reads are invite-only too), writes only for the owner
  (`auth.uid() = user_id`), no client `INSERT`/`DELETE`, `invitaciones` table closed to everyone but
  `service_role`. The client's write requests already carry the user JWT, so RLS can scope them.
- **Serverless (`service_role`)** — `api/redeem-invite.js` (provisions a player only after
  validating an unexpired invite + the user's session) and `api/create-invite.js` (admin-only, via
  `ADMIN_TRIGGER_SECRET`). The `service_role` key is server-only (`SUPABASE_SERVICE_ROLE`), never in
  the client.

Rules of thumb when editing:
- **Never trust the client for authorization.** Don't add a client-side gate as the only check.
- **Escape every user-controlled value** before putting it in `innerHTML` with `esc()` (names,
  podium, etc. are attacker-writable via the API → stored XSS otherwise).
- **No client-side provisioning/linking** — onboarding is invite-only and happens server-side.
- The `anon` key being public is fine; the `service_role` key never is.

**Prediction locking.** `isLocked(key)` blocks editing a prediction starting 1h before kickoff.
Kickoff times in `MATCH_TIMES` are **CEST (UTC+2)**.

**Results updater (`.github/scripts/update_results.py`).** Scrapes `worldcup26.ir`, keeps only
finished group-stage games, maps each to `"1"/"X"/"2"` plus a score string, and **computes the
per-group standings** from those same finished games (seeding all 4 teams of each group from the
full fixture list, sorted by `pts ▸ gd ▸ gf ▸ name`) — writing `results`, `scores` and `standings`
to `results.json`. Standings are computed here, not pulled from the API's `/get/groups` table,
which proved unreliable (stale/inconsistent rows). The `update-results.yml` workflow runs it on a
daily cron (with `contents: write`) and commits any change as the `bot:` commits seen in history.

## Testing architecture (read before touching tests)

`js/app.js` is a **classic browser script that self-executes** (creates the Supabase client,
registers the auth callback, calls `render()`), not a module — it has no exports.

`test/load-app.js` loads it **without modifying the source**: it reads the file and runs it through
`vm.compileFunction` with the *real* file path as `filename` (so V8 coverage attributes to
`js/app.js` — a plain `new Function` would show up as anonymous `eval` and be invisible to
coverage). It injects stubbed globals (`supabase`, `document` with a fake `#app`, `window`,
`fetch`, `setTimeout`, and a `Date` whose `now` is fixable via `opts.now`) and returns the internal
functions, the live `S` object, the `window` stub (with the `window.*` handlers), `fetchCalls`,
and `fireAuth` (drives the captured `onAuthStateChange` callback).

- **To expose a new function or constant to tests, add its name to the `EXPOSED` array in
  `test/load-app.js`.** It's only reachable if listed there.
- Mock the data layer with `opts.fetch` (a URL-routing stub); assert outbound requests via
  `app.fetchCalls`. Control time-dependent logic with `opts.now`.
- Test files are `test/*.test.js`, grouped by layer: pure logic + data integrity (`app.test.js`),
  `render*` output (`render.test.js`), Supabase/data layer (`data.test.js`), the auth callback
  (`auth.test.js`), and `window.*` handlers (`handlers.test.js`).

**Integration tests (`test/integration/*.itest.mjs`, run with `npm run test:integration`).** The unit
tests mock the network, so they can't prove RLS or the serverless invite flow actually work.
`test/integration/security.itest.mjs` boots a **real local Supabase stack** with **testcontainers**
(`supabase/postgres` + PostgREST + GoTrue + an nginx gateway routing `/rest/v1` and `/auth/v1`) and
asserts, against it: **RLS by the real path** (HTTP → PostgREST → `auth.uid()`: anon can't read/write,
**reads only for members** (a logged-in non-member sees nothing), owner-only updates, `invitaciones` closed) and the **invite flow** (`api/create-invite` /
`api/redeem-invite`: provisioning, idempotency, expired/invalid invites, with a user signed up in the
local GoTrue to get a real JWT). Needs only Docker (no Supabase CLI). It lives outside `test/*.test.js`
so `npm test` skips it, and **hard-aborts unless `SUPABASE_URL` is localhost** so it can never hit
production. PostgREST runs with `PGRST_DB_USE_LEGACY_GUCS=true` so `auth.uid()` (which reads
`request.jwt.claim.sub` in this `supabase/postgres` version) resolves.

## CI

`.github/workflows/tests.yml` (workflow **Tests**) has two jobs: `test` runs `npm test` (unit), and
`integration` runs `npm run test:integration` — the **integration suite against a real local Supabase**
(Postgres + PostgREST + GoTrue), orchestrated with **testcontainers** (needs only Docker, no Supabase
CLI). Both must pass — migrations (gated on the Tests workflow) won't apply otherwise.
`.github/workflows/changelog.yml` runs on PRs and **fails** any PR that doesn't modify
`changelog.json` unless it carries the `skip-changelog` label. Workflows pin GitHub Actions to **full
commit SHAs** (with the version as a trailing comment) rather than tags — keep new actions pinned the
same way.

## Database migrations (Supabase)

Schema/RLS changes live in **`supabase/migrations/<timestamp>_name.sql`** and are applied
**automatically on merge to `main`** by the `migrations.yml` workflow — but only **after the `Tests`
workflow passes** (chained via `workflow_run`); if tests fail, migrations don't run. The Supabase
CLI tracks what's applied, so each migration runs exactly once.

**Migrations are forward-only.** Never edit (or delete) a migration that has already been
merged/applied — it won't re-run and prod will drift from the files. To change the schema, **add a
new migration** with a later timestamp. Keep them idempotent where cheap (`if not exists`,
`drop ... if exists`). Requires the repo Actions secrets `SUPABASE_ACCESS_TOKEN` and
`SUPABASE_DB_PASSWORD`. Operator setup lives in `docs/ADMIN.md`.

## Changelog (required on every PR)

The app shows a small dismissible **"Novedades" banner** on entry (`renderChangelogBanner` in
`js/app.js`), driven by a committed **`changelog.json`** (fetched in `loadData` like `results.json`).
The banner shows the most recent entry; "already seen" is tracked **client-side in `localStorage`**
(`porra_changelog_seen` = the entry `id`), so it reappears only when a newer entry lands. No writes
to Supabase.

`changelog.json` is an array of `{ id, fecha, items[] }`, newest first. **Every PR must add an
entry** (or update today's) with **user-facing Spanish** text describing what changed — not commit
jargon. The `changelog.yml` workflow enforces this and **fails the build** if a PR neither touches
`changelog.json` nor is labeled `skip-changelog` (use that label for chore/docs/internal PRs with no
user-visible change). Keep `id` unique per entry (e.g. the date, or date + suffix if several land the
same day) so the banner re-shows when content changes.
