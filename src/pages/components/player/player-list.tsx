/*
 * Player index — sortable performance table with season scope filters © 2026
 */

import {type CSSProperties, type FC, useCallback, useMemo, useState} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, CardHeader, Table} from "react-bootstrap";

import {
    buildFullPlayerList,
    PLAYER_INDEX_CACHE_CATEGORY,
    type PlayerListEntry,
    type PlayerListSeasonSlice,
} from "../../../data/player/player-aggregate";
import {useCachedFetcher} from "../cache/data-loader";
import Loader from "../loader";
import ErrorDisplay from "../error-display";
import {useTheme} from "../theme";
import {gradeClass, MicroBarChart, performanceGrade, Sparkline} from "../charts/mini-charts";

const numberFormat = Intl.NumberFormat("en-US", {
    style: "decimal",
    maximumFractionDigits: 1,
});

type SortKey =
    | "rank"
    | "name"
    | "average"
    | "games"
    | "pinfall"
    | "highGame"
    | "highSeries"
    | "games200"
    | "grade";

type SortDir = "asc" | "desc";

export type PlayerScope = "career" | "current" | "last-year";

interface DisplayRow {
    id: string;
    name: string;
    average: number | null;
    games: number;
    pinfall: number;
    highGame: number;
    highSeries: number;
    games200: number;
    weekAverages?: number[];
    weekSeries?: number[];
}

function gradeRank(avg: number | null): number {
    if (avg == null || avg <= 0) return -1;
    if (avg >= 210) return 5;
    if (avg >= 190) return 4;
    if (avg >= 170) return 3;
    if (avg >= 150) return 2;
    return 1;
}

function compareRows(a: DisplayRow, b: DisplayRow, key: SortKey, dir: SortDir): number {
    const mul = dir === "asc" ? 1 : -1;
    let cmp = 0;
    switch (key) {
        case "name":
            cmp = a.name.localeCompare(b.name);
            break;
        case "average":
            cmp = (a.average ?? -1) - (b.average ?? -1);
            break;
        case "games":
            cmp = a.games - b.games;
            break;
        case "pinfall":
            cmp = a.pinfall - b.pinfall;
            break;
        case "highGame":
            cmp = a.highGame - b.highGame;
            break;
        case "highSeries":
            cmp = a.highSeries - b.highSeries;
            break;
        case "games200":
            cmp = a.games200 - b.games200;
            break;
        case "grade":
            cmp = gradeRank(a.average) - gradeRank(b.average);
            break;
        case "rank":
        default:
            cmp = a.games - b.games || (a.average ?? 0) - (b.average ?? 0);
            break;
    }
    if (cmp === 0) cmp = a.name.localeCompare(b.name);
    return cmp * mul;
}

function mergeSlices(
    slices: PlayerListSeasonSlice[]
): Omit<DisplayRow, "id" | "name" | "weekAverages" | "weekSeries"> {
    let games = 0;
    let pinfall = 0;
    let highGame = 0;
    let highSeries = 0;
    let games200 = 0;
    let weighted = 0;
    for (const s of slices) {
        games += s.games;
        pinfall += s.pinfall;
        highGame = Math.max(highGame, s.highGame);
        highSeries = Math.max(highSeries, s.highSeries);
        games200 += s.games200;
        if (s.average != null && s.games > 0) {
            weighted += s.average * s.games;
        }
    }
    return {
        games,
        pinfall,
        highGame,
        highSeries,
        games200,
        average: games > 0 ? weighted / games : null,
    };
}

function resolveCurrentSeason(entries: PlayerListEntry[]): string {
    let best = "";
    for (const e of entries) {
        for (const s of e.seasonSlices) {
            if (s.season.localeCompare(best) > 0) best = s.season;
        }
    }
    return best;
}

function sliceMatchesLastYear(season: string, year: number): boolean {
    return season.includes(String(year));
}

