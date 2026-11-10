# Consolidation completion ledger

Review baseline: `0312d3e27743de26cc8097cb850e1182aa0be5d3`. Work branch: `cleanup/consolidation`.

All 54 review items are addressed in the local implementation. At review completion, no commits, pushes, deployments or remote settings changes had been made. Production rollout was subsequently authorized through PR #66. Both data sources, historical provenance and preview support are retained.

## Completed items

| Item | Result and implementation |
| --- | --- |
| 1 | Removed unused date-range and date-scope filter modules. |
| 2 | Removed the stale API comparison placeholder. |
| 3 | Removed unused `PLAYER_LIST_CACHE_CATEGORY` and `CurrentLeagueDetailsDisplay` declarations. |
| 4 | Removed the unused `bootstrap-icons` dependency; React icon components remain. |
| 5 | Removed the disabled React Refresh ESLint plugin and configuration. |
| 6 | Removed orphaned insight and wide-toggle styles. |
| 7 | Removed the redundant ClearCache component; loaders share the application cache. |
| 8 | Removed unused compact league-list rendering. |
| 9 | Removed unused theme modes and setter plumbing. |
| 10 | Removed unused props and their call-site plumbing. |
| 11 | Removed unused `hideGroups`, `max` and `limit` rendering options. |
| 12 | Removed unused frame-label metadata and icons. |
| 13 | Removed redundant cache-key and TTL configuration plumbing. |
| 14 | Removed minima that were immediately overwritten. |
| 15 | Removed unreachable pending-state rendering. |
| 16 | Shared catalogue traversal (`league-entries.ts`), roster scanning and loaded league requests. Cache invalidation prevents pending old requests from repopulating cleared data; derived results inherit source expiry. |
| 17 | Reused calculated season statistics in player aggregation. |
| 18 | Historical player summaries now use one pass while preserving sparse-history and zero-score behavior. |
| 19 | Shared player/week accumulation between historical player and league summaries. |
| 20 | Reused API-derived player statistics across views. |
| 21 | Shared slice aggregation in `slice-stats.ts`. |
| 22 | Shared statistic projection in `stat-projection.ts`. |
| 23 | Consolidated equivalent counters, replaced simulated-score arrays with sum/count and removed repeated series-length scanning. |
| 24 | Extracted independent frame scoring into `frame-scoring.ts`; compatibility exports remain. |
| 25 | Shared clean-game and strike-run analysis, including tenth-frame milestones. |
| 26 | Shared beer-sheet models, loading and player identity helpers in `beer-sheet.ts`. |
| 27 | Error display reuses the viewport subscription hook. |
| 28 | Shared comparison cards, tabs and metric bars across all four comparison screens. |
| 29 | Shared sortable headers, including the Beer League native-button variant. |
| 30 | Shared the controlled API team multiselect. |
| 31 | Reused FullStatsGrid for roster statistics, retaining carryover information and incomplete-frame notices. |
| 32 | Shared radar-chart configuration while retaining comparison-specific series settings. |
| 33 | Shared datetime-axis options and removed redundant chart toolbar/zoom overrides. |
| 34 | Removed overridden frame-layout declarations and stale contradictory comments. |
| 35 | Removed overridden matchup-action alignment declarations. |
| 36 | Consolidated scope/tab styles into `controls.scss` and centralized comparison colors. |
| 37 | Shared ranking-table rendering between overlapping league/API player screens; distinct filters, destinations and tabs remain. |
| 38 | Corrected the fortnight duration lookup from `TW` to `FN`. |
| 39 | Removed redundant pull-request dependency-review workflow; validation retains auditing. |
| 40 | Publishing consumes the artifact assembled from validated production/preview builds. |
| 41 | Consolidated push/PR matrices: main and preview pushes plus main PRs use `check.yml`. |
| 42 | Shared import commit helper skips unchanged data and explicitly dispatches validation after changed data is pushed. |
| 43 | Consolidated Pages publishing into one reusable publisher and concurrency group; each artifact includes production and preview. |
| 44 | Historical backfills and source discovery are manual operations against main; preview hosting remains supported. |
| 45 | Source integration checks reuse production source discovery instead of a separate prototype. |
| 46 | Shared immutable Beer League archive writer preserves duplicate detection and revision behavior. |
| 47 | Shared LeagueSecretary history preparation and player keying. |
| 48 | Shared script name, slug, HTML-decoding and request helpers; source-specific request/retry policies remain. |
| 49 | Excluded raw archive files from production artifacts while preserving repository source archives and runtime history assets. |
| 50 | Consolidated Vite server/environment defaults while retaining development data and test analytics settings. |
| 51 | Shared DOM fixture setup/teardown with restoration of previous globals. |
| 52 | Removed obsolete monolithic-history cleanup; packaging excludes the obsolete output. |
| 53 | Consolidated setup/validation instructions, documented current delivery behavior and moved historical source observations into CHANGES.md. |
| 54 | Removed the direct `baseline-browser-mapping` pin; the Browserslist transitive dependency remains. |

## Validation

- `npm run check`: passed, with 118 tests and zero failures; TypeScript, production build and bundle budgets passed.
- ESLint: zero errors; nine pre-existing advisory warnings remain, with the warning ceiling set to nine.
- Dependency audit: zero reported vulnerabilities.
- Actionlint 1.7.12: all workflows passed (`-shellcheck= -pyflakes=`); shellcheck and pyflakes were not run.
- Historical player/league summaries matched the previous implementation across 150 generated histories and 13 metrics, with added sparse/empty/invalid-handicap regression coverage.
- Regression coverage includes cache invalidation/expiry, partial-load retries, archive duplicate/revision behavior, comparison bars, frame milestones, filters, sorting, deployment filtering and workflow structure.
- Production and preview artifacts were assembled locally; their asset base paths, runtime history and security assets were checked.
- Deployment filtering omitted 125 source/archive files totaling 14,318,636 bytes (13.66 MiB). Repository source data was unchanged.
- Initial production JavaScript: 286.7 KiB raw / 92.2 KiB gzip. CSS: 265.1 KiB raw / 39.0 KiB gzip. The existing lazy ApexCharts chunk warning remains within the explicit bundle budget.

## Rollout and verification limits

Browser automation was unavailable in this environment, so responsive styling and chart appearance have not received browser visual verification. Hosted GitHub Actions and Pages deployment have not been executed; local workflow parsing, Actionlint and artifact checks passed.

When merging, synchronize the preview branch's workflow changes so its old standalone publisher is retired. The existing matrix check names and audit gate are retained, but an administrator must verify any workflow-name-specific required checks: the connected integration could not read classic branch protection. These are rollout/verification steps, not remaining local consolidation code changes.

## Production rollout follow-up

PR #66 adds single-pass HTML entity decoding and removes file existence/write race patterns identified by hosted CodeQL. Archive creation uses exclusive writes. Preview publishing workflows were synchronized in commits 38825bc and 28c6a1a, preserving its application and source data; dependency patches reduced its audit to zero vulnerabilities and all 52 preview tests passed. Production checks now cover 118 tests.

The existing github-pages environment permits deployment from main only. Preview validation therefore requests publication by dispatching the main workflow, preserving environment protections.
