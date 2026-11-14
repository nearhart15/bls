import {SortHeader} from "../sort-header";
/*
 * Player detail tables © 2026
 */

import {type FC, useMemo, useState} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, Table} from "react-bootstrap";

import type {
    PlayerLeagueAppearance,
    PlayerSeasonStats,
} from "../../../data/player/player-aggregate";
import type {PlayerStats, RatioGroup} from "../../../data/player/player-stats";
import type {LeaguePlayerCarryOverStats, LeaguePlayerStats} from "../../../data/league/league-team-details";

const numberFormat = Intl.NumberFormat("en-US", {style: "decimal", maximumFractionDigits: 1});

interface AppearancesProps {
    appearances: PlayerLeagueAppearance[];
}

type AppearSortKey = "idx" | "season" | "league" | "team" | "status" | "games" | "avg" | "hg";
type SortDir = "asc" | "desc";


function fmtPct(rg?: RatioGroup | null): string {
    if (!rg || rg.denominator <= 0) return "\u2014";
    return `${(rg.pct * 100).toFixed(1)}% (${rg.numerator}/${rg.denominator})`;
}

function fmtNum(n: number | null | undefined, digits = 1): string {
    if (n == null || Number.isNaN(n)) return "\u2014";
    return (Math.round(n * 10 ** digits) / 10 ** digits).toFixed(digits);
}

function fmtAccolade(accolade?: {description?: string; howMuch?: number; when?: {format: (s: string) => string}}): string {
    if (!accolade) return "\u2014";
    const base = accolade.description && accolade.description.length > 0
        ? accolade.description
        : String(accolade.howMuch ?? "");
    const when = accolade.when?.format("DD MMM");
    return when ? `${base} on ${when}` : base;
}

function fmtStreaks(rows: [number, number][] | undefined): string {
    if (!rows || rows.length === 0) return "\u2014";
    return rows.map(([len, count]) => `${len}x \u00d7 ${count}`).join(", ");
}

function paceItems(stats: PlayerStats): {label: string; value: string}[] {
    const targets = [50, 100, 150, 200];
    const items: {label: string; value: string}[] = [];
    targets.forEach((target, idx) => {
        const n = stats.paceN?.[idx] ?? 0;
        const frames = stats.paceAvgFrames?.[idx];
        const balls = stats.paceAvgBalls?.[idx];
        const sample = n ? ` \u00b7 ${n} games` : "";
        items.push({
            label: `Avg frames to reach ${target}${sample}`,
            value: n && frames ? fmtNum(frames) : "\u2014",
        });
        items.push({
            label: `Avg balls to reach ${target}${sample}`,
            value: n && balls ? fmtNum(balls) : "\u2014",
        });
    });
    return items;
}

