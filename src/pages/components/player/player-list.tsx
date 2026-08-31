/*
 * Player index — dashboard performance table with column sorting © 2026
 */

import {type FC, useCallback, useMemo, useState} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, CardHeader, Table} from "react-bootstrap";

import {
    buildFullPlayerList,
    PLAYER_INDEX_CACHE_CATEGORY,
    type PlayerListEntry,
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

function gradeRank(avg: number | null): number {
    if (avg == null || avg <= 0) return -1;
    if (avg >= 210) return 5;
    if (avg >= 190) return 4;
    if (avg >= 170) return 3;
    if (avg >= 150) return 2;
    return 1;
}

function comparePlayers(a: PlayerListEntry, b: PlayerListEntry, key: SortKey, dir: SortDir): number {
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
            // rank follows games then avg (default list order)
            cmp = a.games - b.games || (a.average ?? 0) - (b.average ?? 0);
            break;
    }
    if (cmp === 0) cmp = a.name.localeCompare(b.name);
    return cmp * mul;
}

const SortTh: FC<{
    label: string;
    sortKey: SortKey;
    active: SortKey;
    dir: SortDir;
    onSort: (k: SortKey) => void;
    className?: string;
    style?: React.CSSProperties;
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

const PlayerList: FC = () => {
    const {theme} = useTheme();
    const isDark = theme === "dark";
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        fetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

    const [sortKey, setSortKey] = useState<SortKey>("games");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const onSort = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            // sensible default direction per column
            setSortDir(key === "name" ? "asc" : "desc");
        }
    };

    const sorted = useMemo(() => {
        if (!data) return [];
        return [...data].sort((a, b) => comparePlayers(a, b, sortKey, sortDir));
    }, [data, sortKey, sortDir]);

    return (
        <Card className="mb-0 h-100 bls-perf-card">
            <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>Bowler Performance</span>
                {data && (
                    <Badge bg="secondary" pill>
                        {data.length} bowlers
                    </Badge>
                )}
            </CardHeader>
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
                                <SortTh
                                    label="#"
                                    sortKey="rank"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-center"
                                    style={{width: "2.5rem"}}
                                />
                                <SortTh
                                    label="Bowler"
                                    sortKey="name"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                />
                                <SortTh
                                    label="Avg"
                                    sortKey="average"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end"
                                />
                                <SortTh
                                    label="Games"
                                    sortKey="games"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end d-none d-sm-table-cell"
                                />
                                <SortTh
                                    label="Pins"
                                    sortKey="pinfall"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end d-none d-md-table-cell"
                                />
                                <SortTh
                                    label="HG"
                                    sortKey="highGame"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end d-none d-md-table-cell"
                                />
                                <SortTh
                                    label="HS"
                                    sortKey="highSeries"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end d-none d-lg-table-cell"
                                />
                                <SortTh
                                    label="200+"
                                    sortKey="games200"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-end d-none d-sm-table-cell"
                                />
                                <th className="d-none d-xl-table-cell text-center">Trend</th>
                                <SortTh
                                    label="Grade"
                                    sortKey="grade"
                                    active={sortKey}
                                    dir={sortDir}
                                    onSort={onSort}
                                    className="text-center"
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((p, idx) => {
                                const grade = performanceGrade(p.average);
                                return (
                                    <tr key={p.id}>
                                        <td className="text-center text-body-secondary fw-semibold">
                                            {idx + 1}
                                        </td>
                                        <td>
                                            <Link
                                                to={`/player/${p.id}`}
                                                className="bls-link fw-semibold"
                                            >
                                                {p.name}
                                            </Link>
                                        </td>
                                        <td className="text-end fw-semibold tabular-nums">
                                            {p.average != null
                                                ? numberFormat.format(p.average)
                                                : "—"}
                                        </td>
                                        <td className="text-end d-none d-sm-table-cell tabular-nums">
                                            {p.games || "—"}
                                        </td>
                                        <td className="text-end d-none d-md-table-cell tabular-nums">
                                            {p.pinfall || "—"}
                                        </td>
                                        <td className="text-end d-none d-md-table-cell tabular-nums">
                                            {p.highGame || "—"}
                                        </td>
                                        <td className="text-end d-none d-lg-table-cell tabular-nums">
                                            {p.highSeries || "—"}
                                        </td>
                                        <td className="text-end d-none d-sm-table-cell tabular-nums">
                                            {p.games200 || "—"}
                                        </td>
                                        <td className="d-none d-xl-table-cell text-center">
                                            {p.weekAverages && p.weekAverages.length > 1 ? (
                                                <div className="d-flex justify-content-center gap-2 align-items-center">
                                                    <MicroBarChart
                                                        values={p.weekSeries ?? p.weekAverages}
                                                        isDark={isDark}
                                                    />
                                                    <Sparkline
                                                        values={p.weekAverages}
                                                        isDark={isDark}
                                                    />
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
