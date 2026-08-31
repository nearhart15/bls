/*
 * Player index — dashboard performance table © 2026
 */

import {type FC, useCallback} from "react";
import {Link} from "react-router";
import {Badge, Card, CardBody, CardHeader, Table} from "react-bootstrap";
import {PersonCircle} from "react-bootstrap-icons";

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

const PlayerList: FC = () => {
    const {theme} = useTheme();
    const isDark = theme === "dark";
    const fetcher = useCallback(buildFullPlayerList, []);
    const {data, isLoading, error} = useCachedFetcher<PlayerListEntry[]>(
        fetcher,
        PLAYER_INDEX_CACHE_CATEGORY
    );

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
                                <th className="text-center" style={{width: "2.5rem"}}>
                                    #
                                </th>
                                <th>Bowler</th>
                                <th className="text-end">Avg</th>
                                <th className="text-end d-none d-sm-table-cell">Games</th>
                                <th className="text-end d-none d-md-table-cell">Pins</th>
                                <th className="text-end d-none d-md-table-cell">HG</th>
                                <th className="text-end d-none d-lg-table-cell">HS</th>
                                <th className="text-end d-none d-sm-table-cell">200+</th>
                                <th className="d-none d-xl-table-cell text-center">Trend</th>
                                <th className="text-center">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((p, idx) => {
                                const grade = performanceGrade(p.average);
                                return (
                                    <tr key={p.id}>
                                        <td className="text-center text-body-secondary fw-semibold">
                                            {idx + 1}
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className="bls-bowler-icon">
                                                    <PersonCircle size={16} />
                                                </span>
                                                <div className="min-w-0">
                                                    <Link
                                                        to={`/player/${p.id}`}
                                                        className="bls-link fw-semibold text-truncate d-block"
                                                    >
                                                        {p.name}
                                                    </Link>
                                                    <div className="fs-xs text-body-secondary">
                                                        {p.games} game{p.games === 1 ? "" : "s"}
                                                    </div>
                                                </div>
                                            </div>
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