export const FullStatsGrid: FC<{stats: PlayerStats; leagueExtras?: LeaguePlayerStats; carryOverStats?: LeaguePlayerCarryOverStats}> = ({stats, leagueExtras, carryOverStats}) => {
    const gameSlotItems = (stats.gameAverages ?? []).map((ga, idx) => ({
        label: `Game ${idx + 1} avg`,
        value: ga ? fmtNum(ga) : "\u2014",
    }));
    const rows: {group: string; items: {label: string; value: string}[]}[] = [
        {group: "Scoring", items: [
            {label: "Games", value: String(stats.gameStats.count || "\u2014")},
            {label: "Pinfall", value: String(stats.pinfall || "\u2014")},
            {label: "Games - Avg", value: fmtNum(stats.gameStats.average)},
            {label: "Games - Min", value: String(stats.gameStats.min || "\u2014")},
            {label: "Games - Max", value: String(stats.gameStats.max || "\u2014")},
            {label: "Games - SD", value: fmtNum(stats.gameStats.sd)},
            {label: "200 Games", value: String(stats.games200 ?? "\u2014")},
            {label: "300 Games", value: String(stats.games300 ?? "\u2014")},
            ...gameSlotItems,
            {label: "Series", value: String(stats.seriesStats.count || "\u2014")},
            {label: "Series - Avg", value: fmtNum(stats.seriesStats.average)},
            {label: "Series - Min", value: String(stats.seriesStats.min || "\u2014")},
            {label: "Series - Max", value: String(stats.seriesStats.max || "\u2014")},
            {label: "Series - SD", value: fmtNum(stats.seriesStats.sd)},
            {label: "600 Series", value: String(stats.series600 ?? "\u2014")},
            {label: "800 Series", value: String(stats.series800 ?? "\u2014")},
            {label: "First Ball Average", value: fmtNum(stats.firstBallAverage)},
            {label: "Avg pinfall / frame", value: fmtNum(stats.avgPinfallPerFrame)},
        ]},
        {group: "Pace & frames", items: [
            {label: "Avg 10th-frame marks", value: stats.tenthMarkGames ? fmtNum(stats.avgTenthMarks) : "\u2014"},
            {label: "Splits / frame", value: fmtPct(stats.splitsOccurred)},
            {label: "Opens / frame", value: fmtPct(stats.opens)},
            ...paceItems(stats),
        ]},
        {group: "Conversion", items: [
            {label: "Clean Games", value: String(stats.cleanGames ?? "\u2014")},
            {label: "Strikes", value: fmtPct(stats.strikes)},
            {label: "Spares", value: fmtPct(stats.spares)},
            {label: "Single Pin Spares", value: fmtPct(stats.singlePinSpares)},
            {label: "Picked up Splits", value: fmtPct(stats.splits)},
            {label: "Opens", value: fmtPct(stats.opens)},
            {label: "Consecutive Strikes", value: fmtStreaks(stats.strikesInARow)},
            {label: "Strike Spare Ratio", value: fmtPct(stats.strikesToSpares)},
            {label: "Single-pin pickup avg", value: fmtNum(stats.allSinglePinsPickedUpAverage)},
            {label: "Got hung", value: String(stats.hungCount ?? "\u2014")},
            {label: "Turkeys", value: String(stats.turkeyCount ?? "\u2014")},
        ]},
    ];
    if (leagueExtras) {
        rows.splice(1, 0, {group: "League book", items: [
            {label: "League Games", value: String(leagueExtras.leagueGames || "\u2014")},
            {label: "League Pinfall", value: String(leagueExtras.leaguePinfall || "\u2014")},
            {label: "League Average", value: fmtNum(leagueExtras.leagueAverage)},
            {label: "League Handicap", value: String(leagueExtras.leagueHandicap || "\u2014")},
            {label: "Average Booster", value: fmtNum(leagueExtras.averageBoosterSeries, 0)},
            {label: "Best Game over Avg", value: fmtAccolade(leagueExtras.bestGameOverAverage)},
            {label: "Best Series over Avg", value: fmtAccolade(leagueExtras.bestSeriesOverAverage)},
        ]});
    }
    if (carryOverStats) rows.unshift({group: "Carry-over", items: [
        {label: "Carry-Over Pinfall", value: String(carryOverStats.pins)},
        {label: "Carry-Over Games", value: String(carryOverStats.games)},
        {label: "Entering Handicap", value: String(carryOverStats.enteringHdcp)},
    ]});
    return (
        <div className="bls-allstats">
            {stats.incompleteFrameData && <p className="small text-body-secondary">Some stats may be missing or incomplete as frame data is missing for some games.</p>}
            {rows.map((g) => (
                <div key={g.group} className="bls-allstats-group">
                    <div className="bls-allstats-group-head">{g.group}</div>
                    <div className="bls-allstats-grid">
                        {g.items.map((it) => (
                            <div key={it.label} className="bls-allstats-cell">
                                <div className="bls-allstats-val">{it.value}</div>
                                <div className="bls-allstats-lbl" title={g.group === "League book" ? (it.label === "Average Booster" ? "Bowl a series of at least this number to increase average by 1 pin." : "Includes carry-over games") : it.label === "Single-pin pickup avg" ? "Potential Average if all single pin spares were picked up." : undefined}>{it.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AppearancesPanel: FC<AppearancesProps> = ({appearances}) => {
    const [sortKey, setSortKey] = useState<AppearSortKey>("idx");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const onSort = (key: AppearSortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else setSortKey(key);
    };
    const sorted = useMemo(() => {
        const withIdx = appearances.map((a, i) => ({a, i}));
        const mul = sortDir === "asc" ? 1 : -1;
        withIdx.sort((x, y) => {
            const A = x.a; const B = y.a; let cmp: number;
            switch (sortKey) {
                case "season": cmp = A.season.localeCompare(B.season); break;
                case "league": cmp = A.leagueName.localeCompare(B.leagueName); break;
                case "team": cmp = A.teamName.localeCompare(B.teamName); break;
                case "status": cmp = A.status.localeCompare(B.status); break;
                case "games": cmp = (A.stats?.gameStats.count ?? -1) - (B.stats?.gameStats.count ?? -1); break;
                case "avg": cmp = (A.stats?.gameStats.average ?? -1) - (B.stats?.gameStats.average ?? -1); break;
                case "hg": cmp = (A.stats?.gameStats.max ?? -1) - (B.stats?.gameStats.max ?? -1); break;
                default: cmp = x.i - y.i; break;
            }
            if (cmp === 0) cmp = x.i - y.i;
            return cmp * mul;
        });
        return withIdx;
    }, [appearances, sortKey, sortDir]);
    if (appearances.length === 0) {
        return <Card className="bls-profile-card h-100"><CardBody className="text-body-secondary">No league appearances yet.</CardBody></Card>;
    }
    return (
        <Card className="bls-profile-card h-100">
            <div className="bls-profile-card-head">League Appearances</div>
            <div className="bls-appear-scroll">
                <Table className="bls-appear-table mb-0" size="sm">
                    <thead>
                        <tr>
                            <SortHeader label="#" sortKey="idx" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="Season" sortKey="season" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="League" sortKey="league" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="Team" sortKey="team" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="Status" sortKey="status" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="Games" sortKey="games" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Avg" sortKey="avg" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="HG" sortKey="hg" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(({a, i}) => {
                            const key = `${a.season}::${a.leagueId}::${a.teamId}`;
                            const isOn = selectedKey === key;
                            return (
                            <tr key={key} className={isOn ? "table-active" : undefined}>
                                <td className="text-body-secondary">{String(i + 1).padStart(2, "0")}</td>
                                <td>{a.season}</td>
                                <td>
                                    <button type="button" className="bls-link bls-link-btn" onClick={() => { setSelectedKey(isOn ? null : key); }}>
                                        {a.leagueName}
                                    </button>
                                </td>
                                <td><Link className="bls-link" to={`/league/${a.leagueId}/${a.teamId}`}>{a.teamName}</Link></td>
                                <td><Badge bg={a.status === "REGULAR" ? "primary" : "secondary"}>{a.status === "REGULAR" ? "Regular" : "Sub"}</Badge></td>
                                <td className="text-end tabular-nums">{a.stats?.gameStats.count ?? "\u2014"}</td>
                                <td className="text-end tabular-nums">{a.stats ? numberFormat.format(a.stats.gameStats.average) : "\u2014"}</td>
                                <td className="text-end tabular-nums">{a.stats?.gameStats.max ?? "\u2014"}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </div>
            {selectedKey && (() => {
                const a = appearances.find((x) => `${x.season}::${x.leagueId}::${x.teamId}` === selectedKey);
                if (!a) return null;
                return (
                    <CardBody className="border-top">
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                            <div>
                                <div className="fw-semibold">{a.leagueName}</div>
                                <div className="text-body-secondary fs-sm">{a.season} \u00b7 {a.teamName}</div>
                            </div>
                            <Link className="bls-link fs-sm" to={`/league/${a.leagueId}/${a.teamId}`}>Open league page</Link>
                        </div>
                        {a.stats
                            ? <FullStatsGrid stats={a.stats} leagueExtras={a.stats} />
                            : <p className="text-body-secondary mb-0">No detailed stats for this league appearance.</p>}
                    </CardBody>
                );
            })()}
        </Card>
    );
};

type SeasonSortKey = "season" | "leagues" | "games" | "average" | "pinfall" | "highGame" | "highSeries" | "games200" | "cleanGames" | "hungCount" | "turkeyCount";


const SeasonBreakdownTable: FC<{seasons: PlayerSeasonStats[]}> = ({seasons}) => {
    const [sortKey, setSortKey] = useState<SeasonSortKey>("season");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const onSort = (key: SeasonSortKey) => {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("desc"); }
    };
    const sorted = useMemo(() => {
        const list = [...seasons];
        const mul = sortDir === "asc" ? 1 : -1;
        list.sort((a, b) => {
            let cmp: number;
            switch (sortKey) {
                case "leagues": cmp = a.leagues - b.leagues; break;
                case "games": cmp = a.games - b.games; break;
                case "average": cmp = a.average - b.average; break;
                case "pinfall": cmp = a.pinfall - b.pinfall; break;
                case "highGame": cmp = a.highGame - b.highGame; break;
                case "highSeries": cmp = a.highSeries - b.highSeries; break;
                case "games200": cmp = a.games200 - b.games200; break;
                case "cleanGames": cmp = a.cleanGames - b.cleanGames; break;
                case "hungCount": cmp = a.hungCount - b.hungCount; break;
                case "turkeyCount": cmp = a.turkeyCount - b.turkeyCount; break;
                default: cmp = a.season.localeCompare(b.season); break;
            }
            if (cmp === 0) cmp = a.season.localeCompare(b.season);
            return cmp * mul;
        });
        return list;
    }, [seasons, sortKey, sortDir]);
    return (
        <Card className="bls-profile-card mb-3">
            <div className="bls-profile-card-head">Season breakdown</div>
            <div className="table-responsive">
                <Table className="bls-appear-table mb-0" size="sm">
                    <thead>
                        <tr>
                            <SortHeader label="Season" sortKey="season" active={sortKey} dir={sortDir} onSort={onSort} />
                            <SortHeader label="Leagues" sortKey="leagues" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Games" sortKey="games" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Average" sortKey="average" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Pinfall" sortKey="pinfall" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="High Gm" sortKey="highGame" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="High Ser" sortKey="highSeries" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="200s" sortKey="games200" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Clean" sortKey="cleanGames" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Hungs" sortKey="hungCount" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                            <SortHeader label="Turkeys" sortKey="turkeyCount" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s) => (
                            <tr key={s.season}>
                                <td className="fw-semibold">{s.season}</td>
                                <td className="text-end">{s.leagues || "\u2014"}</td>
                                <td className="text-end">{s.games || "\u2014"}</td>
                                <td className="text-end">{s.games > 0 ? numberFormat.format(s.average) : "\u2014"}</td>
                                <td className="text-end">{s.games > 0 ? s.pinfall : "\u2014"}</td>
                                <td className="text-end">{s.games > 0 ? s.highGame : "\u2014"}</td>
                                <td className="text-end">{s.highSeries > 0 ? s.highSeries : "\u2014"}</td>
                                <td className="text-end">{s.games200 || "\u2014"}</td>
                                <td className="text-end">{s.cleanGames || "\u2014"}</td>
                                <td className="text-end">{s.hungCount || "\u2014"}</td>
                                <td className="text-end">{s.turkeyCount || "\u2014"}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
        </Card>
    );
};

export {AppearancesPanel, SeasonBreakdownTable};
