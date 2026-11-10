# Bowling League Stats

Bowling League Stats shows team, player, matchup and historical statistics for Pins Go Boom! and its leagues. The original application was created by Bindul Bhowmik; this fork adds full-league imports and historical views. See LICENSE for the Apache 2.0 terms.

## Local development

Use Node from .nvmrc and npm from the packageManager field in package.json.

```powershell
npm ci --ignore-scripts
npm run dev:test
```

Open the local URL printed by Vite, normally http://127.0.0.1:5173/bls/. Test-copy mode uses the shared public data settings and sends analytics in GA test mode. Development mode keeps its local /data/ override. Client VITE_ settings are public and must never contain credentials.

To inspect a production-style build with analytics in test mode:

```powershell
npm run build:test
npm run preview -- --host 127.0.0.1 --port 4173
```

## Validation

```powershell
npm run check
```

This runs lint, behavioral regression tests, TypeScript, a production build and bundle budgets. Nine existing advisory lint warnings remain; new warnings fail the budget. See [TESTING.md](TESTING.md) for source integration checks and data-quality behavior, and [CLEANUP-PROGRESS.md](CLEANUP-PROGRESS.md) for the consolidation ledger.

## Data and caching

BinBin frame data loads from https://bls.bindul.name/data/. A.B.C. league-sheet data and split LeagueSecretary history are generated under public/data. Both sources remain available because they provide different detail and historical coverage.

The React fetch hook and domain loaders share the application cache. Requests are deduplicated, partial results are retried, and derived player data expires with its oldest source. Refresh reloads the application and its cache. Shared frame facts and statistics projections feed the different views.

Original PDF/JSON source archives stay in Git for reprocessing. Production builds copy current beer-league.json, player-history-index.json, players/*.json and league-week-history.json, alongside normal icons/theme/security assets. Raw PDF archives, raw season snapshots, raw history index.json and the obsolete player-history.json are excluded from deployment. Published raw-archive URLs are therefore retired; the underlying files remain in this repository.

## Delivery and imports

check.yml validates pull requests and main/preview branch pushes on Windows and Ubuntu. Feature branches use PR checks, avoiding duplicate push/PR matrices. The legacy audit status is retained as a dependent gate; dependency installation/auditing happens in validation rather than a separate duplicate workflow. The scheduled audit, CodeQL and Scorecard remain separate checks.

One reusable deploy-pages.yml workflow publishes the exact artifact assembled after validation. Every artifact contains production plus preview/beer-league-pdf-import-test/, so production publications retain the preview. The Linux validation job also validates the companion source before assembling both builds. The publisher uses one shared Pages concurrency group.

Current standings refresh on schedule or manual dispatch. Beer and LeagueSecretary history backfills and live source discovery are manual operations against main. All data writers use commit-import.mjs: unchanged generated data exits without publishing; changed data is committed and explicitly dispatches check.yml. GitHub permits workflow_dispatch from GITHUB_TOKEN-created commits: [GitHub token behavior](https://docs.github.com/en/actions/concepts/security/github_token).

When rolling this branch out, synchronize the preview branch's workflow changes as well, so its obsolete standalone publisher is retired. Existing job names check (ubuntu-latest), check (windows-latest), and audit are retained. An administrator should verify any workflow-name-specific branch protection requirements before merging; the connected integration cannot read classic branch-protection settings. No remote settings or deployments are changed by local validation.

## Original data tooling

The upstream frame data is maintained separately with [BLS Data Management](https://github.com/bindul/bls-dm). Historical review findings are retained in [CHANGES.md](CHANGES.md).
