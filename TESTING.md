# BLS testing and release notes

The security fixes were developed and tested in a separate local repository based on `nearhart15/bls` commit `4c6472bc4fb2d5bfe8029490715069412fe8344e`, then prepared for release with the Last season filter. Upstream score data is unchanged. Merges to `main` run the checks and deploy to GitHub Pages; feature branches do not deploy.

## Start the test app

Open a terminal in this folder and run:

```powershell
npm run dev:test
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173/bls/`. Keep the terminal running; Ctrl+C stops the server. The test mode uses the existing public league data and disables analytics transmission through GA's test mode.

Dependencies are already installed in the prepared local folder. If you use the ZIP on another computer, install Node 24.20.0 and npm 11.19.0, then run `npm ci` first. The ZIP contains source, not node_modules or Git history.

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

- `npm ci --ignore-scripts` succeeded on Windows after lockfile repair.
- `npm run check` runs lint, 16 regression tests, and the production build.
- Lint reports no errors. Style, defensive-guard and React migration diagnostics remain visible as warnings; these were triaged rather than all removed. Correctness/type-safety rules remain enforced. The exact configured rule changes are reviewable in `eslint.config.js`.
- Tests cover chart injection through the actual ApexCharts library, malformed input, JSON field guards, cache expiry, frame scoring, variable series length, vacancy rules, statistics merging, calendar/team separation, partial failures, storage denial, trusted links, and blind-penalty policy.
- `node tests/live-data.cjs` is an optional read-only upstream check. It intentionally exits nonzero while the invalid winter-league frame remains.
- Browser checks verified the home page, player list, profile charts, partial-data banner and two-player comparison.
- The production build still reports large bundle warnings. This review did not redesign the application's asset loading.
- CI checks are defined for Windows and Linux; the Linux job has not been run locally or on GitHub for this new repository.

See `CHANGES.md` for the review-to-fix mapping. Use `git log` and the release pull request to inspect changes. Deployment runs only on `main` pushes or an explicit manual workflow dispatch.