function toDisplayRows(entries: PlayerListEntry[], scope: PlayerScope): DisplayRow[] {
    const currentSeason = resolveCurrentSeason(entries);
    const lastYear = new Date().getFullYear() - 1;

    const rows: DisplayRow[] = [];
    for (const e of entries) {
        let stats: Omit<DisplayRow, "id" | "name" | "weekAverages" | "weekSeries">;
        if (scope === "career") {
            stats = {
                average: e.average,
                games: e.games,
                pinfall: e.pinfall,
                highGame: e.highGame,
                highSeries: e.highSeries,
                games200: e.games200,
            };
        } else if (scope === "current") {
            const slices = e.seasonSlices.filter((s) => s.season === currentSeason);
            stats = mergeSlices(slices);
        } else {
            const slices = e.seasonSlices.filter((s) => sliceMatchesLastYear(s.season, lastYear));
            stats = mergeSlices(slices);
        }

        if (stats.games <= 0) continue;

        rows.push({
            id: e.id,
            name: e.name,
            ...stats,
            weekAverages: scope === "career" ? e.weekAverages : undefined,
            weekSeries: scope === "career" ? e.weekSeries : undefined,
        });
    }
    return rows;
}

const SortTh: FC<{
    label: string;
    sortKey: SortKey;
    active: SortKey;
    dir: SortDir;
    onSort: (k: SortKey) => void;
    className?: string;
    style?: CSSProperties;
}> = ({label, sortKey, active, dir, onSort, className, style}) => {
    const isActive = active === sortKey;
    return (
        <th
            className={`bls-sortable-th ${className ?? ""}${isActive ? " is-sorted" : ""}`}
            style={style}
            onClick={() => onSort(sortKey)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSort(sortKey);
                }
            }}
            aria-sort={isActive ? (dir === "asc" ? "ascending" : "descending") : "none"}
        >
            <span className="bls-sortable-label">
                {label}
                <span className="bls-sort-indicator" aria-hidden>
                    {isActive ? (dir === "asc" ? " ▲" : " ▼") : ""}
                </span>
            </span>
        </th>
    );
};

const SCOPE_OPTIONS: {id: PlayerScope; label: string; hint: string}[] = [
    {id: "career", label: "Career", hint: "All seasons combined"},
    {id: "current", label: "Current season", hint: "Most recent league season"},
    {id: "last-year", label: "Last calendar year", hint: "Seasons in the prior calendar year"},
];

interface PlayerListProps {
    defaultScope?: PlayerScope;
    lockScope?: boolean;
    title?: string;
}

