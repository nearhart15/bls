# Review changes implemented in this copy

The release also adds **Last season** after Current season in Bowler Performance. It selects the previous distinct season across the dataset, preserves the separate calendar-year filter, and shows no rows when no previous season exists.

| Review finding | Implementation |
| --- | --- |
| 1. Chart HTML/script injection | Shared SafeChart boundary replaces HTML legends with React text, uses safe internal series names, encodes categories, and builds tooltip content through textContent. Actual-library injection regression test included. |
| 2. JSX build failure | Replaced the invalid literal arrow; full TypeScript/Vite build passes. |
| 3. Unvalidated remote data | Bounded JSON download, timeout/cancellation, HTTP status checks, safe relative data URLs, finite/ranged values, ID/reference checks, strict dates and complete frame validation. |
| 4. Invalid/stale converter input | Complete frame/rack parser, full input consumption, clear-on-error, submit-time reparsing, player/average validation and mutually exclusive blind/vacant flags. |
| 5. Cache TTL | Explicit numeric parsing with safe defaults and a tested millisecond expiry boundary. |
| 6. Duplicated team totals | Team-specific aggregation keys and duplicate matchup detection. |
| 7. Silent incomplete data | Partial results carry warnings displayed above the page; incomplete results are not cached; all-failed loads error. |
| 8. Incorrect percentage merging | Shared numerator/denominator aggregation, preserving zero and tracking observation coverage. |
| 9. Incorrect merged variance | Pooled population variance plus actual observation counts for frame/game averages. |
| 10. Hardcoded three-game series | Variable-length calculations and dynamic roster game columns, including blind/vacant handling. |
| 11. Wrong vacant-opponent rules | Dedicated vacant rule selection, tested against different absent rules. |
| 12. Scratch score suppresses frames | Always process supplied frames; conflicting precomputed scores fail explicitly. |
| 13. Tenth-frame strike errors | Distinguish spare marks from strikes and count fresh-rack opportunities. |
| 14. Calendar filters | Build calendar-year aggregates from matchup dates, including year-specific team slices; latest league uses bowling dates. |
| 15. Stale league/team view | Derive selected team and last/next matchup from current data and route rather than retaining stale state. |
| 16. Storage startup failure | Safe storage helper with session-only fallback; system theme follows OS changes until an explicit choice. |
| 17. 800-series boundary | Inclusive 800 threshold, regression tested. |
| 18. Vulnerable development dependencies | Patched lockfile; npm audit reports zero known vulnerabilities at verification. |
| 19. Windows clean install | Repaired optional platform lock entries, documented toolchain, verified npm ci on Windows. |
| 20. Missing delivery checks | CI runs lint, regression tests, build and dependency audit. Deployment runs after the checks on main. Remaining advisory lint diagnostics are documented. |

Additional review improvements: lower-is-better comparison metrics; configurable lineup size; explicit missed-matchup penalty policy; latest-played-date shoutouts and team-aware deduplication; responsive breakpoint boundaries; safe LeagueSecretary URLs; JSON-delimited untrusted AI prompt data; job-scoped Pages permissions; action references pinned to verified commit SHAs; and a script CSP with an external theme initialization script.

The original source's public PNG asset is preserved. The test-copy environment reads public upstream data and uses analytics test mode. No external data was rewritten or published. See TESTING.md for the malformed winter-league data and the unresolved league policy choice.


## Archived source observations from the November 2026 review

These observations describe that review snapshot and have not been rechecked against the live upstream service. Current data quality is reported in the application.


- Four of the five current leagues pass validation.
- `league-2526-winter-beer-team-23.json` contains `["87", "/"]` in frame 7, under matchup index 4, player-score index 1, game index 2 (all indices zero-based). This is invalid bowling input. The test copy excludes that league and shows a visible partial-data warning. Neither `8` nor `7` was guessed as a correction. Fix this in the data source only after verifying the actual score sheet.
- Consequently, career totals, rankings, and historical comparisons can differ from the original dashboard. The partial-data banner explains this. Partial results are not cached as complete, and an all-failed load reports an error.
- A 10-pin penalty after three missed matchups is configured in the live data, but the original code did not define whether absences are consecutive or season-total. Both modes are implemented. The default `strict` mode proceeds when both interpretations give the same answer and reports an error if they differ. Once the league rule is confirmed, add `VITE_MISSED_MATCHUP_MODE=consecutive` or `VITE_MISSED_MATCHUP_MODE=total` to `.env.test-copy.local`, then restart. The configured missed-matchup penalty replaces the default penalty once the threshold is reached. Only explicitly recorded all-blind matchups count as absences; missing records are not guessed to be absences.
