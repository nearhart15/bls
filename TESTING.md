# BLS testing and release notes

Main and preview builds share validation and one Pages publisher. See README.md for delivery details.

## Local setup

Use the installation, development and preview commands in [README.md](README.md). The test-copy mode uses public league data with analytics in test mode.

## Live data

Live data changes independently of this repository. The app reports partial-load warnings and rejects invalid source records. See CHANGES.md for dated review observations; verify the actual score sheet before correcting source data.

## Suggested manual checks

The November 2026 review corrections add league-scoped comparison links, validated
league identity and week-one start dates, separate upcoming/pending matchups,
source explanations and result dates, phone sorting, and uniform frame totals.
Historical A.B.C. comparisons show an unavailable explanation when the current
sheet cannot represent that league; they never substitute current teams with the
same numbers. These corrections do not create missing bowling results.

Regression suites cover league identity, comparison scope, source freshness,
upcoming matchups, and shared phone/table sorting. For visual checks, use a
390-pixel phone and an 820-pixel tablet, including the tenth frame, three-digit
totals, and both themes.

1. Open Players, compare Career, Current season, Last season and Last calendar year, and confirm the partial-data banner is visible. Last season uses the previous available season across all bowlers; with the current data it is 2025–26.
2. Open Nick's profile: check the charts, All stats filters, season totals, and team appearances.
3. Compare two bowlers, switch Scoring/Conversion/Volume and season/league scope, and change either player.
4. Open a league with two teams, switch teams, then try a league URL without a team or with an invalid team ID. Confirm no stale team details remain.
5. Open Score Utilities. `XXXXXXXXXXXX` is a valid 300. Partial games, impossible `99` frames, and trailing characters must be rejected. Edit a valid game into an invalid one and confirm the old result disappears.
6. Resize the window and toggle the theme. Clear/refresh data to retry loading after a source correction.

## Verification

- `npm ci --ignore-scripts` installs the locked dependencies used by CI.
- Pages deploys the same committed lockfile verified by CI; update dependencies on a branch and pass the audit and project checks before merging. The Minimatch override keeps lint dependencies on the patched 11.x release while their upstream ranges still select 10.x.
- `npm run check` runs lint, all `tests/*.test.cjs` suites, the TypeScript/production build, and bundle-size budgets.
- Lint allows at most 9 existing warnings. Existing style, defensive-guard, and React migration diagnostics remain visible; correctness/type-safety rules remain enforced.
- Tests cover chart injection through the actual ApexCharts library, malformed input, JSON field guards, cache expiry, frame scoring, variable series length, vacancy rules, statistics merging, calendar/team separation, partial failures, storage denial, trusted links, and blind-penalty policy.
- `node tests/live-data.cjs` is an optional read-only upstream check. It intentionally exits nonzero while the invalid winter-league frame remains.
- Cleanup regression tests cover player/team/calendar aggregation, ratings, responsive subscriptions, missing frame data, and resetting matchup details when switching teams.
- `npm run budget` checks the generated assets against the limits in `scripts/check-bundle-budget.mjs`; run the build first.
- GitHub Actions runs dependency audits and `npm run check` on both Windows and Ubuntu. Pull requests also run CodeQL and a dependency audit.

See `CHANGES.md` for the security review-to-fix mapping. Use `git log` and the release pull request to inspect changes. Production deployment runs on `main` pushes, a successful Beer standings import workflow, or an explicit manual workflow dispatch.