const PlayerList: FC<PlayerListProps> = ({
    defaultScope = "career",
    lockScope = false,
    title = "Bowler Performance",
}) => {
    const {theme} = useTheme();
    const isDark = theme === "dark";
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        fetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

    const [scope, setScope] = useState<PlayerScope>(defaultScope);
    const [sortKey, setSortKey] = useState<SortKey>("games");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const onSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
        }
    };

    const currentSeasonLabel = useMemo(
        () => (data ? resolveCurrentSeason(data) : ""),
        [data]
    );
    const lastYearLabel = String(new Date().getFullYear() - 1);

    const sorted = useMemo(() => {
        if (!data) return [];
        const rows = toDisplayRows(data, scope);
        return rows.sort((a, b) => compareRows(a, b, sortKey, sortDir));
    }, [data, scope, sortKey, sortDir]);

    return (
        <Card className="mb-0 h-100 bls-perf-card">
            <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>{title}</span>
                {data && (
                    <Badge bg="secondary" pill>
                        {sorted.length} bowlers
                    </Badge>
                )}
            </CardHeader>

            {!lockScope && (
                <div className="bls-scope-bar px-3 pt-3">
                    <div className="bls-scope-pills" role="tablist" aria-label="Stats scope">
                        {SCOPE_OPTIONS.map((opt) => {
                            const active = scope === opt.id;
                            let sub = opt.hint;
                            if (opt.id === "current" && currentSeasonLabel) {
                                sub = currentSeasonLabel;
                            }
                            if (opt.id === "last-year") {
                                sub = lastYearLabel;
                            }
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    className={`bls-scope-pill${active ? " is-active" : ""}`}
                                    title={opt.hint}
                                    onClick={() => setScope(opt.id)}
                                >
                                    <span className="bls-scope-pill-label">{opt.label}</span>
                                    <span className="bls-scope-pill-sub">{sub}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {isLoading && (
                <CardBody>
                    <Loader />
                </CardBody>
            )}
            {error != null && (
                <ErrorDisplay message="Error loading players." error={error} />
            )}
            {data && (
                <div className="bls-perf-scroll">
                    <Table className="bls-perf-table mb-0" size="sm" hover responsive>
                        <thead>
                            <tr>
                                <SortTh label="#" sortKey="rank" active={sortKey} dir={sortDir} onSort={onSort} className="text-center" style={{width: "2.5rem"}} />
                                <SortTh label="Bowler" sortKey="name" active={sortKey} dir={sortDir} onSort={onSort} />
                                <SortTh label="Avg" sortKey="average" active={sortKey} dir={sortDir} onSort={onSort} className="text-end" />
                                <SortTh label="Games" sortKey="games" active={sortKey} dir={sortDir} onSort={onSort} className="text-end d-none d-sm-table-cell" />
                                <SortTh label="Pins" sortKey="pinfall" active={sortKey} dir={sortDir} onSort={onSort} className="text-end d-none d-md-table-cell" />
                                <SortTh label="HG" sortKey="highGame" active={sortKey} dir={sortDir} onSort={onSort} className="text-end d-none d-md-table-cell" />
                                <SortTh label="HS" sortKey="highSeries" active={sortKey} dir={sortDir} onSort={onSort} className="text-end d-none d-lg-table-cell" />
                                <SortTh label="200+" sortKey="games200" active={sortKey} dir={sortDir} onSort={onSort} className="text-end d-none d-sm-table-cell" />
                                <th className="d-none d-xl-table-cell text-center">Trend</th>
                                <SortTh label="Grade" sortKey="grade" active={sortKey} dir={sortDir} onSort={onSort} className="text-center" />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center text-body-secondary py-4">
                                        No bowlers with games in this scope.
                                    </td>
                                </tr>
                            )}
                            {sorted.map((p, idx) => {
                                const grade = performanceGrade(p.average);
                                return (
                                    <tr key={p.id}>
                                        <td className="text-center text-body-secondary fw-semibold">{idx + 1}</td>
                                        <td>
                                            <Link to={`/player/${p.id}`} className="bls-link fw-semibold">
                                                {p.name}
                                            </Link>
                                        </td>
                                        <td className="text-end fw-semibold tabular-nums">
                                            {p.average != null ? numberFormat.format(p.average) : "—"}
                                        </td>
                                        <td className="text-end d-none d-sm-table-cell tabular-nums">{p.games || "—"}</td>
                                        <td className="text-end d-none d-md-table-cell tabular-nums">{p.pinfall || "—"}</td>
                                        <td className="text-end d-none d-md-table-cell tabular-nums">{p.highGame || "—"}</td>
                                        <td className="text-end d-none d-lg-table-cell tabular-nums">{p.highSeries || "—"}</td>
                                        <td className="text-end d-none d-sm-table-cell tabular-nums">{p.games200 || "—"}</td>
                                        <td className="d-none d-xl-table-cell text-center">
                                            {p.weekAverages && p.weekAverages.length > 1 ? (
                                                <div className="d-flex justify-content-center gap-2 align-items-center">
                                                    <MicroBarChart values={p.weekSeries ?? p.weekAverages} isDark={isDark} />
                                                    <Sparkline values={p.weekAverages} isDark={isDark} />
                                                </div>
                                            ) : (
                                                <span className="bls-mini-empty">—</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className={`bls-grade ${gradeClass(grade)}`}>
                                                {grade === "—" ? "—" : `Gr. ${grade}`}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </Card>
    );
};

export default PlayerList;
