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
npm test                              # run the whole suite (node:test, no deps)
npm run test:coverage                 # same + V8 coverage report
node --test test/render.test.js       # run a single test file
node --test --test-name-pattern="isLocked"   # run tests whose name matches

python3 .github/scripts/update_results.py    # regenerate results.json from the live API
```

There is no install/build/lint step — the app has zero runtime dependencies and tests use Node's
built-in runner (Node 22 in CI).

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
- Players: read/written via Supabase REST (`sbGet/sbPost/sbPatch`) using the public anon key in
  `app.js` (client-side by design).
- Results: fetched from the static `results.json` (cache-busted), regenerated daily — the app
  never writes results. `results.json` holds three maps: `results` and `scores` (keyed by
  match-key) plus `standings` (keyed by **group letter**, an ordered array of team rows with
  `mp/w/d/l/gf/ga/gd/pts`).
- Auth: Google OAuth via Supabase. `ensurePlayer` links the auth user to a `porra_jugadores` row
  by `user_id`, then by name; if neither matches it shows a **manual linking screen** so people who
  played before auth existed can claim their old name.
- Scoring is computed in the browser: `gPts` (1 pt per correct 1/X/2) + `podiumBonus` (5/3/2 for
  champion/runner-up/third). The **group standings table**, by contrast, is precomputed in the
  updater and read straight from `results.json` (`renderStandings` does no calculation).

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

## CI

`.github/workflows/tests.yml` runs `npm test` on push to `main` and on PRs.
`.github/workflows/changelog.yml` runs on PRs and **fails** any PR that doesn't modify
`changelog.json` unless it carries the `skip-changelog` label. Workflows pin GitHub Actions to **full
commit SHAs** (with the version as a trailing comment) rather than tags — keep new actions pinned the
same way.

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
