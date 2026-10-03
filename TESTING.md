# BLS testing and release notes

Merges to `main` run the checks and deploy to GitHub Pages. Ordinary feature branches run validation without deploying. The dedicated `beer-league-pdf-import-test` branch has its own preview workflow.

## Start the test app

Open a terminal in this folder and run:

```powershell
npm run dev:test
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/bls/`. Keep the terminal running; Ctrl+C stops the server. The test mode uses the existing public league data and disables analytics transmission through GA's test mode.

For a fresh checkout, use the Node version in `.nvmrc` and the npm version in `package.json`, then run `npm ci` before starting the app.

For a production-style local preview with analytics still in test mode:

```powershell
npm run build:test
npm run preview -- --host 127.0.0.1 --port 4173
```

## Important live-data differences

- Four of the five current leagues pass validation.
- `league-2526-winter-beer-team-23.json` contains `["87", "/"]` in frame 7, under matchup index 4, player-score index 1, game index 2 (all indices zero-based). This is invalid bowling input. The test copy excludes that league and shows a visible partial-data warning. Neither `8` nor `7` was guessed as a correction. Fix this in the data source only after verifying the actual score sheet.
- Consequently, career totals, rankings, and historical comparisons can differ from the original dashboard. The partial-data banner explains this. Partial results are not cached as complete, and an all-failed load reports an error.
- A 10-pin penalty after three missed matchups is configured in the live data, but the original code did not define whether absences are consecutive or season-total. Both modes are implemented. The default `strict` mode proceeds when both interpretations give the same answer and reports an error if they differ. Once the league rule is confirmed, add `VITE_MISSED_MATCHUP_MODE=consecutive` or `VITE_MISSED_MATCHUP_MODE=total` to `.env.test-copy.local`, then restart. The configured missed-matchup penalty replaces the default penalty once the threshold is reached. Only explicitly recorded all-blind matchups count as absences; missing records are not guessed to be absences.

## Suggested manual checks

1. Open Players, compare Career, Current season, Last season and Last calendar year, and confirm the partial-data banner is visible. Last season uses the previous available season across all bowlers; with the current data it is 2025–26.
2. Open Nick's profile: check the charts, All stats filters, season totals, and team appearances.
3. Compare two bowlers, switch Scoring/Conversion/Volume and season/league scope, and change either player.
4. Open a league with two teams, switch teams, then try a league URL without a team or with an invalid team ID. Confirm no stale team details remain.
5. Open Score Utilities. `XXXXXXXXXXXX` is a valid 300. Partial games, impossible `99` frames, and trailing characters must be rejected. Edit a valid game into an invalid one and confirm the old result disappears.
6. Resize the window and toggle the theme. Clear/refresh data to retry loading after a source correction.

## Verification

- `npm ci --ignore-scripts` installs the locked dependencies used by CI.
- `npm run check` runs lint, all `tests/*.test.cjs` suites, the TypeScript/production build, and bundle-size budgets.
- Lint allows at most 181 warnings, reduced from 228 in the code cleanup. Existing style, defensive-guard, and React migration diagnostics remain visible; correctness/type-safety rules remain enforced.
- Tests cover chart injection through the actual ApexCharts library, malformed input, JSON field guards, cache expiry, frame scoring, variable series length, vacancy rules, statistics merging, calendar/team separation, partial failures, storage denial, trusted links, and blind-penalty policy.
- `node tests/live-data.cjs` is an optional read-only upstream check. It intentionally exits nonzero while the invalid winter-league frame remains.
- Cleanup regression tests cover player/team/calendar aggregation, ratings, responsive subscriptions, missing frame data, and resetting matchup details when switching teams.
- `npm run budget` checks the generated assets against the limits in `scripts/check-bundle-budget.mjs`; run the build first.
- GitHub Actions runs dependency audits and `npm run check` on both Windows and Ubuntu. Pull requests also run CodeQL and a dependency audit.

See `CHANGES.md` for the security review-to-fix mapping. Use `git log` and the release pull request to inspect changes. Production deployment runs on `main` pushes, a successful Beer standings import workflow, or an explicit manual workflow dispatch.
